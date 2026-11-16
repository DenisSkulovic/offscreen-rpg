# QA-SF01 | Honest focused Storyteller / story-resolution integration checks (2026-11-15)

**Change:** [QA-SF01](../../../../../../work/changes/open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md)
**Source base:** `e28f53e4` (OBS00-C). **Provider spend / external HTTP: $0 / 0** (provider-free env of `pnpm test:focus`; every fake provider is local; no `.env.openrouter`, no paid call).
**DB:** disposable `offscreen_auth_test`, destroyed/recreated by every `pnpm test:focus` invocation; suites never overlapped.

## Verdict: **Blocked (partly repaired)**

`story-resolution` and `admin-situation` are green. `storyteller` went from **6/33 pass** (Cursor forensic report) to **27/33 pass** (32 subtests + parent). The remaining **5 subtests** fail on what I believe are genuine runtime defects, not stale fixtures. Per the Change, they are left **red with exact repros**; none were removed, skipped, or loosened. A separate bounded runtime Change is needed. The Done criterion (storyteller green) is **not** met.

## Commands actually run (final, in order)

| Command | Exit | Elapsed | Result |
| --- | --- | --- | --- |
| `pnpm test:focus -- storyteller` | 1 | ~67 s | tests 33, **pass 27, fail 6** (5 subtests + the parent that contains them), skipped 0 |
| `pnpm test:focus -- story-resolution` | 0 | ~52 s | tests 8, **pass 8**, fail 0 (was 7/8) |
| `pnpm test:focus -- admin-situation` | 0 | ~21 s | tests 3, **pass 3**, fail 0 |
| `pnpm test:focus -- start-package` (not required; sanity only, see "Out of scope") | 1 | ~7 s | tests 5, pass 1, fail 4 |

Teardown: no cleanup `AggregateError` or `*_generation_id_fk` failure in any of the three required runs. Logs (uncommitted): `tmp/qa-sf01-final-*.log`.

## Changes (test source/cleanup only; production untouched)

1. **`time.id` fixture** `simulation-gameSeconds` → `simulation-game-seconds` (storyteller ×2; start-package also `harbor-…`, `beacon-…`). Production schema `/^[a-z0-9][a-z0-9.-]{0,99}$/` untouched.
2. **OBS00-C attestation:** new `test/helpers/attested-fake-provider.ts` (`Object.assign(fn, { prepareWire: prepareOpenRouterWire })`); all plain fake providers in `storyteller.integration.ts` (22) and `start-package.integration.ts` (2) wrapped. Without it the reviewed-packet guard refuses before reserve (`0 !== 1` call counts).
3. **Teardown** (`test/helpers/app-integration.ts`, test cleanup only): before `DELETE FROM generation`, delete the owner's `storyteller_execution_stage`, prompt provenance, dispatch-review decisions, dispatch reviews, context-capture rearms and context captures. Production FKs stay `RESTRICT`; no CASCADE added. Verified by story-resolution 8/8 and a clean storyteller teardown.
4. **ENG03 capture-first fixture updates** (the contract changed under the old tests): a document store for `createStories`/worker runtime and the opening's `startReference`; hold now `{kind:'storyteller', generationId}` and receipt state `generating` (was `storyteller-intent`); narration task is `pending-consequence`; `fictionalSeconds` replaced `gameSeconds`; instant pace + `advanceCampaignAction` where a test needs a settled action; scene handoff reads the consequence generation; beacon test selects `restore-beacon` by id and the three-key access list; browser test uses the multi-step wizard helper (`createCustomDraftSetup`), opens the collapsed "Details" panel, and uses an exact "Journey paused" match.
5. **Judgement calls to review (each is a deliberate adjustment, not a silent loosening):**
   - *boundary prerequisites:* the captured offer is now `{id, nodes: []}` not `null`; assert `nodes` is empty (a blocked activity captures no actionable plan).
   - *fake provider accounting:* account `settledMicrousd` `10n` → `20n`, because the reviewed-and-released hold generation earlier in the same test settles its own 10.
   - *early preparation:* public resolution state for a succeeded-but-unpublished generation is `running` by design (`stories/reads.ts::publicResolutionState`, unchanged since `cc4c69a6`); the generation row is still asserted `succeeded`. Poll limit 30→100 attempts (timing only).
   - *accepted finite plan:* generation count scoped to the story (`story_resolution`) instead of the global table, because other tests' workers share the owner; equality is still required.
   - *failed preparation:* `prepareCampaignConsequence` no longer rejects `lost its story revision fence` after a manual `story.revision` bump, because with an admission-time G the fence lives in the frozen capture (the rejection survives only in `captureCommittedActionNarration` for receipts with no G). The test now asserts the invariants that matter (receipt still linked to G, outcome/effects kept, clock and hold unchanged). **This weakens one negative case; the owner/ChatGPT should decide whether the legacy path needs its own direct test.**

## Remaining red (5 subtests) | genuine defects, not fixed

| # | Test | Failure | Source finding |
| --- | --- | --- | --- |
| 1 | `active journey re-reads postponed and cancelled schedules…` | `0 !== 55` (`gameSecond`) | One `advanceCampaignActivity` under **instant pace** with a controlling world obligation returns without advancing `gameSecond`; expectation 55 is correct for the accepted semantics, so it was **not** changed. Relevant: `packages/application/src/campaign/activities.ts` (`settleActivity`/`advance`), `packages/game/src/activities.ts` (`nextBoundaryGameSecond`, `worldGameSecondForEffortBoundary`). Root cause location not fully proven. |
| 2 | `custom-calendar winter interrupts a sixty-day journey at day fifty-five…` | same `0 !== 55` | Same. |
| 3 | `concurrent reservations obey a shared cap…` | both `budget.reserve` calls reject, `0 !== 1` | `TypeError: clock.now.getTime is not a function` from `window-accounting.ts` (`sql<Date>\`clock_timestamp()\`` is typed `Date` but the node-postgres session returns a string). Reproduces with any **rolling** usage window (`account-cost-burst`). |
| 4 | `multiple dispatch slices consume one operation envelope` | `Only a retained invalid candidate may keep an operation open` | `budget.ts::settle` (guard from `7ba3ff1d`) rejects `operationOutcome:'continue'` unless the generation outcome is a retained invalid candidate. |
| 5 | `memory exploration uses reviewed provider attempts and settles its final round` | same error from `memory-provider-runtime.ts::settlePersistedRound` | `memory-exploration-controller.ts` (~l.661) passes `'continue'` for admissible context requests and ready decisions, which the guard rejects: the multi-round memory loop cannot proceed after round 1. Already noted in the OBS00-C receipt. |

Negative case for 4/5: `settle({operationOutcome:'continue', generationOutcome: succeeded})` throws today; the controller emits exactly that.

## Out of scope / observed

- `pnpm test:focus -- start-package` (not a named QA-SF01 suite) is red 4/5 (`startStorytellerCandidate` → `invalid`, a stale `start_reference`-style fixture, and an extra `time` rule item). I only fixed the slug and attestation there; not triaged further.
- `tmp/` and `docs/programs/engine/evidence/eng03-lock-measurement-2026-11-14.md` remain uncommitted as instructed.

## Next dependency

One bounded runtime Change (owner to select) covering the three real defects: instant-pace controlling-obligation advance; rolling-window `clock_timestamp()` type; `budget.settle` `continue` guard vs memory controller. Then re-run `pnpm test:focus -- storyteller` unchanged.
