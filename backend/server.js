const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORTA = 8080;
const DB_PATH = path.join(__dirname, 'doalink.db');

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// Upload de imagens
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const nomeUnico = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, nomeUnico);
  }
});
const upload = multer({ storage });

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// Banco de Dados
// ============================================
let db;

function salvarBanco() {
  const dados = db.export();
  const buffer = Buffer.from(dados);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save a cada 5 segundos
setInterval(salvarBanco, 5000);

function inicializarBanco() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuario (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      endereco TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_doacao (
      id_item INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Disponivel',
      id_doador INTEGER NOT NULL,
      id_receptor INTEGER DEFAULT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_doador) REFERENCES usuario(id_usuario),
      FOREIGN KEY (id_receptor) REFERENCES usuario(id_usuario)
    );

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
  `);

  const resultado = db.exec('SELECT COUNT(*) as total FROM usuario');
  const total = resultado[0].values[0][0];
  if (total > 0) return;

  console.log('Inserindo dados de teste...');

  db.run('INSERT INTO usuario (nome, email, senha, endereco) VALUES (?, ?, ?, ?)',
    ['Mariana Silva', 'mariana@email.com', '123456', 'São Paulo, SP']);
  db.run('INSERT INTO usuario (nome, email, senha, endereco) VALUES (?, ?, ?, ?)',
    ['João Santos', 'joao@email.com', '123456', 'Rio de Janeiro, RJ']);
  db.run('INSERT INTO usuario (nome, email, senha, endereco) VALUES (?, ?, ?, ?)',
    ['Ana Oliveira', 'ana@email.com', '123456', 'Belo Horizonte, MG']);

  db.run('INSERT INTO item_doacao (titulo, descricao, status, id_doador) VALUES (?, ?, ?, ?)',
    ['Livros Infantis', 'Coleção de livros infantis em ótimo estado. Perfeitos para idades de 5 a 8 anos.', 'Disponivel', 1]);
  db.run('INSERT INTO item_doacao (titulo, descricao, status, id_doador) VALUES (?, ?, ?, ?)',
    ['Cadeira de Rodas', 'Cadeira de rodas manual dobrável. Usada por pouco tempo, excelente estado mecânico.', 'Disponivel', 2]);
  db.run('INSERT INTO item_doacao (titulo, descricao, status, id_doador, id_receptor) VALUES (?, ?, ?, ?, ?)',
    ['Roupas de Inverno', 'Sacola com diversos casacos e blusas de frio tamanho M feminino. Higienizadas.', 'Doado', 3, 1]);

  console.log('Dados de teste inseridos.');
}

function converterParaObjeto(resultadoQuery) {
  if (!resultadoQuery.length) return [];
  const colunas = resultadoQuery[0].columns;
  return resultadoQuery[0].values.map(linha => {
    const objeto = {};
    colunas.forEach((coluna, i) => { objeto[coluna] = linha[i]; });
    return objeto;
  });
}

function converterParaUmObjeto(resultadoQuery) {
  const lista = converterParaObjeto(resultadoQuery);
  return lista.length > 0 ? lista[0] : null;
}

function proximoId(tabela) {
  const mapaTabelas = {
    usuario: { tabela: 'usuario', coluna: 'id_usuario' },
    doacao: { tabela: 'item_doacao', coluna: 'id_item' },
    mensagem: { tabela: 'mensagem', coluna: 'id_mensagem' }
  };
  const destino = mapaTabelas[tabela];
  const r = db.exec(`SELECT MAX(${destino.coluna}) as maximo FROM ${destino.tabela}`);
  if (!r.length || r[0].values[0][0] === null) return 1;
  return r[0].values[0][0] + 1;
}

// ============================================
// ROTAS DA API
// ============================================

// --- Auth ---
app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
  }

  const resultado = db.exec('SELECT * FROM usuario WHERE email = ? AND senha = ?', [email, senha]);
  const usuario = converterParaUmObjeto(resultado);

  if (!usuario) {
    return res.status(401).json({ erro: 'Credenciais inválidas.' });
  }

  res.json(usuario);
});

app.post('/api/auth/cadastrar', (req, res) => {
  const { nome, email, senha, endereco } = req.body;

  if (!nome || !email || !senha || !endereco) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
  }

  const existente = db.exec('SELECT id_usuario FROM usuario WHERE email = ?', [email]);
  if (converterParaObjeto(existente).length > 0) {
    return res.status(409).json({ erro: 'Email já cadastrado.' });
  }

  const id = proximoId('usuario');
  db.run('INSERT INTO usuario (id_usuario, nome, email, senha, endereco) VALUES (?, ?, ?, ?, ?)',
    [id, nome, email, senha, endereco]);

  const novoUsuario = converterParaUmObjeto(db.exec('SELECT * FROM usuario WHERE id_usuario = ?', [id]));
  res.status(201).json(novoUsuario);
});

// --- Doações ---
app.get('/api/doacoes', (req, res) => {
  const resultado = db.exec('SELECT * FROM item_doacao WHERE status = ? ORDER BY criado_em DESC', ['Disponivel']);
  res.json(converterParaObjeto(resultado));
});

app.post('/api/doacoes', upload.single('foto'), (req, res) => {
  const { titulo, descricao, id_doador } = req.body;

  if (!titulo || !descricao) {
    return res.status(400).json({ erro: 'Título e descrição são obrigatórios.' });
  }

  const id = proximoId('doacao');
  db.run('INSERT INTO item_doacao (id_item, titulo, descricao, status, id_doador) VALUES (?, ?, ?, ?, ?)',
    [id, titulo, descricao, 'Disponivel', id_doador || 1]);

  const novaDoacao = converterParaUmObjeto(db.exec('SELECT * FROM item_doacao WHERE id_item = ?', [id]));
  res.status(201).json(novaDoacao);
});

app.put('/api/doacoes/:id/solicitar', (req, res) => {
  const id = parseInt(req.params.id);

  const doacao = converterParaUmObjeto(db.exec('SELECT * FROM item_doacao WHERE id_item = ?', [id]));
  if (!doacao) {
    return res.status(404).json({ erro: 'Doação não encontrada.' });
  }
  if (doacao.status === 'Doado') {
    return res.status(409).json({ erro: 'Este item já foi doado.' });
  }

  db.run('UPDATE item_doacao SET status = ?, id_receptor = ? WHERE id_item = ?',
    ['Doado', 2, id]);

  const atualizada = converterParaUmObjeto(db.exec('SELECT * FROM item_doacao WHERE id_item = ?', [id]));
  res.json(atualizada);
});

app.delete('/api/doacoes/:id', (req, res) => {
  const id = parseInt(req.params.id);

  const doacao = converterParaUmObjeto(db.exec('SELECT * FROM item_doacao WHERE id_item = ?', [id]));
  if (!doacao) {
    return res.status(404).json({ erro: 'Doação não encontrada.' });
  }

  db.run('DELETE FROM item_doacao WHERE id_item = ?', [id]);
  res.status(204).send();
});

// --- Histórico do Usuário ---
app.get('/api/usuarios/:id/historico', (req, res) => {
  const id = parseInt(req.params.id);

  const resultado = db.exec(
    'SELECT * FROM item_doacao WHERE id_doador = ? OR id_receptor = ? ORDER BY criado_em DESC',
    [id, id]
  );

  res.json(converterParaObjeto(resultado));
});

// --- Usuários (contatos para conversas) ---
app.get('/api/usuarios', (req, res) => {
  const resultado = db.exec('SELECT id_usuario, nome, endereco FROM usuario ORDER BY nome');
  res.json(converterParaObjeto(resultado));
});

// --- Mensagens ---
app.get('/api/mensagens/:idUsuario', (req, res) => {
  const id = parseInt(req.params.idUsuario);

  const resultado = db.exec(
    'SELECT * FROM mensagem WHERE id_remetente = ? OR id_destinatario = ? ORDER BY id_mensagem ASC',
    [id, id]
  );

  res.json(converterParaObjeto(resultado));
});

app.post('/api/mensagens', (req, res) => {
  const { id_remetente, id_destinatario, texto } = req.body;

  if (!id_remetente || !id_destinatario || !texto || !texto.trim()) {
    return res.status(400).json({ erro: 'Remetente, destinatário e texto são obrigatórios.' });
  }

  if (id_remetente === id_destinatario) {
    return res.status(400).json({ erro: 'Não é possível enviar mensagem para si mesmo.' });
  }

  const id = proximoId('mensagem');
  db.run(
    'INSERT INTO mensagem (id_mensagem, id_remetente, id_destinatario, texto, lida) VALUES (?, ?, ?, ?, 0)',
    [id, id_remetente, id_destinatario, texto.trim()]
  );

  const novaMensagem = converterParaUmObjeto(db.exec('SELECT * FROM mensagem WHERE id_mensagem = ?', [id]));
  res.status(201).json(novaMensagem);
});

app.put('/api/mensagens/lidas', (req, res) => {
  const { id_usuario, id_outro } = req.body;

  if (!id_usuario || !id_outro) {
    return res.status(400).json({ erro: 'Usuário e contato são obrigatórios.' });
  }

  db.run(
    'UPDATE mensagem SET lida = 1 WHERE id_remetente = ? AND id_destinatario = ? AND lida = 0',
    [id_outro, id_usuario]
  );

  res.json({ ok: true });
});

// ============================================
// Iniciar Servidor
// ============================================
async function iniciar() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('Banco de dados existente carregado.');
  } else {
    db = new SQL.Database();
    console.log('Novo banco de dados criado.');
  }

  inicializarBanco();
  salvarBanco();

  app.listen(PORTA, () => {
    console.log(`\n=====================================`);
    console.log(`  DoaLink Backend rodando na porta ${PORTA}`);
    console.log(`=====================================`);
    console.log(`\nEndpoints disponíveis:`);
    console.log(`  POST   /api/auth/login`);
    console.log(`  POST   /api/auth/cadastrar`);
    console.log(`  GET    /api/usuarios`);
    console.log(`  GET    /api/doacoes`);
    console.log(`  POST   /api/doacoes`);
    console.log(`  PUT    /api/doacoes/:id/solicitar`);
    console.log(`  DELETE /api/doacoes/:id`);
    console.log(`  GET    /api/usuarios/:id/historico`);
    console.log(`  GET    /api/mensagens/:idUsuario`);
    console.log(`  POST   /api/mensagens`);
    console.log(`  PUT    /api/mensagens/lidas`);
    console.log(`\nContas de teste:`);
    console.log(`  mariana@email.com / 123456 (id: 1)`);
    console.log(`  joao@email.com    / 123456 (id: 2)`);
    console.log(`  ana@email.com     / 123456 (id: 3)`);
    console.log(`\nPronto para receber conexões!\n`);
  });
}

iniciar().catch(erro => {
  console.error('Erro ao iniciar o servidor:', erro);
  process.exit(1);
});
