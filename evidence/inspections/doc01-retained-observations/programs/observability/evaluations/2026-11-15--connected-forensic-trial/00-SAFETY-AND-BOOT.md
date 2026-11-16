# S0 | Boot the actual local stack and establish a provider-free baseline

**Execution scope:** owner kickoff permits **local/disposable, provider-free** inspection and services. Read only [Cursor entry](../../handoff/CURSOR-FORENSIC-TRIAL-START-HERE-2026-11-15.md), this phase, [evidence contract](./EVIDENCE-CONTRACT.md), relevant [development startup](../../../../operations/development.md#requirements-and-startup). **Do not start OBS06 code** here. Never call a paid provider.

## Actions for Cursor, execute them

### 0.1 Recheck baseline, safely

~~~sh
git status --short
git rev-parse HEAD
node --version
pnpm --version
pnpm repo:brief
pnpm repo:docs-health
pnpm infra -- ps
~~~

Expected workspace engine **Node 24.19.x or compatible Node 24**, pnpm **11.19.0**. If wrong, repair local toolchain yourself; do not edit lockfile merely to make an old Node pass. If working tree has owner changes, preserve them and segregate generated evidence rather than resetting. Establish real current `main` SHA and active Change. If repository has advanced, re-read the small affected source/evidence only; don't repeat architectural redesign.

### 0.2 Start local infrastructure yourself

~~~sh
pnpm infra:up
pnpm infra -- ps
~~~

Confirm the actual Compose services and loopback ports: Postgres 5432, Temporal 7233/UI 8233, Redis 6379, S3 mock 9090 where configured. Do **not** assume all services healthy from a Docker command exit; check `pnpm infra -- ps`/health and an API/Temporal connection when launched.

If Docker Desktop is stopped or unavailable, try normal startup yourself. On the known Windows stale socket issue, read the **specific guarded** `pnpm infra:repair` instructions in `docs/operations/development.md`; only run it when its preconditions actually match. Do not reinstall Docker/WSL or erase volumes. If a port is occupied, identify the process, avoid killing unrelated user work; use existing services if compatible or report the blocker.

**No `pnpm infra:down -v`, no `pnpm chamber:reset`, no `pnpm db:baseline` on owner data, no `pnpm db:migrate` on an unverified non-disposable DB.** `pnpm infra:up` starts/preserves named data volumes. The focused runner below alone destroys its *specified* disposable `offscreen_auth_test` DB.

### 0.3 Build and run one real focused baseline, sequentially

Use exact existing scripts from `package.json`. Run:

~~~sh
pnpm --filter @offscreen/db build
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/storyteller build
pnpm test:focus -- admin-diagnostics
pnpm test:focus -- storyteller
~~~

**Before executing** `test:focus`, inspect `scripts/repo-tools/focused-integration.mjs` and `reset-test-db.mjs` (small files) to confirm `DATABASE_TEST_URL` is the loopback disposable `offscreen_auth_test`. **Each invocation recreates that DB** and cannot run concurrently with other focused suites. It does not test the owner's `offscreen` story DB. The runner strips provider keys/live opt-in; preserve that. If earlier API/Next server occupies shared ports, resolve conflict within local dev process scope before continuing.

**Record** actual exit codes, elapsed time, selected test counts, compile outcome, created/migrated DB name, and a representative failure snippet with secrets stripped. No “all integration tests passed” claim from two suites. If environment truly lacks a dependency, record it and continue safe pure stages.

### 0.4 Baseline source reality to check

Inspect current implementation, not historical plan:
- `packages/application/src/admin/diagnostics-reads.ts`: OBS01 no-attempt operation discoverability.
- `packages/application/src/storyteller/execution-stages.ts`: OBS02/OBS02-H stage integrity.
- `packages/application/src/storyteller/prompt-provenance.ts`: OBS03 sidecar and coverage.
- `packages/storyteller/src/providers/evidence-lineage.ts`: OBS05 v2.
- `packages/application/src/storyteller/config.ts` and `dispatch-authority.ts`: OBS00-A forwarding Done, OBS00-B independent current dispatch authority still missing or otherwise explicitly verified.

**Status expected from previous Cursor evidence:** OBS00-A, OBS01, OBS02, OBS02-H, OBS03, OBS05 Done; OBS04/06/07 Proposed; OBS00-B blocked. If actual source contradicts, give exact symbol and adjust checkpoint, not invented completion.

### 0.5 Finish S0 with evidence, not recommendations

Append a brief **real** phase record to `RUN-LOG.md`:
- SHA/worktree, OS/Node/pnpm, Docker/Temporal/Postgres/Redis status and exact service endpoints, **no credentials**;
- commands executed and outcomes;
- provider calls zero; bytes/data stored only disposable/local;
- first source-level gap/unknown if encountered.

Update `CHECKPOINT.md`: `S0 DONE/PARTIAL/BLOCKED`, next `S1` file, next concrete command, environment caveat, pushed Git commit. If services unavailable, still do pure packet analysis later; don't declare all work blocked without trying local recovery.

**Next:** [S1 real connected synthetic campaigns](./01-CONNECTED-CAMPAIGN.md).
