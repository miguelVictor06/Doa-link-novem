const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const { configurar, obterPool, fechar } = require('../src/database');
const { migrar } = require('../src/database/migrator');
const { normalizarEmail, normalizarTipoConta } = require('../src/dominio-documento');
const {
  enviarArquivo,
  registrarArquivo,
  excluirArquivoCloudinaryComLog
} = require('../src/services/arquivos');

const ID_MIGRACAO_DADOS = 'dados_sqlite_v1';
const ROUNDS_BCRYPT = Number(process.env.BCRYPT_ROUNDS || 12);
const DIRETORIO_BACKUP = path.join(__dirname, '..', 'backups');
const DIRETORIO_UPLOADS = path.join(__dirname, '..', 'uploads');
const CAMINHO_SQLITE = path.join(__dirname, '..', 'doalink.db');

async function main() {
  if (!fs.existsSync(CAMINHO_SQLITE)) {
    throw new Error(`Banco SQLite não encontrado em ${CAMINHO_SQLITE}`);
  }

  const backup = await criarBackup();

  configurar();
  await migrar();

  const pool = obterPool();
  const cliente = await pool.connect();
  const banco = new Database(CAMINHO_SQLITE, { readonly: true });
  const arquivosEnviados = [];

  try {
    const jaMigrado = await cliente.query(
      'SELECT 1 FROM migracao WHERE id_migracao = $1',
      [ID_MIGRACAO_DADOS]
    );

    if (jaMigrado.rowCount > 0) {
      console.log('A migração de dados do SQLite já foi executada. Nada a fazer.');
      return;
    }

    const usuariosExistentes = await cliente.query('SELECT COUNT(*)::int AS total FROM usuario');

    if (usuariosExistentes.rows[0].total > 0 && process.env.PERMITIR_MIGRACAO_SOBRE_DADOS !== 'true') {
      throw new Error(
        'O PostgreSQL já possui usuários. Para evitar duplicidade, a migração foi cancelada. ' +
        'Use um banco vazio ou defina PERMITIR_MIGRACAO_SOBRE_DADOS=true após revisar os dados.'
      );
    }

    await cliente.query('BEGIN');

    const categorias = new Set(
      (await cliente.query('SELECT nome FROM categoria')).rows.map(linha => linha.nome)
    );

    const usuariosSqlite = lerTabela(banco, 'usuario');
    const itensSqlite = lerTabela(banco, 'item_doacao');
    const pedidosSqlite = lerTabela(banco, 'pedido_necessidade');
    const mensagensSqlite = lerTabela(banco, 'mensagem');

    const idsUsuarios = new Set();
    const relatorio = {
      usuarios: 0,
      credenciais: 0,
      arquivos: 0,
      itens: 0,
      pedidos: 0,
      mensagens: 0,
      ignorados: []
    };

    for (const usuario of usuariosSqlite) {
      const id = Number(usuario.id_usuario);
      const email = normalizarEmail(usuario.email);

      if (!Number.isInteger(id) || id <= 0 || !email) {
        relatorio.ignorados.push(`usuario inválido: ${JSON.stringify(usuario)}`);
        continue;
      }

      const tipo = normalizarTipoConta(usuario.tipo);
      const cnpj = tipo === 'Instituicao' ? somenteDigitos(usuario.cnpj) || null : null;

      await cliente.query(
        `INSERT INTO usuario (id_usuario, nome, email, endereco, tipo, cnpj, criado_em)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          String(usuario.nome || '').trim() || `Usuário ${id}`,
          email,
          String(usuario.endereco || '').trim(),
          tipo,
          cnpj,
          paraData(usuario.criado_em)
        ]
      );

      const senha = String(usuario.senha || '');
      const senhaHash = senha.startsWith('$2')
        ? senha
        : await bcrypt.hash(senha || crypto.randomBytes(16).toString('hex'), ROUNDS_BCRYPT);

      await cliente.query(
        `INSERT INTO credencial (id_usuario, senha_hash, algoritmo)
         VALUES ($1, $2, 'bcrypt')`,
        [id, senhaHash]
      );

      idsUsuarios.add(id);
      relatorio.usuarios += 1;
      relatorio.credenciais += 1;
    }

    for (const item of itensSqlite) {
      const id = Number(item.id_item);
      const idDoador = Number(item.id_doador);

      if (!Number.isInteger(id) || id <= 0 || !idsUsuarios.has(idDoador)) {
        relatorio.ignorados.push(`item ${item.id_item}: doador inexistente`);
        continue;
      }

      const idReceptor = idsUsuarios.has(Number(item.id_receptor))
        ? Number(item.id_receptor)
        : null;

      const arquivo = await migrarFoto(cliente, item.foto, idDoador, arquivosEnviados);
      const fotoOriginal = item.foto && !String(item.foto).startsWith('/uploads/')
        ? String(item.foto)
        : null;

      if (arquivo) {
        relatorio.arquivos += 1;
      }

      await cliente.query(
        `INSERT INTO item_doacao
           (id_item, titulo, descricao, foto, id_arquivo, condicao, telefone, status, id_doador, id_receptor, criado_em)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          String(item.titulo || '').trim() || `Doação ${id}`,
          String(item.descricao || '').trim(),
          arquivo ? `/api/arquivos/${arquivo}` : fotoOriginal,
          arquivo,
          item.condicao || null,
          item.telefone || null,
          item.status === 'Doado' ? 'Doado' : 'Disponivel',
          idDoador,
          idReceptor,
          paraData(item.criado_em)
        ]
      );

      relatorio.itens += 1;
    }

    for (const pedido of pedidosSqlite) {
      const id = Number(pedido.id_pedido);
      const idSolicitante = Number(pedido.id_solicitante);

      if (!Number.isInteger(id) || id <= 0 || !idsUsuarios.has(idSolicitante)) {
        relatorio.ignorados.push(`pedido ${pedido.id_pedido}: solicitante inexistente`);
        continue;
      }

      const categoria = categorias.has(pedido.categoria) ? pedido.categoria : 'Outros';
      const urgencia = normalizarUrgencia(pedido.urgencia);
      const quantidade = Math.max(1, Number(pedido.quantidade) || 1);
      const quantidadeAtendida = Math.min(
        Math.max(0, Number(pedido.quantidade_atendida) || 0),
        quantidade
      );

      await cliente.query(
        `INSERT INTO pedido_necessidade
           (id_pedido, titulo, categoria, urgencia, cidade, estado, descricao, telefone,
            quantidade, quantidade_atendida, status, id_solicitante, criado_em)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          String(pedido.titulo || '').trim() || `Pedido ${id}`,
          categoria,
          urgencia,
          String(pedido.cidade || '').trim(),
          normalizarEstado(pedido.estado),
          String(pedido.descricao || '').trim(),
          String(pedido.telefone || '').trim(),
          quantidade,
          quantidadeAtendida,
          pedido.status === 'Concluído' || pedido.status === 'Concluido' ? 'Concluído' : 'Aberto',
          idSolicitante,
          paraData(pedido.criado_em)
        ]
      );

      relatorio.pedidos += 1;
    }

    for (const mensagem of mensagensSqlite) {
      const id = Number(mensagem.id_mensagem);
      const idRemetente = Number(mensagem.id_remetente);
      const idDestinatario = Number(mensagem.id_destinatario);

      if (
        !Number.isInteger(id) || id <= 0 ||
        !idsUsuarios.has(idRemetente) ||
        !idsUsuarios.has(idDestinatario) ||
        idRemetente === idDestinatario
      ) {
        relatorio.ignorados.push(`mensagem ${mensagem.id_mensagem}: usuários inválidos`);
        continue;
      }

      const lida = Boolean(mensagem.lida);

      await cliente.query(
        `INSERT INTO mensagem
           (id_mensagem, id_remetente, id_destinatario, texto, lida, lida_em, criado_em)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          idRemetente,
          idDestinatario,
          String(mensagem.texto || '').trim(),
          lida,
          lida ? paraData(mensagem.criado_em) : null,
          paraData(mensagem.criado_em)
        ]
      );

      relatorio.mensagens += 1;
    }

    await cliente.query(
      `INSERT INTO atividade (id_usuario, tipo, entidade, detalhes)
       VALUES (NULL, 'migracao_sqlite', 'sistema', $1::jsonb)`,
      [JSON.stringify({
        origem: 'SQLite',
        backup,
        ...relatorio
      })]
    );

    await ajustarSequencias(cliente);
    await verificarIntegridade(cliente);
    await garantirSomenteMetadados(cliente);

    await cliente.query(
      'INSERT INTO migracao (id_migracao) VALUES ($1)',
      [ID_MIGRACAO_DADOS]
    );

    await cliente.query('COMMIT');

    imprimirRelatorio(relatorio, backup);
  } catch (erro) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // A transação pode já ter sido encerrada pelo PostgreSQL.
    }

    for (const enviado of arquivosEnviados) {
      await excluirArquivoCloudinaryComLog({
        public_id: enviado.publicId,
        provedor: enviado.provedor,
        resource_type: enviado.resourceType
      });
    }

    throw erro;
  } finally {
    banco.close();
    cliente.release();
    await fechar();
  }
}

async function criarBackup() {
  fs.mkdirSync(DIRETORIO_BACKUP, { recursive: true });

  const agora = new Date().toISOString().replace(/[:.]/g, '-');
  const destino = path.join(DIRETORIO_BACKUP, `doalink-${agora}.db`);
  const banco = new Database(CAMINHO_SQLITE, { readonly: true });

  try {
    await banco.backup(destino);
  } finally {
    banco.close();
  }

  console.log(`[BACKUP] Cópia do SQLite criada em ${destino}`);
  return destino;
}

async function migrarFoto(cliente, foto, idUsuario, arquivosEnviados) {
  if (!foto || !String(foto).startsWith('/uploads/')) {
    return null;
  }

  const nomeArquivo = path.basename(String(foto));
  const caminho = path.join(DIRETORIO_UPLOADS, nomeArquivo);

  if (!fs.existsSync(caminho)) {
    console.warn(`[AVISO] Arquivo não encontrado: ${caminho}`);
    return null;
  }

  const mime = mimePorExtensao(nomeArquivo);

  if (!['image/jpeg', 'image/png'].includes(mime)) {
    console.warn(`[AVISO] Arquivo legado ignorado por formato não suportado: ${nomeArquivo}`);
    return null;
  }

  const conteudo = fs.readFileSync(caminho);
  const metadados = await enviarArquivo({
    arquivo: {
      buffer: conteudo,
      size: conteudo.length,
      mimetype: mime,
      originalname: nomeArquivo
    },
    nomeOriginal: nomeArquivo
  });

  arquivosEnviados.push(metadados);

  const resultado = await registrarArquivo(cliente, { idUsuario, metadados });

  return resultado.id_arquivo;
}

async function ajustarSequencias(cliente) {
  const sequencias = [
    ['usuario', 'id_usuario'],
    ['item_doacao', 'id_item'],
    ['pedido_necessidade', 'id_pedido'],
    ['mensagem', 'id_mensagem'],
    ['arquivo', 'id_arquivo'],
    ['atividade', 'id_atividade'],
    ['interacao_ajuda', 'id_interacao']
  ];

  for (const [tabela, coluna] of sequencias) {
    const resultado = await cliente.query(
      `SELECT COALESCE(MAX(${coluna}), 0)::bigint AS maior, COUNT(*)::int AS total FROM ${tabela}`
    );
    const maior = Number(resultado.rows[0].maior);
    const total = Number(resultado.rows[0].total);

    await cliente.query(
      `SELECT setval(pg_get_serial_sequence('${tabela}', '${coluna}'), $1, $2)`,
      [total > 0 ? maior : 1, total > 0]
    );
  }
}

async function verificarIntegridade(cliente) {
  const verificacoes = [
    ['mensagens com remetente inexistente', `
      SELECT COUNT(*)::int AS total
      FROM mensagem m
      LEFT JOIN usuario u ON u.id_usuario = m.id_remetente
      WHERE u.id_usuario IS NULL`],
    ['mensagens com destinatário inexistente', `
      SELECT COUNT(*)::int AS total
      FROM mensagem m
      LEFT JOIN usuario u ON u.id_usuario = m.id_destinatario
      WHERE u.id_usuario IS NULL`],
    ['doações com doador inexistente', `
      SELECT COUNT(*)::int AS total
      FROM item_doacao d
      LEFT JOIN usuario u ON u.id_usuario = d.id_doador
      WHERE u.id_usuario IS NULL`],
    ['pedidos com solicitante inexistente', `
      SELECT COUNT(*)::int AS total
      FROM pedido_necessidade p
      LEFT JOIN usuario u ON u.id_usuario = p.id_solicitante
      WHERE u.id_usuario IS NULL`],
    ['usuários sem credencial', `
      SELECT COUNT(*)::int AS total
      FROM usuario u
      LEFT JOIN credencial c ON c.id_usuario = u.id_usuario
      WHERE c.id_usuario IS NULL`],
    ['arquivos sem URL segura', `
      SELECT COUNT(*)::int AS total
      FROM arquivo
      WHERE url_segura IS NULL`]
  ];

  for (const [descricao, sql] of verificacoes) {
    const resultado = await cliente.query(sql);
    const total = Number(resultado.rows[0].total);

    if (total > 0) {
      throw new Error(`Verificação de integridade falhou: ${descricao} (${total}).`);
    }
  }
}

async function garantirSomenteMetadados(cliente) {
  const coluna = await cliente.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'arquivo'
       AND column_name = 'conteudo'`
  );

  if (coluna.rowCount > 0) {
    const restantes = await cliente.query(
      'SELECT COUNT(*)::int AS total FROM arquivo WHERE conteudo IS NOT NULL'
    );

    if (restantes.rows[0].total > 0) {
      throw new Error(
        'Ainda existem arquivos binários em arquivo.conteudo. ' +
        'Execute npm run migrar:arquivos antes de concluir a migração.'
      );
    }

    await cliente.query('ALTER TABLE arquivo DROP COLUMN conteudo');
  }

  await cliente.query('ALTER TABLE arquivo VALIDATE CONSTRAINT arquivo_url_segura_check');
  await cliente.query('ALTER TABLE arquivo VALIDATE CONSTRAINT arquivo_resource_type_check');
}

function lerTabela(banco, tabela) {
  const existe = banco.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?"
  ).get(tabela);

  return existe ? banco.prepare(`SELECT * FROM ${tabela}`).all() : [];
}

function paraData(valor) {
  if (!valor) {
    return new Date();
  }

  const texto = String(valor).includes('T') ? String(valor) : String(valor).replace(' ', 'T');
  const data = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto) ? texto : `${texto}Z`);

  return Number.isNaN(data.getTime()) ? new Date() : data;
}

function normalizarEstado(valor) {
  const estado = String(valor || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(estado) ? estado : '';
}

function normalizarUrgencia(valor) {
  const urgencia = String(valor || '').trim();
  return ['Baixa', 'Média', 'Alta'].includes(urgencia) ? urgencia : 'Baixa';
}

function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function mimePorExtensao(nome) {
  const extensao = path.extname(nome).toLowerCase();

  if (extensao === '.jpg' || extensao === '.jpeg') return 'image/jpeg';
  if (extensao === '.png') return 'image/png';
  if (extensao === '.webp') return 'image/webp';
  if (extensao === '.gif') return 'image/gif';
  if (extensao === '.txt') return 'text/plain';

  return 'application/octet-stream';
}

function imprimirRelatorio(relatorio, backup) {
  console.log(`
=====================================
  Migração SQLite -> PostgreSQL
=====================================
Backup: ${backup}
Usuários: ${relatorio.usuarios}
Credenciais: ${relatorio.credenciais}
Arquivos: ${relatorio.arquivos}
Doações: ${relatorio.itens}
Pedidos: ${relatorio.pedidos}
Mensagens: ${relatorio.mensagens}
Ignorados: ${relatorio.ignorados.length}
`);

  if (relatorio.ignorados.length > 0) {
    console.log('Registros ignorados:');
    for (const item of relatorio.ignorados) {
      console.log(`- ${item}`);
    }
  }
}

main().catch((erro) => {
  console.error('[MIGRAÇÃO] Falha:', erro.message);
  process.exit(1);
});
