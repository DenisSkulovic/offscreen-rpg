FROM docker.io/library/node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee
WORKDIR /app
COPY infra/verification/release-acceptance/content-bootstrap/package.json infra/verification/release-acceptance/content-bootstrap/package-lock.json ./
RUN npm ci --omit=dev
COPY packages/documents/dist ./packages/documents/dist
COPY scripts/repo-tools/import-pinned-fixture.mjs scripts/repo-tools/read-pinned-fixture.mjs ./scripts/repo-tools/
COPY content/worlds/vvardenfell-poc ./content/worlds/vvardenfell-poc
COPY content/rules/srd-5.2.1-subset ./content/rules/srd-5.2.1-subset
COPY content/starts/seyda-neen-prisoner ./content/starts/seyda-neen-prisoner
USER node
ENTRYPOINT ["node"]
CMD ["scripts/repo-tools/import-pinned-fixture.mjs", "--s3"]
