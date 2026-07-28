# Mystery Box API — production image.
#
# Built from the monorepo root as the build context (see .dockerignore at root),
# because pnpm workspaces resolve @rescuebite/types via a symlink into
# node_modules — the API cannot build in isolation from apps/api alone.
#
# Multi-stage: `deps` installs once and is reused by both `build` and the
# pruned runtime, `build` compiles @rescuebite/types then the API and runs
# `prisma generate`, and the final stage ships only the compiled output plus
# production node_modules — no source, no dev dependencies, no build tools.

FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app

# --- deps: install once, cached across builds unless lockfiles change -------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json packages/types/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/
COPY apps/api/package.json apps/api/
# Native deps (argon2) need a C++ toolchain to build during install.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*
RUN pnpm install --frozen-lockfile

# --- build: compile the workspace types package, then the API --------------
FROM deps AS build
COPY packages/types packages/types
COPY packages/config packages/config
COPY apps/api apps/api
RUN pnpm --filter @rescuebite/types build
RUN pnpm --filter @rescuebite/api exec prisma generate
RUN pnpm --filter @rescuebite/api build

# --- runtime: only what's needed to run the compiled server ------------------
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/types/dist ./packages/types/dist
COPY --from=build /app/packages/types/package.json ./packages/types/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

EXPOSE 4000
# Railway (and most PaaS) route on $PORT; env.schema.ts already defaults PORT to
# 4000 and reads whatever the platform injects, so no extra wiring is needed.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
