[[Principal]]

**Projeto:** Protótipo DoaLink (Foco em Economia Circular)

## 1. Natureza Gratuita (Diretriz Crítica para a IA)
*   O sistema é um modelo de economia circular e de solidariedade. **Não há transações financeiras**.
*   O código gerado **NÃO DEVE** incluir lógicas de carrinho de compras, integração com gateways de pagamento, variáveis de "preço" ou cálculo monetário de frete. O foco é apenas o pareamento entre quem quer doar e quem precisa receber.

## 2. Fluxo Principal da Doação
1.  **Oferta:** Um usuário logado cadastra um item, que entra no sistema com o status "Disponível".
2.  **Vitrine:** O Hub Principal busca e exibe exclusivamente itens com status "Disponível".
3.  **Ação:** Um usuário interessado solicita o item na interface. A solicitação é registrada no banco sem alterar o status do item, que continua "Disponível" no Hub.
4.  **Múltiplos interessados:** Qualquer usuário logado, exceto o próprio doador, pode solicitar o mesmo item. O sistema não limita a quantidade de solicitações nem esconde o item após a primeira.
5.  **Encerramento:** Somente o doador pode encerrar/remover a própria doação, após confirmação. Ao encerrar, o item sai do Hub e das listas de solicitações.

## 3. Restrições do Protótipo
*   Um usuário não pode visualizar a opção de solicitar uma doação na qual ele mesmo é o doador.
*   A solicitação não altera o doador (`id_doador`) nem o receptor (`id_receptor`) do item.
*   Para o cadastro de uma nova doação, os atributos `titulo` e `descricao` devem ser validados como obrigatórios no front-end e no back-end.