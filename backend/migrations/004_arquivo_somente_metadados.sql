ALTER TABLE arquivo DROP CONSTRAINT IF EXISTS arquivo_conteudo_ou_url_check;
ALTER TABLE arquivo DROP CONSTRAINT IF EXISTS arquivo_url_segura_check;
ALTER TABLE arquivo ADD CONSTRAINT arquivo_url_segura_check
  CHECK (url_segura IS NOT NULL) NOT VALID;

ALTER TABLE arquivo DROP CONSTRAINT IF EXISTS arquivo_resource_type_check;
ALTER TABLE arquivo ADD CONSTRAINT arquivo_resource_type_check
  CHECK (resource_type IN ('image', 'raw')) NOT VALID;

ALTER TABLE arquivo DROP COLUMN IF EXISTS url_externa;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'arquivo'
      AND column_name = 'conteudo'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM arquivo WHERE conteudo IS NOT NULL) THEN
      ALTER TABLE arquivo DROP COLUMN conteudo;
    END IF;
  END IF;
END $$;
