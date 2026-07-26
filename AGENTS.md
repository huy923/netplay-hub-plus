# CyberNet — AGENTS.md

## Identity

Vietnamese internet café (quán net) management: PC rental tracking, food/drink menu, combos, POS, invoices, customer tiers. Built with TanStack Start (React 19, SSR on Cloudflare Workers).

## Stack

- **Framework**: TanStack Start + React 19 + TanStack Router (file-based routes)
- **Build**: Vite 7 via `@lovable.dev/vite-tanstack-config` — bundles tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare plugin, componentTagger
- **CSS**: Tailwind v4 (`@import "tailwindcss" source(none); @source "../src"`), shadcn/ui (new-york style), tw-animate-css
- **DB**: Prisma (SQLite dev / PostgreSQL Docker), Prisma client generated at postinstall
- **Auth**: Supabase
- **Encryption**: AES-256-CBC via `ENCRYPTION_KEY` (32-byte hex)
- **Server target**: Cloudflare Workers (`wrangler.jsonc` → `src/server.ts`)
- **PM**: bun (with 24h supply-chain guard), but npm also works

## Critical gotchas

1. **Never add these Vite plugins manually** (tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare, componentTagger). They're already in `@lovable.dev/vite-tanstack-config` — duplicating them breaks the build. Pass extra config via `defineConfig({ vite: { ... } })`.

2. **`routeTree.gen.ts` is auto-generated** by TanStack Router. Never edit manually. Restart dev server after adding/renaming routes.

3. **Server entry is `src/server.ts`** (not TanStack Start's default). It wraps SSR with error recovery for h3-swallowed exceptions. Configured in `vite.config.ts` via `tanstackStart: { server: { entry: "server" } }`.

4. **Admin routes are local-only**. The app blocks non-localhost access to `/admin/*` via inline checks / `useLocalOnly()` hook.

5. **No `server-only` imports**. TanStack Start uses `.server.ts` file convention or `@tanstack/react-start/server-only`. ESLint enforces this.

6. **`.env` contains secrets** (Supabase keys, encryption key). Keep out of version control.

7. **bun's supply-chain guard**: `bunfig.toml` has `minimumReleaseAge = 86400`. Can block fresh package installs. `@lovable.dev/vite-tanstack-config` is excluded. Add other excludes only with user confirmation.

## Commands

| Command                        | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `npm run dev`                  | Dev server                                   |
| `npm run build`                | Production build                             |
| `npm run build:dev`            | Dev-mode build                               |
| `npm run preview`              | Preview production build                     |
| `npm run lint`                 | ESLint (flat config, `eslint.config.js`)     |
| `npm run format`               | Prettier (100 printWidth, trailingComma all) |
| `npm run db:push`              | Prisma schema → DB                           |
| `npm run db:seed`              | Seed sample data                             |
| `docker-compose up -d --build` | Full stack (PostgreSQL + app)                |

`postinstall` auto-runs `prisma generate --schema=./prisma/schema.prisma`.

## First-time setup

```sh
npm install          # installs deps + generates Prisma client
npx prisma db push   # creates dev.db (SQLite)
npx prisma db seed   # loads sample data
npm run dev
```

## Architecture notes

- **All server logic** (DB queries, encryption) lives in `src/lib/` via `createServerFn` from `@tanstack/react-start`.
- **Route files** at `src/routes/` — flat, file-based. No nested dirs.
- **Error handling**: `src/server.ts` catches h3-swallowed SSR errors, `src/start.ts` adds request middleware.
- **`src/lib/prisma.server.ts`** — singleton Prisma client (logs errors+warn only).
- **`src/lib/encryption.ts`** — encrypt/decrypt with AES-256-CBC, `iv:encrypted` format.
- **`src/lib/cybernet.functions.ts`** — all server functions (machines, menu, customers, combos, invoices, auth).

## Testing

No test framework configured. No test files found. No CI workflow.

## File conventions

- `*.server.ts` — server-only code
- `lib/` — shared utilities and server functions
- `components/ui/` — shadcn/ui primitives
- `components/` — app-level components
- `hooks/` — custom React hooks
- `integrations/supabase/` — Supabase client and auth middleware
