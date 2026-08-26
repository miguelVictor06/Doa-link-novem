

**Projeto:** Protótipo DoaLink (Marketplace de Doações)

## 1. Tecnologias Principais
*   **Front-end:** Angular (com TypeScript). Foco em arquitetura baseada em componentes modulares e injeção de dependência para serviços.
*   **Back-end:** Java. O sistema fornecerá uma API RESTful para comunicação com o front-end.
*   **Banco de Dados:** Relacional (foco atual na estruturação das tabelas e modelagem MER/DER).

## 2. Padrões de Desenvolvimento (Object Calisthenics)
Para garantir um código limpo, testável e de fácil manutenção neste protótipo, todo o código gerado pela IA (tanto a lógica TypeScript no Angular quanto o back-end em Java) deve aplicar, sempre que possível, as regras de Object Calisthenics:
1.  Um nível de indentação por método.
2.  Não usar a palavra-chave `else`.
3.  Envolver todos os tipos primitivos e strings.
4.  Coleções de primeira classe (First-class collections).
5.  Um ponto por linha (evitar encadeamento excessivo de métodos).
6.  Não abreviar nomes de variáveis, métodos ou classes.
7.  Manter as entidades pequenas.
8.  Nenhuma classe com mais de duas variáveis de instância.
9.  Nenhum *getter* ou *setter* / Propriedades públicas (focar no encapsulamento do comportamento).