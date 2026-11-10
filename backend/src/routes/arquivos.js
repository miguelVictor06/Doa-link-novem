const express = require('express');
const router = express.Router();

const { consultar } = require('../database');

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'Arquivo inválido.' });
    }

    const resultado = await consultar(
      `SELECT url_segura
       FROM arquivo
       WHERE id_arquivo = $1`,
      [id]
    );

    const arquivo = resultado.rows[0];

    if (!arquivo?.url_segura) {
      return res.status(404).json({ erro: 'Arquivo não encontrado.' });
    }

    res.set('Cache-Control', 'public, max-age=86400');
    res.redirect(302, arquivo.url_segura);
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
