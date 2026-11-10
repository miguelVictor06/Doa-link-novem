const assert = require('assert/strict');

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.TEST_PORT || '0';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:4200';

const { iniciar } = require('../server');
const { consultar, fechar } = require('../src/database');

const ORIGIN = process.env.CORS_ORIGINS.split(',')[0].trim();
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=',
  'base64'
);

function exigirConfiguracao() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL antes de executar o teste.');
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Defina as credenciais do Cloudinary antes de executar o teste.');
  }
}

async function requisicao(base, caminho, opcoes = {}) {
  const resposta = await fetch(`${base}${caminho}`, opcoes);
  const tipo = resposta.headers.get('content-type') || '';
  const corpo = tipo.includes('application/json')
    ? await resposta.json()
    : await resposta.text();

  return { resposta, corpo };
}

async function login(base) {
  const { resposta, corpo } = await requisicao(base, '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ email: 'mariana@email.com', senha: '123456' })
  });

  assert.equal(resposta.status, 200, `Login falhou: ${JSON.stringify(corpo)}`);

  return resposta.headers.getSetCookie()[0].split(';')[0];
}

async function criarDoacao(base, cookie, titulo) {
  const formulario = new FormData();
  formulario.append('titulo', titulo);
  formulario.append('descricao', 'Doação criada pelo teste real do Cloudinary.');
  formulario.append('foto', new Blob([PNG], { type: 'image/png' }), 'teste.png');

  const { resposta, corpo } = await requisicao(base, '/api/doacoes', {
    method: 'POST',
    headers: { origin: ORIGIN, cookie },
    body: formulario
  });

  assert.equal(resposta.status, 201, `Criação falhou: ${JSON.stringify(corpo)}`);
  assert.equal(typeof corpo.id_arquivo, 'number');
  assert.ok(corpo.foto.includes(`/api/arquivos/${corpo.id_arquivo}`));

  return corpo;
}

async function buscarImagem(base, idArquivo) {
  const { resposta } = await requisicao(base, `/api/arquivos/${idArquivo}`, {
    redirect: 'manual'
  });

  return resposta;
}

async function main() {
  exigirConfiguracao();

  let servidor = await iniciar();
  let base = `http://127.0.0.1:${servidor.address().port}`;
  let cookie = await login(base);
  let doacao = await criarDoacao(base, cookie, `Teste Cloudinary ${Date.now()}`);
  const idDoacao = doacao.id_item;
  const primeiroArquivo = doacao.id_arquivo;

  try {
    const redirecionamento = await buscarImagem(base, primeiroArquivo);
    assert.equal(redirecionamento.status, 302);
    const urlCloudinary = redirecionamento.headers.get('location');
    assert.ok(urlCloudinary, 'A API não retornou a URL do Cloudinary.');

    const imagem = await fetch(urlCloudinary);
    assert.equal(imagem.status, 200);
    assert.equal(imagem.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await imagem.arrayBuffer());
    assert.equal(bytes.length, PNG.length);

    await new Promise(resolver => servidor.close(resolver));
    await fechar();

    servidor = await iniciar();
    base = `http://127.0.0.1:${servidor.address().port}`;

    const doacaoAposReinicio = await requisicao(base, `/api/doacoes/${idDoacao}`, {
      headers: { cookie }
    });
    assert.equal(doacaoAposReinicio.resposta.status, 200);
    assert.equal(doacaoAposReinicio.corpo.id_arquivo, primeiroArquivo);

    const imagemAposReinicio = await buscarImagem(base, primeiroArquivo);
    assert.equal(imagemAposReinicio.status, 302);

    const formulario = new FormData();
    formulario.append('titulo', doacao.titulo);
    formulario.append('descricao', doacao.descricao);
    formulario.append('foto', new Blob([PNG], { type: 'image/png' }), 'teste-2.png');

    const atualizacao = await requisicao(base, `/api/doacoes/${idDoacao}`, {
      method: 'PUT',
      headers: { origin: ORIGIN, cookie },
      body: formulario
    });

    assert.equal(atualizacao.resposta.status, 200, JSON.stringify(atualizacao.corpo));
    assert.notEqual(atualizacao.corpo.id_arquivo, primeiroArquivo);
    const segundoArquivo = atualizacao.corpo.id_arquivo;

    const arquivoAntigo = await buscarImagem(base, primeiroArquivo);
    assert.equal(arquivoAntigo.status, 404);

    const arquivoNovo = await buscarImagem(base, segundoArquivo);
    assert.equal(arquivoNovo.status, 302);

    const exclusao = await requisicao(base, `/api/doacoes/${idDoacao}`, {
      method: 'DELETE',
      headers: { origin: ORIGIN, cookie }
    });
    assert.equal(exclusao.resposta.status, 204);

    const arquivoExcluido = await buscarImagem(base, segundoArquivo);
    assert.equal(arquivoExcluido.status, 404);

    const restantes = await consultar(
      'SELECT COUNT(*)::int AS total FROM arquivo WHERE id_arquivo = ANY($1::bigint[])',
      [[primeiroArquivo, segundoArquivo]]
    );
    assert.equal(restantes.rows[0].total, 0);

    console.log('[OK] Upload, recuperação, reinício, substituição e exclusão no Cloudinary passaram.');
  } finally {
    try {
      await requisicao(base, `/api/doacoes/${idDoacao}`, {
        method: 'DELETE',
        headers: { origin: ORIGIN, cookie }
      });
    } catch {
      // A doação pode já ter sido excluída pelo fluxo principal.
    }

    await new Promise(resolver => servidor.close(resolver));
    await fechar();
  }
}

main().catch(erro => {
  console.error('[FALHA]', erro.stack || erro.message);
  process.exitCode = 1;
});
