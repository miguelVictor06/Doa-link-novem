# Relatório Técnico Completo — DoaLink

> **Levantamento:** 09/11/2026  
> **Escopo:** site inteiro (frontend Angular, backend Node/Express, banco SQLite, build, telas, fluxos, regras e pendências)  
> **Objetivo deste documento:** servir de contexto completo para outra IA (por exemplo, ChatGPT) entender o projeto e ajudar a conduzir conversas, revisões, correções e melhorias com precisão.  
> **Importante:** este relatório foi escrito a partir do **código que está no repositório**, não apenas da documentação antiga. Quando documento e código divergem, o relatório aponta a divergência e considera o código como fonte da verdade.

---

## 1. Visão geral do produto

O **DoaLink** é um protótipo de plataforma web com formato de marketplace, mas **sem nenhuma transação financeira**. O propósito é conectar:

- pessoas ou instituições que querem **doar itens**;
- pessoas ou instituições que **precisam receber** esses itens;
- pessoas que querem **ajudar financeiramente? Não.** O sistema não tem preço, carrinho, pagamento, frete pago ou comissão. O foco é economia circular e solidariedade.

O produto tem duas grandes áreas:

1. **Vitrine de doações** (`/hub`, `/pesquisar`, `/doacoes/:id`, `/postar`): itens disponíveis, detalhes, contato e solicitação.
2. **Mural de pedidos de necessidade** (`/pedidos`, `/pedidos/criar`): instituições/famílias publicam necessidades e doadores registram ajuda.

Além disso, existe um **chat interno** (`/mensagens`), uma **área de perfil/histórico** (`/perfil`) e uma página institucional **Sobre** (`/sobre`).

O projeto é claramente um **protótipo acadêmico/experimental**:
- autenticação simplificada (senha em texto puro, sessão em `localStorage`);
- sem tokens, sem JWT, sem controle de permissão no servidor;
- sem testes automatizados;
- banco local em arquivo SQLite;
- algumas telas e funcionalidades ainda são placeholders.

---

## 2. Stack tecnológica

### 2.1 Frontend

| Item | Versão / escolha | Observações |
|---|---|---|
| Framework | **Angular 21.1** | Componentes standalone, sem NgModules |
| Linguagem | **TypeScript 5.9** | `strict: true`, `strictTemplates: true` |
| Reatividade | **Signals + computed** | Usado em quase todos os componentes |
| Formulários | **Reactive Forms** | `FormBuilder`, `Validators` |
| HTTP | **HttpClient** | `provideHttpClient()` no `app.config.ts` |
| Roteamento | **Angular Router** | Rotas lazy-loaded com `loadComponent` |
| Estilo | **Tailwind CSS 4.3** | Tema Material Design 3 via `@theme` |
| Ícones | **Material Symbols Outlined** | Carregados por CDN no `src/index.html` |
| Fontes | **Inter** e **Plus Jakarta Sans** | Google Fonts no `src/index.html` |
| Testes | **Vitest** configurado | Não há arquivos de teste; schematics com `skipTests: true` |
| Deploy | **angular-cli-ghpages** | Builder `deploy` configurado no `angular.json` |

O frontend é uma **SPA** servida em `http://localhost:4200` durante o desenvolvimento.

### 2.2 Backend

| Item | Versão / escolha | Observações |
|---|---|---|
| Runtime | **Node.js** | CommonJS (`require`/`module.exports`) |
| Framework HTTP | **Express 4.21** | Sem TypeScript |
| Banco | **better-sqlite3 13** | SQLite em arquivo, WAL ativado |
| Upload | **Multer 1.4** | Upload de imagem em `multipart/form-data` |
| CORS | **cors 2.8** | Liberado para qualquer origem (`cors()`) |
| Porta | **8080** | `PORTA` pode ser alterada por variável de ambiente |
| Driver de banco | **`DB_DRIVER`** | Apenas `sqlite` implementado; MySQL é stub |

O backend expõe uma **API REST** em `http://localhost:8080/api`.

### 2.3 Banco de dados

- **SQLite** em arquivo: `backend/doalink.db`.
- Modo **WAL** (`journal_mode = WAL`), com arquivos auxiliares `doalink.db-wal` e `doalink.db-shm`.
- Chaves estrangeiras ativadas (`foreign_keys = ON`).
- O schema **não é lido de `schema.sql`**: ele é criado em código dentro de `backend/server.js`, na inicialização.
- O seed é idempotente por tabela:
  - `semear()` insere usuários e doações apenas se a tabela `usuario` estiver vazia;
  - `semearPedidos()` insere pedidos apenas se a tabela `pedido_necessidade` estiver vazia.

> **Atenção:** o `AGENTS.md` e alguns resumos antigos mencionam `sql.js` em memória com flush a cada 5 s. O código atual usa **better-sqlite3 em arquivo**, com persistência imediata e WAL. Para resetar, apague `backend/doalink.db`, `backend/doalink.db-wal` e `backend/doalink.db-shm` e reinicie o backend.

### 2.4 Build e ferramentas

- **Tailwind CLI** compila `src/styles.css` para `src/styles.generated.css`.
- O `angular.json` referencia **somente** `src/styles.generated.css`.
- Portanto, **`npm run build:css` é obrigatório antes de `ng serve`/`ng build`** quando o CSS mudar.
- Nunca editar `src/styles.generated.css` manualmente: é artefato de build.
- O `package.json` declara `"packageManager": "npm@11.6.2"`, mas nesta máquina o `npm install` trava. A instalação usada é via pnpm.

---

## 3. Estrutura de diretórios

```text
DoaLink/
├── AGENTS.md                     # instruções para agentes de IA
├── angular.json                  # config do build Angular
├── package.json                  # scripts e dependências do frontend
├── pnpm-lock.yaml                # lockfile do frontend
├── proxy.conf.json               # proxy de /uploads -> 8080
├── tsconfig.json                 # TypeScript strict
├── src/
│   ├── index.html                # shell do SPA + fontes/ícones
│   ├── main.ts                   # bootstrap do Angular
│   ├── styles.css                # Tailwind + tokens MD3
│   ├── styles.generated.css      # artefato gerado (não editar)
│   └── app/
│       ├── app.ts                # componente raiz
│       ├── app.html              # sidebar + router-outlet
│       ├── app.config.ts         # providers globais
│       ├── app.routes.ts         # rotas lazy + authGuard
│       ├── components/
│       │   ├── login/            # login + cadastro
│       │   ├── hub/              # vitrine de doações
│       │   ├── detalhes-doacao/  # detalhes de um item
│       │   ├── pesquisar/        # busca client-side
│       │   ├── postar-doacao/    # formulário de nova doação
│       │   ├── pedidos/          # mural de pedidos
│       │   ├── criacao-pedido/   # formulário de pedido
│       │   ├── perfil/           # perfil + histórico
│       │   ├── mensagens/        # chat
│       │   ├── sidebar/          # navegação responsiva
│       │   └── sobre/            # página institucional
│       ├── guards/
│       │   └── auth.guard.ts     # só verifica presença de sessão
│       ├── models/               # interfaces TypeScript
│       ├── services/             # chamadas HTTP
│       └── utils/
│           └── cpf-validator.ts  # validação de CPF (módulo 11)
├── backend/
│   ├── server.js                 # bootstrap, schema, rotas
│   ├── package.json              # dependências do backend
│   ├── doalink.db                # banco SQLite
│   ├── uploads/                  # imagens enviadas
│   └── src/
│       ├── database/
│       │   ├── index.js          # fachada do driver
│       │   ├── sqlite.js         # conexão better-sqlite3
│       │   └── mysql.js          # stub não implementado
│       ├── routes/
│       │   ├── auth.js           # login/cadastro
│       │   ├── doacoes.js        # CRUD + upload + solicitar
│       │   ├── pedidos.js        # CRUD + atender
│       │   ├── usuarios.js       # lista, detalhe, histórico
│       │   └── mensagens.js      # chat
│       ├── middleware/
│       │   └── errorHandler.js   # tratamento central de erros
│       ├── seed.js               # dados iniciais
│       └── dominio-pedido.js     # enums e validadores de pedido
├── public/
│   └── favicon.ico
├── dist/                         # saída de build
├── obsidian opencode/            # documentação de design e regras
├── RESUMO_SESSAO*.md             # histórico de sessões
└── *.html / *.js                 # protótipos legados (código morto)
```

### 3.1 Arquivos legados que NÃO fazem parte do SPA

Na raiz existem protótipos estáticos antigos:

- `index.html`, `login.html`, `perfil.html`, `posts.html`, `posts.js`, `sobre.html`, `index.js`;
- `criacaopedido.html`, `pagnecessidades.html`, `produto.html`.

Eles são da época em que o Tailwind era carregado por CDN e **não são usados pelo Angular**. O shell real é `src/index.html`. Não editar esses arquivos por engano.

---

## 4. Arquitetura e fluxo de execução

### 4.1 Bootstrap do frontend

1. O navegador carrega `src/index.html`.
2. `src/main.ts` executa `bootstrapApplication(App, appConfig)`.
3. `appConfig` registra:
   - `provideBrowserGlobalErrorListeners()`;
   - `provideRouter(routes)`;
   - `provideHttpClient()`.
4. `App` renderiza:
   - `<app-sidebar />`;
   - `<router-outlet />` dentro de um container com `lg:pl-20`.

### 4.2 Navegação e proteção

- A rota vazia redireciona para `/login`.
- Quase todas as rotas usam `authGuard`.
- `authGuard` só verifica `authService.estaLogado()`; se falso, redireciona para `/login`.
- `estaLogado` é um `computed` que verifica se o signal de usuário não é `null`.
- A sessão é restaurada do `localStorage` no construtor do `AuthService`.
- **Não há validação de token no backend.** Qualquer pessoa com um JSON no `localStorage` é considerada logada pelo frontend.

### 4.3 Comunicação com a API

- Cada service declara `private readonly API_URL = 'http://localhost:8080/api'`.
- As chamadas vão direto para a porta 8080; o CORS do backend está aberto.
- O `proxy.conf.json` só redireciona `/uploads` da porta 4200 para 8080; ele **não** faz proxy de `/api`.
- Não há `environment.ts`, interceptor, retry, tratamento global de erro HTTP ou base URL configurável.

### 4.4 Backend

Fluxo de uma requisição:

```text
HTTP request
  -> Express
  -> cors()
  -> express.json()
  -> /uploads (estático)
  -> rota específica (/api/auth, /api/doacoes, /api/pedidos, /api/usuarios, /api/mensagens)
  -> better-sqlite3 (prepare/run/get/all)
  -> resposta JSON
  -> errorHandler em caso de exceção
```

O backend não usa ORM, migrations, validação de schema, autenticação de rota, logs estruturados nem variáveis de ambiente além de `PORTA` e `DB_DRIVER`.

---

## 5. Rotas do frontend

| Rota | Componente | Guard | Finalidade |
|---|---|---|---|
| `''` | redireciona | — | Vai para `/login` |
| `/login` | `LoginComponent` | Não | Login e cadastro |
| `/hub` | `HubComponent` | Sim | Vitrine de doações disponíveis |
| `/doacoes/:id` | `DetalhesDoacaoComponent` | Sim | Detalhes de uma doação |
| `/pesquisar` | `PesquisarComponent` | Sim | Busca por título/descrição |
| `/pedidos/criar` | `CriacaoPedidoComponent` | Sim | Formulário de pedido |
| `/pedidos` | `PedidosComponent` | Sim | Mural de pedidos |
| `/perfil` | `PerfilComponent` | Sim | Perfil e histórico |
| `/postar` | `PostarDoacaoComponent` | Sim | Cadastro de doação |
| `/mensagens` | `MensagensComponent` | Sim | Chat |
| `/sobre` | `SobreComponent` | Não | Página institucional |
| `**` | redireciona | — | Vai para `/login` |

---

## 6. Frontend em detalhe

### 6.1 `App` e shell

- `App` é o componente raiz, com `title = 'DoaLink'`.
- `app.html` monta a sidebar e o `router-outlet`.
- A sidebar fica visível apenas quando o usuário está logado e não está em `/login`.
- Em telas grandes, a sidebar é fixa, recolhida (`w-20`) e expande no hover (`w-72`).
- Em telas pequenas, vira uma barra superior + gaveta lateral.

### 6.2 `SidebarComponent`

Arquivo: `src/app/components/sidebar/sidebar.component.ts`.

Itens de navegação:

| Rota | Rótulo | Ícone | `exact` |
|---|---|---|---|
| `/hub` | Doações | `storefront` | Sim |
| `/pedidos` | Pedidos | `volunteer_activism` | Sim |
| `/pedidos/criar` | Criar Pedido | `note_add` | Sim |
| `/pesquisar` | Pesquisar | `search` | Sim |
| `/postar` | Postar Doação | `add_box` | Não |
| `/mensagens` | Mensagens | `chat` | Não |
| `/perfil` | Meu Perfil | `account_circle` | Não |
| `/sobre` | Sobre o Site | `info` | Não |

Responsabilidades:
- controlar `expandido` e `menuAberto`;
- observar `NavigationEnd` para atualizar a URL atual, fechar o menu e recalcular mensagens não lidas;
- exibir badge de não lidas em `/mensagens`;
- exibir nome/e-mail do usuário e botão de logout;
- `logout()` limpa o signal, remove `usuario_doalink` do `localStorage` e navega para `/login`.

Limitação: o badge de não lidas é atualizado **na navegação**, não em tempo real. Não há polling, WebSocket ou SSE.

### 6.3 `LoginComponent`

Arquivo: `src/app/components/login/login.component.ts` e `.html`.

Tela:
- layout editorial em duas colunas;
- coluna esquerda: login;
- coluna direita: cadastro;
- header e footer com links de navegação (a maioria é `href="#"`, ou seja, sem destino real).

**Login:**
- campos `email` e `senha`;
- validações: `required`, `email`, `minLength(6)`;
- envia `POST /api/auth/login`;
- em sucesso, salva sessão e navega para `/hub`;
- em erro, mostra mensagem genérica.

**Cadastro:**
- tipo de conta: `Pessoal` ou `Instituicao`;
- se `Pessoal`: campo CPF (validado por `validarCPF`, módulo 11);
- se `Instituicao`: campo CNPJ (validação de 14 dígitos + dígitos verificadores);
- nome, e-mail, senha, confirmar senha, endereço;
- checkbox de termos (marcado por padrão, sem validação);
- envia `POST /api/auth/cadastrar`;
- em sucesso, salva sessão e navega para `/hub`.

Observações importantes:
- **Confirmar senha não é validado** contra a senha principal (`login.component.ts:118-128`).
- **CPF não é enviado ao backend** (`extrairDadosCadastro`, `login.component.ts:180-191`). O backend não tem coluna `cpf`.
- **Checkbox de termos não está vinculado ao formulário** e não bloqueia o cadastro.
- O CNPJ é validado no frontend, mas o backend só verifica presença e duplicidade, não os dígitos verificadores.
- O backend retorna o usuário sem senha e o frontend o salva automaticamente como sessão.

### 6.4 `HubComponent`

Arquivo: `src/app/components/hub/hub.component.ts` e `.html`.

Tela:
- cabeçalho “Itens Recentes”;
- grid responsivo de 1 a 4 colunas;
- cards com foto (ou placeholder “Sem imagem”), badge “Disponível”, título, descrição e botão “Solicitar”;
- clique no card abre `/doacoes/:id`;
- botão “Solicitar” usa `$event.stopPropagation()`;
- estados de loading (skeleton) e erro;
- estado vazio;
- footer.

Fluxo:
- `ngOnInit()` chama `buscarDoacoesDisponiveis()`;
- `solicitarItem(id)` pega o id do usuário logado e chama `PUT /api/doacoes/:id/solicitar`;
- em sucesso, remove o item da lista local e mostra `alert()`;
- em erro, mostra mensagem genérica.

Limitação importante:
- O método `filtrarItensProprios()` existe, mas está **comentado** no fluxo (`hub.component.ts:59`). O hub exibe doações do próprio usuário e permite clicar em “Solicitar”; o backend responde 400, mas a UI mostra erro genérico.
- O componente `Pesquisar` já filtra os itens próprios; o Hub não. Isso é inconsistente.

### 6.5 `DetalhesDoacaoComponent`

Arquivo: `src/app/components/detalhes-doacao/detalhes-doacao.component.ts` e `.html`.

Tela em split-view:
- coluna esquerda: foto grande, selo “DOAÇÃO 100% GRATUITA”, botão de ampliar, banner de economia circular;
- coluna direita: condição, status, título, “Grátis”, data de publicação, botão “Entrar em Contato com o Doador”, telefone com botão copiar, caixa de mensagem rápida, informações do doador, local de retirada e descrição.

Fluxo:
- lê `:id` da rota;
- chama `GET /api/doacoes/:id`;
- “Entrar em contato” navega para `/mensagens?com=<id_doador>`;
- “Enviar mensagem rápida” também navega para o chat (não envia automaticamente);
- “Copiar” usa `navigator.clipboard.writeText`;
- “Ampliar” abre a foto em nova aba.

Observações:
- A página **não tem botão “Solicitar”**; a solicitação acontece no Hub/Pesquisar.
- `formatarCondicao()` mapeia `novo`, `factorynew`, `bom`, `usado`, `regular`. O formulário de doação envia `marcas`, que não está no mapa; nesse caso o texto cru “marcas” aparece.
- O local de retirada é o `endereco_doador` (cidade/UF), não um endereço completo.

### 6.6 `PesquisarComponent`

Arquivo: `src/app/components/pesquisar/pesquisar.component.ts` e `.html`.

Tela:
- campo de busca fixo no topo;
- filtro client-side por título ou descrição;
- contador de resultados;
- grid de cards;
- estado vazio;
- skeleton.

Fluxo:
- carrega todas as doações disponíveis;
- filtra itens do próprio usuário;
- `resultados` é um `computed` que aplica o termo;
- “Solicitar” chama o mesmo endpoint do Hub e remove o item da lista.

Limitação:
- O card de resultado **não exibe a foto** mesmo quando `doacao.foto` existe; o template sempre mostra o placeholder “Sem imagem” (`pesquisar.component.html:65-69`).
- A busca é somente no cliente; não há endpoint de busca no backend.

### 6.7 `PostarDoacaoComponent`

Arquivo: `src/app/components/postar-doacao/postar-doacao.component.ts` e `.html`.

Tela:
- upload de foto por clique ou drag-and-drop, com preview;
- validação de tipo (`image/jpeg` ou `image/png`) e tamanho (5 MB);
- campos: título (`itemName`), condição (`condition`), telefone (`phone`), descrição (`description`);
- botões “Cancelar” e “Publicar Doação”.

Fluxo:
- monta `FormData` com `titulo`, `descricao`, `condicao`, `telefone`, `foto` e `id_doador`;
- envia `POST /api/doacoes` como `multipart/form-data`;
- em sucesso, navega para `/hub`.

Observações:
- O backend espera exatamente esse formato; o antigo bug de enviar JSON foi corrigido.
- O formulário **não implementa edição**. `PerfilComponent.editarDoacao()` navega para `/postar?editId=...`, mas `PostarDoacaoComponent.ngOnInit()` está vazio e ignora o `editId`.
- As opções de condição são `factorynew`, `novo`, `bom`, `marcas`; o detalhe não mapeia `marcas`.

### 6.8 `PedidosComponent`

Arquivo: `src/app/components/pedidos/pedidos.component.ts` e `.html`.

Tela:
- hero com propósito, três métricas (pedidos abertos, itens atendidos, percentual geral) e CTA “Criar Pedido”;
- filtros por categoria (pills) e ordenação;
- grid de cards de pedidos;
- modal de detalhes;
- seção “Como funciona” com três passos;
- footer.

Dados:
- `listarPedidos()` carrega todos os pedidos;
- `pedidosVisiveis` aplica filtro de categoria e ordenação;
- métricas são `computed` sobre a lista.

Ordenação:
- `relevancia`: peso de urgência (`Alta=3`, `Média=2`, `Baixa=1`) vezes 10 + percentual atendido;
- `urgencia`: urgência decrescente e, em empate, data mais recente;
- `proximidade`: compara a UF do pedido com a UF extraída do `endereco` do usuário logado.

Ações:
- “Ajudar neste Pedido” chama `PUT /api/pedidos/:id/atender` com `id_ajudante`;
- “Ver Detalhes” abre modal;
- “Falar com quem pediu” navega para `/mensagens?com=<id_solicitante>`;
- pedidos do próprio usuário mostram “Pedido publicado por você” no lugar de “Ver Detalhes”;
- pedidos concluídos têm o botão “Ajudar” desabilitado.

Observações:
- O backend aceita `quantidade` no corpo de `/atender`, mas o frontend **não envia**; cada ajuda vale 1 por padrão.
- Não há registro de **quem** ajudou; apenas o contador `quantidade_atendida` é incrementado.
- O modal mostra telefone e nome do solicitante.

### 6.9 `CriacaoPedidoComponent`

Arquivo: `src/app/components/criacao-pedido/criacao-pedido.component.ts` e `.html`.

Tela:
- breadcrumb “Voltar ao Mural de Pedidos”;
- selo “Publicação Direta • 100% Solidária”;
- formulário com título, categoria, urgência, descrição (limite 800, contador em tempo real), cidade/UF, telefone e quantidade;
- cards de “Compromisso Solidário” e “Segurança/Moderação”;
- footer.

Fluxo:
- categoria pode vir por query param `?categoria=`;
- ao publicar, envia `POST /api/pedidos`;
- em sucesso, navega para `/pedidos?publicado=1`;
- em erro, exibe `erro.error.erro` quando disponível.

Observações:
- O campo `cidade` é único; o backend separa a UF via regex.
- `estado` é enviado como string vazia; o backend preenche a partir da cidade.
- `id_solicitante` vem do usuário logado.

### 6.10 `PerfilComponent`

Arquivo: `src/app/components/perfil/perfil.component.ts` e `.html`.

Tela:
- cabeçalho com avatar padrão (ícone `person`), nome, endereço e e-mail;
- botão “Edit Profile” (em inglês) que apenas mostra um `alert` dizendo que a edição não está disponível;
- seção “Minhas Doações” com grid de cards;
- cada card mostra foto/placeholder, status (“Ativo”/“Inativo”), título, descrição e botões de editar/excluir;
- footer com textos em inglês e copyright 2024.

Fluxo:
- pega o usuário do `AuthService`;
- chama `GET /api/usuarios/:id/historico`;
- editar navega para `/postar?editId=<id>`;
- excluir chama `DELETE /api/doacoes/:id` e remove da lista local.

Observações:
- O endpoint de histórico retorna itens em que o usuário é **doador ou receptor**. A tela chama isso de “Minhas Doações”, então doações recebidas também aparecem.
- A edição de doação não funciona (não há carregamento do item no formulário).
- Não há upload de foto de perfil; a tabela `usuario` não tem coluna de foto.
- A exclusão não pede confirmação.

### 6.11 `MensagensComponent`

Arquivo: `src/app/components/mensagens/mensagens.component.ts` e `.html`.

Tela:
- lista de contatos/conversas à esquerda;
- painel de chat à direita;
- em telas pequenas, a lista e o chat se alternam;
- busca? Não há busca de contato; a lista mostra todos os usuários, exceto o próprio;
- mensagens não lidas com badge;
- campo de texto e botão “Enviar”;
- `Enter` envia.

Fluxo:
- `forkJoin` carrega usuários e mensagens do usuário logado;
- `conversas` é um `computed` que agrupa mensagens por contato e ordena pela última mensagem;
- ao selecionar uma conversa com não lidas, chama `PUT /api/mensagens/lidas`;
- ao enviar, chama `POST /api/mensagens` e adiciona a mensagem localmente;
- query param `?com=<id>` abre a conversa correspondente.

Observações:
- `GET /api/mensagens/:idUsuario` retorna **todas** as mensagens enviadas ou recebidas pelo usuário, não uma conversa específica. O frontend filtra.
- Não há paginação, polling, WebSocket ou atualização em tempo real.
- Não há indicador de “digitando”, anexos, exclusão ou edição de mensagem.
- O chat é 1:1, sem grupo.

### 6.12 `SobreComponent`

Arquivo: `src/app/components/sobre/sobre.component.ts` e `.html`.

Tela estática com:
- título “Nosso Compromisso com a Solidariedade e a Ética”;
- seções “Atuação Focada em Instituições”, “Garantia de Propósito” e “Como Receber uma Doação”;
- footer.

**Divergência importante:** o texto afirma que as doações podem ser adquiridas **exclusivamente por instituições beneficentes validadas**. O código não implementa essa restrição: qualquer usuário `Pessoal` pode solicitar doações. O campo `tipo` existe no usuário, mas não é usado para bloquear nada.

### 6.13 Services

| Service | Arquivo | Métodos principais |
|---|---|---|
| `AuthService` | `src/app/services/auth.service.ts` | `login`, `cadastrar`, `logout`, `obterUsuarioLogado`, `obterIdUsuario`, signals `estaLogado` e `usuarioLogado` |
| `DoacaoService` | `src/app/services/doacao.service.ts` | `buscarDoacoesDisponiveis`, `buscarDoacaoPorId`, `cadastrarDoacaoFormData`, `solicitarItem`, `excluirDoacao`, `buscarHistoricoUsuario` |
| `PedidoService` | `src/app/services/pedido.service.ts` | `listarPedidos`, `buscarPedidoPorId`, `cadastrarPedido`, `atualizarPedido`, `ajudarNoPedido`, `excluirPedido` |
| `MensagemService` | `src/app/services/mensagem.service.ts` | `listarUsuarios`, `buscarMensagens`, `enviarMensagem`, `marcarConversaComoLida`, `recalcularNaoLidas`, signal `naoLidas` |

Todos usam `HttpClient` e a mesma URL base hardcoded.

### 6.14 Models

| Model | Conteúdo |
|---|---|
| `Usuario` | `id_usuario`, `nome`, `email`, `senha`, `endereco`, `tipo`, `cnpj?` |
| `LoginPayload` | `email`, `senha` |
| `CadastroPayload` | `nome`, `email`, `senha`, `endereco`, `tipo`, `cnpj?` |
| `ItemDoacao` | `id_item`, `titulo`, `descricao`, `foto`, `condicao`, `telefone`, `status`, `id_doador`, `id_receptor`, `nome_doador`, `endereco_doador`, `criado_em` |
| `PedidoNecessidade` | `id_pedido`, `titulo`, `categoria`, `urgencia`, `cidade`, `estado`, `descricao`, `telefone`, `quantidade`, `quantidade_atendida`, `status`, `id_solicitante`, `nome_solicitante`, `tipo_solicitante`, `criado_em` |
| `PedidoPayload` | campos de criação |
| `Mensagem` | `id_mensagem`, `id_remetente`, `id_destinatario`, `texto`, `lida`, `criado_em` |
| `UsuarioContato` | `id_usuario`, `nome`, `endereco` |

Observação: `Usuario.senha` é obrigatório no tipo, mas o backend nunca devolve a senha em login/cadastro. Em tempo de execução isso não quebra, mas o tipo está impreciso.

### 6.15 Design system e Tailwind

`src/styles.css` define tokens Material Design 3 em `@theme`:

- cores: `primary`, `secondary`, `tertiary`, `surface`, `error`, `outline`, `on-*`, containers etc.;
- fontes: `--font-headline-*`, `--font-label-*`, `--font-body-*`, `--font-display-lg`;
- utilitários `.material-symbols-outlined` e `.line-clamp-2`.

**Problema sistêmico de tipografia:** os templates usam classes como `text-headline-lg`, `text-body-md`, `text-label-md`, `text-label-sm`, `text-display-lg`, mas o `@theme` só define `--font-*`, não `--text-*`. O CSS gerado contém `font-headline-lg` e `font-display-lg`, porém **não contém** `text-headline-lg`, `text-body-md` etc. Ou seja, a família da fonte é aplicada, mas o tamanho definido pelo design system não é.

**Problema específico da tela de login/Sobre/Postar:** essas telas usam tokens que não existem no tema:

- `border-border`, `border-border-subtle`;
- `text-text-muted`, `text-text-subtle`;
- `bg-primary-subtle`, `bg-primary-hover`, `bg-surface-muted`;
- `px-margin-mobile`, `md:px-margin-desktop`, `px-margin-desktop`;
- `gap-sm`, `gap-gutter`;
- `space-y-xl`, `py-xl`;
- `max-w-container-max-width`.

Essas classes não aparecem no `styles.generated.css`, então não geram estilo. A tela de login e a página Sobre são as mais afetadas.

### 6.16 Validações no frontend

- Login: e-mail válido, senha mínima de 6 caracteres.
- Cadastro: nome/e-mail/senha/endereço obrigatórios; senha mínima de 6; CPF válido (Pessoa Física); CNPJ válido (Instituição).
- Postar doação: título, condição, telefone (mínimo 10), descrição obrigatórios; foto JPEG/PNG até 5 MB.
- Criar pedido: título (máx. 120), categoria, urgência, cidade, quantidade mínima 1, descrição (máx. 800), telefone (mínimo 10).
- Não há validação de CPF/CNPJ no backend; o backend só valida presença/duplicidade de CNPJ.

---

## 7. Backend em detalhe

### 7.1 `server.js`

Responsabilidades:
- cria o app Express;
- configura `cors()` e `express.json()`;
- garante a pasta `backend/uploads` e a serve em `/uploads`;
- inicializa o banco com `db.iniciar(DRIVER)`;
- executa o schema `CREATE TABLE IF NOT EXISTS` para `usuario`, `item_doacao`, `pedido_necessidade` e `mensagem`;
- executa `semear()` e `semearPedidos()`;
- aplica migrações simples para adicionar `tipo` e `cnpj` em bancos antigos;
- registra as rotas;
- registra o middleware de erro;
- sobe na porta 8080.

### 7.2 Middleware de erro

`backend/src/middleware/errorHandler.js`:
- loga `[ERRO] MÉTODO URL: mensagem`;
- se `erro.code === 'SQLITE_CONSTRAINT'`, responde 409 com “Violação de restrição no banco de dados.”;
- caso contrário, responde 500 com “Erro interno do servidor.”.

Não há distinção de erros de validação, autorização, recurso inexistente etc. fora do que cada rota trata explicitamente.

### 7.3 Endpoints

#### Autenticação — `/api/auth`

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/login` | `{ email, senha }` | 200 com usuário sem senha | 400 campos faltando; 401 credenciais inválidas |
| `POST` | `/cadastrar` | `{ nome, email, senha, endereco, tipo?, cnpj? }` | 201 com usuário sem senha | 400 campos faltando; 400 CNPJ obrigatório para Instituição; 409 e-mail já cadastrado; 409 CNPJ já cadastrado |

Regras:
- `tipo` é normalizado para `Instituicao` ou `Pessoal`.
- CNPJ é obrigatório para `Instituicao`.
- A senha é gravada em texto puro.
- O cadastro já retorna o usuário e o frontend o considera logado.

#### Doações — `/api/doacoes`

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| `GET` | `/` | — | 200 lista de itens com status `Disponivel` | 500 |
| `GET` | `/:id` | — | 200 item com dados do doador | 404 |
| `POST` | `/` | `multipart/form-data`: `titulo`, `descricao`, `condicao?`, `telefone?`, `foto?`, `id_doador?` | 201 item criado | 400 título/descrição faltando; 500 |
| `PUT` | `/:id/solicitar` | `{ id_receptor }` | 200 item atualizado | 400 sem `id_receptor`; 400 solicitar a própria doação; 404; 409 já doado |
| `PUT` | `/:id` | `{ titulo?, descricao?, condicao?, telefone? }` | 200 item atualizado | 404 |
| `DELETE` | `/:id` | — | 204 | 404 |

Regras:
- `GET /` retorna apenas `status = 'Disponivel'`.
- `POST` usa Multer; a foto é salva em `backend/uploads` com nome `Date.now()-nome_original`.
- `fileFilter` aceita apenas `image/jpeg` e `image/png`; limite de 5 MB.
- Se nenhum arquivo for enviado, `foto` fica `null`.
- `id_doador` cai para `1` se não for enviado.
- `solicitar` grava `status = 'Doado'` e `id_receptor`.
- `PUT /:id` e `DELETE /:id` **não verificam se o usuário logado é o dono**.
- `DELETE` remove também o arquivo de foto, se existir.
- Não há endpoint para listar doações do usuário diretamente; o histórico usa `/api/usuarios/:id/historico`.

#### Pedidos — `/api/pedidos`

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| `GET` | `/` | — | 200 lista com `nome_solicitante` e `tipo_solicitante` | 500 |
| `GET` | `/:id` | — | 200 pedido | 404 |
| `POST` | `/` | `{ titulo, categoria, urgencia, cidade, estado?, descricao, telefone, quantidade?, id_solicitante? }` | 201 pedido | 400 campos obrigatórios; 400 categoria inválida; 400 urgência inválida |
| `PUT` | `/:id` | campos parciais | 200 pedido atualizado | 404; 400 categoria/urgência inválida; 400 quantidade menor que atendida |
| `PUT` | `/:id/atender` | `{ id_ajudante, quantidade? }` | 200 pedido atualizado | 400 sem `id_ajudante`; 400 ajudar no próprio pedido; 404; 409 já concluído |
| `DELETE` | `/:id` | — | 204 | 404 |

Regras:
- Categorias válidas: `Alimentos`, `Móveis`, `Vestuário`, `Materiais Escolares`, `Saúde`, `Outros`.
- Urgências válidas: `Baixa`, `Média`, `Alta`.
- Status: `Aberto`, `Concluído`.
- `quantidade` mínima 1.
- `quantidade_atendida` começa em 0.
- `atender` soma a ajuda, satura em `quantidade` e calcula status: `Concluído` se `quantidade_atendida >= quantidade`.
- `separarCidadeEEstado`:
  - se `estado` vier preenchido, usa;
  - senão tenta `Cidade - UF` ou `Cidade/UF`;
  - senão grava cidade e estado vazio.
- `POST` usa `id_solicitante || 1` se não enviado.
- `PUT /:id` e `DELETE /:id` **não verificam dono**.
- Não há tabela de ajudantes; a ajuda é apenas um contador.

#### Usuários — `/api/usuarios`

| Método | Rota | Sucesso | Observações |
|---|---|---|---|
| `GET` | `/` | 200 lista `{ id_usuario, nome, endereco }` | usada como lista de contatos do chat |
| `GET` | `/:id` | 200 `{ id_usuario, nome, email, endereco }` | 404 se não existir |
| `GET` | `/:id/historico` | 200 itens em que o usuário é doador ou receptor | inclui `nome_doador` |

#### Mensagens — `/api/mensagens`

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| `GET` | `/:idUsuario` | — | 200 mensagens enviadas ou recebidas | 500 |
| `POST` | `/` | `{ id_remetente, id_destinatario, texto }` | 201 mensagem | 400 campos faltando; 400 mensagem para si mesmo |
| `PUT` | `/lidas` | `{ id_usuario, id_outro }` | 200 `{ ok: true }` | 400 campos faltando |

Regras:
- `lida` é inteiro 0/1.
- `PUT /lidas` marca como lidas as mensagens de `id_outro` para `id_usuario`.
- Não há verificação de participação na conversa nem de existência dos usuários.

### 7.4 Uploads

- Pasta: `backend/uploads`.
- Servida em `http://localhost:8080/uploads/...`.
- O banco grava o caminho relativo `/uploads/<arquivo>`.
- No frontend, `<img src="/uploads/...">` funciona em desenvolvimento porque o Angular tem proxy para `/uploads`.
- Em produção, é preciso garantir que o mesmo host sirva `/uploads` ou ajustar a URL.

### 7.5 Seed

Contas de teste:

| ID | Nome | E-mail | Senha | Tipo |
|---|---|---|---|---|
| 1 | Mariana Silva | `mariana@email.com` | `123456` | Pessoal |
| 2 | João Santos | `joao@email.com` | `123456` | Pessoal |
| 3 | Ana Oliveira | `ana@email.com` | `123456` | Pessoal |
| 4 | Instituto Acolher | `instituto@email.com` | `123456` | Instituicao |

Doações de seed:
1. Livros Infantis — doador 1 — Disponível;
2. Cadeira de Rodas — doador 2 — Disponível;
3. Roupas de Inverno — doadora 3 — Doado, receptor 1.

Pedidos de seed:
1. Cestas de food bank para 20 famílias — Betim/MG — 13/20 — Alta;
2. Cadeiras de rodas para centro de acolhimento — Sabará/MG — 1/6 — Alta;
3. Material escolar para ano letivo — Divinópolis/MG — 0/30 — Média;
4. Fraldas e absorventes para idosos — Salvador/BA — 100/100 — Baixa;
5. Cobertores e roupas de inverno — Curitiba/PR — 9/25 — Média.

> O pedido 4 tem `quantidade_atendida = quantidade`, mas o seed não define `status`; como o default é `Aberto`, ele nasce “Aberto” com 100% de progresso. Ao clicar em “Ajudar”, o backend calcula e muda para `Concluído`.

---

## 8. Banco de dados

### 8.1 Schema criado em `server.js`

```sql
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  endereco TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Pessoal',
  cnpj TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS item_doacao (
  id_item INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  foto TEXT DEFAULT NULL,
  condicao TEXT DEFAULT NULL,
  telefone TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'Disponivel',
  id_doador INTEGER NOT NULL,
  id_receptor INTEGER DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_doador) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_receptor) REFERENCES usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS pedido_necessidade (
  id_pedido INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  urgencia TEXT NOT NULL DEFAULT 'Baixa',
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  descricao TEXT NOT NULL,
  telefone TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  quantidade_atendida INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aberto',
  id_solicitante INTEGER NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_solicitante) REFERENCES usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS mensagem (
  id_mensagem INTEGER PRIMARY KEY AUTOINCREMENT,
  id_remetente INTEGER NOT NULL,
  id_destinatario INTEGER NOT NULL,
  texto TEXT NOT NULL,
  lida INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_remetente) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_destinatario) REFERENCES usuario(id_usuario)
);
```

### 8.2 Relacionamentos

- `usuario 1:N item_doacao` como doador (`id_doador`).
- `usuario 1:N item_doacao` como receptor (`id_receptor`, opcional).
- `usuario 1:N pedido_necessidade` como solicitante (`id_solicitante`).
- `usuario 1:N mensagem` como remetente e como destinatário.
- Não há tabela de conversas, ajudantes, notificações, avaliações ou categorias normalizadas.

### 8.3 Reset do banco

```powershell
# pare o backend antes
Remove-Item backend\doalink.db, backend\doalink.db-wal, backend\doalink.db-shm -ErrorAction SilentlyContinue
cd backend
node server.js
```

O seed roda novamente e recria as contas e os dados iniciais.

---

## 9. Autenticação e sessão

### 9.1 Como funciona hoje

1. Usuário envia e-mail e senha para `POST /api/auth/login`.
2. Backend consulta `usuario WHERE email = ? AND senha = ?`.
3. Se encontrar, retorna `{ id_usuario, nome, email, endereco, tipo, cnpj }` (sem senha).
4. Frontend salva esse JSON em `localStorage` na chave `usuario_doalink`.
5. `AuthService` mantém um signal com o usuário.
6. `authGuard` libera rotas se o signal não for `null`.
7. `logout()` limpa o signal e o `localStorage`.

### 9.2 Limitações e riscos

- Senha em texto puro no banco.
- Sem hash (bcrypt/argon2).
- Sem token, cookie de sessão, JWT ou refresh.
- Sem expiração de sessão.
- Sem verificação do usuário no backend a cada requisição.
- Qualquer pessoa pode forjar o `localStorage` e “entrar” no frontend.
- Rotas de escrita não verificam identidade nem propriedade.
- CORS aberto.
- Sem rate limiting, CSRF, helmet ou validação robusta de entrada.

Para um protótipo, isso é aceitável; para produção, é o principal bloco a ser refeito.

---

## 10. Regras de negócio implementadas (código atual)

1. O sistema é gratuito; não há preço, pagamento, carrinho ou frete.
2. Uma doação nasce com status `Disponivel`.
3. O Hub lista apenas `Disponivel`.
4. Solicitar uma doação grava `id_receptor` e muda o status para `Doado`.
5. O item some do Hub e passa a aparecer no histórico dos envolvidos.
6. O doador não pode solicitar a própria doação (backend valida).
7. Título e descrição são obrigatórios para doação (frontend e backend).
8. Um pedido nasce com status `Aberto` e `quantidade_atendida = 0`.
9. Categorias e urgências são validadas no backend.
10. Ajudar em um pedido incrementa `quantidade_atendida`.
11. A ajuda satura em `quantidade`; ao atingir, o status vira `Concluído`.
12. O solicitante não pode ajudar no próprio pedido.
13. Pedido concluído não aceita nova ajuda.
14. A quantidade de um pedido não pode ser reduzida abaixo do já atendido.
15. Cidade/UF é normalizada a partir de um campo único.
16. E-mail é único; CNPJ é checado manualmente para duplicidade.
17. Instituição exige CNPJ no cadastro.
18. Mensagem não pode ser enviada para si mesmo.
19. Mensagens podem ser marcadas como lidas por conversa.
20. Upload de doação aceita apenas JPEG/PNG até 5 MB.

### 10.1 Regras documentadas que NÃO estão implementadas

| Regra/documento | Situação no código |
|---|---|
| “Doações podem ser adquiridas exclusivamente por instituições beneficentes validadas” (`Sobre`) | Não há bloqueio. Qualquer usuário pode solicitar. |
| Backend em Java (`obsidian opencode/Modelagem_e_Backend.md`, `stacks e padrões.md`) | O backend real é Node/Express. |
| Sessão/token gerenciado pelo `AuthService` | Sessão é JSON em `localStorage`, sem token. |
| `CardDoacaoComponent` e `NavbarComponent` compartilhados (`Arquitetura_Front_Angular.md`) | Não existem; há `SidebarComponent` e cards inline. |
| Banco descrito como “relacional” genérico | SQLite local, schema em código. |
| “Object Calisthenics sempre que possível” | Aplicado em parte; há métodos longos, `else`, primitivos soltos e classes com muitas responsabilidades. |

---

## 11. Fluxos ponta a ponta

### 11.1 Cadastro e login

```text
/ login
  -> preencher formulário
  -> POST /api/auth/cadastrar ou /api/auth/login
  -> backend valida e retorna usuário
  -> AuthService salva em localStorage
  -> navega para /hub
```

### 11.2 Publicar doação

```text
/ postar
  -> selecionar foto (opcional)
  -> preencher título, condição, telefone, descrição
  -> FormData multipart
  -> POST /api/doacoes
  -> Multer salva imagem em backend/uploads
  -> INSERT em item_doacao com status Disponivel
  -> navega para /hub
```

### 11.3 Solicitar doação

```text
/ hub ou /pesquisar
  -> clicar em Solicitar
  -> PUT /api/doacoes/:id/solicitar { id_receptor }
  -> backend valida existência, status e auto-solicitação
  -> UPDATE status = Doado, id_receptor = usuário
  -> frontend remove o card da lista
  -> item aparece no histórico do doador e do receptor
```

### 11.4 Detalhes e contato

```text
/ hub
  -> clicar no card
  -> /doacoes/:id
  -> GET /api/doacoes/:id
  -> renderiza foto, doador, endereço, telefone e descrição
  -> Entrar em Contato
  -> /mensagens?com=<id_doador>
```

### 11.5 Criar e ajudar em pedido

```text
/ pedidos/criar
  -> preencher formulário
  -> POST /api/pedidos
  -> navega para /pedidos?publicado=1

/ pedidos
  -> GET /api/pedidos
  -> filtrar/ordenar no cliente
  -> Ajudar neste Pedido
  -> PUT /api/pedidos/:id/atender { id_ajudante }
  -> backend incrementa quantidade_atendida e recalcula status
  -> frontend substitui o pedido na lista
```

### 11.6 Chat

```text
/ mensagens
  -> GET /api/usuarios
  -> GET /api/mensagens/:idUsuario
  -> agrupa conversas no cliente
  -> seleciona contato
  -> PUT /api/mensagens/lidas
  -> envia texto
  -> POST /api/mensagens
  -> adiciona mensagem localmente
```

### 11.7 Perfil e exclusão

```text
/ perfil
  -> lê usuário do localStorage
  -> GET /api/usuarios/:id/historico
  -> lista doações como doador ou receptor
  -> excluir
  -> DELETE /api/doacoes/:id
  -> remove da lista local
```

---

## 12. Como rodar o projeto

### 12.1 Instalação

Nesta máquina, `npm install` trava. O procedimento usado é:

```powershell
cmd /c "npx --yes pnpm@10 install --config.package-manager-strict=false"
```

O flag é obrigatório porque o `package.json` declara `packageManager: npm@11.6.2`.

O `.npmrc` da raiz já contém:

```ini
node-linker=hoisted
package-manager-strict=false
```

Isso é necessário no Windows para evitar `ERR_PNPM_EISDIR` com symlinks.

Backend tem `package.json` próprio e `package-lock.json`; instale separadamente se necessário:

```powershell
cd backend
cmd /c "npm install"   # se funcionar; caso contrário, usar pnpm no diretório do backend
```

### 12.2 Desenvolvimento

Terminal 1 — backend:

```powershell
cd backend
node server.js
```

Terminal 2 — frontend:

```powershell
cmd /c "npm run build:css"
npx ng serve
```

Abrir `http://localhost:4200`.

### 12.3 Build de produção

```powershell
npm run build
```

Esse script roda `build:css` e depois `ng build`. A saída fica em `dist/`.

### 12.4 Deploy

O `angular.json` tem o builder `angular-cli-ghpages:deploy`. O uso típico seria:

```powershell
npx ng deploy
```

Mas isso depende de configuração de repositório GitHub Pages e de o backend estar hospedado em outro lugar.

### 12.5 Gotchas de ambiente (Windows/PowerShell)

- `npm install` pode travar indefinidamente; usar pnpm via `npx`.
- PowerShell com execução de scripts desabilitada: envolver comandos em `cmd /c "..."`.
- Não criar `pnpm-workspace.yaml` na raiz: isso faz o `backend/` virar workspace e mistura dependências.
- `npm run start` usa `&` no script; no Windows isso não inicia os dois processos em paralelo de forma confiável (o `--watch` do Tailwind bloqueia). Prefira dois terminais.
- Nunca editar `src/styles.generated.css`.
- O `build:css` é obrigatório antes de `ng serve`/`ng build` quando o CSS muda.
- O banco fica em `backend/doalink.db`; para resetar, apague também `-wal` e `-shm`.
- `Start-Process` com redirecionamento pode prender o shell; para deixar servidor em background, usar `cmd /c "comando > log 2>&1"`.
- O PowerShell 5.1 pode enviar corpo em latin-1 em `Invoke-RestMethod`; para testar acentos, enviar bytes UTF-8 explicitamente.

---

## 13. Estado atual, limitações e bugs conhecidos

### 13.1 Itens de maior impacto

| # | Severidade | Área | Problema | Evidência |
|---|---|---|---|---|
| 1 | Crítica (produção) | Auth | Senhas em texto puro; sem token/sessão real; guard só olha `localStorage` | `backend/src/routes/auth.js`, `auth.service.ts`, `auth.guard.ts` |
| 2 | Crítica (produção) | Autorização | `PUT`/`DELETE` de doações e pedidos não verificam dono | `backend/src/routes/doacoes.js:126-177`, `pedidos.js:82-185` |
| 3 | Alta | Auth/UX | “Confirmar senha” não é validado contra a senha | `login.component.ts:118-128` |
| 4 | Alta | Auth/Dados | CPF é validado no frontend, mas não é enviado nem persistido | `login.component.ts:180-191`, schema sem `cpf` |
| 5 | Alta | UI | Tela de login usa tokens inexistentes (`border-border`, `text-text-muted`, `bg-primary-subtle`, etc.) | `login.component.html`, `styles.css`, `styles.generated.css` |
| 6 | Alta | UI | Classes `text-headline-*`, `text-body-*`, `text-label-*` não existem no CSS gerado | `styles.css` define só `--font-*`; templates usam `text-*` |
| 7 | Média | Hub | Hub não filtra doações do próprio usuário; botão Solicitar gera erro 400 genérico | `hub.component.ts:59` |
| 8 | Média | Pesquisar | Cards de resultado nunca mostram foto | `pesquisar.component.html:65-69` |
| 9 | Média | Perfil | Editar doação não funciona: `/postar?editId=` é ignorado | `perfil.component.ts:35-37`, `postar-doacao.component.ts:34` |
| 10 | Média | Perfil | “Minhas Doações” inclui itens recebidos, não só doados | `backend/src/routes/usuarios.js:38-44` |
| 11 | Média | Negócio | Página Sobre diz que só instituições podem receber, mas o código permite qualquer usuário | `sobre.component.html:26-29` vs rotas |
| 12 | Média | Seed | Pedido 4 nasce `Aberto` com 100/100 | `backend/src/seed.js:92-103` |
| 13 | Média | Pedidos | Não há registro de quem ajudou; só contador | schema `pedido_necessidade` |
| 14 | Média | Pedidos | Frontend não envia quantidade na ajuda; sempre 1 | `pedido.service.ts:30-34` |
| 15 | Média | Mensagens | `GET /api/mensagens/:id` retorna todas as mensagens do usuário; sem paginação/tempo real | `backend/src/routes/mensagens.js:6-20` |
| 16 | Baixa | Sidebar | Badge de não lidas só atualiza na navegação | `sidebar.component.ts:83-95` |
| 17 | Baixa | Config | `API_URL` hardcoded em quatro services; sem `environment.ts` | `src/app/services/*.ts` |
| 18 | Baixa | UI | Condição `marcas` não é traduzida em detalhes | `detalhes-doacao.component.ts:80-95` |
| 19 | Baixa | Tipos | `Usuario.senha` é obrigatório no model, mas nunca retorna da API | `usuario.model.ts` |
| 20 | Baixa | Backend | MySQL é apenas stub | `backend/src/database/mysql.js:18` |
| 21 | Baixa | Qualidade | Sem testes automatizados | `angular.json` com `skipTests`; nenhum spec |
| 22 | Baixa | UI | Textos em inglês e copyright inconsistente no Perfil | `perfil.component.html` |
| 23 | Baixa | UX | Uso de `alert()` em vez de feedback visual | `hub.component.ts`, `perfil.component.ts` |
| 24 | Baixa | Segurança | CORS totalmente aberto | `backend/server.js:23` |
| 25 | Baixa | Backend | `POST /api/doacoes` e `POST /api/pedidos` caem para usuário 1 se `id` não for enviado | `doacoes.js:77`, `pedidos.js:73` |
| 26 | Baixa | Backend | `id_receptor` não é validado como usuário existente | `doacoes.js:89-124` |
| 27 | Baixa | UI | Links `href="#"` sem destino (termos, ajuda, redes) | `login.component.html`, `perfil.component.html` |
| 28 | Baixa | Deploy | Uploads em `/uploads` exigem mesmo host ou proxy em produção | `proxy.conf.json` |

### 13.2 Backlog antigo já resolvido

O `RESUMO_SESSAO_21-08.md` listava problemas que **já foram corrigidos** no código atual:

- upload de foto: agora usa `FormData`/multipart;
- `id_receptor` hardcoded: agora vem do usuário logado;
- coluna `foto`: existe no schema;
- `doacao.service` com JSON: substituído por `cadastrarDoacaoFormData`;
- `editarPerfil()`: ainda é placeholder, mas não navega mais para `/login`.

### 13.3 Observações de qualidade

- Métodos longos em `pedidos.component.ts`, `mensagens.component.ts`, `login.component.ts`.
- Uso de `any` em `$any($event.target).value`.
- Mistura de português e inglês em nomes de campos (`itemName`, `condition`, `phone`, `description`).
- Alguns componentes usam `signal`, outros usam propriedades simples (`PerfilComponent`).
- Falta de componentes compartilhados (card de doação, card de pedido, avatar, badge).
- Tratamento de erro repetido e genérico.
- Sem `OnPush`, sem `trackBy` além de `track` do control flow (ok), sem lazy para imagens.
- Sem acessibilidade completa (foco em modal, `aria-live`, contraste, navegação por teclado).

---

## 14. Oportunidades de melhoria (roadmap sugerido)

### 14.1 Segurança e autenticação (prioridade máxima)

1. Hash de senha com bcrypt/argon2.
2. Sessão real com JWT ou cookie `httpOnly` + `SameSite`.
3. Middleware de autenticação no backend.
4. Middleware de autorização por dono do recurso.
5. Validação de entrada com Zod/Joi/express-validator.
6. CORS restrito ao domínio do frontend.
7. Helmet, rate limiting e logs de auditoria.
8. Não retornar dados sensíveis em respostas.

### 14.2 Corretude de negócio

1. Decidir se “somente instituições podem receber” é regra real; se sim, implementar no backend.
2. Validar CPF/CNPJ no backend e persistir CPF.
3. Validar “confirmar senha” e termos no frontend.
4. Registrar ajudantes em uma tabela `ajuda_pedido`.
5. Criar status explícito para doação (`Disponivel`, `Reservado`, `Doado`) e para pedido.
6. Corrigir seed do pedido 4.
7. Impedir que o dono edite/exclua recursos de terceiros.
8. Validar existência de `id_doador`, `id_receptor`, `id_solicitante` e `id_ajudante`.

### 14.3 Frontend e UX

1. Corrigir tokens do tema: definir `--text-*` no `@theme` ou trocar classes para as existentes.
2. Criar tokens `--color-border`, `--color-text-muted`, `--color-text-subtle`, `--color-surface-muted`, `--color-primary-subtle`, `--color-primary-hover` ou substituir por tokens MD3 existentes.
3. Corrigir `px-margin-*`, `gap-*`, `space-y-*`, `max-w-container-*` ou substituir por valores padrão.
4. Unificar componentes de card, badge, avatar e estado vazio.
5. Mostrar foto na busca.
6. Implementar edição real de doação e perfil.
7. Trocar `alert()` por toasts/snackbars.
8. Adicionar confirmação antes de excluir.
9. Melhorar acessibilidade (foco no modal, ESC, `aria-live`).
10. Remover textos em inglês e links mortos.
11. Padronizar copyright e rodapés.

### 14.4 Arquitetura

1. Criar `environment.ts` com `apiBaseUrl`.
2. Criar interceptor para erros e headers.
3. Centralizar tratamento de erros.
4. Extrair componentes compartilhados.
5. Adotar `OnPush` e signals de forma consistente.
6. Separar `PedidosComponent` em componentes menores (hero, filtros, card, modal).
7. Separar `MensagensComponent` em lista e chat.
8. Criar camada de domínio no backend (services/repositories) em vez de SQL nas rotas.
9. Adicionar migrations versionadas.
10. Remover código legado da raiz.

### 14.5 Funcionalidades

1. Notificações de mensagens/pedidos.
2. Busca e filtros no backend.
3. Paginação.
4. Upload múltiplo de fotos.
5. Foto de perfil.
6. Avaliações/reputação.
7. Histórico de status.
8. Painel de moderação.
9. Exportação de dados.
10. PWA/offline.

### 14.6 Testes

1. Testes unitários dos services e validadores.
2. Testes de componentes com Angular Testing Library.
3. Testes de integração da API com banco em memória/temporário.
4. Testes E2E com Playwright/Cypress.
5. Testes de contrato dos endpoints.

---

## 15. Como usar este relatório com o ChatGPT

### 15.1 Prompt de contexto sugerido

Copie e cole o bloco abaixo junto com este arquivo no ChatGPT:

```text
Você vai me ajudar a evoluir o projeto DoaLink descrito no relatório técnico em anexo.

Regras:
1. O código real é a fonte da verdade; se o relatório e o código divergirem, considere o código.
2. Todo código, comentário, UI e mensagem de API deve ser em português do Brasil.
3. O frontend é Angular 21 standalone, com signals, Reactive Forms, HttpClient, Tailwind CSS 4 e componentes lazy-loaded.
4. O backend é Node.js/Express com better-sqlite3, sem ORM e sem TypeScript.
5. Não invente bibliotecas que não estejam no projeto sem antes me perguntar.
6. Preserve as convenções existentes: nomes de arquivos, serviços que chamam a API diretamente, templates com templateUrl/styleUrl, uso de @if/@for.
7. Ao propor mudanças, diga exatamente quais arquivos alterar e mostre o diff ou o trecho completo.
8. Respeite o ambiente Windows/PowerShell: comandos devem funcionar com cmd /c quando necessário.
9. Nunca edite src/styles.generated.css; edite src/styles.css e rode npm run build:css.
10. Não edite os HTMLs legados da raiz; o SPA real está em src/.
11. Aplique Object Calisthenics quando fizer sentido, mas sem exagerar.
12. Antes de implementar algo grande, faça perguntas de esclarecimento.

Quero que você atue como revisor técnico e parceiro de implementação. Comece resumindo o que entendeu do projeto e depois me pergunte qual é o próximo objetivo.
```

### 15.2 O que pedir ao ChatGPT

- Revisão de segurança do fluxo de login.
- Plano de migração para autenticação com hash + token.
- Correção dos tokens do Tailwind.
- Refatoração de componentes grandes.
- Criação de testes.
- Revisão de regras de negócio (instituições x pessoas físicas).
- Padronização de respostas de erro da API.
- Melhoria de UX do mural de pedidos.
- Correção do fluxo de edição de doação/perfil.

### 15.3 O que evitar

- Pedir para “reescrever tudo” sem plano: o projeto tem muitas partes acopladas.
- Assumir que o backend é Java: ele é Node/Express.
- Assumir que o banco é `sql.js`: ele é better-sqlite3 em arquivo.
- Assumir que existem testes: não existem.
- Assumir que o deploy já funciona: só há configuração de ghpages.
- Assumir que a regra “somente instituições” está implementada: não está.

---

## 16. Referência rápida

### 16.1 Contas de teste

| E-mail | Senha | Tipo |
|---|---|---|
| `mariana@email.com` | `123456` | Pessoal |
| `joao@email.com` | `123456` | Pessoal |
| `ana@email.com` | `123456` | Pessoal |
| `instituto@email.com` | `123456` | Instituicao |

### 16.2 Endpoints

```text
POST   /api/auth/login
POST   /api/auth/cadastrar
GET    /api/usuarios
GET    /api/usuarios/:id
GET    /api/usuarios/:id/historico
GET    /api/doacoes
GET    /api/doacoes/:id
POST   /api/doacoes
PUT    /api/doacoes/:id
PUT    /api/doacoes/:id/solicitar
DELETE /api/doacoes/:id
GET    /api/pedidos
GET    /api/pedidos/:id
POST   /api/pedidos
PUT    /api/pedidos/:id
PUT    /api/pedidos/:id/atender
DELETE /api/pedidos/:id
GET    /api/mensagens/:idUsuario
POST   /api/mensagens
PUT    /api/mensagens/lidas
```

### 16.3 Portas e URLs

| Serviço | URL |
|---|---|
| Frontend dev | `http://localhost:4200` |
| Backend | `http://localhost:8080` |
| API | `http://localhost:8080/api` |
| Uploads | `http://localhost:8080/uploads` |

### 16.4 Arquivos-chave

| Arquivo | Por que importa |
|---|---|
| `src/app/app.routes.ts` | Rotas e guards |
| `src/app/services/auth.service.ts` | Sessão e login |
| `src/app/components/login/login.component.ts` | Login/cadastro e validações |
| `src/app/components/hub/hub.component.ts` | Vitrine |
| `src/app/components/pedidos/pedidos.component.ts` | Mural de pedidos |
| `src/app/components/mensagens/mensagens.component.ts` | Chat |
| `src/app/components/perfil/perfil.component.ts` | Perfil/histórico |
| `src/styles.css` | Tokens Tailwind/MD3 |
| `backend/server.js` | Bootstrap, schema e rotas |
| `backend/src/routes/*.js` | Regras da API |
| `backend/src/seed.js` | Dados iniciais |
| `AGENTS.md` | Convenções para agentes de IA |

### 16.5 Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `PORTA` | `8080` | Porta do backend |
| `DB_DRIVER` | `sqlite` | Driver do banco (apenas `sqlite`) |

---

## 17. Conclusão

O DoaLink é um protótipo funcional de marketplace de doações com:

- frontend Angular 21 moderno, standalone, com signals e Tailwind;
- backend Express simples e direto;
- SQLite local com schema em código;
- fluxos completos de cadastro, doação, pedido, chat e perfil;
- boa base visual em Material Design 3.

Os principais pontos de atenção são:

1. **Segurança/autenticação** de nível protótipo.
2. **Ausência de autorização por dono** nas rotas de escrita.
3. **Tokens de tema incompletos** que afetam a aparência de algumas telas.
4. **Funcionalidades incompletas** (edição de perfil/doação, foto na busca, notificações).
5. **Divergências entre documentação e código** (Java vs Node, sql.js vs better-sqlite3, instituições vs qualquer usuário).

Com este relatório, outra IA consegue entender o projeto inteiro, respeitar as convenções e propor mudanças com muito menos ida e volta.
