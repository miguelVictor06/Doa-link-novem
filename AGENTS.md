# AGENTS.md

DoaLink: donation marketplace prototype. Two separate packages: Angular 21 app at repo root, Node backend in `backend/`. All code, comments, and UI/API text are Portuguese (pt-BR) — keep it that way.

## Commands

- Dev server (run both, two terminals):
  - `npm run build:css` — Tailwind: compiles `src/styles.css` -> `src/styles.generated.css`
  - `npx ng serve` — SPA on http://localhost:4200
- Build: `npm run build` (runs `build:css` first — required, see gotchas)
- Backend: `cd backend && npm start` — Express on port 8080; requires `DATABASE_URL` PostgreSQL/Neon, Cloudinary credentials, and `.env` (see `backend/.env.example`).
- Migração SQLite -> PostgreSQL: `cd backend && npm run migrate`; backup automático em `backend/backups/`; envia fotos ao Cloudinary.
- Migração de binários antigos do PostgreSQL para Cloudinary: `cd backend && npm run migrar:arquivos`.
- Teste de integração backend: `cd backend && npm run test:integracao` (precisa de banco migrado).
- Teste real de upload/recuperação no Cloudinary: `cd backend && npm run test:cloudinary` (precisa de credenciais reais).
- Tests: `ng test` (Vitest). No test files exist; `angular.json` sets `skipTests: true` for all schematics, so don't expect or generate specs.

## Package manager (this machine)

- `npm install` hangs indefinitely here — do not use it.
- Install with: `cmd /c "npx --yes pnpm@10 install --config.package-manager-strict=false"`
  (the flag is mandatory because `package.json` pins `"packageManager": "npm@11.6.2"`).
- pnpm 10 blocks dependency postinstall scripts; if esbuild/lightningcss show "ignored build scripts", approve with `cmd /c "npx pnpm approve-builds"`.
- The repo root has a `.npmrc` with `node-linker=hoisted` + `package-manager-strict=false`. It is REQUIRED here: the pnpm default virtual store (`.pnpm`) hits `ERR_PNPM_EISDIR` on this Windows machine when creating directory symlinks.
- Do NOT create a `pnpm-workspace.yaml` at the repo root: it makes `backend/` (which has its own package.json) a workspace member and the install mixes backend deps into the root `node_modules`, breaking the build.
- PowerShell script execution is disabled on this machine — wrap commands in `cmd /c "..."`.
- There was no lockfile historically; commit one after a successful install (`pnpm-lock.yaml` now exists).
- `approve-builds` is interactive; the four ignored build scripts (`@parcel/watcher`, `esbuild`, `lmdb`, `msgpackr-extract`) do NOT block `ng serve`/`ng build` under the hoisted linker.

## Gotchas

- Never edit `src/styles.generated.css` (build artifact). Edit `src/styles.css` (Tailwind v4 source with Material Design 3 theme tokens) and rerun `build:css`. `angular.json` references only the generated file, so skipping `build:css` breaks styling.
- Root-level `index.html`, `login.html`, `perfil.html`, `posts.html`/`posts.js`, `sobre.html`, `index.js` are legacy static prototypes (Tailwind CDN era). They are dead code — the real SPA shell is `src/index.html`. Don't edit them by mistake.
- Backend DB is PostgreSQL/Neon. `backend/doalink.db` is now only the SQLite source for `npm run migrate`; do not edit or delete it before confirming the backup.
- Schema lives in `backend/migrations/*.sql` and is applied by `backend/src/database/migrator.js`. `backend/doalink.db` is migrated with IDs preserved; images referenced by `/uploads/` are uploaded to Cloudinary and only metadata remains in PostgreSQL (`arquivo`).
- Auth uses bcrypt and opaque HttpOnly session cookies stored in PostgreSQL (`sessao`); frontend has no localStorage session. `authGuard` still checks presence. Routes `/hub`, `/perfil`, `/postar` require login; everything else redirects to `/login`.
- Seeded test accounts: `mariana@email.com`, `joao@email.com`, `ana@email.com` — all password `123456`.

## Structure & conventions

- Angular 21 standalone components, lazy-loaded per route (`src/app/app.routes.ts`); services in `src/app/services` use `api-config.ts` + `credentialsInterceptor` for cookie sessions.
- Feature components follow `hub/hub.component.ts` naming with `templateUrl`/`styleUrl` (singular); the root component is just `App` (new-style naming).
- Design docs and business rules live in `obsidian opencode/` (e.g. `Regras_de_Negocio..md`, `Modelagem_e_Backend.md`) — note they describe the backend as Java, but the actual implemented backend is Node/Express; trust the code.
- Team convention: apply Object Calisthenics where practical (see `obsidian opencode/stacks e padrões.md`).
- Open bug backlog is tracked in `RESUMO_SESSAO_21-08.md`; the PostgreSQL migration fixed the old photo-upload JSON/multipart mismatch and the hardcoded `id_receptor`.
