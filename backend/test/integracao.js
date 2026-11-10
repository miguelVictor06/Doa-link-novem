const assert = require('assert/strict');

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.TEST_PORT || '0';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:4200';

if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL antes de executar o teste de integração.');
  process.exit(1);
}

const { iniciar } = require('../server');
const { fechar } = require('../src/database');

const ORIGIN = process.env.CORS_ORIGINS.split(',')[0].trim();

async function requisicao(base, caminho, opcoes = {}) {
  const resposta = await fetch(`${base}${caminho}`, opcoes);
  const tipo = resposta.headers.get('content-type') || '';
  const corpo = tipo.includes('application/json')
    ? await resposta.json()
    : await resposta.text();

  return { resposta, corpo };
}

async function main() {
  const servidor = await iniciar();
  const porta = servidor.address().port;
  const base = `http://127.0.0.1:${porta}`;

  try {
    const health = await requisicao(base, '/api/health');
    assert.equal(health.resposta.status, 200);
    assert.equal(health.corpo.status, 'ok');

    const login = await requisicao(base, '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ email: 'mariana@email.com', senha: '123456' })
    });

    assert.equal(
      login.resposta.status,
      200,
      `Login falhou (${login.resposta.status}). O banco de teste está migrado? ${JSON.stringify(login.corpo)}`
    );

    const cookie = login.resposta.headers.getSetCookie()[0].split(';')[0];

    const me = await requisicao(base, '/api/auth/me', { headers: { cookie } });
    assert.equal(me.resposta.status, 200);
    assert.equal(typeof me.corpo.id_usuario, 'number');
    assert.equal(me.corpo.email, 'mariana@email.com');

    const doacoes = await requisicao(base, '/api/doacoes', { headers: { cookie } });
    assert.equal(doacoes.resposta.status, 200);
    assert.ok(Array.isArray(doacoes.corpo));

    const pedidos = await requisicao(base, '/api/pedidos', { headers: { cookie } });
    assert.equal(pedidos.resposta.status, 200);
    assert.ok(Array.isArray(pedidos.corpo));

    const mensagens = await requisicao(base, '/api/mensagens', { headers: { cookie } });
    assert.equal(mensagens.resposta.status, 200);
    assert.ok(Array.isArray(mensagens.corpo));

    const usuarios = await requisicao(base, '/api/usuarios', { headers: { cookie } });
    assert.equal(usuarios.resposta.status, 200);
    assert.ok(usuarios.corpo.every(usuario => !('senha' in usuario) && !('email' in usuario)));

    const atividades = await requisicao(base, '/api/atividades', { headers: { cookie } });
    assert.equal(atividades.resposta.status, 200);
    assert.ok(Array.isArray(atividades.corpo));

    const logout = await requisicao(base, '/api/auth/logout', {
      method: 'POST',
      headers: { origin: ORIGIN, cookie }
    });
    assert.equal(logout.resposta.status, 204);

    console.log('[OK] Teste de integração concluído.');
  } finally {
    await new Promise(resolver => servidor.close(resolver));
    await fechar();
  }
}

main().catch(erro => {
  console.error('[FALHA]', erro.stack || erro.message);
  process.exitCode = 1;
});
