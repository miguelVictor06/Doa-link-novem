const express = require('express');
const router = express.Router();

const { consultar, transacao } = require('../database');
const { autenticar } = require('../middleware/auth');
const { registrarAtividade } = require('../services/atividade');

router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const resultado = await consultar(
      `SELECT *
       FROM mensagem
       WHERE id_remetente = $1 OR id_destinatario = $1
       ORDER BY criado_em ASC, id_mensagem ASC`,
      [req.usuario.id_usuario]
    );

    res.json(resultado.rows);
  } catch (erro) {
    next(erro);
  }
});

router.put('/lidas', async (req, res, next) => {
  try {
    const idOutro = paraIdPositivo(req.body?.id_outro);

    if (!idOutro) {
      return res.status(400).json({ erro: 'Contato é obrigatório.' });
    }

    if (idOutro === req.usuario.id_usuario) {
      return res.status(400).json({ erro: 'Usuário e contato devem ser diferentes.' });
    }

    if (!(await usuarioExiste(idOutro))) {
      return res.status(404).json({ erro: 'Contato não encontrado.' });
    }

    const resultado = await consultar(
      `UPDATE mensagem
       SET lida = TRUE, lida_em = NOW()
       WHERE id_remetente = $1
         AND id_destinatario = $2
         AND lida = FALSE`,
      [idOutro, req.usuario.id_usuario]
    );

    res.json({ ok: true, atualizadas: resultado.rowCount });
  } catch (erro) {
    next(erro);
  }
});

router.get('/:idUsuario', async (req, res, next) => {
  try {
    const idUsuario = paraIdPositivo(req.params.idUsuario);

    if (!idUsuario) {
      return res.status(400).json({ erro: 'Usuário inválido.' });
    }

    if (idUsuario !== req.usuario.id_usuario) {
      return res.status(403).json({ erro: 'Você só pode acessar suas próprias mensagens.' });
    }

    const resultado = await consultar(
      `SELECT *
       FROM mensagem
       WHERE id_remetente = $1 OR id_destinatario = $1
       ORDER BY criado_em ASC, id_mensagem ASC`,
      [idUsuario]
    );

    res.json(resultado.rows);
  } catch (erro) {
    next(erro);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const idDestinatario = paraIdPositivo(req.body?.id_destinatario);
    const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';

    if (!idDestinatario || !texto) {
      return res.status(400).json({ erro: 'Destinatário e texto são obrigatórios.' });
    }

    if (idDestinatario === req.usuario.id_usuario) {
      return res.status(400).json({ erro: 'Não é possível enviar mensagem para si mesmo.' });
    }

    if (!(await usuarioExiste(idDestinatario))) {
      return res.status(404).json({ erro: 'Destinatário não encontrado.' });
    }

    const mensagem = await transacao(async (cliente) => {
      const criada = await cliente.query(
        `INSERT INTO mensagem (id_remetente, id_destinatario, texto, lida)
         VALUES ($1, $2, $3, FALSE)
         RETURNING *`,
        [req.usuario.id_usuario, idDestinatario, texto]
      );

      await registrarAtividade(cliente, {
        idUsuario: req.usuario.id_usuario,
        tipo: 'mensagem_enviada',
        entidade: 'mensagem',
        entidadeId: criada.rows[0].id_mensagem,
        detalhes: { id_destinatario: idDestinatario }
      });

      return criada.rows[0];
    });

    res.status(201).json(mensagem);
  } catch (erro) {
    next(erro);
  }
});

function paraIdPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

async function usuarioExiste(id) {
  const resultado = await consultar('SELECT 1 FROM usuario WHERE id_usuario = $1', [id]);
  return resultado.rowCount > 0;
}

module.exports = router;
