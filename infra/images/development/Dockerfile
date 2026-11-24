# syntax=docker/dockerfile:1
# Build context: repository root (pnpm monorepo). Dev-only: not used for release acceptance.
# Installs workspace dependencies once; source edits sync via Tilt live_update.

ARG NODE_IMAGE
ARG PNPM_VERSION

FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

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
# Commands run inside each app directory. Copy the entrypoints again so a
# reused dependency layer cannot omit a watcher that the deployment invokes.
COPY --chown=node:node apps/api/dev-pod-compile-watch.mjs apps/api/dev-pod-compile-watch.mjs
COPY --chown=node:node apps/game-authority/dev-pod-compile-watch.mjs apps/game-authority/dev-pod-compile-watch.mjs
COPY --chown=node:node apps/worker/dev-pod-compile-watch.mjs apps/worker/dev-pod-compile-watch.mjs
COPY --chown=node:node apps/web/dev-pod-web-receipt.mjs apps/web/dev-pod-web-receipt.mjs
# Slot watchers import these modules. The rest of infra is not part of the dev image.
COPY --chown=node:node infra/dev/dev-watched-compilation-receipt.mjs infra/dev/dev-watched-compilation-receipt.mjs
COPY --chown=node:node infra/dev/dev-watch-compilation.mjs infra/dev/dev-watch-compilation.mjs
COPY --chown=node:node infra/dev/dev-image-runtime-modules.mjs infra/dev/dev-image-runtime-modules.mjs
USER node
RUN node infra/dev/dev-image-runtime-modules.mjs --check
EXPOSE 3000