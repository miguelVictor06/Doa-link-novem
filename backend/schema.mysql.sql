-- ============================================
-- Schema MySQL - DoaLink (Marketplace de Doações)
-- ============================================

CREATE DATABASE IF NOT EXISTS doalink CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doalink;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  endereco VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- Tabela de Itens de Doação
CREATE TABLE IF NOT EXISTS item_doacao (
  id_item INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  foto VARCHAR(500) DEFAULT NULL,
  condicao VARCHAR(50) DEFAULT NULL,
  telefone VARCHAR(20) DEFAULT NULL,
  status ENUM('Disponivel', 'Doado') NOT NULL DEFAULT 'Disponivel',
  id_doador INT NOT NULL,
  id_receptor INT DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_doador) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_receptor) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS mensagem (
  id_mensagem INT AUTO_INCREMENT PRIMARY KEY,
  id_remetente INT NOT NULL,
  id_destinatario INT NOT NULL,
  texto TEXT NOT NULL,
  lida TINYINT(1) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_remetente) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_destinatario) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB;
