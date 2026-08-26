# AGENTS.md

DoaLink: donation marketplace prototype. Two separate packages: Angular 21 app at repo root, Node backend in `backend/`. All code, comments, and UI/API text are Portuguese (pt-BR) — keep it that way.

## Commands

- Dev server (run both, two terminals):
  - `npm run build:css` — Tailwind: compiles `src/styles.css` -> `src/styles.generated.css`
  - `npx ng serve` — SPA on http://localhost:4200
- Build: `npm run build` (runs `build:css` first — required, see gotchas)
- Backend: `cd backend && node server.js` — Express on port 8080; frontend services hardcode `http://localhost:8080/api`
- Tests: `ng test` (Vitest). No test files exist; `angular.json` sets `skipTests: true` for all schematics, so don't expect or generate specs.

## Package manager (this machine)

- `npm install` hangs indefinitely here — do not use it.
- Install with: `cmd /c "npx --yes pnpm@10 install --config.package-manager-strict=false"`
  (the flag is mandatory because `package.json` pins `"packageManager": "npm@11.6.2"`).
- pnpm 10 blocks dependency postinstall scripts; if esbuild/lightningcss show "ignored build scripts", approve with `cmd /c "npx pnpm approve-builds"`.
- PowerShell script execution is disabled on this machine — wrap commands in `cmd /c "..."`.
- There was no lockfile historically; commit one after a successful install.

## Gotchas

- Never edit `src/styles.generated.css` (build artifact). Edit `src/styles.css` (Tailwind v4 source with Material Design 3 theme tokens) and rerun `build:css`. `angular.json` references only the generated file, so skipping `build:css` breaks styling.
- Root-level `index.html`, `login.html`, `perfil.html`, `posts.html`/`posts.js`, `sobre.html`, `index.js` are legacy static prototypes (Tailwind CDN era). They are dead code — the real SPA shell is `src/index.html`. Don't edit them by mistake.
- Backend DB is sql.js (SQLite/WASM) held in memory and flushed to `backend/doalink.db` every 5 s. Schema is created in code (`inicializarBanco()` in `backend/server.js`), not from `schema.sql`; seed data is inserted when the user table is empty. Delete the `.db` file to reset.
- Auth is prototype-grade: plaintext password comparison, no tokens; session = user JSON in localStorage key `usuario_doalink`; `authGuard` only checks presence. Routes `/hub`, `/perfil`, `/postar` require login; everything else redirects to `/login`.
- Seeded test accounts: `mariana@email.com`, `joao@email.com`, `ana@email.com` — all password `123456`.

## Structure & conventions

- Angular 21 standalone components, lazy-loaded per route (`src/app/app.routes.ts`); services in `src/app/services` call the API directly (no interceptors).
- Feature components follow `hub/hub.component.ts` naming with `templateUrl`/`styleUrl` (singular); the root component is just `App` (new-style naming).
- Design docs and business rules live in `obsidian opencode/` (e.g. `Regras_de_Negocio..md`, `Modelagem_e_Backend.md`) — note they describe the backend as Java, but the actual implemented backend is Node/Express; trust the code.
- Team convention: apply Object Calisthenics where practical (see `obsidian opencode/stacks e padrões.md`).
- Open bug backlog is tracked in `RESUMO_SESSAO_21-08.md` — check it before assuming behavior is correct (known: photo upload sends JSON but backend expects multipart; `id_receptor` hardcoded to 2 in `PUT /api/doacoes/:id/solicitar`).
