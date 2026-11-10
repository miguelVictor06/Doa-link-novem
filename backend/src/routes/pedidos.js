const express = require('express');
const router = express.Router();

const { consultar, transacao } = require('../database');
const { autenticar } = require('../middleware/auth');
const { registrarAtividade } = require('../services/atividade');
const { ehCategoriaValida, ehUrgenciaValida } = require('../dominio-pedido');

const PEDIDO_COM_SOLICITANTE = `
  SELECT p.*, u.nome AS nome_solicitante, u.tipo AS tipo_solicitante
  FROM pedido_necessidade p
  JOIN usuario u ON u.id_usuario = p.id_solicitante
`;

const CAMPOS_OBRIGATORIOS = ['titulo', 'categoria', 'urgencia', 'cidade', 'descricao', 'telefone'];

router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const resultado = await consultar(
      `${PEDIDO_COM_SOLICITANTE} ORDER BY p.criado_em DESC`
    );
    res.json(resultado.rows);
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pedido = await buscarPedido(req.params.id);

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    res.json(pedido);
  } catch (erro) {
    next(erro);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const dados = req.body || {};
    const pendencias = camposObrigatoriosFaltando(dados);

    if (pendencias.length > 0) {
      return res.status(400).json({ erro: `Preencha os campos obrigatórios: ${pendencias.join(', ')}.` });
    }

    if (!ehCategoriaValida(dados.categoria)) {
      return res.status(400).json({ erro: 'Categoria inválida.' });
    }

    if (!ehUrgenciaValida(dados.urgencia)) {
      return res.status(400).json({ erro: 'Nível de urgência inválido.' });
    }

    const quantidade = paraInteiroPositivo(dados.quantidade, 1);
    const local = separarCidadeEEstado(dados.cidade, dados.estado);

    const pedido = await transacao(async (cliente) => {
      const criado = await cliente.query(
        `INSERT INTO pedido_necessidade
           (titulo, categoria, urgencia, cidade, estado, descricao, telefone, quantidade, id_solicitante)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id_pedido`,
        [
          dados.titulo.trim(),
          dados.categoria,
          dados.urgencia,
          local.cidade,
          local.estado,
          dados.descricao.trim(),
          dados.telefone.trim(),
          quantidade,
          req.usuario.id_usuario
        ]
      );

      await registrarAtividade(cliente, {
        idUsuario: req.usuario.id_usuario,
        tipo: 'pedido_criado',
        entidade: 'pedido_necessidade',
        entidadeId: criado.rows[0].id_pedido,
        detalhes: { categoria: dados.categoria, urgencia: dados.urgencia, quantidade }
      });

      return buscarPedidoComCliente(cliente, criado.rows[0].id_pedido);
    });

    res.status(201).json(pedido);
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const atual = await buscarPedido(req.params.id);

    if (!atual) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    if (atual.id_solicitante !== req.usuario.id_usuario) {
      return res.status(403).json({ erro: 'Você só pode editar seus próprios pedidos.' });
    }

    const dados = req.body || {};

    if (dados.categoria && !ehCategoriaValida(dados.categoria)) {
      return res.status(400).json({ erro: 'Categoria inválida.' });
    }

    if (dados.urgencia && !ehUrgenciaValida(dados.urgencia)) {
      return res.status(400).json({ erro: 'Nível de urgência inválido.' });
    }

    const quantidade = dados.quantidade
      ? paraInteiroPositivo(dados.quantidade, atual.quantidade)
      : atual.quantidade;

    if (quantidade < atual.quantidade_atendida) {
      return res.status(400).json({ erro: 'A quantidade não pode ser menor que a quantidade já atendida.' });
    }

    const local = dados.cidade
      ? separarCidadeEEstado(dados.cidade, dados.estado)
      : { cidade: atual.cidade, estado: atual.estado };

    await transacao(async (cliente) => {
      await cliente.query(
        `UPDATE pedido_necessidade
         SET titulo = $1, categoria = $2, urgencia = $3, cidade = $4, estado = $5,
             descricao = $6, telefone = $7, quantidade = $8, status = $9
         WHERE id_pedido = $10`,
        [
          dados.titulo || atual.titulo,
          dados.categoria || atual.categoria,
          dados.urgencia || atual.urgencia,
          local.cidade,
          local.estado,
          dados.descricao || atual.descricao,
          dados.telefone || atual.telefone,
          quantidade,
          calcularStatus(quantidade, atual.quantidade_atendida),
          atual.id_pedido
        ]
      );

      await registrarAtividade(cliente, {
        idUsuario: req.usuario.id_usuario,
        tipo: 'pedido_atualizado',
        entidade: 'pedido_necessidade',
        entidadeId: atual.id_pedido,
        detalhes: { quantidade }
      });
    });

    res.json(await buscarPedido(atual.id_pedido));
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id/atender', async (req, res, next) => {
  try {
    const pedido = await transacao(async (cliente) => {
      const bloqueado = await cliente.query(
        `SELECT * FROM pedido_necessidade WHERE id_pedido = $1 FOR UPDATE`,
        [paraIdPositivo(req.params.id) || 0]
      );

      const atual = bloqueado.rows[0];

      if (!atual) {
        const erro = new Error('Pedido não encontrado.');
        erro.status = 404;
        throw erro;
      }

      if (atual.id_solicitante === req.usuario.id_usuario) {
        const erro = new Error('Você não pode ajudar no seu próprio pedido.');
        erro.status = 400;
        throw erro;
      }

      if (atual.status === 'Concluído') {
        const erro = new Error('Este pedido já foi totalmente atendido.');
        erro.status = 409;
        throw erro;
      }

      const restante = atual.quantidade - atual.quantidade_atendida;
      const ajuda = Math.min(paraInteiroPositivo(req.body?.quantidade, 1), restante);
      const atendida = atual.quantidade_atendida + ajuda;

      await cliente.query(
        `UPDATE pedido_necessidade
         SET quantidade_atendida = $1, status = $2
         WHERE id_pedido = $3`,
        [atendida, calcularStatus(atual.quantidade, atendida), atual.id_pedido]
      );

      await cliente.query(
        `INSERT INTO interacao_ajuda (id_pedido, id_usuario, quantidade)
         VALUES ($1, $2, $3)`,
        [atual.id_pedido, req.usuario.id_usuario, ajuda]
      );

      await registrarAtividade(cliente, {
        idUsuario: req.usuario.id_usuario,
        tipo: 'pedido_atendido',
        entidade: 'pedido_necessidade',
        entidadeId: atual.id_pedido,
        detalhes: { quantidade: ajuda }
      });

      return buscarPedidoComCliente(cliente, atual.id_pedido);
    });

    res.json(pedido);
  } catch (erro) {
    next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const pedido = await buscarPedido(req.params.id);

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    if (pedido.id_solicitante !== req.usuario.id_usuario) {
      return res.status(403).json({ erro: 'Você só pode excluir seus próprios pedidos.' });
    }

    await transacao(async (cliente) => {
      await cliente.query('DELETE FROM pedido_necessidade WHERE id_pedido = $1', [pedido.id_pedido]);
      await registrarAtividade(cliente, {
        idUsuario: req.usuario.id_usuario,
        tipo: 'pedido_excluido',
        entidade: 'pedido_necessidade',
        entidadeId: pedido.id_pedido,
        detalhes: { titulo: pedido.titulo }
      });
    });

    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

async function buscarPedido(idParam) {
  const id = paraIdPositivo(idParam);

  if (!id) {
    return undefined;
  }

  const resultado = await consultar(
    `${PEDIDO_COM_SOLICITANTE} WHERE p.id_pedido = $1`,
    [id]
  );

  return resultado.rows[0];
}

async function buscarPedidoComCliente(cliente, id) {
  const resultado = await cliente.query(
    `${PEDIDO_COM_SOLICITANTE} WHERE p.id_pedido = $1`,
    [id]
  );

  return resultado.rows[0];
}

function camposObrigatoriosFaltando(dados) {
  return CAMPOS_OBRIGATORIOS.filter(campo => !dados[campo] || !String(dados[campo]).trim());
}

function paraIdPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function paraInteiroPositivo(valor, padrao) {
  const numero = parseInt(valor, 10);

  if (!Number.isInteger(numero) || numero < 1) {
    return padrao;
  }

  return numero;
}

function calcularStatus(quantidade, quantidadeAtendida) {
  return quantidadeAtendida >= quantidade ? 'Concluído' : 'Aberto';
}

function separarCidadeEEstado(cidade, estado) {
  const texto = String(cidade || '').trim();

  if (String(estado || '').trim()) {
    return { cidade: texto, estado: String(estado).trim().toUpperCase() };
  }

  const comSigla = texto.match(/^(.*?)\s*[-/]\s*([A-Za-z]{2})\s*$/);

  if (!comSigla) {
    return { cidade: texto, estado: '' };
  }

  return { cidade: comSigla[1].trim(), estado: comSigla[2].toUpperCase() };
}

module.exports = router;
