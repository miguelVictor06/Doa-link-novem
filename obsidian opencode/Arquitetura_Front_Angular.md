
**Projeto:** Protótipo DoaLink

## 1. Estrutura de Componentes
A interface do usuário será construída utilizando componentes independentes:
*   `AppComponent`: O contêiner principal de roteamento da aplicação.
*   `LoginComponent`: Interface responsável pela autenticação e controle de acesso de doadores e receptores.
*   `HubComponent`: A vitrine central do marketplace, contendo a lógica para listar e filtrar os itens disponíveis.
*   `PerfilComponent`: Área dedicada à exibição dos dados do usuário e seu histórico na plataforma.
*   `CardDoacaoComponent` (Shared): Componente visual reutilizável (filho do Hub) para exibir as informações resumidas de um único item.
*   `NavbarComponent` (Shared): Barra de navegação superior para transição entre as rotas.

## 2. Serviços (Services)
A comunicação com o back-end será isolada nestas classes:
*   `AuthService`: Gerencia os tokens/sessão do usuário e chamadas de login.
*   `DoacaoService`: Executa chamadas HTTP para buscar a lista de doações, cadastrar novos itens e realizar solicitações.

## 3. Roteamento Básico (Routing)
*   Rota `''` ou `'/login'` -> Carrega o `LoginComponent`
*   Rota `'/hub'` -> Carrega o `HubComponent` (Requer usuário logado)
*   Rota `'/perfil'` -> Carrega o `PerfilComponent` (Requer usuário logado)