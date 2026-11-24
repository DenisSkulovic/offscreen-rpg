# syntax=docker/dockerfile:1
ARG NODE_IMAGE
FROM ${NODE_IMAGE} AS builder
ARG PNPM_VERSION
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
ENV CI=true
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY infra/images/common/docker.npmrc .npmrc
COPY json/ ./
RUN --mount=type=cache,id=offscreen-pnpm-store,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=offscreen-pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --offline
COPY full/ ./
COPY infra/images/common/workspace-graph.mjs infra/images/common/
COPY infra/images/release/ infra/images/release/
RUN pnpm --filter @offscreen/content-packages... build
RUN bash infra/images/release/prepare-runtime-tree.sh packages/content-packages /runtime

FROM ${NODE_IMAGE}
WORKDIR /app
COPY --from=builder --chown=node:node /runtime /app
COPY --chown=node:node scripts/repo-tools/ scripts/repo-tools/
COPY --chown=node:node content/ content/
USER node
ENTRYPOINT ["node"]
CMD ["scripts/repo-tools/import-pinned-fixture.mjs", "--s3"]
