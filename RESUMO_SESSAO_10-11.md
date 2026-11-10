# Resumo da Sessão — 10/11/2026

## Objetivo

Implementar o armazenamento de fotos do DoaLink no Cloudinary, mantendo o PostgreSQL/Neon apenas com
metadados, sem binários no banco e sem armazenamento local em produção. A integração foi implementada e
validada com Cloudinary e Neon reais; falta apenas validar o deploy no Render.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Provedor de imagens | Cloudinary, modalidade gratuita |
| Banco de produção | PostgreSQL/Neon |
| Fallback S3/BYTEA | Removido; Cloudinary é o único provedor de imagens |
| Dados no PostgreSQL | Apenas metadados: URL segura, `public_id`, provedor, tipo, usuário, nome, MIME, tamanho e data |
| Credenciais | Somente variáveis de ambiente; nunca no frontend ou no repositório |
| Imagens existentes | Devem ser preservadas e migradas para o Cloudinary |
| Exclusão/substituição | Sincronizar banco e Cloudinary; órfãos são preferíveis a referências quebradas |
| Conclusão | Não declarar concluído antes do teste real com Cloudinary/Neon |

## Arquivos criados

- `backend/migrations/003_arquivo_cloudinary.sql` — adiciona `url_segura`, `public_id`, `provedor`,
  `resource_type`, copia `url_externa` e cria índice único de `public_id`.
- `backend/migrations/004_arquivo_somente_metadados.sql` — cria constraints, remove `url_externa` e remove
  `conteudo` somente quando não há binários pendentes.
- `backend/scripts/migrar-arquivos-cloudinary.js` — migra binários `BYTEA` antigos para o Cloudinary, remove
  `conteudo` e valida as constraints.
- `backend/test/cloudinary.js` — teste real de upload, recuperação, reinício do backend, substituição e exclusão.
- `RESUMO_SESSAO_10-11.md` — este registro.

## Arquivos alterados

- `backend/src/services/arquivos.js` — reescrito para Cloudinary:
  - validação de buffer, MIME JPEG/PNG, magic bytes e limite de 5 MB;
  - upload via `upload_stream`;
  - `public_id` sem pasta duplicada; pasta configurada por `CLOUDINARY_FOLDER`;
  - inserção de metadados, remoção de registro e exclusão no Cloudinary.
- `backend/src/routes/doacoes.js` — upload no `POST`, substituição no `PUT` com limpeza após commit e exclusão
  sincronizada no `DELETE`.
- `backend/src/routes/arquivos.js` — `GET /api/arquivos/:id` redireciona para `url_segura`.
- `backend/src/middleware/errorHandler.js` — tratamento de falhas do Cloudinary com `502/503`.
- `backend/scripts/migrar-sqlite.js` — envia imagens de `backend/uploads` ao Cloudinary, grava apenas metadados,
  ignora não-imagens, limpa uploads em rollback e valida constraints.
- `backend/package.json` — scripts `migrar:arquivos` e `test:cloudinary`; dependência `cloudinary`; `multer`
  atualizado para `^2.5.0`.
- `backend/.env.example` — variáveis do Cloudinary e opção de servidor fake HTTPS para testes locais.
- `render.yaml` — Neon com `PGSSL=require`/`PGSSL_REJECT_UNAUTHORIZED=true` e variáveis Cloudinary.
- `README.md` e `AGENTS.md` — instruções de Cloudinary, migração, teste real e deploy.
- Lockfiles: `backend/package-lock.json`, `backend/pnpm-lock.yaml` e `package-lock.json` da raiz.

## Comportamento implementado

- Fotos são enviadas pelo backend; o frontend não recebe credenciais do Cloudinary.
- Formatos aceitos: JPEG e PNG.
- Limite: 5 MB.
- Validação por magic bytes, além do MIME declarado.
- O banco guarda `url_segura`, `public_id`, `provedor`, `resource_type` e metadados básicos.
- `GET /api/arquivos/:id` responde com redirect para a URL segura.
- Ao substituir uma foto, o registro antigo é removido após o commit e a imagem antiga é excluída do Cloudinary.
- Ao excluir uma doação, a imagem correspondente também é removida do Cloudinary.
- Falhas de limpeza no Cloudinary são registradas em log para não impedir a operação principal.
- Arquivos legados que não são imagens são ignorados com aviso; não são enviados ao Cloudinary.

## Migração dos dados existentes

- `backend/doalink.db` foi usado como fonte local; IDs preservados.
- Dados encontrados: 6 usuários, 5 doações, 1 pedido, 5 mensagens.
- `backend/uploads/1793038572846-134306808912541288.jpg` foi migrado para o Cloudinary.
- `backend/uploads/1787787990410-tmp.txt` foi ignorado por não ser imagem; a doação correspondente ficou sem foto.
- O backup automático do SQLite é criado em `backend/backups/`.
- `backend/doalink.db` está no `.gitignore`; a migração deve ser executada localmente apontando para o Neon.

## Testes executados

### Cloudinary fake com PostgreSQL embarcado

Harness local em `C:\Users\migue\AppData\Local\Temp\opencode\pgtest\cloudinary-test.mjs`, usando um servidor
HTTPS fake com certificado autoassinado.

Resultado: **passou**.

Cobriu:
- migração SQLite → PostgreSQL com upload de imagem;
- upload de nova doação;
- recuperação da imagem pela API;
- reinício do backend;
- substituição da foto;
- exclusão da doação e da imagem;
- contagem de uploads e exclusões no Cloudinary fake.

### Migração de `BYTEA` legado

Harness `legacy-test.mjs`, com uma linha antiga em `arquivo.conteudo`.

Resultado: **passou**.

Cobriu:
- upload do binário legado para o Cloudinary;
- preenchimento de `url_segura` e `public_id`;
- `resource_type = image`;
- remoção da coluna `conteudo`;
- validação das constraints.

### Cloudinary real

Teste direto com as credenciais reais do `backend/.env`, usando o serviço `src/services/arquivos.js`.

Resultado: **passou**.

Cobriu:
- upload real de PNG 1x1;
- `public_id` em `doalink/`;
- `provedor = cloudinary`;
- `resource_type = image`;
- exclusão da imagem após o teste.

Inicialmente o teste completo falhou com `Defina DATABASE_URL antes de executar o teste`, porque o
`backend/.env` tinha apenas as variáveis do Cloudinary. Depois da criação do projeto Neon e da configuração do
`DATABASE_URL`, o teste completo passou.

### Caminho sem coluna `conteudo`

Harness `no-column-test.mjs`, executado depois da migração SQLite → PostgreSQL, quando a coluna `conteudo`
já havia sido removida.

Resultado: **passou**.

Cobriu:
- execução de `scripts/migrar-arquivos-cloudinary.js` sem arquivos binários pendentes;
- chamada de `finalizar()` no early return;
- validação das constraints `arquivo_url_segura_check` e `arquivo_resource_type_check`.

### Cloudinary + Neon real

Projeto Neon criado pela CLI:

- Nome: `doalink`
- ID: `red-forest-91663366`
- Organização: `DoaLink` (`org-cool-morning-65926655`)
- Região: `aws-us-east-1`
- PostgreSQL: `18.6`
- Banco: `doalink`
- Role: `doalink_owner`

O `backend/.env` foi configurado com `DATABASE_URL`, `PGSSL=require` e
`PGSSL_REJECT_UNAUTHORIZED=true`. A conexão foi confirmada com `SELECT 1` antes da migração.

Resultados:

- `npm run migrate` — **passou**: schema 001–004 aplicado, backup SQLite criado, 6 usuários, 6 credenciais,
  1 arquivo, 5 doações, 1 pedido e 5 mensagens migrados. O TXT legado foi ignorado.
- `npm run migrar:arquivos` — **passou**: nenhum binário pendente; constraints validadas.
- `npm run test:integracao` — **passou** contra o Neon real.
- `npm run test:cloudinary` — **passou**: upload, recuperação, reinício do backend, substituição e exclusão.

Estado final verificado no Neon:

- 6 usuários;
- 5 doações em `item_doacao`;
- 1 arquivo, com `url_segura` e `public_id` preenchidos;
- `arquivo_url_segura_check` e `arquivo_resource_type_check` validadas (`convalidated = true`).

### Verificações estáticas

- `node --check` passou em todos os arquivos `.js` do backend.
- `pnpm audit --prod` não apontou vulnerabilidades conhecidas após a atualização do `multer`.

## Setup do agente para Neon

- Neon CLI `9.3.2` instalada globalmente com Node.js `24.19.0`.
- `neon login` concluído com a conta do usuário.
- `neon plugins` não lista `opencode` como agente suportado; foi usado o fallback de skills + MCP.
- `neon skills -y --global --agent opencode` falhou porque o Git não está instalado (`spawn git ENOENT`).
- Workaround: baixado o ZIP oficial de `neondatabase/agent-skills` e copiadas as 7 skills para
  `C:\Users\migue\.config\opencode\skills`.
- `neon mcp -y --agent opencode` instalou o MCP remoto `https://mcp.neon.tech/mcp` em
  `C:\Users\migue\.config\opencode\opencode.jsonc`, com API key account-wide. A chave não foi registrada
  neste resumo.
- É necessário reiniciar o opencode para carregar as skills e o MCP.
- `neon skills update` continuará indisponível enquanto o Git não for instalado.

## O que ainda não foi feito

- Não foi validado o deploy no Render.
- O harness antigo `integration.mjs` com PostgreSQL embarcado no Windows apresentou reset de conexão; ele é
  externo ao repositório e não substitui o teste real.

## Como continuar

1. Configurar as mesmas variáveis de `backend/.env` no Render:
   - `DATABASE_URL`
   - `PGSSL=require`
   - `PGSSL_REJECT_UNAUTHORIZED=true`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_FOLDER=doalink`
2. Fazer o deploy no Render.
3. Testar em produção: login, criação de doação com foto, recarga, substituição e exclusão.
4. Confirmar no Cloudinary Media Library que a imagem foi criada em `doalink` e removida após a exclusão.

## Retomada em 11/11/2026

### Estado ao encerrar

- Backend local já aponta para o Neon real e para o Cloudinary real.
- `backend/.env` existe, contém os segredos e está ignorado pelo `.gitignore`.
- Banco Neon `doalink` já está migrado e com os dados de seed.
- Upload, recuperação, reinício, substituição e exclusão de imagem já foram testados com sucesso.
- A única pendência funcional é o deploy no Render e o teste de fumaça em produção.

### Verificação rápida amanhã

```bash
cd backend
npm run test:integracao
npm run test:cloudinary
```

Não é necessário rodar `npm run migrate` novamente no ambiente local atual; o banco já está migrado. Se o
Render apontar para outro banco vazio, rode a migração antes do primeiro uso. O `test:cloudinary` cria e exclui
a própria doação de teste, então pode ser repetido.

### Rodar o app localmente

```bash
# terminal 1
cd backend
npm start

# terminal 2, na raiz do projeto
npm run build:css
npx ng serve
```

### Deploy no Render

Configurar no Render as mesmas variáveis do `backend/.env`:

```env
DATABASE_URL=...
PGSSL=require
PGSSL_REJECT_UNAUTHORIZED=true
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=doalink
```

Não definir `CLOUDINARY_UPLOAD_PREFIX` nem `NODE_TLS_REJECT_UNAUTHORIZED` no Render.

Depois do deploy, testar: login, criação de doação com foto, recarregar a página, substituir a foto e excluir
a doação. Conferir no Cloudinary Media Library a pasta `doalink`.

### Infraestrutura criada

- Neon: projeto `doalink`, ID `red-forest-91663366`, região `aws-us-east-1`, PostgreSQL 18.6.
- Cloudinary: pasta `doalink`.
- Backup SQLite: `backend/backups/doalink-2026-11-10T03-35-07-488Z.db`.
- Neon CLI: `9.3.2`; MCP em `C:\Users\migue\.config\opencode\opencode.jsonc`; skills em
  `C:\Users\migue\.config\opencode\skills`.
- Git continua ausente, então `neon skills update` não funciona até instalar o Git.
- O MCP do Neon usa uma API key account-wide; se necessário, revogar/rotacionar ou reinstalar com OAuth.

## Observações e gotchas

- `npm install` trava nesta máquina Windows; usar:
  `cmd /c "npx --yes pnpm@10 install --config.package-manager-strict=false"`.
- O SDK do Cloudinary rejeita `upload_prefix` HTTP; o servidor fake precisa ser HTTPS.
- Para o servidor fake autoassinado, usar `NODE_TLS_REJECT_UNAUTHORIZED=0` somente em teste local.
- Não definir `CLOUDINARY_UPLOAD_PREFIX` em produção.
- O `pg` emite um aviso sobre `sslmode=require`; a conexão com o Neon passou, mas o aviso continuará até
  migrar para `sslmode=verify-full` ou usar `uselibpqcompat=true`.
- O `backend/.env` contém segredos reais e está coberto pelo `.gitignore`; não commitá-lo.
- O projeto não é um repositório Git nesta máquina; nenhum commit foi feito.
- A integração Cloudinary/Neon foi validada localmente; falta apenas validar o deploy no Render.
