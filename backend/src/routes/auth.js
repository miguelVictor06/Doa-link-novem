const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const { consultar, transacao } = require('../database');
const { criarSessao, autenticar, encerrarSessao } = require('../middleware/auth');
const { limitadorAutenticacao } = require('../middleware/rateLimit');
const { registrarAtividade } = require('../services/atividade');
const { usuarioPublico } = require('../serializadores');
const {
  normalizarEmail,
  normalizarTipoConta,
  normalizarDigitos,
  validarCpf,
  validarCnpj
} = require('../dominio-documento');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROUNDS_BCRYPT = Number(process.env.BCRYPT_ROUNDS || 12);

router.post('/login', limitadorAutenticacao, async (req, res, next) => {
  try {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    }

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
         c.senha_hash
       FROM usuario u
       JOIN credencial c ON c.id_usuario = u.id_usuario
       WHERE lower(u.email) = $1`,
      [normalizarEmail(email)]
    );

    const registro = resultado.rows[0];

    if (!registro || !(await bcrypt.compare(String(senha), registro.senha_hash))) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const usuario = usuarioPublico(registro, true);
    await criarSessao(req, res, usuario);

    res.json(usuario);
  } catch (erro) {
    next(erro);
  }
});

router.post('/cadastrar', limitadorAutenticacao, async (req, res, next) => {
  try {
    const dados = req.body || {};
    const nome = String(dados.nome || '').trim();
    const email = normalizarEmail(dados.email);
    const senha = String(dados.senha || '');
    const endereco = String(dados.endereco || '').trim();
    const tipo = normalizarTipoConta(dados.tipo);

    if (!nome || !email || !senha || !endereco) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    if (!EMAIL_VALIDO.test(email)) {
      return res.status(400).json({ erro: 'Email inválido.' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    let cpf = null;
    let cnpj = null;

    if (tipo === 'Pessoal') {
      cpf = normalizarDigitos(dados.cpf);

      if (!validarCpf(cpf)) {
        return res.status(400).json({ erro: 'CPF inválido.' });
      }
    } else {
      cnpj = normalizarDigitos(dados.cnpj);

      if (!validarCnpj(cnpj)) {
        return res.status(400).json({ erro: 'CNPJ inválido.' });
      }
    }

    const existente = await consultar(
      `SELECT id_usuario
       FROM usuario
       WHERE lower(email) = $1
          OR ($2::text IS NOT NULL AND cpf = $2)
          OR ($3::text IS NOT NULL AND cnpj = $3)
       LIMIT 1`,
      [email, cpf, cnpj]
    );

    if (existente.rowCount > 0) {
      return res.status(409).json({ erro: 'Email ou documento já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, ROUNDS_BCRYPT);

    const usuario = await transacao(async (cliente) => {
      const criado = await cliente.query(
        `INSERT INTO usuario (nome, email, endereco, tipo, cpf, cnpj)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_usuario, nome, email, endereco, tipo, cpf, cnpj, criado_em`,
        [nome, email, endereco, tipo, cpf, cnpj]
      );

      const novoUsuario = criado.rows[0];

      await cliente.query(
        `INSERT INTO credencial (id_usuario, senha_hash, algoritmo)
         VALUES ($1, $2, 'bcrypt')`,
        [novoUsuario.id_usuario, senhaHash]
      );

      await registrarAtividade(cliente, {
        idUsuario: novoUsuario.id_usuario,
        tipo: 'usuario_cadastrado',
        entidade: 'usuario',
        entidadeId: novoUsuario.id_usuario,
        detalhes: { tipo }
      });

      return usuarioPublico(novoUsuario, true);
    });

    await criarSessao(req, res, usuario);

    res.status(201).json(usuario);
  } catch (erro) {
    next(erro);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await encerrarSessao(req, res);
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

router.get('/me', autenticar, (req, res) => {
  res.json(usuarioPublico(req.usuario, true));
});

module.exports = router;
