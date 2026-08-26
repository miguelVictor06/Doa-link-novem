

**Projeto:** Protótipo DoaLink

## 1. Modelagem MER/DER (Entidades Principais)
A base de dados estrutural do sistema deve conter duas entidades centrais que se relacionam:
*   **Usuario:**
    *   Atributos básicos: `id_usuario` (PK), `nome`, `email`, `senha`, `endereco`.
*   **Item_Doacao:**
    *   Atributos básicos: `id_item` (PK), `titulo`, `descricao`, `status` (Enum: Disponível / Doado).
    *   Relacionamentos: `id_doador` (FK para Usuario - quem ofertou o item) e `id_receptor` (FK para Usuario - quem recebeu o item, inicia como nulo).

## 2. Contratos da API REST (Endpoints)
O back-end Java precisará expor os seguintes endpoints para consumo pelo Angular:
*   `POST /api/auth/login`: Para autenticação do usuário.
*   `GET /api/doacoes`: Retorna a lista de itens com status "Disponível" para renderização no Hub.
*   `POST /api/doacoes`: Recebe o payload do front-end para salvar um novo item de doação.
*   `PUT /api/doacoes/{id}/solicitar`: Atualiza o status de um item específico para "Doado" e vincula o `id_receptor`.
*   `GET /api/usuarios/{id}/historico`: Retorna a lista de itens doados ou recebidos por um usuário específico para alimentar o Perfil.