# Mystery Box — Engineering Conventions

> This file is the contract for all work in this repo. Every prompt, PR, and generated file must obey it.
> When something here conflicts with a habit or a framework default, **this file wins**. If a convention
> genuinely needs to change, change it here first, then change the code.

## Brand

- **Name:** Mystery Box
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

## Local development & testing

Code is written on a headless Linux box, but **features are tested on an Android emulator (AVD) on the developer's host PC** — that is the canonical test loop. "Works" means *works on the host AVD*, not merely a green typecheck/lint/test.

- **Run order (all on the host):** (1) PostgreSQL 16 with role/password/db all `rescuebite` on `:5432` (matches the default `DATABASE_URL`); (2) API — `pnpm --filter @rescuebite/api dev` → `http://localhost:4000` (health at `/health`); (3) customer app — `cd apps/customer && npx expo run:android`.
- **Emulator API URL.** The customer app reads its API base URL from `apps/customer/app.json` → `expo.extra.apiBaseUrl` (the `EXPO_PUBLIC_API_BASE_URL` in `.env` is currently **unused**). For the Android emulator this must be **`http://10.0.2.2:4000`** — `10.0.2.2` is the host's loopback as seen from the AVD; `localhost` points at the emulator itself. A physical device uses the host's LAN IP.
- **No Expo Go — dev build only.** The app bundles native modules (`@stripe/stripe-react-native`, `expo-dev-client`, `react-native-maps`), so it runs only as a **dev build** via `expo run:android` (the first run does an implicit `expo prebuild`; `android/` is not committed). Adding a native module forces a rebuild — call it out in the PR. **On Windows, `expo run:android` does NOT work as-is — follow the *Windows host build* recipe below instead.**
- **Env files are gitignored** (only `*.env.example` is tracked). After cloning, create `apps/api/.env` from `apps/api/.env.example`; build the shared packages (`types`, `api-client`, `ui`) before running the app so it resolves their `dist/`.
- **Known gaps when testing:** payments don't complete (Stripe keys are placeholders; PayHere is unbuilt), and seed data is around Dublin (`53.3478, -6.2497`).

### Windows host build (customer app) — known-good recipe

Building the customer dev client on **Windows** hits several native-toolchain traps that don't occur on macOS/Linux. The steps below are the verified working recipe (Windows 11, Android Studio + NDK 27, RN 0.81, pnpm 9). Do them in order; **do not use `expo run:android`** — it forces an `arm64-v8a` build that fails on Windows.

**One-time host setup:**

1. **Short project path.** Clone to a short root like `D:\myst` — *not* a deep path like `C:\Users\<you>\Work\...`. pnpm's virtual-store folder names are very long; combined with a deep path they blow past Windows' 260-char and CMake's 250-char object-path limits, and native builds fail with "cannot find file" / "manifest 'build.ninja' still dirty".
2. **`.npmrc` ships `virtual-store-dir-max-length=40`** (already committed) — shortens `node_modules/.pnpm/*` names, the single biggest cause of the path-length failures. If it's ever missing, add it, delete `node_modules`, and re-run `pnpm install`.
3. **Enable Windows long paths once** (admin PowerShell), then reboot:
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force
   ```
4. **Environment variables** (User vars; reopen the terminal after setting):
   - `ANDROID_HOME` → SDK path (e.g. `D:\AndroidSDK`); add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to `PATH`.
   - `JAVA_HOME` → Android Studio's bundled JDK, `<AndroidStudioInstall>\jbr`; add `%JAVA_HOME%\bin` to `PATH`.
   - Remove any stale Oracle Java from the **System** `PATH` — a broken `C:\ProgramData\Oracle\Java\javapath` shadows the JDK and makes `java` fail (`could not find java.dll`). Verify with `where java` (the `jbr` one must be first) and `java -version`.
5. **pnpm via Corepack** (admin terminal for the first two): `corepack enable`, `corepack prepare pnpm@9.12.0 --activate`. If PowerShell blocks `pnpm.ps1`, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
6. **CMake 3.31.6** — install via Android Studio → SDK Manager → SDK Tools → (tick *Show Package Details*) → CMake. Emulator: a lightweight AVD (e.g. Pixel 6a, **Google APIs** image — not Play Store, non-"16 KB Page Size"), Graphics = Hardware, and on Optimus laptops point `emulator.exe` at the discrete GPU in the NVIDIA Control Panel.

**Build + run (the important part):**

```powershell
# DB + API first (see Run order above): docker start rescuebite-db; pnpm dev:api
cd apps\customer
npx expo prebuild --platform android          # regenerates android/ (not committed)
cd android
.\gradlew.bat app:assembleDebug -x lint -x test -PreactNativeArchitectures=x86_64
#   ^ x86_64 ONLY — skips the arm64 build that fails on Windows (NDK 27 lld rejects
#     -z / --no-rosegment / --no-undefined-version). The emulator is x86_64, so arm64
#     is not needed. First build ~30 min; the emulator need NOT be running to compile.
adb install -r app\build\outputs\apk\debug\app-debug.apk   # emulator must be booted here
cd ..
npx expo start                                 # then press "a" to open on the emulator
```

**Gotchas / recovery:**

- **Gradle fails reading `metadata.bin` or a transform** → the `%USERPROFILE%\.gradle\caches` is corrupted (usually an interrupted delete). Fix: `.\gradlew.bat --stop`, then delete `%USERPROFILE%\.gradle\caches`, then rebuild (re-downloads Gradle bits). If files are locked, `taskkill /F /IM java.exe` first (close Android Studio too).
- **Getting new builds later:** only re-run the *Build + run* block when **native** code changes — a new native module, an `app.json` plugin/config change, or after `expo prebuild`. Everyday JS/TS/UI edits hot-reload through `npx expo start` on the already-installed APK; **no rebuild needed**. After pulling a PR that adds a native dependency, do a fresh `expo prebuild` + `gradlew assembleDebug` (delete `apps/customer/android` first if it's stale).
- **Disk hygiene:** Gradle caches (`%USERPROFILE%\.gradle`) and AVD data (`%USERPROFILE%\.android\avd`) default to C:. Keep the Gradle cache (it speeds up rebuilds); reclaim emulator space via Device Manager → Wipe Data. To stop them growing C: at all, set `GRADLE_USER_HOME` and `ANDROID_AVD_HOME` to D: paths.

## Git & commit authorship

These are **privacy requirements** and apply to **every** commit — human or AI-generated, no exceptions. A commit that breaks any of them is a defect: amend it before pushing.

- **Author is `ParaBoyLord`.** Never commit under a real name. Repo config sets `user.name=ParaBoyLord`.
- **No email.** The commit identity is `ParaBoyLord <>` (empty email). `user.email` is intentionally empty — never introduce a personal email into git config, commit metadata, or anywhere in the repo.
- **No credentials, ever.** No tokens, passwords, or keys in commits, history, or config. Auth for `git push` is supplied interactively by the maintainer and never stored.
- **No attribution trailers.** Never append `Co-Authored-By:` (Claude/Anthropic or any other) or "Generated with …" lines to commit messages. The message ends with its own content — nothing else.
- **Default branch is `Para`.** Commit and push to `Para` unless explicitly told to target `main`.

## Definition of done

A change is done only when **all** of these hold:

1. **Typechecks** — `pnpm typecheck` passes with no errors and no new `any`.
2. **Lints** — `pnpm lint` passes (including the no-`any`, named-export, and no-silent-catch rules).
3. **Tested** — business logic has unit tests; boundary validation and error mapping are covered.
4. **All states handled** — every async UI surface handles **loading, empty, and error** states (not just the happy path). Customer-app changes are exercised on the **host Android emulator** (dev build), not just unit-tested (see *Local development & testing*).
5. **Formatted** — `pnpm format` has been run.
6. **Conventions honored** — types live in `packages/types`, network calls go through `packages/api-client`, styling uses `packages/ui` tokens, and accessibility (labels, contrast, touch targets) is verified.
7. **Commit hygiene** — authored as `ParaBoyLord <>` with **no email, no credentials, and no `Co-Authored-By`/attribution trailer** (see *Git & commit authorship*).
```
