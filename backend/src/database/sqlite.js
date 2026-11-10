const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'doalink.db');

let db;

function conectar() {
  db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('SQLite conectado:', DB_PATH);
  return db;
}

function obterInstancia() {
  if (!db) {
    throw new Error('Banco de dados não conectado. Chame conectar() primeiro.');
  }
  return db;
}

function fechar() {
  if (db) {
    db.close();
    db = null;
    console.log('SQLite desconectado.');
  }
}

module.exports = { conectar, obterInstancia, fechar };
