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

## Payments (Stripe Connect, test mode)

RescueBite runs as a **marketplace**: customers pay, the platform takes a commission
(`PLATFORM_FEE_BPS`, default 10%), and the remainder is transferred to the merchant's connected
Stripe **Express** account. Amounts are always recomputed server-side from the order — never
trusted from the client.

### Setup

1. Create a [Stripe test-mode account](https://dashboard.stripe.com/test) and enable **Connect**.
2. Put your keys in `apps/api/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   PLATFORM_FEE_BPS=1000
   ```
3. Forward webhooks to the API with the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   stripe login
   stripe listen --forward-to localhost:4000/payments/webhook
   ```
   Copy the printed `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET` and restart the API.

The webhook endpoint (`POST /payments/webhook`) verifies the Stripe signature against the raw
request body and handles `payment_intent.succeeded` (RESERVED → PAID),
`payment_intent.payment_failed`, `charge.refunded` (→ REFUNDED + restock), and `account.updated`
(sets `payoutsEnabled`). Handlers are idempotent.

### Flows

- **Merchant onboarding:** `POST /payments/connect/onboarding` returns a Stripe onboarding URL
  (the merchant **Payouts** page links to it). `GET /payments/connect/status` shows connection state.
- **Customer checkout:** `POST /payments/orders/:id/checkout` creates a PaymentIntent (with
  `application_fee_amount` + `transfer_data` to the merchant) and returns a `clientSecret`; the
  client confirms with Stripe.js. The success webhook moves the order to PAID.
- **Refund:** `POST /payments/orders/:id/refund` (merchant) issues a Stripe refund, restocks, and
  sets REFUNDED.

### Test cards

| Card                  | Result                          |
| --------------------- | ------------------------------- |
| `4242 4242 4242 4242` | Payment succeeds                |
| `4000 0000 0000 9995` | Declined (insufficient funds)   |
| `4000 0025 0000 3155` | Requires 3DS authentication     |

Use any future expiry, any CVC, any postal code. For Connect onboarding, Stripe's test mode lets
you fast-forward with prefilled data.

## Conventions (the short version)

- Strict TypeScript, **no `any`**.
- **Zod-validate every API boundary**; types are defined once in `packages/types`.
- Network calls go through `packages/api-client`; styling uses `packages/ui` tokens.
- **Named exports** (framework entry files excepted).
- Friendly, typed error handling — never leak internals.

The full contract is in [`CLAUDE.md`](./CLAUDE.md).
