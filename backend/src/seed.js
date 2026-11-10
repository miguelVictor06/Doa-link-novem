function semear(db) {
  const totalUsuarios = db.prepare('SELECT COUNT(*) AS total FROM usuario').get().total;
  if (totalUsuarios > 0) return;

  console.log('Inserindo dados de teste...');

  const inserirUsuario = db.prepare(
    'INSERT INTO usuario (nome, email, senha, endereco, tipo, cnpj) VALUES (?, ?, ?, ?, ?, ?)'
  );

  inserirUsuario.run('Mariana Silva', 'mariana@email.com', '123456', 'São Paulo, SP', 'Pessoal', null);
  inserirUsuario.run('João Santos', 'joao@email.com', '123456', 'Rio de Janeiro, RJ', 'Pessoal', null);
  inserirUsuario.run('Ana Oliveira', 'ana@email.com', '123456', 'Belo Horizonte, MG', 'Pessoal', null);
  inserirUsuario.run('Instituto Acolher', 'instituto@email.com', '123456', 'Curitiba, PR', 'Instituicao', '12345678000195');

  const inserirDoacao = db.prepare(
    `INSERT INTO item_doacao (titulo, descricao, condicao, telefone, status, id_doador)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  inserirDoacao.run(
    'Livros Infantis',
    'Coleção de livros infantis em ótimo estado. Perfeitos para idades de 5 a 8 anos.',
    'bom', '(11) 99999-0001', 'Disponivel', 1
  );
  inserirDoacao.run(
    'Cadeira de Rodas',
    'Cadeira de rodas manual dobrável. Usada por pouco tempo, excelente estado mecânico.',
    'bom', '(21) 99999-0002', 'Disponivel', 2
  );
  inserirDoacao.run(
    'Roupas de Inverno',
    'Sacola com diversos casacos e blusas de frio tamanho M feminino. Higienizadas.',
    'bom', '(31) 99999-0003', 'Doado', 3
  );

  db.prepare(
    'UPDATE item_doacao SET id_receptor = ? WHERE titulo = ?'
  ).run(1, 'Roupas de Inverno');

  console.log('Dados de teste inseridos.');
}

module.exports = { semear };
