> Historical source scope closed by owner 2026-11-27. Legacy artifact-specific acceptance retired; no dispatch or new PASS. Existing design/evidence retained.

# MA12 | bounded Cursor tasks

Branch linked `change/ma12-production-api-lab-isolation` from current undertaking HEAD; run change-branch guard. Parent implements T01→T05 and sends tested branch SHA to batch custodian without independently merging.

**T01 Core API seam.** Read `apps/api/src/{app,main}.ts`, `apps/api/src/modules/auth/identity.ts`, `apps/api/src/modules/drafts/openings-controller.ts`, `apps/api/package.json`. Write app, new lab-host-contract, manifest. Positive production API compiles sans Lab dependency; negative dev routes not implicitly available, auth/origin unchanged.
**T02 Outer Lab package.** Read the 3 Lab controllers and `tools/chamber/tsconfig.json`; move files into new tools/api-lab/src; create package, tsconfig, create-lab-app factory. Positive all four controllers/DI tokens/paths preserved; negative no API→Lab import, no second Nest app.
**T03 Consumer migration.** Read `tools/chamber/src/main.ts`, `tools/api-integration/test/helpers/{app-integration,boot03-distributed-app-integration,story03-causal-multiprocess-harness}.ts`; edit those and manifests for explicit outer factory. Positive all original lab tests compile; negative direct production callers still use createApp and Lab routes remain gated.
**T04 Artifact closure and production tree.** Read `infra/kubernetes/lab/app-release/{Dockerfile.api,prepare-runtime-tree.sh}`, `apps/api/package.json`, `apps/game-authority/package.json`, `pnpm-workspace.yaml`. Write `prepare-runtime-tree.sh` and new `production-workspace-closure.mjs`/test **only** within app-release root (not `turn03/`). Build a runtime dependency DFS from workspace manifests; copy only reachable workspaces, preserve symlinks, include required GA app and migration assets, fail on missing dist; API Lab not in production API closure. Positive closure checks; negative devDependencies not included, unknown/missing workspace denied. STOP if actual non-API release would lose a runtime workspace.
**T05 Verification.** Run focused API/API Lab/Chamber/API Integration build+typecheck and auth/lab controller tests, `pnpm repo:module-graph`, source/import manifest check, `git diff --check`. Check bad origin, wrong owner and malformed body. Report precise results, no fake production Docker image PASS. No change outside owned files.

No paid provider requests, database reset, cluster deploy or main branch change.
