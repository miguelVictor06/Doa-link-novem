function tratarErro(erro, req, res, next) {
  console.error(`[ERRO] ${req.method} ${req.originalUrl}:`, erro.message);

  if (res.headersSent) {
    return next(erro);
  }

  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }

  if (erro.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ erro: 'Arquivo muito grande. O limite é de 5 MB.' });
  }

  if (erro.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ erro: 'Campo de arquivo inválido.' });
  }

  if (erro.code === '23505') {
    return res.status(409).json({ erro: 'Registro já cadastrado.' });
  }

  if (erro.code === '23503') {
    return res.status(409).json({ erro: 'Operação bloqueada por vínculo entre registros.' });
  }

  if (erro.code === '23514' || erro.code === '22P02' || erro.code === '22001') {
    return res.status(400).json({ erro: 'Dados inválidos para esta operação.' });
  }

  if (erro.status === 502 || erro.status === 503) {
    return res.status(erro.status).json({ erro: erro.message || 'Serviço externo indisponível.' });
  }

  if (erro.status && erro.status >= 400 && erro.status < 500) {
    return res.status(erro.status).json({ erro: erro.message || 'Requisição inválida.' });
  }

  res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = tratarErro;
