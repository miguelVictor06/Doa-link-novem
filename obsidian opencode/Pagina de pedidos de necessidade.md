[[Principal]] [[Pagina de criação de pedidos]]

# 📦 Página de Pedidos - DoaLink A página de **Mural de Pedidos** é o ambiente onde instituições e indivíduos podem publicar suas necessidades e onde os doadores podem encontrar causas para apoiar. O design segue a mesma identidade visual da página principal (cores primárias, tipografia Inter, ícones Material Symbols) e utiliza Tailwind CSS. ## 🏗️ Estrutura de Componentes da Página Para facilitar a futura migração e roteamento no framework (Angular), a página foi estruturada em blocos modulares que podem ser separados: 
### 1. Header (Navegação Global) - **Localização:** Barra superior fixa (`fixed`, `backdrop-blur-xl`). - **Elementos:** - Logo DoaLink. - Links de navegação (com a rota "Pedidos" ativa). - Barra de pesquisa global. - **Botão "Criar Pedido":** Localizado no canto superior direito, serve como principal *Call to Action* (CTA) da barra, abrindo diretamente a interface de criação. 

# 2. Cabeçalho e Métricas (Hero) - **Título e Descrição:** Apresenta o propósito da página. - **Métricas Rápidas:** Cards mostrando "Pedidos Abertos" e "Famílias Atendidas", reforçando o impacto social e a credibilidade da rede. - **Banner de Chamada:** Destaque em gradiente azul chamando o usuário para publicar necessidades urgentes. Possui um botão secundário para abrir o modal. 
# 3. Filtros de Navegação - **Pills de Categoria:** Botões de filtro horizontal para facilitar a busca (Todos, Alimentos, Móveis, Vestuário, Materiais Escolares, Saúde). - **Ordenação:** Um `<select>` para ordenar por relevância, urgência ou proximidade geográfica. 

# 4. Cards de Pedidos (Grid) - **Layout:** CSS Grid responsivo (`grid-cols-1` para mobile, `grid-cols-3` para desktop). - **Conteúdo de cada Card:** - **Badges:** Identificadores visuais para *Categoria* (ex: Saúde & Higiene) e *Nível de Urgência* (ex: Urgência Alta em vermelho). - **Título e Localização:** O que é preciso e de onde é a requisição (ex: Betim, Sabará, Divinópolis, etc). - **Barra de Progresso:** Um elemento visual dinâmico mostrando a porcentagem do pedido que já foi atendida (ex: 65% - 13 de 20 peças). - **Ações:** Botão principal de "Ajudar neste Pedido" e botão secundário de "Ver Detalhes". 

# 5. Seção "Como Funciona" - Um infográfico em texto simples com 3 passos (Cadastro, Contato Direto, Confirmação) que explica o fluxo do processo para novos usuários. 

# 6. Modal de Criação de Pedido (Formulário) - **Comportamento:** Fica oculto no DOM (`hidden opacity-0`) e é ativado via JavaScript simples. Fica sobreposto à tela com um fundo escurecido (`backdrop-blur-sm`). - **Campos Coletados:** - Título do Pedido - Categoria (Select) - Nível de Urgência (Select) - Cidade / Estado - Descrição Detalhada (Textarea) - Telefone / WhatsApp para contato. #

# ⚙️ Lógica e Interatividade (JS) O HTML já conta com scripts integrados para prototipação das interações: - **Abertura/Fechamento do Modal:** Funções `openModal()` e `closeModal()` que manipulam as classes do Tailwind (`hidden`, `opacity-0`) e travam o scroll da página (`document.body.style.overflow = 'hidden'`). - **Feedback Visual (Filtros):** Script iterativo (`forEach`) que adiciona/remove as classes ativas (`bg-primary-container`, `text-on-primary`) nos botões de filtro quando clicados. #

# 🚀 
róximos Passos para o Desenvolvimento - [ ] Extrair o `<header>` para um componente independente (ex: `header.component.html`) já que ele se repete entre a página de Doações e Pedidos. - [ ] Criar um componente isolado para o `<article>` do Card, recebendo os dados (título, urgência, % de progresso) via *Inputs/Props*. - [ ] Isolar o Modal em um componente de overlay para gerenciar o estado (aberto/fechado) via rotas ou state management.

## 🔄 Regras de Sincronização de Dados (Mapeamento Front/Back)

Para que o formulário de criação reflita corretamente no layout dos Cards do Mural, o framework (Angular) deve implementar os seguintes mapeamentos dinâmicos:

### 1. Interface TypeScript do Card (`@Input`)
O componente do Card deve receber um objeto com a seguinte estrutura (sincronizada com o payload de criação):
\`\`\`typescript
export interface PedidoModel {
  id: string;
  titulo: string;
  categoria: string; // ex: 'alimentos', 'moveis'
  urgencia: string;  // ex: 'alta', 'media'
  descricao: string;
  cidade: string;
  itensArrecadados: number;
  metaItens: number; // Quantidade total solicitada
  instituicaoVerificada: boolean; // Flag para mostrar o ícone de 'verified'
  nomeSolicitante: string;
}
\`\`\`

### 2. Dicionário de Mapeamento Visual (Categorias)
Dependendo da `categoria` salva no banco, o código deve renderizar o **ícone Material Symbol** e o **texto** correspondente no primeiro Badge do card:
- `alimentos` ➔ Ícone: `lunch_dining` | Texto: Alimentos
- `moveis` ➔ Ícone: `chair` | Texto: Móveis
- `vestuario` ➔ Ícone: `checkroom` | Texto: Vestuário
- `escolar` ➔ Ícone: `school` | Texto: Materiais Escolares
- `saude` ➔ Ícone: `medication` | Texto: Saúde & Higiene
- `eletro` ➔ Ícone: `kitchen` | Texto: Eletrodomésticos

### 3. Dicionário de Cores (Nível de Urgência)
A propriedade `urgencia` dita o estilo (classes Tailwind) do segundo Badge do card. É essencial aplicar as classes condicionalmente (ex: `[ngClass]` no Angular):
- **Alta (`alta`)** ➔ Classes: `bg-error-container text-on-error-container` | Ponto (bolinha): `bg-error`
- **Média (`media` / `moderada`)** ➔ Classes: `bg-secondary-fixed text-on-secondary-fixed-variant` | Ponto: `bg-secondary`
- **Baixa / Recorrente (`baixa`, `recorrente`)** ➔ Classes: `bg-primary-fixed text-on-primary-fixed-variant` | Ponto: `bg-primary`

### 4. Cálculo Dinâmico da Barra de Progresso
A largura (`width`) da barra de progresso no HTML estático está como `style="width: 40%;"`. Na sincronização, isso deve ser uma fórmula matemática baseada nos dados:
- **Cálculo:** `(itensArrecadados / metaItens) * 100`
- **Exemplo Angular:** `[style.width.%]="(pedido.itensArrecadados / pedido.metaItens) * 100"`
- Se for `0%`, exibir o texto: *"Aguardando doador"*.
- Se for `100%`, o card deve ser marcado como *"Concluído"* ou removido do mural de pedidos abertos.

### 5. Estados de Interface (UI States) a Serem Implementados
Para que a lista sincronize suavemente com o backend, o desenvolvedor deve prever três estados no grid de cards:
- **Loading State (Carregando):** Exibir *Skeleton Loaders* (cards cinzas piscando) enquanto a API busca os pedidos.
- **Empty State (Vazio):** Se um filtro (ex: "Móveis") for clicado e não houver pedidos no banco, exibir uma imagem/ilustração amigável com a mensagem *"Nenhum pedido desta categoria no momento"*.
- **Filtro Ativo:** A lógica do JavaScript/Angular deve garantir que, ao clicar nos botões de filtro (Pills), a lista faça um `filter()` na array de objetos renderizados, comparando o atributo `categoria` do botão com o `categoria` do pedido.