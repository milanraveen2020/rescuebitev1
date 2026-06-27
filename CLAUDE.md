# RescueBite — Engineering Conventions

> This file is the contract for all work in this repo. Every prompt, PR, and generated file must obey it.
> When something here conflicts with a habit or a framework default, **this file wins**. If a convention
> genuinely needs to change, change it here first, then change the code.

## Brand

- **Name:** RescueBite
- **Mission:** Rescue surplus food — let merchants sell discounted "surprise bags" of surplus food that customers reserve, pay for, and pick up within a time window.
- **Tone:** Warm, sustainable, a little playful. We're fighting food waste and it should feel good. Friendly, never preachy; clever, never cute-to-the-point-of-confusing.

## Stack

| Layer            | Technology                                                        | Location         |
| ---------------- | ----------------------------------------------------------------- | ---------------- |
| Customer app     | React Native + Expo (Expo Router), TypeScript                     | `apps/customer`  |
| Merchant web     | Next.js (App Router), TypeScript, Tailwind, shadcn/ui             | `apps/merchant`  |
| Admin web        | Next.js (App Router), TypeScript, Tailwind, shadcn/ui             | `apps/admin`     |
| API              | NestJS, TypeScript, Prisma, PostgreSQL                            | `apps/api`       |
| Shared types     | Domain types + Zod schemas (single source of truth)               | `packages/types` |
| API client       | Typed client used by all three frontends                          | `packages/api-client` |
| Design tokens    | Colors, spacing, radii, typography                                | `packages/ui`    |
| Shared config    | ESLint, tsconfig, Prettier                                        | `packages/config`|
| Monorepo         | Turborepo + pnpm workspaces                                       | repo root        |

## Repository layout

```
rescuebite/
├─ apps/
│  ├─ customer/   Expo app. Screens in app/ (Expo Router). Feature code in src/features/<feature>.
│  ├─ merchant/   Next.js. Routes in src/app/. Feature code in src/features/<feature>.
│  ├─ admin/      Next.js. Same structure as merchant.
│  └─ api/        NestJS. One folder per feature module under src/. Cross-cutting code in src/common.
├─ packages/
│  ├─ types/      Zod schemas + inferred TS types. THE source of truth for every data shape.
│  ├─ api-client/ Transport (ApiClient) + per-resource modules that return typed Results.
│  ├─ ui/         Design tokens (src/tokens.ts) + Tailwind preset (tailwind-preset.mjs).
│  └─ config/     eslint/, tsconfig/, prettier/ — extended by every app and package.
├─ turbo.json     Task pipeline.
└─ pnpm-workspace.yaml
```

### Where each kind of file lives

- **A data shape** (entity, request body, response, enum) → `packages/types`. Never redeclare it elsewhere; import it.
- **A network call** → a resource module in `packages/api-client`. Frontends never call `fetch` directly.
- **A color / spacing / radius / font value** → `packages/ui` tokens. No hardcoded hex or pixel values in apps.
- **A feature** (UI + hooks + local logic) → `src/features/<feature>/` in the relevant app (feature-folder structure).
- **A NestJS feature** → `apps/api/src/<feature>/` with its `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- **Cross-cutting API code** (filters, pipes, guards, Prisma) → `apps/api/src/common/`.

## Coding standards

- **Strict TypeScript, no `any`.** `strict` plus `noUncheckedIndexedAccess` are on. `@typescript-eslint/no-explicit-any` is an **error**, as are the `no-unsafe-*` rules. If a type is unknown, use `unknown` and narrow it.
- **Zod-validate every API boundary.** Every value crossing a boundary — HTTP request bodies/params, HTTP responses, env vars, third-party payloads — is parsed with a schema from `packages/types`. On the server use `ZodValidationPipe`; in the client the `ApiClient` parses responses. No unparsed data flows inward.
- **Single source of truth.** Types are defined once in `packages/types` as Zod schemas and the TS type is inferred from the schema (`z.infer`). Prisma owns persistence only; if the schema and Zod diverge, reconcile them in the same change.
- **Feature-folder structure.** Group by feature, not by file type. A feature owns its components, hooks, and logic.
- **Named exports only.** No default exports, except where a framework requires them (Next.js `page`/`layout`/`route`/config, Expo Router screens, Next/Expo config files). ESLint enforces this and whitelists those paths.
- **Money is integer minor units.** Store and pass `{ amountMinor, currency }`. Never use floats for money.
- **Naming:** `PascalCase` types/components/classes, `camelCase` values/functions, `SCREAMING_SNAKE_CASE` consts/env, `kebab-case` file names (except React component files, which are `PascalCase.tsx`).

## Design principles

- **Mobile-first.** Design the smallest screen first, then enhance upward.
- **Generous whitespace.** Let the food and the offer breathe.
- **One primary action per screen.** Exactly one obvious next step; everything else is secondary or tertiary.
- **8pt spacing grid.** All spacing is a multiple of 8 (4 allowed for tight pairs). Use `packages/ui` spacing tokens / the Tailwind preset — never arbitrary pixels.
- **Accessible (WCAG AA).** ≥4.5:1 contrast for text, ≥3:1 for large text/UI. Real labels on inputs, focus states, 44×44pt minimum touch targets, respect reduced-motion.
- **Brand-consistent.** Color, type, and copy come from the design tokens and the tone above.

## Error handling

- **Typed results, no silent catches.** Server code throws typed `HttpException`s (or `ZodError`); `HttpExceptionFilter` normalizes everything to the `ApiError` envelope from `packages/types`. The client returns `Result<T, ApiError>` — callers handle both branches.
- **Never leak internals.** 5xx details, stack traces, SQL, and framework messages are logged server-side but never sent to a client. User-facing messages are friendly and actionable.
- **No empty catches.** `no-empty` (with `allowEmptyCatch: false`) is enforced. Either handle the error, convert it to a typed result, or rethrow — never swallow it.
- **Promises are handled.** `no-floating-promises` / `no-misused-promises` are on; `await` or explicitly `void` every promise.

## Definition of done

A change is done only when **all** of these hold:

1. **Typechecks** — `pnpm typecheck` passes with no errors and no new `any`.
2. **Lints** — `pnpm lint` passes (including the no-`any`, named-export, and no-silent-catch rules).
3. **Tested** — business logic has unit tests; boundary validation and error mapping are covered.
4. **All states handled** — every async UI surface handles **loading, empty, and error** states (not just the happy path).
5. **Formatted** — `pnpm format` has been run.
6. **Conventions honored** — types live in `packages/types`, network calls go through `packages/api-client`, styling uses `packages/ui` tokens, and accessibility (labels, contrast, touch targets) is verified.
```
