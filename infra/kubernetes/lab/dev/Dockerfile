# syntax=docker/dockerfile:1
# Build context: repository root (pnpm monorepo). Dev-only: not used for release acceptance.
# Installs workspace dependencies once; source edits sync via Tilt live_update.

FROM docker.io/library/node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate

FROM base AS deps
WORKDIR /app
COPY infra/kubernetes/lab/app-release/docker.npmrc .npmrc
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY tools ./tools
RUN --mount=type=cache,id=offscreen-pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=offscreen-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline
# Workspace packages export types from dist/. Watch mode cannot resolve them until this build.
# The app itself is compiled by its watcher. ^... builds dependencies only, so web does not next-build.
ARG TURBO_FILTER=@offscreen/api^...
RUN pnpm exec turbo run build --filter="${TURBO_FILTER}"

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps --chown=node:node /app/ ./
USER node
EXPOSE 3000