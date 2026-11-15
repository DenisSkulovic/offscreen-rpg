# Forensic connected trial | Actual execution log

**Status: S0 executed 2026-11-15.** Cursor fills this **only after actually running each phase**. Use [evidence contract](EVIDENCE-CONTRACT.md).

## Run metadata

- **Owner kickoff:** received 2026-11-15 (execute S0–S6; OBS06 then OBS07 if gates; conditional live ≤$0.25 / 4 req / $0.10 op)
- **Source SHA at evaluation start:** `fa4fef80b523137a6c058dde45c55b4d43665519`
- **Environment / local DB:** Windows; Node v24.19.0; pnpm 11.19.0; Compose loopback Postgres/Redis/S3mock/Temporal healthy; focused suites use disposable `offscreen_auth_test`
- **Actual provider requests:** 0
- **Actual provider spend:** $0
- **Raw private evidence:** do not commit; local ignored `data/` / `tmp/` only
- **Preserved dirty worktree (not part of this run):** `docs/engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md`, `tmp/`

## Executed phases

### S0 — safety/boot baseline — 2026-11-15T17:53Z approx
Status: PARTIAL
Git HEAD before / after: `fa4fef80` / (pending S0 evidence commit)
Environment: OS win32; Node v24.19.0; pnpm 11.19.0; DB `offscreen_auth_test` @ 127.0.0.1:5432; Temporal 7233/8233; Redis 6379; S3 mock 9090; mode Connected-local Compose
Authorization: provider-free
Commands actually run:
- `git status --short`; `git rev-parse HEAD` → `fa4fef80…`
- `pnpm repo:brief`; `pnpm repo:docs-health` → ok/advisory
- `pnpm infra -- ps` → postgres/redis/s3mock/temporal Up healthy (already running; `infra:up` not required)
- `pnpm --filter @offscreen/{db,application,storyteller} build` → exit 0
- `pnpm test:focus -- admin-diagnostics` → exit 0; 1 pass (AD05 campaign/redacted operation)
- `pnpm test:focus -- storyteller` → exit 1; **6 pass / 27 fail** (dominant: Zod `time.id` must match `/^[a-z0-9][a-z0-9.-]{0,99}$/` at story start; separate calendar assertion 0≠55)
- Supplemental OBS proofs (provider-free): OBS00-A 4/4; OBS02+OBS02-H 6/6; OBS03 unit 3/3; OBS05 lineage 2/2 — all pass
Observed game identity: none created in S0 (baseline only)
Source checks (inspection, not new runtime rows):
- OBS00-A: `wrapApprovedWorkerProvider` forwards dispatch; no `dispatchAuthority` in worker options — OBS00-B still blocked
- OBS01/02/02-H/03/05 symbols present as prior Done evidence
Result: Local stack healthy; disposable focused DB path confirmed; admin-diagnostics green; broad storyteller integration suite **not** green (pre-existing calendar/time.id fixture mismatch, not introduced by forensic OBS packets)
Negative case: `pnpm test:focus -- storyteller` failed closed with Zod/assertion errors; no provider keys used
Evidence class: recorded-runtime (Compose/ps, focused suites) + source-inspection (OBS00-B)
Coverage: partial (S0 infra+admin ok; full storyteller integration suite unhealthy)
Cost: external requests 0; settled USD 0; cap unused
Artifacts: this RUN-LOG entry
Duration/queries/bytes: admin-diagnostics ~34s wall; storyteller focus ~80s wall; OBS supplemental ~8s
Discrepancy and cause: storyteller.integration fixtures reject `time.id` against tightened regex; forensic OBS unit/live proofs still pass independently — **hypothesis:** fixture calendar IDs use characters outside `[a-z0-9.-]` or related settings drift; disproof = inspect failing fixture `time.id` in S1/S2 if Connected play also fails
Next exact step: Execute [S1](01-CONNECTED-CAMPAIGN.md)

## Investigation questions to answer

- Which story/operation/G actually produced a stage receipt and which did not?
- Did a held or interrupted game preserve correct receipts, time, and source state without fake model work?
- What exact original source version/profile/selected context is reconstructable? What was derived from task vs observed by a selector?
- Does the reviewed request match the actual per-round transport? If not proved, say `not verified`.
- Can a genuinely assigned Support staffer diagnose the incident from an authorized S1 UI, and is foreign case access denied?
- Can the player browse persisted story/choices without triggering new game effects, model attempts or a GM06 ACK?
- How much storage/query/lock time and actual provider cost was observed, and what's still unknown?
- Which one next bounded Change solves the most important *observed* problem?

## Raw output / screenshot policy

Save only sanitized type-coded source IDs/hashes, small synthetic visuals and safe metrics. Original player narrative and prompt text, credentials, SQL JSONB and provider envelopes remain private local evidence outside Git.
