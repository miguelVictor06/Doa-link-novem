const express = require('express');
const router = express.Router();

const { consultar } = require('../database');
const { autenticar } = require('../middleware/auth');
const { usuarioPublico, serializarDoacao } = require('../serializadores');

router.use(autenticar);

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
       WHERE d.id_doador = $1 OR d.id_receptor = $1
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
