const express = require('express');
const router = express.Router();

const { consultar, transacao } = require('../database');
const { autenticar } = require('../middleware/auth');
const { usuarioPublico, serializarDoacao } = require('../serializadores');
const { registrarAtividade } = require('../services/atividade');
const { normalizarEmail } = require('../dominio-documento');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(autenticar);

router.put('/:id', async (req, res, next) => {
  try {
    const id = paraIdPositivo(req.params.id);

    if (!id) {
      return res.status(400).json({ erro: 'Usuário inválido.' });
    }

    if (id !== req.usuario.id_usuario) {
      return res.status(403).json({ erro: 'Você só pode editar o seu próprio perfil.' });
    }

    const dados = req.body || {};
    const nome = String(dados.nome || '').trim();
    const endereco = String(dados.endereco || '').trim();
    const email = normalizarEmail(dados.email);

    if (!nome || !endereco || !email) {
      return res.status(400).json({ erro: 'Nome, email e endereço são obrigatórios.' });
    }

    if (nome.length > 120) {
      return res.status(400).json({ erro: 'O nome deve ter no máximo 120 caracteres.' });
    }

    if (endereco.length > 200) {
      return res.status(400).json({ erro: 'O endereço deve ter no máximo 200 caracteres.' });
    }

    if (!EMAIL_VALIDO.test(email)) {
      return res.status(400).json({ erro: 'Email inválido.' });
    }

    const emailEmUso = await consultar(
      `SELECT id_usuario
       FROM usuario
       WHERE lower(email) = $1
         AND id_usuario <> $2
       LIMIT 1`,
      [email, id]
    );

    if (emailEmUso.rowCount > 0) {
      return res.status(409).json({ erro: 'Email já cadastrado.' });
    }

    const atualizado = await transacao(async (cliente) => {
      const resultado = await cliente.query(
        `UPDATE usuario
         SET nome = $1, email = $2, endereco = $3
         WHERE id_usuario = $4
         RETURNING id_usuario, nome, email, endereco, tipo, cpf, cnpj, criado_em`,
        [nome, email, endereco, id]
      );

      if (resultado.rowCount === 0) {
        const erro = new Error('Usuário não encontrado.');
        erro.status = 404;
        throw erro;
      }

      await registrarAtividade(cliente, {
        idUsuario: id,
        tipo: 'usuario_atualizado',
        entidade: 'usuario',
        entidadeId: id,
        detalhes: { campos: ['nome', 'email', 'endereco'] }
      });

      return resultado.rows[0];
    });

    res.json(usuarioPublico(atualizado, true));
  } catch (erro) {
    next(erro);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const resultado = await consultar(
      `SELECT id_usuario, nome, endereco, tipo
       FROM usuario
       ORDER BY nome`
    );

    res.json(resultado.rows.map(usuario => usuarioPublico(usuario)));
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = paraIdPositivo(req.params.id);

    if (!id) {
      return res.status(400).json({ erro: 'Usuário inválido.' });
    }

    const resultado = await consultar(
      `SELECT id_usuario, nome, email, endereco, tipo, cpf, cnpj, criado_em
       FROM usuario
       WHERE id_usuario = $1`,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const ehProprio = id === req.usuario.id_usuario;
    res.json(usuarioPublico(resultado.rows[0], ehProprio));
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id/historico', async (req, res, next) => {
  try {
    const id = paraIdPositivo(req.params.id);

    if (!id) {
      return res.status(400).json({ erro: 'Usuário inválido.' });
    }

    if (id !== req.usuario.id_usuario) {
      return res.status(403).json({ erro: 'Você não pode acessar o histórico de outro usuário.' });
    }

    const resultado = await consultar(
      `SELECT d.*, u.nome AS nome_doador, u.endereco AS endereco_doador
       FROM item_doacao d
       JOIN usuario u ON u.id_usuario = d.id_doador
       WHERE d.id_doador = $1
          OR d.id_receptor = $1
          OR EXISTS (
            SELECT 1
            FROM solicitacao_doacao s
            WHERE s.id_item = d.id_item
              AND s.id_interessado = $1
          )
       ORDER BY d.criado_em DESC`,
      [id]
    );

    res.json(resultado.rows.map(doacao => serializarDoacao(req, doacao)));
  } catch (erro) {
    next(erro);
  }
});

function paraIdPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

module.exports = router;
