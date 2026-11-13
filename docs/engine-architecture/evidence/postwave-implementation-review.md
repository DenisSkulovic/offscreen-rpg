# Post-implementation engine review | 2026-11-13

**Status:** independent code review after Cursor's ENG01/ENG02/ENG04 work on `main@23fe6b5676c68853a7e864ccc177f0a6b3ea5c53`. **Design-only review branch, no application code changed.** Read with [ENG01 dossier](../../changes/2026-11-13--eng-authoritative-item-transfer/CHANGE.md), [ENG02 dossier](../../changes/2026-11-13--eng-optional-actor-capabilities/CHANGE.md), [ENG04 dossier](../../changes/2026-11-13--eng-bounded-current-reads/CHANGE.md), [ENG07 disposition](../../changes/2026-11-13--eng-memory-final-request/CHANGE.md).

**Evidence:** actual GitHub commits, source, existing tests and documented test execution. We **did not re-run** the tests or connect to the user's database. Test execution reported in Cursor's commits is accepted as *reported*, not independently reproduced. Claims below distinguish directly visible source behavior from probable gameplay failure and unproven runtime behavior.

## Executive disposition

| Work | Review result | Why | Next action |
| --- | --- | --- | --- |
| **ENG01** finite mechanical transfer | **Core accepted conditionally; two correctness gaps found** | Timed settlement/conditional SQL/receipt reuse are real; source still permits provider-origin transfer plans without explicit item/holder authority, and an item-changed interruption may leave no playable continuation | [Corrective proposal ENG08](../../changes/2026-11-13--eng-provider-world-effect-gate/CHANGE.md) before new model/world effects |
| **ENG04** bounded current activity read | **Accept as Done for its bounded-query outcome** | Query filters by story ID plus active identity or nonterminal states; 1k-terminal-row disposable fixture; no destructive migration | Performance speedup not measured, no index justified, Storyteller context still reads all activity rows |
| **ENG07** final serialized memory evidence | **Accept Cancelled/Superseded** | Current Greywake/`inspectMemoryExplorationProviderRequest` tests cover source selection, packing and actual final request *serialization* | Do not claim actual model recalled or used the fact; add separate provider/human evaluation later |
| **ENG02** optional health/actor envelope | **Accept as Done for the expressly scoped pure cut**, **not** the complete world-neutral actor milestone | Optional paired health, versioned envelope, pure check adapter, old human round-trip and health-free microbe fixture are present | Future `ENG02b` integrated actor campaign/form-change/old pending-plan proof is still a separate unselected outcome |
| **ENG03** story lock/context capture | **Proposed, not Ready** | Transaction/context refactor changes operation task lifecycle; measurable lock baseline and exact task capture absent | [Small lock profiling + capture decision](../decisions/eng03-instrument-before-refactor.md) |
| **ENG05** shared CAS adapter | **Design-ready for owner authorization after the new storage contract** | Current `DocumentStore` port exists, both bootstraps only use local FS; backend and test topology can be chosen without further product questions | [S3-compatible design](../decisions/eng05-shared-cas-contract.md), then one bounded adapter Change |
| **ENG06** workflow version resilience | **Design-ready for an initial replay-compatibility proof only** | TS SDK 1.24.0 and local Temporal CLI container; full managed Worker Deployment system is not yet justified | [Compatibility policy](../decisions/eng06-temporal-compatibility-policy.md), then narrow replay + restart test |

**Priority warning:** a strong infra adapter cannot make a game safe if its offered effects can bypass in-world authority or strand the player. Fix/prove the ENG01 gaps before widening those effects.

## ENG01: what Cursor really implemented well

1. `packages/game/src/effects.ts` adds `itemTransferEffectSchema` and max-one `worldEffects`, explicitly separate from character-only `applyOutcomeEffects`.
2. `packages/game/src/immediate-actions.ts` admits a world effect only on automatic/success branches, forbids transfer on failed checks; `actionOverlapEligibility` excludes precomputed finite results with transfers from the old character/facts/time-only digest.
3. `packages/application/src/campaign/actions.ts` checks the current registered holder **on admission** before accepting item-mutating finite work.
4. `action-execution-transition.ts` revalidates the holder **at the due boundary**, before dice and effects; wrong holder results in interruption, no roll.
5. `action-executions.ts` applies the existing `applyStoryItemEffects` under the same transaction that writes `gameActionReceipt` and advances canonical game time.
6. Both old narrative item transfers and new mechanical transfers use the `story_item` registry and conditional owner update. The result is idempotent under sequential duplicate operation delivery.
7. The disposable SQL suite exercises automatic success, duplicate command, failed check, admission-time invalid holder and midflight holder change; the pure transition suite exercises checked and abstract token effects.

**Limits:** the live item test sets pace to **instant** and invokes the application advancement directly. It demonstrates transactional settlement and fictional time (not a genuinely elapsed ten-second real wait, full Temporal replay or live provider). The midflight change is a direct test DB mutation, not a real second actor command. This is fine for a bounded first implementation but not proof of all concurrent gameplay.

### Finding E01-A: provider-authored transfers lack an explicit authority grant (high product priority)

- `packages/storyteller/src/tasks/task-contracts.ts` defines generated mechanical action plans using `immediateActionPlanSchema`, including the newly added `worldEffects` field.
- `packages/application/src/storyteller/publication.ts` calls `validateImmediateActionProposal` for next generated plans. That validator (`packages/game/src/immediate-actions.ts`) checks evidence, facts, quantities, applicable check skills etc. It does **not** check world-effect transfer actor/holder permission.
- `packages/application/src/campaign/actions.ts` validates matching current `itemKey/fromHolder`, but does **not** establish the player is entitled to transfer an item held by another actor.
- Therefore **from the source contracts** a model-generated offer could include a transfer from a nonplayer holder, and an accepted automatic/check-success branch could commit it if actual `story_item` holder matches. This is not proof a live model has done it. It is a **fail-closed authority gap** relative to the intended game.

**Immediate target:** a generated plan with item/world effects must be **rejected by default** unless it is an exact, pinned, authorized plan reference with its source, eligible actor, item and holder scope validated. Merely telling the model "don't do this" isn't authority. Preserve fixture-only and approved reference plans. See [ENG08](../../changes/2026-11-13--eng-provider-world-effect-gate/CHANGE.md).

### Finding E01-B: item-holder invalidation may strand the game (high player-experience priority)

- Action admission consumes `campaign.offer`, stores one running `activeActionOperationId` and may schedule no early narration for transfer effects.
- On due holder mismatch, `action-execution-transition.ts` returns `state:'interrupted'`, with elapsed fictional time and no receipt, correctly preventing unauthorized transfer.
- The `action-executions.ts` interrupted branch updates execution/campaign and fires pending world obligations **only if controllingObligation exists**. For holder mismatch alone, it does not visibly enqueue a new current scene, reauthorize an offer, or attach a recovery decision.
- The existing ENG01 SQL test asserts `actionExecution=null`, `actionReceipts.length=0` and unchanged item; it does **not** assert a fresh offer/decision/recovery path.

**Leading inference:** after the action was consumed, the player could return to an old passage with no current offer and no supported way to proceed. The exact public snapshot should be inspected with a stronger test, and the recovery policy selected, before calling holder-change interruption a complete gameplay implementation.

**Target:** commit a factual interruption and arrange a **source-grounded new playable situation or a typed recoverable blocker**, using existing game-authoritative event/offer machinery where possible. Never resurrect the stale offer or invent a free reroll. If this needs a new Storyteller task, it must use the same spend/hold policy and avoid an unbounded retry. This may need a separate minimal domain decision, not a UI “Continue” button.

### Finding E01-C: receipt provenance is reconstructed (medium)

`gameActionReceipt` persists character `effects`, the full saved `plan` and `outcome`, but not a separate `worldEffects-applied` column. `campaign/reads.ts::appliedWorldEffects` reconstructs the public transfer from the frozen plan plus recorded result. The SQL row itself is updated in the same transaction, so this is **not** a current double-spend bug.

For future full causal event history, consider an explicit immutable applied-world-effect receipt/event rather than pretending reconstructed planned effects are the same as a self-contained historical ledger. Do **not** add a new event system solely to close ENG01; first document the provenance contract and ensure old receipts decode.

## ENG02: why its actual completion is narrower than the original dream

`packages/game/src/actor.ts` adds a v1 envelope with `srd-abilities.v1` and optional `health.v1`, converts the existing Character both ways and exposes check subjects independent of HP. `state.ts` enforces that both HP fields exist or neither, and `checks.ts` no longer validates health as a prerequisite to an ability check.

**Good:** absence of health no longer means HP=0; old human remains compatible; a microbe can legitimately sense a gradient through pure rules.

**Still not solved:**
- The working `Character` continues to contain six numeric D&D scores, even if some are inapplicable; no SRD-less actor can pass many current application/read paths.
- Main campaign persistence and Storyteller task creation still generally consume `characterSchema`. `parseActorState` is not a universal write-side actor integration.
- `microbe.v3` is fixture data, not an end-to-end disposable SQL campaign involving an accepted timed activity, interruption and return.
- Form-change invalidation, multi-actor controller permissions and a distinct public actor-version DTO are outside the current Change.
- The new envelope has no stable actor ID/owner; correct for pure scope, incomplete for a shared party.

**Verdict:** accept ENG02 Done **as a pure rules compatibility slice**, but do not claim the original M2 "same engine supports arbitrary bodily forms end-to-end" milestone is complete. A future ENG02b domain+integration Change is warranted only after its exact actor/legacy migration semantics are decided.

## ENG04: precisely what was improved

`readCampaign` now selects rows from `game_activity` with `storyId` AND (the current active ID OR nonterminal states running, paused, encounter, suspended, blocked). It no longer loads terminal/complete history simply to build Now. The existing 1,000 completed row fixture supports correctness and bounded response size.

**Caveat 1:** this is **not** p95/read-latency scale evidence. No new index was added or query-plan improvement established.  
**Caveat 2:** `storyteller/context.ts` still selects all story activities to filter relevant work; separate future scope.  
**Caveat 3:** active and commitment lists still have public schema bounds; a story with unusually many nonterminal commitments may need an explicit paging/summary policy, not a bigger unbounded array.

No reason to reopen ENG04 merely because those adjacent problems exist.

## ENG07: exactly what the cancellation proves

The reported `long-story-memory-evaluation.test.mjs` builds an extended Greywake corpus, retrieves a buried promise, packs it, and inspects the **serialized final-round request messages** through `inspectMemoryExplorationProviderRequest`. The test intentionally reports `transportPerformed=false`. It proves the application **would send** the correct source text through that path, not that a model read, attended to, correctly remembered or creatively used it.

Cancellation is appropriate as an anti-duplicate-code decision. Model fidelity and player experience remain independent evaluations, not a missing test utility by default.

## Next correction vs infrastructure ordering

**Recommended priority:**
1. **ENG08** correct/prove the item-transfer authority and no-dead-end behavior. This protects the newly introduced gameplay effect.
2. **ENG05** S3-compatible shared immutable adapter under a local test service; keep current local adapter default and old roots intact.
3. **ENG06** workflow history replay/rolling restart compatibility harness, no Worker Deployment rollout yet.
4. **ENG03** only after a reproducible slow-source lock baseline; then select short capture/off-lock preparation contract.
5. Later integrate ENG02 actor envelope through a real nonhuman campaign, or reprioritize toward GM01 custom player intention/long-term continuity based on actual play evidence.

**No code change is authorized by this review.** Fix the game-authority problems before introducing a general plugin model or a second state machine.
