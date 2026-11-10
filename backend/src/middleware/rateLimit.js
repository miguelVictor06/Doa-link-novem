const rateLimit = require('express-rate-limit');

const limitadorAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
});

const limitadorApi = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT || 600),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Limite de requisições excedido. Tente novamente em instantes.' }
});

module.exports = { limitadorAutenticacao, limitadorApi };
