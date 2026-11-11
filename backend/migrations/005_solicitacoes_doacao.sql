-- Registra solicitações de doação sem alterar a disponibilidade do item.
-- Várias pessoas podem solicitar o mesmo item enquanto ele estiver disponível.

CREATE TABLE IF NOT EXISTS solicitacao_doacao (
  id_solicitacao BIGSERIAL PRIMARY KEY,
  id_item BIGINT NOT NULL REFERENCES item_doacao(id_item) ON DELETE CASCADE,
  id_interessado BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT solicitacao_doacao_unica UNIQUE (id_item, id_interessado)
);

CREATE INDEX IF NOT EXISTS ix_solicitacao_doacao_item
  ON solicitacao_doacao (id_item);

CREATE INDEX IF NOT EXISTS ix_solicitacao_doacao_interessado
  ON solicitacao_doacao (id_interessado, criado_em DESC);

-- Backfill das solicitações registradas pelo fluxo antigo.
INSERT INTO solicitacao_doacao (id_item, id_interessado, criado_em)
SELECT a.entidade_id, a.id_usuario, a.criado_em
FROM atividade a
JOIN item_doacao d ON d.id_item = a.entidade_id
WHERE a.tipo = 'doacao_solicitada'
  AND a.entidade = 'item_doacao'
  AND a.id_usuario IS NOT NULL
  AND a.entidade_id IS NOT NULL
  AND a.id_usuario <> d.id_doador
ON CONFLICT (id_item, id_interessado) DO NOTHING;

-- Reverte apenas os itens que foram marcados como Doado pelo fluxo antigo,
-- identificados pela atividade de solicitação do próprio receptor.
UPDATE item_doacao d
SET status = 'Disponivel',
    id_receptor = NULL
WHERE d.status = 'Doado'
  AND d.id_receptor IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM atividade a
    WHERE a.tipo = 'doacao_solicitada'
      AND a.entidade = 'item_doacao'
      AND a.entidade_id = d.id_item
      AND a.id_usuario = d.id_receptor
  );
