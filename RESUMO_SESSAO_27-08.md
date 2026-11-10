# Resumo da Sessão - 2026-08-27

## Problema reportado
Hub não exibia fotos e não atualizava a lista após ações (solicitar, carregar).

## Correções realizadas

### 1. Proxy de imagens
- Criado `proxy.conf.json` no raiz do projeto — redireciona `/uploads/*` da porta 4200 (Angular) para 8080 (backend)
- Atualizado `angular.json` para que `ng serve` carregue o proxy automaticamente (`proxyConfig: "proxy.conf.json"`)

### 2. Exibição de fotos no frontend
- **`hub.component.html`**: substituído placeholder estático "Sem imagem" por `@if (doacao.foto)` — renderiza `<img [src]="doacao.foto">` quando disponível, fallback para placeholder
- **`perfil.component.html`**: mesma lógica — imagem hardcoded do Google substituída por `[src]="doacao.foto"` com fallback

### 3. Reatividade com signals (causa raiz do bug de atualização)
- **`hub.component.ts`**: propriedades `doacoesDisponiveis`, `isLoading` e `mensagemErro` convertidas de atributos comuns para `signal()`
- Removido método `removerItemDaLista` — lógica inline com `doacoesDisponiveis.update()`
- Removido `console.log` de debug
- **`hub.component.html`**: todas as referências atualizadas com `()` — `mensagemErro()`, `isLoading()`, `doacoesDisponiveis()`, `.length`

## Arquivos modificados
- `proxy.conf.json` (novo)
- `angular.json`
- `src/app/components/hub/hub.component.ts`
- `src/app/components/hub/hub.component.html`
- `src/app/components/perfil/perfil.component.html`

## Para testar
1. Backend rodando: `cd backend && node server.js`
2. Frontend com proxy: `npx ng serve`
3. Fazer login → hub deve exibir fotos das doações que possuem imagem
