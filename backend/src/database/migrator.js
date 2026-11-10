const fs = require('fs');
const path = require('path');
const { obterPool } = require('./index');

const DIRETORIO_MIGRACOES = path.join(__dirname, '..', '..', 'migrations');

async function migrar() {
  const pool = obterPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS migracao (
      id_migracao TEXT PRIMARY KEY,
      executada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const arquivos = fs.existsSync(DIRETORIO_MIGRACOES)
    ? fs.readdirSync(DIRETORIO_MIGRACOES).filter(arquivo => arquivo.endsWith('.sql')).sort()
    : [];

  for (const arquivo of arquivos) {
    const jaExecutada = await pool.query(
      'SELECT 1 FROM migracao WHERE id_migracao = $1',
      [arquivo]
    );

    if (jaExecutada.rowCount > 0) {
      continue;
    }

    const sql = fs.readFileSync(path.join(DIRETORIO_MIGRACOES, arquivo), 'utf8');
    const cliente = await pool.connect();

    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query(
        'INSERT INTO migracao (id_migracao) VALUES ($1)',
        [arquivo]
      );
      await cliente.query('COMMIT');
      console.log(`[MIGRAÇÃO] ${arquivo} aplicada.`);
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw new Error(`Falha na migração ${arquivo}: ${erro.message}`);
    } finally {
      cliente.release();
    }
  }
}

module.exports = { migrar };
