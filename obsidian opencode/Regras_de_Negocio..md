

**Projeto:** Protótipo DoaLink (Foco em Economia Circular)

## 1. Natureza Gratuita (Diretriz Crítica para a IA)
*   O sistema é um modelo de economia circular e de solidariedade. **Não há transações financeiras**.
*   O código gerado **NÃO DEVE** incluir lógicas de carrinho de compras, integração com gateways de pagamento, variáveis de "preço" ou cálculo monetário de frete. O foco é apenas o pareamento entre quem quer doar e quem precisa receber.

## 2. Fluxo Principal da Doação
1.  **Oferta:** Um usuário logado cadastra um item, que entra no sistema com o status "Disponível".
2.  **Vitrine:** O Hub Principal busca e exibe exclusivamente itens com status "Disponível".
3.  **Ação:** Um usuário interessado solicita o item na interface.
4.  **Conclusão no Banco:** O sistema vincula o usuário interessado como `id_receptor` daquele item e altera o status para "Doado". O item desaparece do Hub Principal e passa a constar no histórico (Perfil) de ambos os envolvidos.

## 3. Restrições do Protótipo
*   Um usuário não pode visualizar a opção de solicitar uma doação na qual ele mesmo é o doador.
*   Para o cadastro de uma nova doação, os atributos `titulo` e `descricao` devem ser validados como obrigatórios no front-end e no back-end.