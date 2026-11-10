const METODOS_COM_ESTADO = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function origensPermitidas() {
  return (process.env.CORS_ORIGINS || 'http://localhost:4200')
    .split(',')
    .map(origem => origem.trim())
    .filter(Boolean);
}

function verificarOrigem(req, res, next) {
  if (!METODOS_COM_ESTADO.has(req.method)) {
    return next();
  }

  const origem = req.get('origin');

  if (!origem) {
    return next();
  }

  if (!origensPermitidas().includes(origem)) {
    return res.status(403).json({ erro: 'Origem não permitida.' });
  }

  next();
}

module.exports = { verificarOrigem, origensPermitidas };
