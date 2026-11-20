# DXK program | planner source map and failure-path inventory

**Inspected:** attached source 13bcd6cf (2026-11-20 13:08 snapshot) plus connected GitHub main through 8796daaa (2026-11-20 13:43 UTC), including current work/QUEUE.md, TURN02 TASKS.md, code.yml, local-development.md, kubernetes-lab.md and root package.json. Newer Cursor worktrees/19a2fd91 unpushed changes cannot be inspected remotely. Source claims below specify observed paths; recheck with git status / HEAD at execution.

## The actual runtime seams

| Entry/authority | Observed source and current effect | Chosen owner |
| --- | --- | --- |
| root package.json | dev=pnpm dev (Tilt); stack:* lifecycle; no root infra/infra:up/down | DXK04 migrated aliases; DXK06 removed compose wrapper |
| compose.yaml + scripts/repo-tools/compose.mjs | **Deleted (DXK06 T01).** Normal development is kind lab + stack:* | — |
| infra/kubernetes/lab/{up.sh,lib.sh,down.sh,kind.yaml} | Existing dedicated kind cluster, context/volume safety and loopback guard; not application release | DXK01 reuses, DXK05 removes hardcoded old volumes from component smokes |
| infra/kubernetes/lab/app-release/ | API/GA and Next image build/test pieces exist; TURN02 T04/T05/T06 still required; no proven full playable release | **TURN02**, not DXK |
| infra/kubernetes/lab/{cnpg,temporal,content-bootstrap,object-storage,gateway} | Real component labs and pinned S3 package import, many are test-specific, not one installed app | TURN02 composes production-like subset; DXK01 makes idempotent lifecycle |
| apps/api/src/main.ts + default-rules-startup.ts | Postgres, cache, S3, pinned-rule boot, Better Auth config before listen | TURN02 release readiness; DXK03 auth only |
| apps/api/src/modules/auth/{auth.ts,config.ts} | Better Auth GitHub-only; GitHub credentials and secret mandatory, APP_ORIGIN is HTTPS or localhost/127.0.0.1 | DXK03 local-only email/password profile with real sessions |
| apps/web/next.config.ts + src/server/api-origin.ts | Next /api rewrite target and SSR API_INTERNAL_ORIGIN require distinct build/runtime Pod DNS verification | TURN02 T03/T05; DXK02 published UI links only |
| apps/api/src/modules/stories/game-authority-client.ts | Host default is `embedded`; `distributed` is explicit; retired `compose` is rejected; S3 lab release requires an explicit mode | DXK06 T02 |
| scripts/repo-tools/story-session-report.mjs | Read-only `psql` via `OFFSCREEN_STORY_DATABASE_URL` | DXK04 landed; no Docker Compose |
| .github/workflows/code.yml | Compose validation, infrastructure up/down, Temporal auth dependency; database job separately already uses native GitHub Postgres service | DXK05 replaces Compose CI with scoped Kubernetes/test services |
| scripts/repo-tools/ci-change-scope.mjs + .test.mjs | Compose filenames in CI classifier/fixtures | DXK05 rewrites classification and tests |
| scripts/repo-tools/repair-docker-desktop.ps1 | Repairs Windows Docker Desktop sockets; advises `pnpm stack:up` after restart | Retained for engine recovery only |
| docs/runbooks/local-development.md + kubernetes-lab.md | Canonical default local boot still Compose/host pnpm dev; lab runbook explicitly not game | DXK07 canonical runbook; DXK06 cleanup compatibility narratives |

## Concrete old-volume dependencies to remove

The attached tree has explicit docker volume inspect offscreen-rpg_postgres-data and offscreen-rpg_temporal-data assertions in:
- infra/kubernetes/lab/cnpg/{install.sh,smoke.sh}
- infra/kubernetes/lab/temporal/{install.sh,smoke.sh}
- infra/kubernetes/lab/object-storage/smoke.sh
- infra/kubernetes/lab/content-bootstrap/smoke.sh
- infra/kubernetes/lab/document-access/smoke.sh

These protect the historical Compose lab but make a pristine clone fail. Replace with generic before/after full-volume snapshot and unrelated-context comparisons in lib.sh, not simple deletion of safety assertions. Component labs must work with **zero** old named volumes. Preserve right to detect volume loss. Do not delete user data even when old volumes are discovered.

## Decisions (avoid re-investigating inside Cursor)

- Keep kind, Docker engine, existing lab resource definitions and safety checks; no second cluster product or Helm/Argo CD/Jenkins introduction. Tilt owns source-watch/build/reconcile view, Headlamp desktop owns cluster object/log/terminal view. Explicitly forbid Tilt's Docker Compose integration.
- One loopback browser origin; Next SSR API origin is internal DNS, /api browser rewrite remains same-origin; private GA must not become public. One definitive Job each for migration/bootstrap, proper apply idempotence/Job completion checks.
- Local-only Better Auth password login with real cookies/sessions and tested guard. Do **not** ship anonymous admin, session forgery, a default well-known privileged credential, or a publicly enabled impersonation endpoint.
- Persistent state owned by Kubernetes claims/S3; warm run retains data. Dev-only fixture importer checks exact manifest roots and idempotency. Reset is separate destructive command.
- Retain fast host tests and package-level executable entrypoints. Root public commands should have few named responsibilities, not one alias per temporary experiment. Existing tools/chamber and tools/api-integration own their experiments.
- Migration to code strings using the noun compose must not destructively rename ordinary domain methods like composeOpportunities; target legacy **orchestration and runtime mode** only. Archived evidence stays honest.

## Failure matrix to prove

| Injected failure | Expected observation |
| --- | --- |
| Missing Docker/kind/kubectl/Tilt, wrong context, low RAM, busy host port | Clear preflight stop, no cluster/context/data mutation |
| No legacy volumes present | All kind lab installers work; no fake required old data |
| Fresh cluster migration/start importer fails or S3 pinned root missing | No READY, failed Job/pod diagnosis, no fake successful fixture |
| Worker unavailable or GA Pod killed during play | Accurate dependency/service health, no false turn completion or duplicate commits |
| Repeat pnpm dev with an existing campaign | Preserves story, database, S3 pins and staff roles; does not rerun destructive seed |
| Wrong user or external dev-auth attempt | Denied by real auth/session/role checks |
| Source edit triggers image failure | Tilt visibly red, last-known-good deployment handling documented; no imaginary green |
| User requests reset without exact cluster name + typed confirmation | Refused; foreign contexts/volumes unchanged |

**Test evidence tiers:** unit/static checks on any host; local real-process integration; live kind Pod/browser/SQL/S3/Temporal proof; external clean WSL clone. Keep tier and NOT-RUN precise. Program is not complete because only tests in lower tiers pass.
