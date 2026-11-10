const express = require('express');
const router = express.Router();

const { consultar } = require('../database');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const limite = Math.min(Math.max(Number(req.query.limite) || 100, 1), 500);
    const resultado = await consultar(
      `SELECT id_atividade, tipo, entidade, entidade_id, detalhes, criado_em
       FROM atividade
       WHERE id_usuario = $1
       ORDER BY criado_em DESC, id_atividade DESC
       LIMIT $2`,
      [req.usuario.id_usuario, limite]
    );

    res.json(resultado.rows);
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
