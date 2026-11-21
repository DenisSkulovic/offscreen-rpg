# WR05P2 | Planner evidence, hard decisions and proof

**Scope/source snapshot:** `undertaking/storyteller-workshop`, source inspected 2026-11-21 after WR05S and before WR05P1. Follow `docs/technical/engine/selected-architecture.md` and `lifecycle-and-compatibility.md`. **No tests executed by planner**. This is an execution plan, not a claim of runtime acceptance.

### Facts (actual symbols)

- Documents `sceneCheckpointV2Schema` at `packages/documents/src/schema.ts` around 1183; `presentFictionalStateSchema` around 977; v2 notes schema at 975 accepts only null/[]; v2 passage inherits `sceneCheckpointPassageSchema` with decision/wait fixed null. `@offscreen/storyteller/context/continuity.ts:continuityNotesSchema` has max20 unique key + text/sources/revision; don't drop nonempty notes.
- DB `gameActivity` rows include `boundariesSettled`; `worldObligation` includes `firedAtGameSecond`; `gameActionExecution` includes operationId, offerId, actionKey, baseRevision, offer/plan/pendingResolution, start/target fictional seconds, state/revision. All are semantic fields relevant to resuming fork, excluded from WR05S initial activeAction type.
- Story Engine `stories/continuation.ts:stageSupportedContinuationCheckpoint` around 417 is v1 quiescent-only; `commitStoryContinuation` around 543 applies items/passage/root/view then stages selector around 665, **notes around 672**. This can produce selected pre-note snapshots if advanced without changing order.
- `storyteller/publication.ts:publishStorytellerResult` around 136 stages passage/optional checkpoint outside lock, then SQL transaction from ~254. For `consequence|pending-consequence`, it parses receipt/capture and verifies source at ~370–710, validates selectedPlans incl resume under transaction ~746–810, chooses `plannedOffer.id=randomUUID()` ~810, then writes passage, `publishStorytellerNotes`, `saveOfferPlans`, campaign `offer`/authorization, `transitionStorytellerHoldToDecision` and `advanceStoryView` at ~851–935. This path is currently without full v2 checkpoint.
- `campaign/holds.ts:transitionStorytellerHoldToDecision` converts storyteller hold into decision hold only if matching generation exists; `clockAnchorAt` changes with DB clock, **not fictional gameSecond**. Stage the semantic hold array and compare, but don't require exact wall-clock anchor equality. `campaign/persistence.ts:saveOfferPlans` writes gameOffer row keyed by new offerId and stores parsed selected plans.
- `stories/scene-checkpoint.ts:stageSceneCheckpointObject` ~203 performs CAS write and read-back off-lock; `insertStagedSceneCheckpointSelector` ~226 validates owner/revision/root/passage and uniqueness under transaction. **Reuse both**. `stories/reads.ts:projectCheckpointCampaign` ~246 currently presumes `.mechanics` v1 and paints empty active work; `readHistoricalScene` ~735 fetches checkpoint and as-of settings but not real v2 work.
- `stories/initialization.ts:{absentOpeningCheckpoint,quiescentCampaignOpeningCheckpoint}` builds v1; `stories/start.ts:createStoryStart` remains old candidate flow. Do not invent fake first scene for new direct Play.
- WR05P1 active `scene-after-state.ts` normalization and pure `projectStorytellerNotes` are **not yet inspected as landed**. Final path/type recheck required before Ready release, not a wholesale architecture review.

### Coherent stage/admit/replay proof

| Adversarial event | Expected behavior |
| --- | --- |
| Later notes patch changes state | staged v2 contains actual post-note data, SQL equals it at commit |
| Another action/offer/obligation changes between stage and lock | story-lock + semantic row/revision base fence rejects; unselected CAS remains harmless |
| Provider returns same result twice | one source-generation ID/transition returns existing published receipt/selector, no duplicate attempt |
| Provider status uncertain | no new model attempt authorized; v2 publication only from valid succeeded saved result |
| CAS write succeeds but SQL fails | no selector/passage/notes/outbox mutation; orphan CAS may be GC'd later |
| CAS verify fails | no SQL story-lock attempt; invalid/unavailable |
| New story with no mechanics | v2 captures `mechanicsAbsent`, no fabricated character or clock |
| Action/obligation active | v2 retains semantic plan/progress/due state; no provider leases or billing |
| Historic scene viewed after later mutations | v2 read uses stored snapshot, not current mutable SQL |
| v1 historic scene | same old parse/projection, no synthetic v2 backfill |

### Readiness gates

G0 **PENDING WR05P1** (actual helper API); WR05S landed. G1 PASS source anchors for old files and DB; G2 designed v2-only schema repair and stage/check/admit algorithm; G3 tasks bounded by owning modules; G4 parent dispatch T01 after WR05P1; G5 WR07M independent Writer tasks, WR08A Web-only, SQL tests serialized; G6 negative matrix specified, runtime UNRUN; G7 no extra packages, no broad resweep, one scope. **Verdict: PROPOSED successor; promote and commission after source check of WR05P1.** Do not label it Ready prematurely.
