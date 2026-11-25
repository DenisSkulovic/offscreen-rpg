# syntax=docker/dockerfile:1
# Build context: repository root (pnpm monorepo). Dev-only: not used for release acceptance.
# Installs workspace dependencies once; source edits sync via Tilt live_update.

ARG NODE_IMAGE
ARG PNPM_VERSION

FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV COREPACK_HOME="/opt/offscreen-corepack"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && chmod -R a+rX "$COREPACK_HOME"

FROM base AS deps
WORKDIR /app
COPY infra/images/common/docker.npmrc .npmrc
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
# One immutable image for every dev role. Containers still start their own command.
# ^... builds workspace prerequisites only; application source stays on the Tilt watcher.
RUN pnpm exec turbo run build \
  --filter=@offscreen/web^... \
  --filter=@offscreen/api^... \
  --filter=@offscreen/game-authority^... \
  --filter=@offscreen/worker^...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps --chown=node:node /app/ ./
USER node
RUN pnpm --version
RUN node tools/dev-environments/runtime/check-packaging.mjs --check
EXPOSE 3000