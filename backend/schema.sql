-- ============================================
-- Schema SQLite - DoaLink (Marketplace de Doações)
-- ============================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  endereco TEXT NOT NULL
);

-- Tabela de Itens de Doação
CREATE TABLE IF NOT EXISTS item_doacao (
  id_item INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  foto TEXT DEFAULT NULL,
  condicao TEXT DEFAULT NULL,
  telefone TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'Disponivel',
  id_doador INTEGER NOT NULL,
  id_receptor INTEGER DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_doador) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_receptor) REFERENCES usuario(id_usuario)
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS mensagem (
  id_mensagem INTEGER PRIMARY KEY AUTOINCREMENT,
  id_remetente INTEGER NOT NULL,
  id_destinatario INTEGER NOT NULL,
  texto TEXT NOT NULL,
  lida INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_remetente) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_destinatario) REFERENCES usuario(id_usuario)
);
