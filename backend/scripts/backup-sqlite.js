const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

async function main() {
  const origem = path.join(__dirname, '..', 'doalink.db');

  if (!fs.existsSync(origem)) {
    throw new Error(`Banco SQLite não encontrado em ${origem}`);
  }

  const diretorio = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(diretorio, { recursive: true });

  const agora = new Date().toISOString().replace(/[:.]/g, '-');
  const destino = path.join(diretorio, `doalink-${agora}.db`);

  const banco = new Database(origem, { readonly: true });

  try {
    await banco.backup(destino);
  } finally {
    banco.close();
  }

  console.log(`Backup do SQLite criado em: ${destino}`);
}

main().catch((erro) => {
  console.error('[BACKUP] Falha:', erro.message);
  process.exit(1);
});
