const express = require('express');
const multer = require('multer');
const router = express.Router();

const { consultar, transacao } = require('../database');
const { autenticar } = require('../middleware/auth');
const { registrarAtividade } = require('../services/atividade');
const {
  enviarArquivo,
  registrarArquivo,
  removerArquivoBanco,
  excluirArquivoCloudinaryComLog
} = require('../services/arquivos');
const { serializarDoacao } = require('../serializadores');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png'];

    if (!tiposPermitidos.includes(file.mimetype)) {
      const erro = new Error('Envie uma imagem JPEG ou PNG.');
      erro.status = 400;
      return cb(erro);
    }

    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const DOACAO_COM_DOADOR = `
  SELECT d.*, u.nome AS nome_doador, u.endereco AS endereco_doador
  FROM item_doacao d
  JOIN usuario u ON u.id_usuario = d.id_doador
`;

router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const resultado = await consultar(
      `${DOACAO_COM_DOADOR} WHERE d.status = 'Disponivel' ORDER BY d.criado_em DESC`
    );

    res.json(resultado.rows.map(doacao => serializarDoacao(req, doacao)));
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doacao = await buscarDoacao(req.params.id);

    if (!doacao) {
      return res.status(404).json({ erro: 'Doação não encontrada.' });
    }

    res.json(serializarDoacao(req, doacao));
  } catch (erro) {
    next(erro);
  }
});

router.post('/', upload.single('foto'), async (req, res, next) => {
  try {
    const { titulo, descricao, condicao, telefone } = req.body || {};

    if (!titulo || !descricao) {
      return res.status(400).json({ erro: 'Título e descrição são obrigatórios.' });
    }

    const enviado = req.file
      ? await enviarArquivo({ arquivo: req.file, nomeOriginal: req.file.originalname })
      : null;

    let doacao;

    try {
      doacao = await transacao(async (cliente) => {
        const arquivo = enviado
          ? await registrarArquivo(cliente, {
            idUsuario: req.usuario.id_usuario,
            metadados: enviado
          })
          : null;

        const criada = await cliente.query(
          `INSERT INTO item_doacao
             (titulo, descricao, foto, id_arquivo, condicao, telefone, status, id_doador)
           VALUES ($1, $2, $3, $4, $5, $6, 'Disponivel', $7)
           RETURNING id_item`,
          [
            String(titulo).trim(),
            String(descricao).trim(),
            arquivo ? `/api/arquivos/${arquivo.id_arquivo}` : null,
            arquivo?.id_arquivo ?? null,
            condicao || null,
            telefone || null,
            req.usuario.id_usuario
          ]
        );

        await registrarAtividade(cliente, {
          idUsuario: req.usuario.id_usuario,
          tipo: 'doacao_criada',
          entidade: 'item_doacao',
          entidadeId: criada.rows[0].id_item,
          detalhes: { titulo: String(titulo).trim(), com_foto: Boolean(arquivo) }
        });

        return buscarDoacaoComCliente(cliente, criada.rows[0].id_item);
      });
    } catch (erro) {
      if (enviado) {
        await excluirArquivoCloudinaryComLog({
          public_id: enviado.publicId,
          provedor: enviado.provedor,
          resource_type: enviado.resourceType
        });
      }

      throw erro;
    }

    res.status(201).json(serializarDoacao(req, doacao));
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id/solicitar', async (req, res, next) => {
  try {
    const doacao = await transacao(async (cliente) => {
      const bloqueada = await cliente.query(
        'SELECT * FROM item_doacao WHERE id_item = $1 FOR UPDATE',
        [paraIdPositivo(req.params.id) || 0]
      );

      const atual = bloqueada.rows[0];

      if (!atual) {
        const erro = new Error('Doação não encontrada.');
        erro.status = 404;
        throw erro;
      }

      if (atual.status === 'Doado') {
        const erro = new Error('Este item já foi doado.');
        erro.status = 409;
        throw erro;
      }

      if (atual.id_doador === req.usuario.id_usuario) {
        const erro = new Error('Você não pode solicitar sua própria doação.');
        erro.status = 400;
        throw erro;
      }

      await cliente.query(
        `UPDATE item_doacao
         SET status = 'Doado', id_receptor = $1
         WHERE id_item = $2`,
        [req.usuario.id_usuario, atual.id_item]
      );

      await registrarAtividade(cliente, {
        idUsuario: req.usuario.id_usuario,
        tipo: 'doacao_solicitada',
        entidade: 'item_doacao',
        entidadeId: atual.id_item,
        detalhes: { id_doador: atual.id_doador }
      });

      return buscarDoacaoComCliente(cliente, atual.id_item);
    });

    res.json(serializarDoacao(req, doacao));
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id', upload.single('foto'), async (req, res, next) => {
  try {
    const atual = await buscarDoacao(req.params.id);

    if (!atual) {
      return res.status(404).json({ erro: 'Doação não encontrada.' });
    }

    if (atual.id_doador !== req.usuario.id_usuario) {
      return res.status(403).json({ erro: 'Você só pode editar suas próprias doações.' });
    }

    const { titulo, descricao, condicao, telefone } = req.body || {};
    const enviado = req.file
      ? await enviarArquivo({ arquivo: req.file, nomeOriginal: req.file.originalname })
      : null;
    let arquivoAnterior = null;

    try {
      await transacao(async (cliente) => {
        let foto = null;
        let idArquivo = null;

        if (enviado) {
          const novo = await registrarArquivo(cliente, {
            idUsuario: req.usuario.id_usuario,
            metadados: enviado
          });

          foto = `/api/arquivos/${novo.id_arquivo}`;
          idArquivo = novo.id_arquivo;
          arquivoAnterior = await removerArquivoBanco(cliente, atual.id_arquivo);
        }

        await cliente.query(
          `UPDATE item_doacao
           SET titulo = $1,
               descricao = $2,
               condicao = $3,
               telefone = $4,
               foto = COALESCE($5, foto),
               id_arquivo = COALESCE($6, id_arquivo)
           WHERE id_item = $7`,
          [
            titulo || atual.titulo,
            descricao || atual.descricao,
            condicao || atual.condicao,
            telefone || atual.telefone,
            foto,
            idArquivo,
            atual.id_item
          ]
        );

        await registrarAtividade(cliente, {
          idUsuario: req.usuario.id_usuario,
          tipo: 'doacao_atualizada',
          entidade: 'item_doacao',
          entidadeId: atual.id_item,
          detalhes: { foto_substituida: Boolean(enviado) }
        });
      });
    } catch (erro) {
      if (enviado) {
        await excluirArquivoCloudinaryComLog({
          public_id: enviado.publicId,
          provedor: enviado.provedor,
          resource_type: enviado.resourceType
        });
      }

      throw erro;
    }

    if (arquivoAnterior) {
      await excluirArquivoCloudinaryComLog(arquivoAnterior);
    }

    res.json(serializarDoacao(req, await buscarDoacao(atual.id_item)));
  } catch (erro) {
    next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doacao = await buscarDoacao(req.params.id);

    if (!doacao) {
      return res.status(404).json({ erro: 'Doação não encontrada.' });
    }

    if (doacao.id_doador !== req.usuario.id_usuario) {
      return res.status(403).json({ erro: 'Você só pode excluir suas próprias doações.' });
    }

    let arquivoRemovido = null;

    await transacao(async (cliente) => {
      await cliente.query('DELETE FROM item_doacao WHERE id_item = $1', [doacao.id_item]);

      if (doacao.id_arquivo) {
        arquivoRemovido = await removerArquivoBanco(cliente, doacao.id_arquivo);
      }

      await registrarAtividade(cliente, {
        idUsuario: req.usuario.id_usuario,
        tipo: 'doacao_excluida',
        entidade: 'item_doacao',
        entidadeId: doacao.id_item,
        detalhes: { titulo: doacao.titulo }
      });
    });

    if (arquivoRemovido) {
      await excluirArquivoCloudinaryComLog(arquivoRemovido);
    }

    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

async function buscarDoacao(idParam) {
  const id = paraIdPositivo(idParam);

  if (!id) {
    return undefined;
  }

  const resultado = await consultar(
    `${DOACAO_COM_DOADOR} WHERE d.id_item = $1`,
    [id]
  );

  return resultado.rows[0];
}

async function buscarDoacaoComCliente(cliente, id) {
  const resultado = await cliente.query(
    `${DOACAO_COM_DOADOR} WHERE d.id_item = $1`,
    [id]
  );

  return resultado.rows[0];
}

function paraIdPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

module.exports = router;
