const crypto = require('crypto');
const { consultar } = require('../database');

const NOME_COOKIE = process.env.SESSION_COOKIE_NAME || 'doalink_sessao';
const TTL_HORAS = Number(process.env.SESSION_TTL_HOURS || 168);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function requisicaoSegura(req) {
  if (req?.secure) {
    return true;
  }

  const protocoloEncaminhado = req?.get?.('x-forwarded-proto');

  if (typeof protocoloEncaminhado === 'string') {
    return protocoloEncaminhado.split(',')[0].trim() === 'https';
  }

  return process.env.NODE_ENV === 'production';
}

function opcoesCookie(req) {
  const seguro = requisicaoSegura(req);

  return {
    httpOnly: true,
    secure: seguro,
    sameSite: seguro ? 'none' : 'lax',
    path: '/',
    maxAge: TTL_HORAS * 60 * 60 * 1000,
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined
  };
}

function opcoesLimpezaCookie(req) {
  const { maxAge, ...opcoes } = opcoesCookie(req);
  return opcoes;
}

async function criarSessao(req, res, usuario) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiraEm = new Date(Date.now() + TTL_HORAS * 60 * 60 * 1000);

  await consultar(
    `INSERT INTO sessao (token_hash, id_usuario, expira_em, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [tokenHash, usuario.id_usuario, expiraEm, req.get('user-agent') || null, req.ip || null]
  );

  res.cookie(NOME_COOKIE, token, opcoesCookie(req));
}

async function autenticar(req, res, next) {
  try {
    const token = req.cookies?.[NOME_COOKIE];

    if (!token) {
      return res.status(401).json({ erro: 'Não autenticado.' });
    }

    const tokenHash = hashToken(token);
    const resultado = await consultar(
      `SELECT
         u.id_usuario,
         u.nome,
         u.email,
         u.endereco,
         u.tipo,
         u.cpf,
         u.cnpj,
         u.criado_em,
         s.expira_em
       FROM sessao s
       JOIN usuario u ON u.id_usuario = s.id_usuario
       WHERE s.token_hash = $1
         AND s.expira_em > NOW()`,
      [tokenHash]
    );

    if (resultado.rowCount === 0) {
      await consultar('DELETE FROM sessao WHERE token_hash = $1', [tokenHash]);
      res.clearCookie(NOME_COOKIE, opcoesLimpezaCookie(req));
      return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
    }

    const usuario = resultado.rows[0];
    req.usuario = usuario;
    req.sessaoTokenHash = tokenHash;

    await consultar(
      `UPDATE sessao
       SET ultimo_acesso_em = NOW()
       WHERE token_hash = $1
         AND ultimo_acesso_em < NOW() - INTERVAL '5 minutes'`,
      [tokenHash]
    );

    next();
  } catch (erro) {
    next(erro);
  }
}

async function encerrarSessao(req, res) {
  const token = req.cookies?.[NOME_COOKIE];

  if (token) {
    await consultar('DELETE FROM sessao WHERE token_hash = $1', [hashToken(token)]);
  }

  res.clearCookie(NOME_COOKIE, opcoesLimpezaCookie(req));
}

module.exports = {
  NOME_COOKIE,
  criarSessao,
  autenticar,
  encerrarSessao
};
