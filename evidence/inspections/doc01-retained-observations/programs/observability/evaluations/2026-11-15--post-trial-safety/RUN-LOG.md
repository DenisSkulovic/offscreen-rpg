# Post-trial safety run log

Cursor appends only actual executed commands, source identities, synthetic DB/run IDs, results, negative cases, measurements and Git commits. Use [previous final report](../../../../../../../work/designs/parked/expired-handoffs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md) for old baseline evidence without copying its PASS statements into this new run.

## Execution entries

### 2026-11-15 | OBS00-L (provider-free) | base `52a3c6d8`

- Commands run: `pnpm --filter @offscreen/chamber build` (exit 0), `... typecheck` (exit 0), `... test` (20 tests, 20 pass, 0 fail), `pnpm --filter @offscreen/application exec node --test test/obs00-dispatch-forward.test.mjs` (4/4).
- Disposable DBs: one `offscreen_chamber_run_<uuid>` per case via the Sandbox guard, created and destroyed per case; owner `offscreen_story_local` not touched. Synthetic ids: account `…0010`, default run `…0011`, trial run `…0012`.
- Normal proof: trial row `limit=250000 max_attempts=4`; 4 mock attempts dispatched (settled 320 µusd, admitted 4); budget-cap case admitted 2 (settled 200000) before the third 150000 µusd reservation was denied.
- Negative proof: fifth attempt denied by count (mock calls stayed 4); `stopped=true`, `enabled=false` and uncertain attempt all survive restart byte-for-byte with 0 provider calls; mismatched captured policy → `authority_unavailable`; generic worker options (no `dispatchAuthority`) → `authority_unavailable`; changed cap under same trial id refused.
- Mutation control: old `stopped=false`/`enabled=true` UPSERT restored temporarily → 3 expected failures; reverted.
- External requests: 0 (fetch thrower asserted 0). Settled USD: $0. Provider attempts: 0 real, mock only. Uncertain: synthetic only.
- Not run: real `pnpm story:server` launch (needs live OpenRouter reads). Receipt: [obs00-l](../../evidence/obs00-l-local-story-trial-guards-2026-11-15.md).

### 2026-11-15 | OBS00-C (provider-free) | base `c887716a`

- Commands run: `pnpm --filter @offscreen/storyteller build` + `test` (52/52), `pnpm --filter @offscreen/application build` + `exec node --test test/obs00-dispatch-forward.test.mjs test/memory-provider-runtime.test.mjs` (9/9), `pnpm --filter @offscreen/chamber build` + `typecheck` (exit 0), `... exec node --test dist/test/obs00-c-wire-equality.live.test.js` (15 tests, 15 pass), `... test` (35/35), eslint on touched source + new test (clean).
- Disposable DBs: one `offscreen_chamber_run_<uuid>` per case, created/destroyed per case; owner `offscreen_story_local` untouched. Synthetic ids: account `00000000-0000-4000-8000-0000000000c0`, trial run `…c2`, route `fake:obs00-c`, dummy key marker only.
- Normal proof: one-shot fixture packet 8,275 bytes sha256 `f3933a57…`; `sha256(RequestInit.body)`, byte length and parsed body all equal the persisted `storyteller_dispatch_review` row; repair attempt 2 and memory decision/final attempts each equal their own attempt's review, with distinct SHAs; evidence `requestSha256` equals review.
- Negative proof: one-byte divergence → 0 HTTP, `wire_mismatch`, no attempt row, admitted/reserved/settled 0, account not stopped, review hash/state/revision unchanged; plain wrapper without `prepareWire` refused; attested wrapper dropping arg 2 fails the equality helper; held review 0 transport; released-then-changed task 0 sends with original packet retained; transport timeout → uncertain, account stopped, retry calls stayed 1; wrong authority and stopped account → 0 HTTP with a matching packet; generic worker without `dispatchAuthority` → `authority_unavailable`, 0 HTTP.
- Mutation control: disabling the digest comparison in `prepareReviewedDispatch` made the one-byte case fail; reverted.
- Finding: pre-existing `budget.settle` `continue` guard (`7ba3ff1d`) breaks the real memory controller after round 1; pinned by test, not fixed. `ENG03-M` application live test is red independent of this Change and rewrote the already-uncommitted eng03 measurement doc (left uncommitted).
- External requests: 0 (fetch thrower asserted 0). Settled USD: $0. Provider attempts: 0 real, mock only. Receipt: [obs00-c](../../evidence/obs00-c-provider-wire-equality-2026-11-15.md).
### 2026-11-15 | QA-SF01 (provider-free) | base `e28f53e4`

- Commands run: `pnpm test:focus -- storyteller` (exit 1, ~67 s, 33 tests: 27 pass / 6 fail = 5 subtests + parent), `pnpm test:focus -- story-resolution` (exit 0, 8/8), `pnpm test:focus -- admin-situation` (exit 0, 3/3), `pnpm test:focus -- start-package` (sanity, exit 1, 1/5; not a named suite). Prettier on touched test files.
- Disposable DB: `offscreen_auth_test` recreated by each invocation, no overlap. Provider calls 0, external HTTP 0, spend $0.
- Normal proof: slug fix, OBS00-C `prepareWire` attestation and test-only teardown ordering make the suite reach real assertions; story-resolution cleanup FK failure gone.
- Negative proof kept red (not loosened): `0 !== 55` x2, rolling-window `clock.now.getTime is not a function`, `Only a retained invalid candidate may keep an operation open` x2.
- Receipt: [qa-sf01](../../evidence/qa-sf01-storyteller-integration-2026-11-15.md).

**Evidence policy:** no credentials, raw prompt/response body, payer ID, cookie or non-synthetic customer content in Git. A source-code inspection is not a runtime test; a fake HTTP mock is not a real LLM call; a review SHA does not prove external provider receipt.
