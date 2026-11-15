# Forensic connected trial | Actual execution log

**Status: S0–S1 executed 2026-11-15.** Cursor fills this **only after actually running each phase**. Use [evidence contract](EVIDENCE-CONTRACT.md).

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

### S1 — connected synthetic campaigns — 2026-11-15T18:06Z approx
Status: PASS (with noted suite partials)
Git HEAD before / after: (S0 evidence commit) / (this S1 evidence commit)
Environment: same Compose; durable DB `offscreen_chamber`; focused suites use disposable `offscreen_auth_test`
Authorization: provider-free
Commands actually run:
- Selector unblock: `locator('#chamber-scenario')` in `stories-browser.integration.ts` + chamber smoke path (dual Scenario combobox strict-mode collision)
- `pnpm test:focus -- stories-browser` → exit 0; 4/4 pass (item transfer, timed Temporal default, reload)
- `pnpm chamber --smoke` → exit 0; loopback identity/play/inspector/transfer/reload; spend $0
- `pnpm test:focus -- story-resolution` → exit 1; **7/8 pass**; failing test `generated intention resolution` failed on **cleanup** FK `storyteller_execution_stage_generation_id_fk` (OBS02 stage rows block generation delete) — not a gameplay assertion failure
- `pnpm chamber:packet` → exit 0; G=`14275b91-51d5-43a0-9931-b578e8dc09ba`; state=`awaiting-review`; packetSha256=`9a9259ca…`; serializedBytes=8371; zero provider attempts
- `pnpm storyteller:packet-audit` → exit 0; **fixture-only**; 9 operation traces; 5 evidence lineages; no provider transport
- Added headless `pnpm chamber -- --forensic-campaigns` (no desktop control) → exit 0; wrote `S1-CAMPAIGN-IDS.json`
- `pnpm chamber:memory-comparison-packets` → exit 0; two held packets; providerAttempts=0
Observed game identity:
- Story A `768b7227-4032-4eab-b691-3910a1644341` chamber.v5 revision/view 2; passage seq2 `response_source=player`; **no Storyteller G**; attempts=0
- Story B `93a23f44-8106-4f47-9992-0dfb131eba82` chamber.v4 revision 2→3; seq3 `response_source=default` (Temporal while browser closed); dueAt `2026-11-15T18:05:54.620Z`; attempts=0
- Held opening G (not A/B): `14275b91-…`; memory comparison G oneShot `49eb3760-…` / bounded `93e40a35-…`
Source checks: SQL on `offscreen_chamber` confirmed passages + zero `storyteller_attempt` for A/B
Result: Two durable scripted campaigns persisted; held packets prepared; browser/Temporal default proved; Storyteller stages expected absent on pure scripted A/B
Negative case: story-resolution cleanup FK gap after OBS02 stage table; memory-comparison initially blocked by occupied port while interactive chamber was up (resolved after stop)
Evidence class: recorded-runtime
Coverage: full S1 campaign + packet probes; story-resolution suite partial due cleanup
Cost: external requests 0; settled USD 0
Artifacts: `S1-CAMPAIGN-IDS.json`; local temp packet JSONs (not committed bodies)
Duration: stories-browser ~85s; chamber smoke ~14s; forensic-campaigns ~30s; packet probes ~10s each
Discrepancy: interactive headed chamber avoided (owner request: no desktop control); headless `--forensic-campaigns` used instead
Next exact step: Execute [S2](02-FORENSIC-CAPTURE.md)

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
