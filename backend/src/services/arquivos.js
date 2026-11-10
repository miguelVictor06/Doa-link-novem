const cloudinary = require('cloudinary').v2;

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TIPOS_IMAGEM = new Set(['image/jpeg', 'image/png']);

function cloudinaryConfigurado() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function configurarCloudinary() {
  if (!cloudinaryConfigurado()) {
    const erro = new Error('Armazenamento de imagens indisponível.');
    erro.status = 503;
    throw erro;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    upload_prefix: process.env.CLOUDINARY_UPLOAD_PREFIX || undefined
  });

  return cloudinary;
}

function validarImagem(arquivo, permitirNaoImagem = false) {
  const buffer = arquivo?.buffer;
  const tamanho = arquivo?.size ?? buffer?.length ?? 0;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const erro = new Error('Envie uma imagem válida.');
    erro.status = 400;
    throw erro;
  }

  if (tamanho > TAMANHO_MAXIMO) {
    const erro = new Error('Arquivo muito grande. O limite é de 5 MB.');
    erro.status = 413;
    throw erro;
  }

  const mime = String(arquivo.mimetype || '').toLowerCase();

  if (permitirNaoImagem && !mime.startsWith('image/')) {
    return { mime, resourceType: 'raw' };
  }

  if (!TIPOS_IMAGEM.has(mime)) {
    const erro = new Error('Envie uma imagem JPEG ou PNG.');
    erro.status = 400;
    throw erro;
  }

  if (mime === 'image/jpeg' && !(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
    const erro = new Error('O conteúdo do arquivo não corresponde a uma imagem JPEG.');
    erro.status = 400;
    throw erro;
  }

  if (
    mime === 'image/png' &&
    !(buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
  ) {
    const erro = new Error('O conteúdo do arquivo não corresponde a uma imagem PNG.');
    erro.status = 400;
    throw erro;
  }

  return { mime, resourceType: 'image' };
}

function criarPublicId(nomeOriginal, resourceType) {
  const base = String(nomeOriginal || 'arquivo')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+/, '')
    .slice(0, 100) || 'arquivo';
  const semExtensao = base.replace(/\.[^.]+$/, '') || 'arquivo';
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return resourceType === 'raw'
    ? `${sufixo}-${base}`
    : `${sufixo}-${semExtensao}`;
}

function enviarParaCloudinary(buffer, opcoes) {
  const cliente = configurarCloudinary();

  return new Promise((resolver, rejeitar) => {
    const stream = cliente.uploader.upload_stream(opcoes, (erro, resultado) => {
      if (erro) {
        const falha = new Error('Não foi possível enviar a imagem para o Cloudinary.');
        falha.status = 502;
        falha.causa = erro;
        return rejeitar(falha);
      }

      resolver(resultado);
    });

    stream.end(buffer);
  });
}

async function enviarArquivo({ arquivo, nomeOriginal, permitirNaoImagem = false }) {
  const { mime, resourceType } = validarImagem(arquivo, permitirNaoImagem);
  const pasta = (process.env.CLOUDINARY_FOLDER || 'doalink').replace(/^\/+|\/+$/g, '');
  const publicId = criarPublicId(nomeOriginal || arquivo.originalname, resourceType);
  const resultado = await enviarParaCloudinary(arquivo.buffer, {
    resource_type: resourceType,
    folder: pasta,
    public_id: publicId,
    overwrite: false,
    invalidate: true,
    allowed_formats: resourceType === 'image' ? ['jpg', 'jpeg', 'png'] : undefined
  });

  return {
    nomeOriginal: nomeOriginal || arquivo.originalname || 'arquivo',
    mime,
    tamanho: Number(resultado.bytes) || arquivo.buffer.length,
    urlSegura: resultado.secure_url,
    publicId: resultado.public_id,
    provedor: 'cloudinary',
    resourceType: resultado.resource_type || resourceType
  };
}

async function registrarArquivo(cliente, { idUsuario, metadados }) {
  const resultado = await cliente.query(
    `INSERT INTO arquivo
       (id_usuario, nome_original, mime, tamanho, url_segura, public_id, provedor, resource_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      idUsuario,
      metadados.nomeOriginal,
      metadados.mime,
      metadados.tamanho,
      metadados.urlSegura,
      metadados.publicId,
      metadados.provedor,
      metadados.resourceType || 'image'
    ]
  );

  return resultado.rows[0];
}

async function removerArquivoBanco(cliente, idArquivo) {
  if (!idArquivo) {
    return null;
  }

  const resultado = await cliente.query(
    `SELECT id_arquivo, public_id, provedor, resource_type
     FROM arquivo
     WHERE id_arquivo = $1
     FOR UPDATE`,
    [idArquivo]
  );

  const arquivo = resultado.rows[0];

  if (!arquivo) {
    return null;
  }

  await cliente.query('DELETE FROM arquivo WHERE id_arquivo = $1', [idArquivo]);

  return arquivo;
}

async function excluirArquivoCloudinary(arquivo) {
  if (!arquivo?.public_id || arquivo.provedor !== 'cloudinary') {
    return;
  }

  const cliente = configurarCloudinary();
  const resultado = await cliente.uploader.destroy(arquivo.public_id, {
    resource_type: arquivo.resource_type || 'image',
    invalidate: true
  });

  if (resultado.result !== 'ok' && resultado.result !== 'not found') {
    const erro = new Error('Não foi possível remover a imagem do Cloudinary.');
    erro.status = 502;
    throw erro;
  }
}

async function excluirArquivoCloudinaryComLog(arquivo) {
  try {
    await excluirArquivoCloudinary(arquivo);
  } catch (erro) {
    console.error(
      `[CLOUDINARY] Falha ao remover ${arquivo?.public_id || 'arquivo'}:`,
      erro.causa?.message || erro.message
    );
  }
}

module.exports = {
  TAMANHO_MAXIMO,
  cloudinaryConfigurado,
  validarImagem,
  enviarArquivo,
  registrarArquivo,
  removerArquivoBanco,
  excluirArquivoCloudinary,
  excluirArquivoCloudinaryComLog
};
