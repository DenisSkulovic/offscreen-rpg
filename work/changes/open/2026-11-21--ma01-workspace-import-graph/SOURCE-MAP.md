# MA01 | inspected source

- `pnpm-workspace.yaml`: apps/packages/tools globs; `package.json`: `typescript@5.9.3`, root scripts and Turbo CLI. `turbo.json`: `build` depends on `^build`, `typecheck` on `^build`. `eslint.config.mjs`: restrictions for game, contracts, storyteller, workflows, browser, but no application subdomain constraints.
- Manifests: `packages/application/package.json` depends on storyteller, game, contracts, documents, db; `packages/cache/package.json` depends on application; `packages/contracts/package.json` depends on documents and game; `apps/{api,game-authority,worker}/package.json` depend on application.
- Source examples: `application/src/stories/index.ts` imports `../storyteller/recovery` and `../developer-tools/chamber-fixtures`; `storyteller/publication.ts` imports story and campaign mutation utilities; `stories/resolution.ts` imports `storyteller/admission`. These cross-edges must be visible separately from package manifest edges.
- Existing read-only tooling patterns: `scripts/repo-tools/process.mjs`, `maintenance-core.mjs`, existing `repo:code-quality:changed`/planned CQ05. Do **not** modify CQ05's separate growth scoring or duplicate its report.
- `packages/application/src/storyteller/index.ts` wide star barrel; inspect public export consumer mapping (don't rewrite it in this packet).
