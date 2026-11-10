function baseApi(req) {
  const configurada = process.env.PUBLIC_API_URL;

  if (configurada) {
    return configurada.replace(/\/+$/, '');
  }

  return `${req.protocol}://${req.get('host')}`;
}

function resolverFoto(req, foto) {
  if (!foto) {
    return null;
  }

  if (foto.startsWith('/api/arquivos/')) {
    return `${baseApi(req)}${foto}`;
  }

  return foto;
}

function serializarDoacao(req, doacao) {
  if (!doacao) {
    return doacao;
  }

  return {
    ...doacao,
    foto: resolverFoto(req, doacao.foto)
  };
}

function usuarioPublico(usuario, incluirDocumentos = false) {
  if (!usuario) {
    return usuario;
  }

  const base = {
    id_usuario: usuario.id_usuario,
    nome: usuario.nome,
    endereco: usuario.endereco,
    tipo: usuario.tipo,
    criado_em: usuario.criado_em
  };

  if (!incluirDocumentos) {
    return base;
  }

  return {
    ...base,
    email: usuario.email,
    cpf: usuario.cpf,
    cnpj: usuario.cnpj
  };
}

module.exports = { baseApi, resolverFoto, serializarDoacao, usuarioPublico };
