# Resumo da Sessão — 27/09/2026

## Objetivo
Implementar a feature **Mural de Pedidos** a partir de dois documentos de design novos em `obsidian opencode/`:
1. `Pagina de pedidos de necessidade.md` — o mural (listagem).
2. `Pagina de criação de pedidos.md` — o formulário de publicação.

Nenhuma das duas páginas existia no código. O `.md` do mural descrevia um protótipo estático; o arquivo
`pagnecessidades.html` foi criado com **0 bytes**. O `criacaopedido.html` também está vazio. Nada foi
implementado a partir dos HTMLs da raiz — ambos os designs foram transpostos para componentes Angular.

## Decisões tomadas (com o usuário)

| Tema | Decisão |
|---|---|
| Escopo | Componente Angular + rotas (os HTMLs da raiz são protótipos legacy, código morto) |
| Dados | Tabela e rotas novas no backend (`/api/pedidos`), não mock |
| Progresso do pedido | Contador simples `quantidade_atendida / quantidade` |
| Urgência "Recorrente" | **Descartada** — o `.md` lista 4 opções, mas só Baixa/Média/Alta valem |
| Campo Cidade | **Campo único** "Cidade / Município" (ex.: `Belo Horizonte - MG`); o backend separa a sigla |
| `metaItens` | **Mantido** como campo `quantidade` no formulário (é o que alimenta "13 de 20 peças") |
| UX | **Página dedicada** `/pedidos/criar`; o modal do mural foi removido |

## Arquivos criados

### Frontend
- `src/app/models/pedido-necessidade.model.ts` — interfaces `PedidoNecessidade` / `PedidoPayload`, tipos
  `CategoriaPedido` / `UrgenciaPedido` / `StatusPedido` / `OrdemPedido`, e as constantes `CATEGORIAS_PEDIDO`,
  `URGENCIAS_PEDIDO`, `ORDEM_URGENCIA`.
- `src/app/services/pedido.service.ts` — `listarPedidos`, `buscarPedidoPorId`, `cadastrarPedido`,
  `atualizarPedido`, `ajudarNoPedido`, `excluirPedido`. Mesma convenção de `doacao.service.ts` (API_URL
  hardcoded, sem interceptors).
- `src/app/components/pedidos/` — Mural de Pedidos (`pedidos.component.{ts,html,css}`), rota `/pedidos`.
- `src/app/components/criacao-pedido/` — Formulário de criação (`criacao-pedido.component.{ts,html,css}`),
  rota `/pedidos/criar`.

### Backend
- `backend/src/dominio-pedido.js` — `CATEGORIAS`, `URGENCIAS`, `STATUS` e os validadores
  `ehCategoriaValida` / `ehUrgenciaValida`, compartilhados entre rotas e seed.
- `backend/src/routes/pedidos.js` — as rotas (ver abaixo).

## Arquivos alterados
- `backend/server.js` — tabela `pedido_necessidade`, registro de `/api/pedidos`, seed dos pedidos, lista de
  endpoints no banner de inicialização. O `require` do seed virou desestruturado:
  `const { semear, semearPedidos } = require('./src/seed');`
- `backend/src/seed.js` — `module.exports` passou a exportar `{ semear, semearPedidos }`. A nova função
  `semetarPedidos` é **idempotente por tabela** (`COUNT(*) FROM pedido_necessidade`), diferente de `semear`
  que aborta se `usuario` tiver linhas — assim os pedidos entram em bancos já existentes.
- `src/app/app.routes.ts` — rotas `/pedidos/criar` e `/pedidos`, ambas com `authGuard`.
- `src/app/components/sidebar/sidebar.component.ts` — itens "Pedidos" (`volunteer_activism`) e
  "Criar Pedido" (`note_add`) inseridos entre "Doações" e "Pesquisar".

## Endpoints criados (`backend/src/routes/pedidos.js`)

| Método | Rota | Regra |
|---|---|---|
| `GET` | `/api/pedidos` | Lista todos, mais recente primeiro, com `nome_solicitante` e `tipo_solicitante` |
| `GET` | `/api/pedidos/:id` | 404 se não existir |
| `POST` | `/api/pedidos` | Exige `titulo`, `categoria`, `urgencia`, `cidade`, `descricao`, `telefone`; valida categoria e urgência |
| `PUT` | `/api/pedidos/:id` | Atualiza; recusa `quantidade` menor que `quantidade_atendida` |
| `PUT` | `/api/pedidos/:id/atender` | Incrementa a ajuda; **400** se o usuário ajudar no próprio pedido, **409** se já concluído; satura em `quantidade` e vira `Concluído` |
| `DELETE` | `/api/pedidos/:id` | 204 / 404 |

Helpers no fim do arquivo: `buscarPedido`, `camposObrigatoriosFaltando`, `paraInteiroPositivo`,
`calcularStatus` e `separarCidadeEEstado`.

### Normalização do campo Cidade
`separarCidadeEEstado(cidade, estado)` aceita o campo único do formulário e preenche as duas colunas.
`estado` explícito tem precedência; senão aplica a regex `^(.*?)\s*[-/]\s*([A-Za-z]{2})\s*$`:

| Enviado | `cidade` | `estado` |
|---|---|---|
| `Belo Horizonte - MG` | Belo Horizonte | MG |
| `Curitiba/PR` | Curitiba | PR |
| `Betim` | Betim | *(string vazia)* |

`estado` foi removido de `CAMPOS_OBRIGATORIOS`, mas continua sendo gravado (coluna `NOT NULL`).

## Tabela `pedido_necessidade`
`id_pedido`, `titulo`, `categoria`, `urgencia` (default `Baixa`), `cidade`, `estado`, `descricao`,
`telefone`, `quantidade` (default 1), `quantidade_atendida` (default 0), `status` (default `Aberto`),
`id_solicitante` (FK → `usuario`), `criado_em`.

## O Mural de Pedidos (`/pedidos`)
6 blocos, na ordem do `.md`:
1. **Hero** — título, descrição, 3 métricas (Pedidos Abertos, Itens Atendidos, % geral com barra) e o banner
   em gradiente `from-primary to-secondary-container` com o CTA "Criar Pedido".
2. **Filtros** — pills das 6 categorias + "Todos" e `<select>` de ordenação.
3. **Cards** — badges de categoria (com ícone) e urgência (cor por nível), título, `cidade/estado`, barra de
   progresso e as ações "Ajudar neste Pedido" / "Ver Detalhes".
4. **Como Funciona** — 3 passos (Cadastro, Contato Direto, Confirmação).
5. **Modal de detalhes** — descrição, progresso, local, data, quem pediu, telefone e "Falar com quem pediu"
   (vai para `/mensagens?com=<id_solicitante>`, reaproveitando o chat existente).
6. Footer.

Regras de UI: o próprio pedido mostra "Pedido publicado por você" no lugar de "Ver Detalhes"; o botão
"Ajudar" fica desabilitado em pedido `Concluído`; o erro 400/409 do backend é exibido vindo de
`erro.error.erro`; concluídos no card de detalhe ganham um aviso de que o solicitador registra as entregas.

Ordenação é **client-side** em `ordenar()`: `relevancia` (peso de urgência + progresso), `urgencia`
(`ORDEM_URGENCIA` decrescente) e `proximidade` (compara a sigla do `estado` com a do `endereco` do usuário
logado, `"São Paulo, SP"` → `SP`).

## A Página de Criação (`/pedidos/criar`)
Segue o `.md`: coluna única centralizada (`max-w-[760px]`), breadcrumb "Voltar ao Mural de Pedidos" com a tag
"Publicação Direta • 100% Solidária", card com ícone e texto de apoio, contador de caracteres **0/800** em
tempo real via `valueChanges`, Card de Compromisso Solidário e Banner de Segurança/Moderação.

O `.md` marcava `categoria` com ⚠️ ATENÇÃO — sem ela o filtro do mural não funciona, então entrou no formulário.
Também mantém o campo `quantidade`, apesar de o `.md` chamá-lo de "campo futuro", porque a barra de progresso
depende dele.

Ao publicar, redireciona para `/pedidos?publicado=1`, que exibe a confirmação e já filtra pela categoria
publicada. A creation page também aceita `?categoria=` para pré-selecionar o select.

### Divergências em relação ao payload do `.md`
O `.md` sugere `contato`, `metaItens` e `progressoAtual`. Usei `telefone`, `quantidade` e
`quantidade_atendida` (default 0) para ficar consistente com a nomenclatura de `item_doacao`. O `.md` também
escreve a urgência em minúsculas (`"alta"`); o banco grava `"Alta"`, como já é feito com `Disponivel`/`Doado`.

## Validações executadas
- `npm run build:css` — OK (Tailwind v4.3.3).
- `npx ng build --configuration development` — OK, chunks `pedidos-component` (65.97 kB) e
  `criacao-pedido-component` (42.59 kB) gerados.
- API exercitada por HTTP: seed (5 pedidos), `POST`/`GET`/`PUT`/`DELETE`, UTF-8 ponta a ponta (confirmado por
  code point: `ç`=231, `ã`=227, `é`=233), saturação do contador, 400 de auto-ajuda, 409 de pedido concluído,
  e as 3 formas do campo Cidade.

## Estado do banco ao fim da sessão
5 pedidos de seed intactos (`#1` Betim/MG 13/20, `#2` Sabará/MG 1/6, `#3` Divinópolis/MG 0/30,
`#4` Salvador/BA 100/100, `#5` Curitiba/PR 9/25). Todos os registros de teste foram removidos.

⚠️ **Pendências**
- A conta id 4 (`instituto@email.com`) foi **renomeada para "Teste Silva"** e apareceram as contas
  "Usuario Teste 2" (id 5) e "miguel" (id 7) — aparentemente você testando o app em paralelo.
- Meu DELETE de limpeza apagou o pedido **#8** que você tinha criado manualmente. Se precisar dele, é só
  recriar pela página nova.
- `pagnecessidades.html` e `criacaopedido.html` continuam vazios na raiz. Como são protótipos legacy, não
  interfered — mas podem ser apagados para não confundir.

## Como rodar
```bash
# terminal 1
cd backend && node server.js          # porta 8080

# terminal 2
cmd /c "npm run build:css"            # obrigatório antes de ng serve
npx ng serve                          # porta 4200
```
Entrar em http://localhost:4200 e logar com uma conta seed (senha `123456`). A feature fica em "Pedidos" na
sidebar, e o formulário em "Criar Pedido".

## Gotchas desta sessão
- `Set-Content -NoNewline` com array no PowerShell **colapsa todas as quebras de linha** de um HTML e o
  arquivo vira uma linha só. Para cortar blocos de um template, use a ferramenta de edição, não o shell.
- `Invoke-RestMethod` do PowerShell 5.1 envia o corpo em **latin-1**; categorias com acento
  (`'Móveis'`, `'Vestuário'`, `'Média'`) chegam corrompidas e o backend responde "Categoria inválida". Isso é
  bug do harness, não da API. Contornar com
  `-Body ([System.Text.Encoding]::UTF8.GetBytes($json))` e `-ContentType "application/json; charset=utf-8"`.
- O console do PowerShell não renderiza acento (codepage legada). Para conferir UTF-8 de verdade, ler a
  resposta como bytes e decodificar com `[System.Text.Encoding]::UTF8.GetString(...)`.
- `Start-Process` com `-RedirectStandardOutput` prende o shell; ao abortar o comando, o `ng serve` filho
  morre junto. Para o servidor ficar de pé, iniciar com `cmd /c "... > log 2>&1"`.
