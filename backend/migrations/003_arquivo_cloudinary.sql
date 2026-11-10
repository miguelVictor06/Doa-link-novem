ALTER TABLE arquivo ADD COLUMN IF NOT EXISTS url_segura TEXT;
ALTER TABLE arquivo ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE arquivo ADD COLUMN IF NOT EXISTS provedor TEXT NOT NULL DEFAULT 'cloudinary';
ALTER TABLE arquivo ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'image';

UPDATE arquivo
SET url_segura = url_externa
WHERE url_segura IS NULL AND url_externa IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_arquivo_public_id
  ON arquivo (public_id)
  WHERE public_id IS NOT NULL;
