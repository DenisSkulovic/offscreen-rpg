# Cursor → ChatGPT | Local Story-mode safety and real-agent trial follow-up

**EXECUTED, provider-free (2026-11-15).** OBS00-L and OBS00-C are Done. QA-SF01 is **Blocked, partly repaired**. The real local provider trial has **not** run and is **still pending fresh owner authorization** (the earlier S0–S6 budget permission does not carry over). Provider spend **$0**, external HTTP **0**.

## Verdict

The two safety guards are proven provider-free. The previously red suites are mostly repaired: `story-resolution` and `admin-situation` are green, `storyteller` improved from 6/33 to 27/33 pass. **Five Storyteller subtests stay red on genuine runtime defects** that I did not hide, skip or loosen. The suite cannot be called healthy until a bounded runtime Change fixes them.

## Status

| Slice | Status | Actual proof & commit |
| --- | --- | --- |
| OBS00-L local account stop/restart/DB cap | **DONE** | `c887716a`; chamber 20/20, application 4/4; stop/enabled/uncertain survive restart; 5th attempt denied by count, cap denial by microusd. [Receipt](../../evidence/obs00-l-local-story-trial-guards-2026-11-15.md) |
| OBS00-C exact persisted review→mock wire bytes | **DONE** | `e28f53e4`; new file 15/15, chamber 35/35, storyteller 52/52, application 9/9; one-byte divergence refused pre-reserve with 0 HTTP. [Receipt](../../evidence/obs00-c-provider-wire-equality-2026-11-15.md) |
| QA-SF01 Storyteller and story-resolution suite repair | **BLOCKED (partly repaired)** | `c48aeced`; `story-resolution` 8/8, `admin-situation` 3/3, `storyteller` 27/33 (5 subtests + parent red). [Receipt](../../evidence/qa-sf01-storyteller-integration-2026-11-15.md) |
| Real local provider trial | **NOT AUTHORIZED / NOT RUN** | Needs a new explicit cap from the owner. 0 real attempts. |
| OBS00-B production current entitlement | BLOCKED (prior source) | not part of this wave |
| Support grant steward production access | UNIMPLEMENTED (prior report) | separate scope |

## Evidence

- **Git source/commits:** OBS00-L `c887716a`, OBS00-C `e28f53e4`, QA-SF01 `c48aeced` on `main`. Windows 10, disposable `offscreen_auth_test` (recreated per `pnpm test:focus` run); owner `offscreen_story_local` untouched.
- **QA-SF01 commands:** `pnpm test:focus -- storyteller` (exit 1, ~67 s, 33 tests: 27 pass / 6 fail), `... story-resolution` (exit 0, 8/8, ~52 s), `... admin-situation` (exit 0, 3/3, ~21 s). `start-package` (not named, sanity only) is red 4/5, not triaged.
- **Previously stopped funding stayed stopped on restart (OBS00-L):** yes; `stopped=true`, `enabled=false` and an uncertain attempt survived restart byte-for-byte with 0 provider calls. Mutation control (old UPSERT) produced 3 expected failures.
- **Trial budget ≤$0.25 / ≤4 attempts enforced in DB (OBS00-L):** yes, in provider-free mock proof: trial row `limit=250000 max_attempts=4`; 4 mock attempts admitted, 5th denied by count; cap case denied the third 150000 µusd reservation. Not proven with a real provider.
- **Persisted review SHA vs mock `RequestInit.body` SHA (OBS00-C):** equal per attempt for one-shot, repair R, memory decision + final, held→released, worker-wrapped and local-Story compositions (one-shot fixture 8,275 bytes). A one-byte divergence: 0 HTTP, `wire_mismatch`, no attempt row, review untouched. A review SHA is not proof of provider receipt.
- **55-day scenario and OBS02 FK cleanup (QA-SF01):** the `time.id` fixture is fixed and the OBS02/OBS03 teardown FKs are cleaned in test cleanup only (production keeps RESTRICT; no CASCADE); no teardown error remains. The two `0 !== 55` tests still fail: under instant pace with a controlling world obligation one `advanceCampaignActivity` does not advance `gameSecond`. The expectation 55 is correct and was **not** changed.
- **Other genuine defects left red:** rolling usage window `clock.now.getTime is not a function` (`window-accounting.ts`, `clock_timestamp()` returns a string) breaks both concurrent reservations; `budget.settle` rejects `operationOutcome:'continue'` for succeeded rounds (guard from `7ba3ff1d`), which the memory exploration controller emits, so multi-round memory loops stop after round 1 (2 tests).
- **Weakened negative case to review:** after ENG03 capture-first admission, `prepareCampaignConsequence` no longer rejects `lost its story revision fence` after a manual `story.revision` bump (the fence now lives in the frozen capture). The test keeps the outcome/G-link/clock/hold invariants but no longer asserts a rejection; the legacy committed-capture path may need its own direct test.
- **Actual external provider requests:** 0.
- **Settled USD / unresolved charge:** $0 / none.
- **Real first Storyteller output (G/attempt/passage IDs, schema version):** none; not permitted and not run.
- **Unverified claims (do not treat as proven):** provider-side receipt; real memory/agentic loop; real `pnpm story:server` launch; ENG03-M live test (red, separate); root-cause code location of the 55 defect (symptom and area proven, fix site not).
- **Uncommitted by instruction:** `docs/engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md` and `tmp/`.

## One next bounded Change

A single runtime-defect Change (owner to select) fixing: instant-pace controlling-obligation advance, the rolling-window `clock_timestamp()` typing, and the `budget.settle` `continue` guard vs the memory controller; then rerun `pnpm test:focus -- storyteller` unchanged. After that, the owner decides whether to authorize a capped real-provider trial.

## Exact Git evidence paths

- `docs/observability/evidence/obs00-l-local-story-trial-guards-2026-11-15.md`
- `docs/observability/evidence/obs00-c-provider-wire-equality-2026-11-15.md`
- `docs/observability/evidence/qa-sf01-storyteller-integration-2026-11-15.md`
- `docs/observability/evaluations/2026-11-15--post-trial-safety/{CHECKPOINT,RUN-LOG,FINAL-HANDOFF}.md`
- Safe reproduction: `pnpm test:focus -- storyteller` (never overlap with another suite; it resets the disposable DB).

## Final handoff protocol

Cursor committed/pushed this report with [RUN-LOG](RUN-LOG.md) and [CHECKPOINT](CHECKPOINT.md). The owner does not need to run tests or collect screenshots.
