try {
  process.loadEnvFile?.();
} catch (erro) {
  if (erro.code !== 'ENOENT') {
    console.warn('[ENV] Não foi possível carregar .env:', erro.message);
  }
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const { configurar, consultar, fechar } = require('./src/database');
const { migrar } = require('./src/database/migrator');
const { verificarOrigem, origensPermitidas } = require('./src/middleware/csrf');
const { limitadorApi } = require('./src/middleware/rateLimit');
const tratarErro = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth');
const doacoesRoutes = require('./src/routes/doacoes');
const pedidosRoutes = require('./src/routes/pedidos');
const usuariosRoutes = require('./src/routes/usuarios');
const mensagensRoutes = require('./src/routes/mensagens');
const arquivosRoutes = require('./src/routes/arquivos');
const atividadesRoutes = require('./src/routes/atividades');

const app = express();
const PORTA = Number(process.env.PORT || process.env.PORTA || 8080);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));


const ORIGENS_FRONTEND = [
  'https://doa-link-novem.onrender.com',
  'http://localhost:4200',
  'http://localhost:4201'
];

app.use(cors({
  origin(origem, callback) {
    const permitidas = [
      ...origensPermitidas(),
      ...ORIGENS_FRONTEND
    ];

    if (!origem || permitidas.includes(origem)) {
      return callback(null, true);
    }

    console.warn('[CORS] Origem bloqueada:', origem);
    return callback(new Error('Origem não permitida pelo CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(verificarOrigem);
app.use(limitadorApi);

app.get(['/health', '/api/health'], async (req, res) => {
  try {
    await consultar('SELECT 1');
    res.json({ status: 'ok', banco: 'ok' });
  } catch {
    res.status(503).json({ status: 'erro', banco: 'indisponivel' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/doacoes', doacoesRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/mensagens', mensagensRoutes);
app.use('/api/arquivos', arquivosRoutes);
app.use('/api/atividades', atividadesRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Endpoint não encontrado.' });
});

app.use(tratarErro);

async function iniciar() {
  configurar();
  await migrar();

  return new Promise((resolver, rejeitar) => {
    const servidor = app.listen(PORTA, () => {
      console.log(`
=====================================
  DoaLink Backend rodando na porta ${PORTA}
  Banco: PostgreSQL
  Ambiente: ${process.env.NODE_ENV || 'development'}
=====================================
Endpoints disponíveis:
  GET    /api/health
  POST   /api/auth/login
  POST   /api/auth/cadastrar
  POST   /api/auth/logout
  GET    /api/auth/me
  GET    /api/usuarios
  GET    /api/usuarios/:id
  GET    /api/usuarios/:id/historico
  GET    /api/doacoes
  GET    /api/doacoes/:id
  POST   /api/doacoes
  PUT    /api/doacoes/:id
  PUT    /api/doacoes/:id/solicitar
  DELETE /api/doacoes/:id
  GET    /api/pedidos
  GET    /api/pedidos/:id
  POST   /api/pedidos
  PUT    /api/pedidos/:id
  PUT    /api/pedidos/:id/atender
  DELETE /api/pedidos/:id
  GET    /api/mensagens
  GET    /api/mensagens/:idUsuario
  POST   /api/mensagens
  PUT    /api/mensagens/lidas
  GET    /api/arquivos/:id
  GET    /api/atividades

Pronto para receber conexões.
`);
      resolver(servidor);
    });

    servidor.on('error', rejeitar);
  });
}

async function encerrar() {
  try {
    await fechar();
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  iniciar().catch((erro) => {
    console.error('[FATAL] Não foi possível iniciar o backend:', erro.message);
    process.exit(1);
  });

  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
}

module.exports = { app, iniciar };
