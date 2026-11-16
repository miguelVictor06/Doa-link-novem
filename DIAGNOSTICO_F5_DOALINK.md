# DIAGNOSTICO_F5_DOALINK

**Data da análise:** 2026-11-16  
**Escopo:** diagnóstico estático do código + verificações HTTP na produção Render. **Nenhum arquivo de código/configuração foi alterado** (exceto criação deste relatório), nenhum commit/push, nenhuma alteração no Render ou banco.

## A. Estado atual
**NÃO CONCLUSIVO / indícios de que o fluxo de restauração está implementado corretamente no código, mas sem evidência de teste de navegador (F5/UI) para afirmar que está resolvido.**

- No código atual, a restauração de sessão no F5/refresh está prevista: `provideAppInitializer` chama `AuthService.restaurarSessao()` (`src/app/app.config.ts:14`), o `authGuard` aguarda restauração quando estado é `desconhecido` (`src/app/guards/auth.guard.ts:8-10`), e o app usa cookie HttpOnly + `withCredentials` (`credentials.interceptor.ts:13`, `backend/src/middleware/auth.js:21-37,53`).
- Em produção, verificou-se SPA rewrite e backend/cookie/auth endpoints respondendo corretamente via HTTP (ver seção D). Porém **não foi possível executar F5/fechar-abrir navegador com sessão real** neste ambiente CLI, então não há prova empírica de que o redirecionamento indevido não ocorra.

## B. Testes

| # | Cenário/rota testada | Resultado | Evidência / motivo |
|---|---|---|---|
| 1 | Login (conta real de teste `mariana@email.com`) | **APROVADO** (API/HTTP) | `POST https://doalink-backend-7q4s.onrender.com/api/auth/login` com `Origin: https://doa-link-novem.onrender.com` retornou `200` e `Set-Cookie: doalink_sessao=...; HttpOnly; Secure; SameSite=None; Path=/` + dados do usuário. (teste executado em 2026-11-16) |
| 2 | Acessar `/hub` e pressionar F5 | **NÃO EXECUTADO** | Não há navegador automatizado/UI disponível neste ambiente para simular F5 mantendo contexto de SPA e storage/cookies de forma equivalente ao usuário. |
| 3 | Acessar `/perfil` e pressionar F5 | **NÃO EXECUTADO** | Mesmo motivo do item 2. |
| 4 | Acessar `/postar` e pressionar F5 | **NÃO EXECUTADO** | Mesmo motivo do item 2. |
| 5 | Acessar `/mensagens?com=15` e pressionar F5 | **NÃO EXECUTADO** | Mesmo motivo do item 2; não foi validado em navegador se URL/query param é preservado no refresh. |
| 6 | Fechar e abrir novamente o navegador | **NÃO EXECUTADO** | Não é possível reproduzir ciclo de fechar/abrir navegador real neste ambiente. |
| 7 | Fazer logout e tentar acessar uma página privada | **APROVADO** (API/HTTP, parcial) | Com sessão de teste: `POST /api/auth/logout` retornou `204`; chamada subsequente a `GET /api/auth/me` retornou `401` (sessão não mais válida). Não foi testado em navegador o bloqueio/redirecionamento visual de rota privada após logout. |
| 8 (apoio) | Refresh de rota SPA na produção (`/hub`) | **APROVADO** (infra HTTP) | `GET https://doa-link-novem.onrender.com/hub` retornou `200` com HTML do app (`index.html`/SPA shell), indicando rewrite funcionando para rota interna. |
| 9 (apoio) | Recuperação de sessão via `/auth/me` com cookie | **APROVADO** (API/HTTP) | Após login, `GET /api/auth/me` com cookie de sessão retornou `200` com usuário autenticado (id 1, mariana). |
| 10 (apoio) | Acesso autenticado a endpoint privado | **APROVADO** (API/HTTP) | `GET /api/doacoes` com cookie de sessão retornou `200`. |

## C. Causa
- **Falha reproduzida:** nenhuma falha de F5 reproduzida com evidência neste diagnóstico (testes de navegador não executados).
- **Análise do fluxo (possíveis pontos sensíveis, sem evidência de falha atual):**
  - `src/app/app.config.ts:14`: restauração é disparada no bootstrap (`provideAppInitializer -> restaurarSessao()`), o que é o comportamento esperado para refresh.
  - `src/app/guards/auth.guard.ts:8-15`: se estado for `desconhecido`, aguarda `restaurarSessao()` e só permite acesso se `estaLogado()`; em erro de rede/timeout de `/auth/me`, `AuthService` pode manter estado `desconhecido` com `erroRestauracao` e o guard redireciona para `/login` com `sessao=indisponivel` (`auth.guard.ts:19-26`) — isso **não** interpreta sessão válida como encerrada, mas pode mandar para login em falha transitória de rede/servidor.
  - `src/app/services/auth.service.ts:46,90-118`: há cache de usuário em `localStorage` (`usuario_doalink`) para render inicial, porém a verdade da sessão é o cookie + `/auth/me`; em `401` limpa sessão e vira `anonimo` (correto). Em erro não-401, tenta revalidar em segundo plano (`124-155`) sem limpar sessão imediatamente.
  - `src/app/interceptors/credentials.interceptor.ts:13-21`: envia `withCredentials` em todas as requisições e, em `401` de rotas não-excluídas (`/auth/login,/auth/cadastrar,/auth/me,/auth/logout`), chama `expirarSessao` e redireciona para login — comportamento correto se sessão realmente expirou, mas agressivo se backend retornar 401 indevido.
  - `src/app/components/mensagens/mensagens.component.ts:326`: leitura de `queryParamMap` (`com`) é feita via `snapshot` em `selecionarContatoDoQueryParam()`; no fluxo normal de navegação/refresh do componente isso preserva o valor da URL carregada, mas não reage a mudanças posteriores de query param sem recarregar componente (não indica bug de F5 por si só).
  - `backend/src/middleware/auth.js:21-37`: cookie `SameSite=None; Secure` em requisição segura/cross-site (adequado para front/back em domínios Render diferentes) e `lax` sem HTTPS; limpeza de cookie usa mesmas opções base.

## D. Produção
- **Frontend publicado (Render):** `https://doa-link-novem.onrender.com`
  - `GET /hub` → `200` com HTML da SPA (rewrite para `index.html` efetivo) — **OK**.
  - `GET /config.js` → `200` com `window.__DOALINK_CONFIG__ = {"apiUrl":"https://doalink-backend-7q4s.onrender.com/api"}` (aponta para backend correto) — **OK**.
  - `Cache-Control` de `/config.js` definido como `no-cache` em `render.yaml` (configuração declarada) — não validado header em runtime além do conteúdo.
- **Backend publicado (Render):** `https://doalink-backend-7q4s.onrender.com`
  - `GET /api/health` → `200 {"status":"ok","banco":"ok"}` (na segunda tentativa; primeira tentativa expirou por timeout, possível cold start do serviço free) — **OK com ressalva de cold start/latência**.
  - `POST /api/auth/login` (Origin do frontend, conta real de teste) → `200` com `Set-Cookie` de sessão (`HttpOnly; Secure; SameSite=None`) — **OK**.
  - `GET /api/auth/me` com cookie da sessão → `200` com usuário — **OK** (recuperação de sessão funciona via HTTP).
  - `GET /api/doacoes` com cookie → `200` — **OK**.
  - `POST /api/auth/logout` → `204`; `GET /api/auth/me` após logout → `401` — **OK**.
- **CORS/origem/cookies (evidência HTTP):** login cross-origin aceito com `Origin` do frontend e cookie de sessão emitido com atributos compatíveis com cross-site (`SameSite=None; Secure`). Não foram observados erros de CORS nas chamadas HTTP realizadas.
- **Atualização de deploy front/back:** inferida como coerente com `render.yaml`/`public/config.js` esperado em produção (backend e apiUrl corretos respondendo), mas **não foi possível confirmar hashes/commits ativos no Render** sem acesso ao painel — **não comprovado diretamente**.
- **Conclusão de ambiente:** não há evidência de falha em produção nos endpoints/rewrites verificados; os testes críticos de F5 em navegador **não foram executados** (nem local, nem produção).

## E. Próxima correção
**Nenhuma correção implementada.** Com as evidências disponíveis, não há causa concreta de F5 reproduzida; portanto não há alteração específica justificada neste momento.

Se, em teste manual de navegador, o F5 ainda redirecionar para `/login`, investigar (nesta ordem) e então corrigir pontualmente:
1. **Reproduzir com DevTools (Network/Application):** confirmar se no refresh é enviado `Cookie: doalink_sessao` para `/api/auth/me`, status retornado (401/403/timeout/CORS), presença de `Set-Cookie` indevido e se `returnUrl`/URL é preservada.
2. **`backend/src/middleware/auth.js` / `backend/server.js` / ambiente Render:** se cookie não chegar, revisar domínio/path/secure/samesite reais, `trust proxy`, CORS/`credentials`, e configuração de domínio do cookie (`SESSION_COOKIE_DOMAIN`).
3. **`src/app/services/auth.service.ts` e `src/app/guards/auth.guard.ts`:** se `/auth/me` falhar por timeout/intermitência de cold start, avaliar UX/estratégia (ex.: manter usuário em estado autenticado via cache enquanto revalida, ou retry mais tolerante) sem interpretar falha transitória como logout — **apenas se reproduzido**.
4. **`src/app/interceptors/credentials.interceptor.ts`:** se houver 401 espúrio em requisições de bootstrap, ajustar regra de expiração automática conforme evidência.
5. **`render.yaml` / `public/config.js`:** se deploy desatualizado ou `apiUrl` incorreto no ambiente publicado, alinhar configuração de deploy (sem alterar código funcional desnecessariamente).

**Arquivos potencialmente envolvidos (dependendo da causa reproduzida):** `src/app/services/auth.service.ts`, `src/app/guards/auth.guard.ts`, `src/app/app.config.ts`, `src/app/interceptors/credentials.interceptor.ts`, `src/app/components/mensagens/mensagens.component.ts`, `backend/src/middleware/auth.js`, `backend/src/routes/auth.js`, `backend/server.js`, `render.yaml`, `public/config.js`.
