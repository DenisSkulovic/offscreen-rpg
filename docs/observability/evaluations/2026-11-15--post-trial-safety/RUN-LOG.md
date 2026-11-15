# Post-trial safety run log

Cursor appends only actual executed commands, source identities, synthetic DB/run IDs, results, negative cases, measurements and Git commits. Use [previous final report](../2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md) for old baseline evidence without copying its PASS statements into this new run.

## Execution entries

### 2026-11-15 | OBS00-L (provider-free) | base `52a3c6d8`

- Commands run: `pnpm --filter @offscreen/chamber build` (exit 0), `... typecheck` (exit 0), `... test` (20 tests, 20 pass, 0 fail), `pnpm --filter @offscreen/application exec node --test test/obs00-dispatch-forward.test.mjs` (4/4).
- Disposable DBs: one `offscreen_chamber_run_<uuid>` per case via the Sandbox guard, created and destroyed per case; owner `offscreen_story_local` not touched. Synthetic ids: account `…0010`, default run `…0011`, trial run `…0012`.
- Normal proof: trial row `limit=250000 max_attempts=4`; 4 mock attempts dispatched (settled 320 µusd, admitted 4); budget-cap case admitted 2 (settled 200000) before the third 150000 µusd reservation was denied.
- Negative proof: fifth attempt denied by count (mock calls stayed 4); `stopped=true`, `enabled=false` and uncertain attempt all survive restart byte-for-byte with 0 provider calls; mismatched captured policy → `authority_unavailable`; generic worker options (no `dispatchAuthority`) → `authority_unavailable`; changed cap under same trial id refused.
- Mutation control: old `stopped=false`/`enabled=true` UPSERT restored temporarily → 3 expected failures; reverted.
- External requests: 0 (fetch thrower asserted 0). Settled USD: $0. Provider attempts: 0 real, mock only. Uncertain: synthetic only.
- Not run: real `pnpm story:server` launch (needs live OpenRouter reads). Receipt: [obs00-l](../../evidence/obs00-l-local-story-trial-guards-2026-11-15.md).

**Evidence policy:** no credentials, raw prompt/response body, payer ID, cookie or non-synthetic customer content in Git. A source-code inspection is not a runtime test; a fake HTTP mock is not a real LLM call; a review SHA does not prove external provider receipt.
