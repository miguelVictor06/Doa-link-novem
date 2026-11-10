# Resumo da Sessão - 2026-08-30

## Objetivo
Adicionar/validar banco de dados na tela de login para cadastro e login.

## Descoberta
O sistema de login/cadastro **já estava implementado e funcionando** — não era necessário criar nada de novo:
- Backend: `POST /api/auth/login` e `POST /api/auth/cadastrar` em `backend/src/routes/auth.js`, com tabela `usuario` no SQLite (`backend/doalink.db`)
- Frontend: formulário de login + cadastro em `login.component.html/.ts` e `services/auth.service.ts`
- Auth é prototype-grade (senha em texto puro, sessão via localStorage `usuario_doalink`) — conforme AGENTS.md

O problema real era a **falta de dependências do frontend** (`node_modules` não existia), que impedia subir o app para testar.

## Atividades

### 1. Instalação do frontend (pnpm)
- `node_modules` não existia; instalado com pnpm (npm install pendura nesta máquina, conforme AGENTS.md).
- O pnpm default (virtual store `.pnpm`) falhava com **`ERR_PNPM_EISDIR`** ao criar symlinks de diretório no Windows (tanto na 1ª quanto na 2ª tentativa).
- Solução aplicada: criado **`.npmrc` na raiz** com:
  ```
  node-linker=hoisted
  package-manager-strict=false
  ```
  O linker hoisted evita os symlinks problemáticos e resolve também o uso do esbuild/@parcel/watcher (binários opcionais ficam na raiz).
- Build scripts de `@parcel/watcher`, `esbuild`, `lmdb` e `msgpackr-extract` ficam **ignorados** pelo pnpm 10 — não impede o `ng serve`/`ng build`.
- IMPORTANTE: **não criar `pnpm-workspace.yaml`** para aprovar builds — ele transforma `backend/` (que tem package.json) em membro de workspace e faz o pnpm instalar as dependências do backend na raiz (quebrou o rebuild com EISDIR envolvendo `express` e `@modelcontextprotocol/sdk`).
- Criado `pnpm-lock.yaml` (ponto de restauração do estado instalado).

### 2. Validação do backend (contas seed mariana/joao/ana, senha `123456`)
| Fluxo | Resultado |
|---|---|
| Login válido (`mariana@email.com`) | 200 → retorna `{id_usuario, nome, email, endereco}` |
| Cadastro novo usuário | 201 → retorna usuário criado |
| Login do usuário recém-cadastrado | OK |
| Credenciais inválidas | 401 `Credenciais inválidas.` |
| Email duplicado | 409 `Email já cadastrado.` |
| Campos ausentes | 400 `Todos os campos são obrigatórios.` |

### 3. Validação do frontend
- `npm run build:css` (Tailwind v4) → OK
- `ng serve` (http://localhost:4200) → bundle gerado, Home e `/login` respondem 200
- CORS 4200 → 8080 para `POST /api/auth/login` → preflight 204 com `Access-Control-Allow-Origin: *`

## Arquivos alterados
- `.npmrc` (novo) — `node-linker=hoisted` + `package-manager-strict=false`
- `pnpm-lock.yaml` (novo)
- `package.json` — sem alterações finais (o campo `pnpm.onlyBuiltDependencies` foi tentado e revertido)

## Serviços ativos (rodando em background)
- Backend: PID 12848 — `node server.js` na 8080
- Frontend: `ng serve` na 4200 (proxy `/uploads` → 8080)

## Observações
- Um usuário de teste adicional foi criado durante a validação: `teste2@email.com` / `123456` (id 5), persistido em `backend/doalink.db`.
- Para resetar o banco, deletar `backend/doalink.db` e reiniciar o backend (seed recria as contas de teste).