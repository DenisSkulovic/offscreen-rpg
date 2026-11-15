# OBS00-L | Local Story-mode stop, restart and finite-trial guard (2026-11-15)

**Change:** [OBS00-L](../../changes/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md)  
**Source base:** `52a3c6d8a50c365e731ca0dc7507d5baeb65e9e4` (this receipt ships in the OBS00-L commit)  
**Provider spend / external HTTP:** **$0 / 0.** Counting fake provider only; `globalThis.fetch` replaced by a thrower for the whole suite and asserted at 0 calls in `test.after`. No `.env.openrouter` read, no credential used.  
**DB:** one fresh disposable `offscreen_chamber_run_<uuid>` per case (guarded by the Sandbox URL guard, destroyed in `finally`). The owner's `offscreen_story_local` was **not** touched. Synthetic IDs: account `00000000-0000-4000-8000-000000000010`, default run `…0011`, trial run `…0012`.

## What changed

| Area | Change |
| --- | --- |
| `tools/chamber/src/story-funding.ts` (new) | `bootstrapLocalStoryFunding`: inserts missing account/run only (`ON CONFLICT DO NOTHING` / `verified_at` refresh only), recomputes reservations from unresolved attempts, then **denies** start on `account-stopped`, `run-disabled`, `uncertain-attempt`, `run-account-mismatch`, `trial-cap-mismatch`, `attempts-exhausted`, `funds-exhausted`. `pinnedLocalStoryDispatchAuthority` names the startup-pinned local authority. |
| `tools/chamber/src/main.ts` | Replaced `stopped=false` / `enabled=true` UPSERTs with the bootstrap; denial closes the DB and throws a fixed safe message before any worker/provider start; trial run id selects `execution.runId`; `server.json` records `runId` and trial cap (no secrets). |
| `tools/chamber/src/modes/cli-flags.ts` | `--story-trial-max-microusd=<1..250000>`, `--story-trial-max-attempts=<1..4>`, optional `--story-trial-id=<uuid>`; strict integer grammar; both caps required together; story-mode only; per-operation cap may not exceed total. |
| Enforcement | **No new SQL gate was needed:** the dedicated trial `storyteller_run` row (`limit_microusd`, `max_attempts`, CHECK `admitted_attempts BETWEEN 0 AND max_attempts`) is enforced by existing `budget.reserve` under the account/run row locks. The Change makes that row the persisted, non-re-mintable trial. `retainsCapturedAuthority` is unchanged and not forced true. |

## Proof (all passed)

```text
pnpm --filter @offscreen/chamber build
pnpm --filter @offscreen/chamber typecheck           # exit 0
pnpm --filter @offscreen/chamber test                # tests 20, pass 20, fail 0
pnpm --filter @offscreen/application exec node --test test/obs00-dispatch-forward.test.mjs   # 4/4
```

New: `tools/chamber/test/obs00-l-story-trial.live.test.ts` (12 cases) and one case in `cli-flags.test.ts`.

| CHANGE.md matrix row | Test | Observation |
| --- | --- | --- |
| Fresh trial Run, 250,000 µusd / 4 attempts | `trial Run is DB-bounded…` | row `limit=250000, max_attempts=4, enabled=true`; four mock attempts reached transport (calls=4), run `admitted=4, settled=320, reserved=0` |
| Fifth attempt denied by count | same | 5th and 6th generation → `budget_unavailable`, mock calls stay **4**, ledger byte-identical |
| Next reservation exceeds remaining total | `a reservation that would exceed the remaining total cap…` | worst-case reservation 150,000 µusd; two attempts settle 100,000 each; third denied `budget_unavailable` at `admitted=2, settled=200000, reserved=0`, calls=2, account not stopped |
| Prior `stopped=true`, restart | `restart never resurrects a stopped account…` | bootstrap `denied: account-stopped` for trial and default run input; `stopped` still true; run row unchanged; provider calls **0** |
| Prior `enabled=false`, restart | `restart never re-enables a disabled run…` | `denied: run-disabled`; `enabled` still false (trial and default run); provider calls 0 |
| Uncertain then restart | `uncertain dispatched attempt keeps its liability…` | attempt `uncertain`, account stopped, run reserved ≠ 0, `admitted=1`; restart `denied: uncertain-attempt`; ledger `deepEqual` before/after; next execution `usage_uncertain`, retry calls **0** |
| Stronger/expensive route beyond µusd policy | `explicit stronger/more expensive route…` | per-operation cap 10,000 vs 150,000 worst case → `budget_unavailable`, calls 0, 0 attempts, no fallback |
| Captured policy ≠ pinned local policy | `captured task policy that differs…` | `authority_unavailable`; attempt `unsent`, reserved 0, settled 0, calls 0; policy not forced to match |
| Stopped account, unchanged policy | `stopped account is denied at budget.dispatch…` | reserve admitted; captured === pinned; account stopped → `budget.dispatch=false`, attempt `unsent`, reserved released |
| Two concurrent attempts, same Run | `two concurrent attempts on the last remaining slot…` | 3 settled, then two parallel `complete()`: exactly one `invalid_output` (dispatched) + one `budget_unavailable`; calls = 4, attempts = 4 |
| Restart with same saved trial id | `restart with the same saved trial id…` | same id → `ready`, ledger unchanged; same id with `maxAttempts=3` → `denied: trial-cap-mismatch`, ledger unchanged |
| Generic `apps/worker` without OBS00-B | `generic worker options without OBS00-B…` | `readStorytellerWorkerOptions` has no `dispatchAuthority`; with a counting fake transport → `authority_unavailable`, calls 0; source scan finds no local-trial symbol/flag in `apps/worker/src` or `packages/application/src` |
| Secret/payload in logs | `denial and status text carry no credential…` | fixed text only; no key/Bearer/payload; `server.json` additions are ids/caps |

**Negative control (old behaviour):** temporarily restoring `SET stopped=false` / `SET enabled=true` in the bootstrap made exactly the stopped, disabled and uncertain-restart cases fail (9 pass / 3 fail); restored, 12/12 pass.

## Not run / limits

- The real launcher (`pnpm story:server`) was **not** started: it performs live OpenRouter credit/endpoint reads at startup, which is outside provider-free scope. The bootstrap and flag grammar are covered as units against real PostgreSQL; the `main.ts` wiring is covered by build/typecheck only.
- The local startup-pinned authority is **not** OBS00-B and does not authorize general worker traffic. No operator recovery path for a stopped account was added (owner-audited procedure, out of scope).
- Existing owner `offscreen_story_local` rows are untouched; if its account is already `stopped=true`, the next `--story-mode` start now refuses live start by design.
- Lint: `eslint tools/chamber` reports two pre-existing unused-var errors in `live-evaluation-run.ts` and `memory-packet-review.ts` (unmodified). `prettier --check` flags only unmodified `inspect-cli.ts`.
- A pre-existing orphan `offscreen_chamber_run_41095bff…` database was present and left alone.
