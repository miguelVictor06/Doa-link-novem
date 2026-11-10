-- Schema PostgreSQL do DoaLink.
-- A migração é aplicada uma única vez e registrada em migracao.

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  endereco TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Pessoal',
  cpf TEXT,
  cnpj TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuario_tipo_check CHECK (tipo IN ('Pessoal', 'Instituicao')),
  CONSTRAINT usuario_email_normalizado_check CHECK (email = lower(email)),
  CONSTRAINT usuario_documento_check CHECK (
    (tipo = 'Pessoal' AND cnpj IS NULL) OR
    (tipo = 'Instituicao' AND cpf IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_email ON usuario (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_cpf ON usuario (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_cnpj ON usuario (cnpj) WHERE cnpj IS NOT NULL;

CREATE TABLE IF NOT EXISTS credencial (
  id_usuario BIGINT PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  senha_hash TEXT NOT NULL,
  algoritmo TEXT NOT NULL DEFAULT 'bcrypt',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessao (
  token_hash TEXT PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL,
  ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS ix_sessao_usuario ON sessao (id_usuario);
CREATE INDEX IF NOT EXISTS ix_sessao_expira_em ON sessao (expira_em);

CREATE TABLE IF NOT EXISTS arquivo (
  id_arquivo BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  nome_original TEXT NOT NULL,
  mime TEXT NOT NULL,
  tamanho INTEGER NOT NULL CHECK (tamanho >= 0),
  conteudo BYTEA,
  url_externa TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT arquivo_conteudo_ou_url_check CHECK (conteudo IS NOT NULL OR url_externa IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_arquivo_usuario ON arquivo (id_usuario);

CREATE TABLE IF NOT EXISTS item_doacao (
  id_item BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  foto TEXT,
  id_arquivo BIGINT REFERENCES arquivo(id_arquivo) ON DELETE SET NULL,
  condicao TEXT,
  telefone TEXT,
  status TEXT NOT NULL DEFAULT 'Disponivel',
  id_doador BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
  id_receptor BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT item_doacao_status_check CHECK (status IN ('Disponivel', 'Doado'))
);

CREATE INDEX IF NOT EXISTS ix_item_doacao_status_criado ON item_doacao (status, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_item_doacao_doador ON item_doacao (id_doador);
CREATE INDEX IF NOT EXISTS ix_item_doacao_receptor ON item_doacao (id_receptor);

CREATE TABLE IF NOT EXISTS pedido_necessidade (
  id_pedido BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL REFERENCES categoria(nome) ON UPDATE CASCADE,
  urgencia TEXT NOT NULL DEFAULT 'Baixa',
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL,
  telefone TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  quantidade_atendida INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aberto',
  id_solicitante BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pedido_urgencia_check CHECK (urgencia IN ('Baixa', 'Média', 'Alta')),
  CONSTRAINT pedido_status_check CHECK (status IN ('Aberto', 'Concluído')),
  CONSTRAINT pedido_quantidade_check CHECK (quantidade > 0),
  CONSTRAINT pedido_quantidade_atendida_check CHECK (
    quantidade_atendida >= 0 AND quantidade_atendida <= quantidade
  ),
  CONSTRAINT pedido_estado_check CHECK (estado = '' OR estado ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS ix_pedido_status_criado ON pedido_necessidade (status, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_pedido_categoria ON pedido_necessidade (categoria);
CREATE INDEX IF NOT EXISTS ix_pedido_solicitante ON pedido_necessidade (id_solicitante);

CREATE TABLE IF NOT EXISTS mensagem (
  id_mensagem BIGSERIAL PRIMARY KEY,
  id_remetente BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_destinatario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  lida_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mensagem_remetente_destinatario_check CHECK (id_remetente <> id_destinatario)
);

CREATE INDEX IF NOT EXISTS ix_mensagem_remetente_destinatario
  ON mensagem (id_remetente, id_destinatario, criado_em);
CREATE INDEX IF NOT EXISTS ix_mensagem_destinatario_lida
  ON mensagem (id_destinatario, lida, criado_em);

CREATE TABLE IF NOT EXISTS interacao_ajuda (
  id_interacao BIGSERIAL PRIMARY KEY,
  id_pedido BIGINT NOT NULL REFERENCES pedido_necessidade(id_pedido) ON DELETE CASCADE,
  id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_interacao_pedido ON interacao_ajuda (id_pedido);
CREATE INDEX IF NOT EXISTS ix_interacao_usuario ON interacao_ajuda (id_usuario);

CREATE TABLE IF NOT EXISTS atividade (
  id_atividade BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id BIGINT,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_atividade_usuario_criado
  ON atividade (id_usuario, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_atividade_entidade
  ON atividade (entidade, entidade_id);

CREATE OR REPLACE FUNCTION atualizar_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuario_atualizado_em ON usuario;
CREATE TRIGGER trg_usuario_atualizado_em
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trg_item_doacao_atualizado_em ON item_doacao;
CREATE TRIGGER trg_item_doacao_atualizado_em
  BEFORE UPDATE ON item_doacao
  FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trg_pedido_atualizado_em ON pedido_necessidade;
CREATE TRIGGER trg_pedido_atualizado_em
  BEFORE UPDATE ON pedido_necessidade
  FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();
