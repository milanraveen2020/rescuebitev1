# RescueBite 🥡

Rescue surplus food. RescueBite is a Too Good To Go–style marketplace where merchants sell discounted
"surprise bags" of surplus food, and customers reserve, pay, and pick them up within a time window.

This is a Turborepo monorepo managed with pnpm.

## What's inside

| Path                   | What it is                                                  | Dev port |
| ---------------------- | ----------------------------------------------------------- | -------- |
| `apps/customer`        | Customer mobile app — React Native + Expo (Expo Router)     | 8081     |
| `apps/merchant`        | Merchant dashboard — Next.js (App Router) + Tailwind/shadcn | 3001     |
| `apps/admin`           | Admin console — Next.js (App Router) + Tailwind/shadcn      | 3002     |
| `apps/api`             | API — NestJS + Prisma + PostgreSQL                          | 4000     |
| `packages/types`       | Domain types + Zod schemas (single source of truth)         | —        |
| `packages/api-client`  | Typed API client used by all three frontends                | —        |
| `packages/ui`          | Design tokens + Tailwind preset                             | —        |
| `packages/config`      | Shared ESLint, tsconfig, Prettier                           | —        |

> **Read [`CLAUDE.md`](./CLAUDE.md) before contributing.** It defines the conventions every change must follow.

## Prerequisites

- **Node.js 22** (see `.nvmrc` — run `nvm use`)
- **pnpm 9** — enable via Corepack: `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- **PostgreSQL 14+** running locally (or via Docker), for the API
- For the customer app: **Expo Go** on a device, or an iOS Simulator / Android Emulator

## Setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Create env files from the examples (one per app)
cp apps/api/.env.example      apps/api/.env
cp apps/merchant/.env.example apps/merchant/.env.local
cp apps/admin/.env.example    apps/admin/.env.local
cp apps/customer/.env.example apps/customer/.env

# 3. Set up the database (edit DATABASE_URL in apps/api/.env first)
pnpm db:generate     # generate the Prisma client
pnpm db:migrate      # create/apply migrations

# 4. Build shared packages once (also handled automatically by turbo)
pnpm build
```

## Running

```bash
pnpm dev               # run everything via Turborepo

# …or run one app at a time:
pnpm dev:api           # NestJS API        → http://localhost:4000
pnpm dev:merchant      # Merchant web      → http://localhost:3001
pnpm dev:admin         # Admin web         → http://localhost:3002
pnpm dev:customer      # Expo dev server   → http://localhost:8081
```

> On a physical device, point `EXPO_PUBLIC_API_BASE_URL` at your machine's LAN IP, not `localhost`.

## Quality scripts

```bash
pnpm typecheck         # strict TS across the monorepo (no `any`)
pnpm lint              # ESLint (named-exports, no-any, no-silent-catch rules)
pnpm test              # unit tests
pnpm format            # Prettier write
pnpm format:check      # Prettier check (CI)
```

These mirror the **Definition of Done** in [`CLAUDE.md`](./CLAUDE.md): typechecks, lints, tested,
all UI states handled (loading / empty / error), formatted.

## Database

The API uses Prisma against PostgreSQL. Common commands:

```bash
pnpm --filter @rescuebite/api db:migrate    # create & apply a dev migration
pnpm --filter @rescuebite/api db:studio     # open Prisma Studio
pnpm --filter @rescuebite/api db:deploy     # apply migrations (prod/CI)
```

The Prisma schema lives at `apps/api/prisma/schema.prisma` and mirrors the Zod domain models in
`packages/types`. The Zod schemas remain the single source of truth for API request/response shapes.

## Conventions (the short version)

- Strict TypeScript, **no `any`**.
- **Zod-validate every API boundary**; types are defined once in `packages/types`.
- Network calls go through `packages/api-client`; styling uses `packages/ui` tokens.
- **Named exports** (framework entry files excepted).
- Friendly, typed error handling — never leak internals.

The full contract is in [`CLAUDE.md`](./CLAUDE.md).
