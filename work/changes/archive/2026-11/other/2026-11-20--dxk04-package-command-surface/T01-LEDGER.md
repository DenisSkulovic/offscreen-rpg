# DXK04 T01 | root `package.json` script disposition ledger

Baseline: root `package.json` at worktree HEAD **9dffd2ed** (69 scripts). Consumers searched under `.github/`, `docs/`, `.agents/`, `.cursor/`, `tests/`, workspace `package.json`, and `scripts/repo-tools/*` usage strings (`rg` per script name + `pnpm` prefix).

| Script | Disposition | Owner | Consumers | Reason |
| --- | --- | --- | --- | --- |
| `dev` — `node scripts/repo-tools/dev-tilt.mjs` | KEEP_ROOT | root | `docs/runbooks/kubernetes-developer-ui.md`, `docs/runbooks/local-development.md`, `docs/technical/platform/deployment-and-compatibility.md`, `STATUS.md` | Mandated single Tilt/kind dev front door (DXK02). |
| `dev:host` — `turbo run dev` | DELETE | retire | `docs/runbooks/kubernetes-developer-ui.md` | Legacy host turbo watchers; not CI; explicitly not second app boot. |
| `build` — `turbo run build` | KEEP_ROOT | root | `.github/workflows/code.yml`, `.agents/rules/verification.md`, `docs/runbooks/local-development.md` | CI and milestone build surface. |
| `typecheck` — `turbo run typecheck` | KEEP_ROOT | root | `.github/workflows/code.yml`, `.agents/rules/verification.md`, `docs/runbooks/local-development.md` | CI typecheck gate. |
| `test` — `turbo run test` | KEEP_ROOT | root | `.github/workflows/code.yml`, `.agents/rules/verification.md`, `docs/runbooks/local-development.md`, `docs/runbooks/local-integration-tests.md` | Repository-wide test entry; CI uses filtered turbo for non-web. |
| `test:fast` — `turbo run test:fast --filter=@offscreen/web` | KEEP_ROOT | root | `.github/workflows/code.yml`, `docs/runbooks/local-development.md`, `docs/technical/client/living-book-poc.md` | Mandated fast web unit lane; CI job step. |
| `test:db` — `pnpm --filter @offscreen/db … test:integration` | KEEP_ROOT | root | `.github/workflows/code.yml`, `docs/runbooks/local-integration-tests.md` | CI database job; disposable Postgres integration. |
| `test:auth` — build api-integration + `test:integration` | KEEP_ROOT | root | `docs/runbooks/local-integration-tests.md` | Stable integration selector documented for auth lane. |
| `test:stories` — build api-integration + `test:stories` | KEEP_ROOT | root | `docs/runbooks/local-integration-tests.md`, `tools/api-integration/package.json` | Stable stories integration entry matching package script. |
| `test:focus` — `node scripts/repo-tools/focused-integration.mjs` | KEEP_ROOT | root | `.agents/rules/verification.md`, `docs/runbooks/local-integration-tests.md`, `scripts/repo-tools/focused-integration.mjs` | Authorized disposable DB suite wrapper; documented guardrails. |
| `db:migrate` — `pnpm --filter @offscreen/db migrate` | KEEP_ROOT | root | `docs/runbooks/local-development.md`, `docs/runbooks/local-integration-tests.md`, `docs/runbooks/release-restore-readiness.md` | Canonical migration entry for local and runbooks. |
| `db:baseline` — `node scripts/repo-tools/baseline.mjs` | KEEP_ROOT | root | `docs/runbooks/local-development.md`, `docs/runbooks/local-integration-tests.md` | Documented migration authoring; side-effect explicit in runbooks. |
| `db:reset:test` — `node scripts/repo-tools/reset-test-db.mjs` | KEEP_ROOT | root | `.agents/rules/verification.md`, `docs/runbooks/local-development.md`, `docs/runbooks/local-integration-tests.md` | Disposable test DB reset; integration docs. |
| `admin:bootstrap-staff` — `node scripts/repo-tools/admin-bootstrap-staff.mjs` | KEEP_ROOT | root | NONE_FOUND | Mandated stable staff-bootstrap script surface (DXK03 route); no doc/CI string yet. |
| `repo:brief` — `node scripts/repo-tools/brief.mjs` | KEEP_ROOT | root | `.agents/README.md`, `AGENTS.md`, `docs/runbooks/local-development.md`, `scripts/repo-tools/brief.mjs` | Mandated selector/status brief for agents and devs. |
| `repo:snapshot:chatgpt` — `node scripts/repo-tools/chatgpt-snapshot.mjs` | KEEP_ROOT | root | `.agents/README.md`, `.agents/HARNESS.md`, `docs/runbooks/chatgpt-design-snapshot.md` | Documented ChatGPT export route; keep on root harness surface. |
| `repo:snapshot:chatgpt:test` — `node --test …chatgpt-snapshot.test.mjs` | DELETE | scripts/repo-tools | `docs/runbooks/chatgpt-design-snapshot.md` | Test-only alias; invoke `node --test` directly from repo-tools. |
| `repo:docs-health` — `node scripts/repo-tools/docs-health.mjs` | KEEP_ROOT | root | `.agents/README.md`, `.agents/rules/documentation.md`, `scripts/repo-tools/docs-health.mjs` | Change/checkpoint doc health; agent command route. |
| `repo:maintenance` — `node scripts/repo-tools/maintenance.mjs` | KEEP_ROOT | root | `.agents/README.md`, `.github/workflows/maintenance.yml` (direct `node`), `.agents/references/repository-maintenance.md` | Lifecycle gate; workflow calls underlying script but root alias is harness surface. |
| `repo:maintenance:test` — `node --test …maintenance*.test.mjs` | DELETE | scripts/repo-tools | NONE_FOUND | Meta test runner; not CI; run listed files via `node --test` without root alias. |
| `wiki:health` — `node scripts/repo-tools/wiki-health.mjs` | KEEP_ROOT | root | `.agents/README.md`, `AGENTS.md`, `ENGINEERING.md`, `scripts/repo-tools/wiki-health.mjs` | Mandated wiki navigation / graph health. |
| `wiki:content-health` — `node scripts/repo-tools/wiki-content-health.mjs` | KEEP_ROOT | root | `docs/runbooks/content-package-authoring.md`, `scripts/repo-tools/wiki-content-health.mjs` | Wiki sibling; maintained content checks. |
| `wiki:graph` — `wiki-health.mjs --graph` | KEEP_ROOT | root | `.agents/README.md`, `scripts/repo-tools/wiki-health.mjs` | Wiki sibling; graph export documented in agents README. |
| `wiki:bench:static` — `node scripts/repo-tools/wiki-bench-static.mjs` | KEEP_ROOT | root | `.agents/README.md`, `ENGINEERING.md` | Wiki sibling; static retrieval benchmark route. |
| `wiki:change-guard` — `node scripts/repo-tools/wiki-change-guard.mjs` | KEEP_ROOT | root | `.agents/references/repository-maintenance.md`, `.agents/rules/documentation.md`, `scripts/repo-tools/wiki-change-guard.mjs` | Change close/plan guard; agent maintenance flow. |
| `wiki:find` — `node scripts/repo-tools/wiki-find.mjs` | KEEP_ROOT | root | `AGENTS.md`, `.agents/references/documentation-navigation-standard.md`, `scripts/repo-tools/wiki-find.mjs` | Mandated wiki navigation entry. |
| `wiki:read` — `node scripts/repo-tools/wiki-read.mjs` | KEEP_ROOT | root | `AGENTS.md`, `.agents/references/documentation-navigation-standard.md`, `scripts/repo-tools/wiki-read.mjs` | Mandated wiki navigation entry. |
| `infra` — `node scripts/repo-tools/compose.mjs` | DELETE | scripts/repo-tools | `docs/runbooks/local-development.md`, `scripts/repo-tools/compose.mjs`, `.cursor/rules/local-infra-unblock.mdc` (mentions `infra:up`) | Compose wrapper; not in CI; DXK06 owns compose removal—drop public root alias after doc migration. |
| `lint` — `eslint . --max-warnings 0` | KEEP_ROOT | root | `.agents/rules/verification.md`, `docs/runbooks/local-development.md` | Repo-wide lint; milestone verification (CI uses `lint:web` subset). |
| `lint:web` — `eslint apps/web/**/*.tsx` | KEEP_ROOT | root | `.github/workflows/code.yml`, `apps/web/src/lib/README.md` | CI React/Next lint gate. |
| `lint:web:negatives` — `node scripts/repo-tools/web-lint-negatives.mjs` | KEEP_ROOT | root | `.github/workflows/code.yml`, `apps/web/src/test/lint-fixtures/*` | CI discriminating lint fixtures. |
| `format` — `prettier --write .` | KEEP_ROOT | root | `.agents/rules/verification.md`, `docs/runbooks/local-development.md` | Developer format fix entry. |
| `format:check` — `prettier --check .` | KEEP_ROOT | root | `.github/workflows/code.yml`, `.agents/rules/verification.md` | CI formatting gate. |
| `infra:up` — `compose.mjs up -d --wait` | DELETE | scripts/repo-tools | `docs/runbooks/local-development.md`, `docs/runbooks/release-restore-readiness.md`, `scripts/repo-tools/repair-docker-desktop.ps1`, `.cursor/rules/local-infra-unblock.mdc` | No `.github` consumer; replace startup docs with `stack:*`/`pnpm dev` (DXK06/DXK07). |
| `infra:down` — `compose.mjs down` | DELETE | scripts/repo-tools | `docs/runbooks/local-development.md` | No CI consumer; Compose retirement removes root alias only. |
| `stack:preflight` — `node scripts/repo-tools/stack-preflight.mjs` | KEEP_ROOT | root | `docs/technical/platform/deployment-and-compatibility.md` | Mandated lab lifecycle surface (DXK01). |
| `stack:up` — `node scripts/repo-tools/stack.mjs up` | KEEP_ROOT | root | `docs/technical/platform/deployment-and-compatibility.md` | Mandated lab lifecycle surface. |
| `stack:status` — `node scripts/repo-tools/stack.mjs status` | KEEP_ROOT | root | `docs/technical/platform/deployment-and-compatibility.md` | Mandated lab lifecycle surface. |
| `stack:down` — `node scripts/repo-tools/stack.mjs down` | KEEP_ROOT | root | `docs/technical/platform/deployment-and-compatibility.md` | Mandated lab lifecycle surface. |
| `stack:reset` — `node scripts/repo-tools/stack.mjs reset` | KEEP_ROOT | root | `docs/technical/platform/deployment-and-compatibility.md` | Mandated lab lifecycle surface. |
| `infra:repair` — `powershell … repair-docker-desktop.ps1` | DELETE | scripts/repo-tools | `docs/runbooks/local-development.md` | Windows Compose repair; not CI; retire from root when Compose path deleted (script may remain on disk). |
| `chamber` — turbo build `@offscreen/chamber` + `start` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-integration-tests.md`, `docs/technical/lab/experiment-protocol.md`, `tools/chamber/README.md`, `packages/application/test/lab-evidence.test.mjs` | Chamber entry; re-home alias in `tools/chamber/package.json`; docs cite root today. |
| `chamber:bench` — builds + `chamber bench` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/technical/lab/experiment-protocol.md`, `tools/chamber/README.md`, `tools/chamber/src/bench-cli.ts` | Bench CLI owned by chamber package. |
| `chamber:scenario` — builds + `chamber scenario` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/technical/lab/experiment-protocol.md`, `packages/application/test/lab-evidence.test.mjs`, `tools/chamber/src/scenario-cli.ts` | Scenario lab route; test asserts command string. |
| `chamber:inspect` — builds + `chamber inspect` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/technical/lab/experiment-protocol.md`, `tools/chamber/src/inspect-cli.ts` | Inspect CLI owned by chamber. |
| `story:local` — chamber `start --story-mode` | DELETE | retire | `docs/runbooks/content-package-authoring.md`, `docs/runbooks/local-storyteller-rehearsal.md` | Redundant public story boot; no CI; remove after runbook points to chamber/`pnpm dev`. |
| `story:server` — chamber `start --story-mode --no-browser` | DELETE | retire | `docs/runbooks/content-package-authoring.md`, `docs/runbooks/local-storyteller-rehearsal.md` | Same redundant boot path; docs-only consumers. |
| `story:play` — `node scripts/repo-tools/story-play.mjs` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-storyteller-rehearsal.md`, `scripts/repo-tools/story-play.mjs` | Story REPL wrapper; T02 moves invocation under chamber tooling owner. |
| `story:inspect` — `node scripts/repo-tools/story-session-report.mjs` | MOVE_TO_EXISTING_OWNER | tools/chamber | `scripts/repo-tools/story-session-report.mjs` | Session report wrapper; same chamber tooling move (keep script on disk). |
| `fixture:import` — `node scripts/repo-tools/import-pinned-fixture.mjs` | MOVE_TO_EXISTING_OWNER | scripts/repo-tools | `docs/runbooks/content-package-authoring.md` | Implementation already repo-tools; drop root alias or re-export from chamber after DXK03. |
| `chamber:reset` — chamber `start --reset-database` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-storyteller-rehearsal.md`, `docs/runbooks/release-restore-readiness.md` | Disposable chamber DB reset; chamber-owned modes. |
| `chamber:packet` — chamber `start --packet-review` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/technical/storyteller/provider-boundary.md`, `docs/runbooks/local-storyteller-rehearsal.md`, `packages/application/src/developer-tools/lab/packet-lab.ts` | Packet review mode; documented storyteller boundary. |
| `chamber:memory-packet` — chamber `start --memory-packet-review` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/technical/storyteller/provider-boundary.md`, `docs/runbooks/local-storyteller-rehearsal.md` | Memory packet capture mode. |
| `chamber:memory-comparison-packets` — chamber flag | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-storyteller-rehearsal.md` | Memory comparison experiment alias. |
| `chamber:memory-evaluation-packet` — chamber flag | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-storyteller-rehearsal.md` | Memory evaluation packet alias. |
| `chamber:memory-evaluation-run` — chamber flag | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-storyteller-rehearsal.md` | Memory evaluation run alias. |
| `chamber:evaluation-packet` — chamber flag | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-storyteller-rehearsal.md` | Evaluation packet alias. |
| `chamber:evaluation-run` — chamber `start --evaluation-run` | MOVE_TO_EXISTING_OWNER | tools/chamber | `tools/chamber/README.md` | Live evaluation mode documented in chamber README; not CI. |
| `storyteller:packet-audit` — builds + `storyteller-request-audit.mjs` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/runbooks/local-storyteller-rehearsal.md`, `packages/storyteller/README.md` | Structural audit harness; archive invocation under chamber. |
| `storyteller:playability` — builds + `storyteller-playability.mjs` | MOVE_TO_EXISTING_OWNER | tools/chamber | NONE_FOUND | Historical measurement script; keep on disk; chamber/tool owner alias only. |
| `storyteller:live-comparison` — builds + `storyteller-live-comparison.mjs` | MOVE_TO_EXISTING_OWNER | tools/chamber | NONE_FOUND | Dry-run comparison harness; no active doc/CI string in scoped trees. |
| `memory:index-benchmark` — builds + `memory-index-benchmark.mjs` | MOVE_TO_EXISTING_OWNER | tools/chamber | NONE_FOUND | Benchmark script stays on disk; move public alias to chamber owner. |
| `chamber:review` — turbo build + `chamber review` | MOVE_TO_EXISTING_OWNER | tools/chamber | `docs/technical/lab/experiment-protocol.md`, `tools/chamber/package.json` (`review` script) | Headless review; package already exposes `review`. |
| `lint:quality` — `eslint --config eslint.quality.config.mjs` | MOVE_TO_EXISTING_OWNER | scripts/repo-tools | NONE_FOUND | Optional broad audit config; not CI; invoke from repo-tools owner not public root. |
| `repo:commit:check:test` — `node --test check-commit-message.test.mjs` | DELETE | scripts/repo-tools | `.agents/rules/git-commits.md` | Meta test; documented as `pnpm repo:commit:check:test` but replace with direct `node --test`. |
| `repo:hooks:install` — `node scripts/repo-tools/install-git-hooks.mjs` | KEEP_ROOT | root | `.agents/rules/git-commits.md`, `AGENTS.md`, `scripts/repo-tools/install-git-hooks.mjs` | Mandated commit-hook installer. |
| `repo:commit:check` — `node scripts/repo-tools/check-commit-message.mjs` | KEEP_ROOT | root | `.agents/rules/git-commits.md` | Mandated commit message validator. |
| `repo:cursor-usage` — `node scripts/repo-tools/cursor-usage-window.mjs` | KEEP_ROOT | root | `.agents/README.md`, `.agents/references/cursor-usage-evaluation.md` | Harness cost evaluation; agent-documented route. |
| `repo:cursor-usage:test` — `node --test cursor-usage-window.test.mjs` | DELETE | scripts/repo-tools | `.agents/references/cursor-usage-evaluation.md` | Meta test alias; keep script tests off root surface. |

**69 scripts**, **KEEP_ROOT 37**, **MOVE_TO_EXISTING_OWNER 21**, **REPLACE 0**, **DELETE 11**.

## Unresolved

None.

## Parent review overrides (T02)

Corrections applied during T02 mechanical relocation; these supersede the disposition table above where they differ.

**KEEP_ROOT (ledger said DELETE):** `infra:repair`, `fixture:import`, `lint:quality`, `repo:snapshot:chatgpt:test`, `repo:maintenance:test`, `repo:commit:check:test`, `repo:cursor-usage:test`, and every other KEEP_ROOT row.

**DELETE from root only:** `dev:host`, `infra`, `infra:up`, `infra:down`, `story:local`, `story:server`, plus all chamber/story/storyteller/memory public aliases moved to `tools/chamber` (`chamber`, `chamber:*`, `story:play`, `story:inspect`, `storyteller:*`, `memory:index-benchmark`).

**MOVE_TO_EXISTING_OWNER:** chamber routes and related storyteller/memory tooling wrappers re-home in `tools/chamber/package.json` without creating a new package.