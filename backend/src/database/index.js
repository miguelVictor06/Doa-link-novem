const { Pool, types } = require('pg');

types.setTypeParser(types.builtins.INT8, valor => Number(valor));

let pool = null;

function configurar() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada. Defina a conexão do PostgreSQL/Neon.');
  }

  const ssl = process.env.PGSSL === 'disable'
    ? false
    : { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED === 'true' };

  pool = new Pool({
    connectionString,
    ssl,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS || 10000),
    application_name: 'doalink-backend'
  });

  pool.on('error', (erro) => {
    console.error('[PG] Erro inesperado no pool:', erro.message);
  });

  return pool;
}

function obterPool() {
  if (!pool) {
    throw new Error('Pool PostgreSQL não configurado.');
  }

  return pool;
}

async function consultar(texto, parametros = []) {
  return obterPool().query(texto, parametros);
}

async function transacao(executar) {
  const cliente = await obterPool().connect();

  try {
    await cliente.query('BEGIN');
    const resultado = await executar(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

async function fechar() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Pool PostgreSQL encerrado.');
  }
}

module.exports = { configurar, obterPool, consultar, transacao, fechar };
