let pool = null;

function configurar(opcoes) {
  // Preparação futura para MySQL — descomentar quando mysql2 estiver instalado:
  //
  // const mysql = require('mysql2/promise');
  // pool = mysql.createPool({
  //   host: opcoes.host || 'localhost',
  //   port: opcoes.port || 3306,
  //   user: opcoes.usuario || 'root',
  //   password: opcoes.senha || '',
  //   database: opcoes.banco || 'doalink',
  //   waitForConnections: true,
  //   connectionLimit: 10,
  //   queueLimit: 0
  // });
  // console.log('MySQL pool configurado.');
  throw new Error('MySQL ainda não implementado. Use SQLite por enquanto.');
}

function obterPool() {
  if (!pool) {
    throw new Error('Pool MySQL não configurado. Chame configurar() primeiro.');
  }
  return pool;
}

function fechar() {
  if (pool) {
    pool.end();
    pool = null;
    console.log('MySQL pool fechado.');
  }
}

module.exports = { configurar, obterPool, fechar };
