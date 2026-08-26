-- ============================================
-- Schema MySQL - DoaLink (Marketplace de Doações)
-- ============================================

CREATE DATABASE IF NOT EXISTS doalink;
USE doalink;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    endereco VARCHAR(255) NOT NULL
);

-- Tabela de Itens de Doação
CREATE TABLE IF NOT EXISTS item_doacao (
    id_item INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    status ENUM('Disponivel', 'Doado') NOT NULL DEFAULT 'Disponivel',
    id_doador INT NOT NULL,
    id_receptor INT DEFAULT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_doador) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_receptor) REFERENCES usuario(id_usuario)
);

-- ============================================
-- Dados de teste
-- ============================================

INSERT INTO usuario (nome, email, senha, endereco) VALUES
('Mariana Silva', 'mariana@email.com', '123456', 'São Paulo, SP'),
('João Santos', 'joao@email.com', '123456', 'Rio de Janeiro, RJ'),
('Ana Oliveira', 'ana@email.com', '123456', 'Belo Horizonte, MG');

INSERT INTO item_doacao (titulo, descricao, status, id_doador, id_receptor) VALUES
('Livros Infantis', 'Coleção de livros infantis em ótimo estado. Perfeitos para idades de 5 a 8 anos.', 'Disponivel', 1, NULL),
('Cadeira de Rodas', 'Cadeira de rodas manual dobrável. Usada por pouco tempo, excelente estado mecânico.', 'Disponivel', 2, NULL),
('Roupas de Inverno', 'Sacola com diversos casacos e blusas de frio tamanho M feminino. Higienizadas.', 'Doado', 3, 1);
