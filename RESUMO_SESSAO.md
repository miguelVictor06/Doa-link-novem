# Resumo da Sessão — 19/08/2026

## Problema Relatado
Após transferir os arquivos HTML da raiz do projeto para a pasta `src/app/components/` (convertendo-os em componentes Angular), a estilização parou de funcionar quando o projeto é aberto.

## Causa Identificada
Os arquivos `.component.html` na pasta `components/` são **templates de componentes Angular**, não páginas HTML standalone. Eles não funcionam sendo abertos diretamente no navegador (clicando duplo no arquivo HTML).

### Por que os HTMLs antigos funcionavam?
Os arquivos HTML originais na raiz do projeto (`index.html`, `login.html`, `perfil.html`, `posts.html`, `sobre.html`) carregavam o Tailwind CSS via CDN:
```html
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
```
Eles eram páginas independentes e funcionavam sem servidor.

### Por que os componentes Angular não funcionam assim?
Os componentes Angular dependem do build do Angular para:
- Compilar os templates (diretivas como `@if`, `@for`, `(click)`, `routerLink`, etc.)
- Injetar os estilos globais (`styles.generated.css`)
- Processar os componentes e suas dependências

## Solução
Para rodar o projeto corretamente:

```bash
cd "D:\doalink 1808 com oc\DoaLink"
npm install          # instala dependencias
npm run build:css    # gera o CSS do Tailwind
ng serve             # inicia o servidor de desenvolvimento
```

Depois abrir **http://localhost:4200** no navegador.

## Verificacao Tecnica
- O arquivo `src/styles.generated.css` (26KB) contém todas as classes Tailwind utilzadas nos componentes
- O `angular.json` referencia corretamente `src/styles.generated.css` como stylesheet global
- Os componentes usam `styleUrl` (singular), válido no Angular 17+
- As fontes (Inter, Plus Jakarta Sans) e icons (Material Symbols) são carregados via CDN no `src/index.html`

## Arquivos Importantes
| Arquivo | Funcao |
|---|---|
| `src/styles.css` | Fonte do Tailwind com tema Material Design 3 |
| `src/styles.generated.css` | CSS compilado (gerado por `build:css`) |
| `src/index.html` | Shell do SPA Angular + links de fontes |
| `angular.json` | Config do build Angular (linha 53-54: styles) |
| `package.json` | Scripts: `build:css`, `start`, `build` |

## Nota
Os HTMLs originais na raiz (`index.html`, `login.html`, etc.) ainda existem no projeto e sao legados. Podem ser removidos caso nao sejam mais necessarios.
