INSERT INTO categoria (nome) VALUES
  ('Alimentos'),
  ('Móveis'),
  ('Vestuário'),
  ('Materiais Escolares'),
  ('Saúde'),
  ('Outros')
ON CONFLICT (nome) DO NOTHING;
