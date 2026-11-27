# Scene commit, active-work and playable-fork audit

**Status:** 2026-11-20 source-level investigation of user-supplied `09d5820bcafedbed7cf969fe228ee84f44ff2405`. GitHub code HEAD was unchanged since that snapshot; only the design dossier has been added. **No DB/cluster tests or live model invocations were run.** Claims below distinguish direct code behavior, conditional risks and unproven end-to-end consequences.

**Question:** Does the immutable historical scene selector actually preserve the post-publication Library, effective authoring context, mechanical state and playable choices needed to review and independently resume *that* scene?

## Current supported path

| Current mechanism | Source | Observed semantics |
| --- | --- | --- |
| Content-addressed document publication | `packages/application/src/stories/passage-documents.ts::stageStoryPublicationDocuments`, `stories/continuation.ts::commitStagedStoryPublication` | A published Storyteller passage adds an immutable source-passage document and possibly bounded document proposals. SQL selects the prepared document root alongside passage publication. |
| Quiescent checkpoint | `packages/documents/src/schema.ts::sceneCheckpointSchema` and `packages/application/src/stories/scene-checkpoint.ts` | V1 checkpoint is an immutable, at-most-1-MiB object; selector keyed by (story, scene sequence), with frozen passage, item/campaign subset, root/revision and world/rule/profile pins. Active offer, hold, wait, decision deadline or running work cannot be represented. |
| Opening creation | `packages/application/src/stories/start.ts` + `stories/initialization.ts` | A suitable non-mechanical opening can stage an absent-mechanics checkpoint; a quiescent campaign opening is staged when admitted conditions allow it. A start with world obligations does not universally get a checkpoint. |
| Continuation preflight | `packages/application/src/stories/continuation.ts::stageSupportedContinuationCheckpoint` | Prepares a checkpoint before acquiring the story transaction lock only when the proposal has no wait/decision, the current campaign has no listed active state, and the blockers permit it. Unsupported states return undefined while the continuation may still publish. |
| Finalizer | `packages/application/src/stories/continuation.ts::commitStoryContinuation` and `scene-checkpoint.ts::insertStagedSceneCheckpointSelector` | Rechecks staged expected root and compares the checkpoint against SQL under the story lock; inserts checkpoint selector in transaction. This is an important existing safety boundary worth retaining. |
| Historical review | `packages/application/src/stories/reads.ts::readHistoricalScene` | Requires an existing checkpoint; returns that frozen passage/items/projection/root and never falls back to current live mechanics. Historic interactions are intentionally not actionable (`canRespond: false`). |
| Historical fork | `packages/application/src/stories/forks.ts::forkFromSceneCheckpoint` | Reads stored v1 checkpoint, remaps the boundary passage and interaction IDs, stages a branch manifest containing ancestor metadata, remaps quiescent state and new clock anchor. It refuses unsupported active work. |
| Explicit long-term target | `docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities` | Every committed scene independently addressable as a fork point, with that scene's knowledge root and mechanical state together. This **target is selected in docs**, but v1 implements a narrower subset. |

## Critical source-derived gaps

### G1: checkpoint eligibility can be suppressed by historical rows

`continuation.ts::checkpointIsBlocked` queries *any row* in `storyResolution` excluding the current transition, `worldObligation`, `gameOffer`, and `gameActivity`, plus pending reports. It does not predicate offers/activities/obligations by currently active state. For example, `world_obligation.state` explicitly supports `pending | fired | cancelled` in `packages/db/src/schema/campaign.ts`, but this preflight does not filter it.

**Observed:** historical presence alone is a blocker for this specific checkpoint path. **Inference:** if historical rows are retained, checkpoint availability can remain suppressed long after the activity completes. This is not yet a measured production frequency or a universal defect in all start/continuation routes. The chosen v1 behavior is intentionally conservative, but cannot satisfy every-scene checkpoints.

### G2: some passage-producing publication modes bypass this checkpoint path

`storyteller/publication.ts` calls `stageSupportedContinuationCheckpoint` only for its eligible `task.task === 'continuation'` branch. The consequence/pending-consequence branch publishes an action-plan offer and passage through a separate branch; it does not build the same quiescent checkpoint. V1's schema also excludes that offer. This is not merely a database-column gap: the complete active scene semantics are outside the v1 checkpoint contract.

### G3: a checkpoint can describe *pre-notes* state for a post-publication scene

`stageSupportedContinuationCheckpoint` builds the candidate from current `story.continuityNotes` before publication. `commitStoryContinuation` then compares/inserts the staged checkpoint and **afterwards** invokes `publishStorytellerNotes`, which applies `result.currentNotes` or `arrivalNotes` and updates `story.continuityNotes` in the same SQL transaction.

`packages/application/test/scene-checkpoint-publication.test.mjs` explicitly exercises a new `gary-watch` continuity note, verifies both that the checkpoint row exists and that the live story notes include the new note, but does **not** verify that the checkpoint contains the resulting note. The checkpoint content was constructed from pre-publication notes, so the recorded scene boundary need not include those newly committed notes.

This is a **source-level temporal skew relative to our proposed post-publication snapshot requirement**, not evidence of corrupted atomic SQL. It calls for computing/validating the **full resulting state** before storing its immutable checkpoint.

### G4: historical creative projection still reads some live story fields

`reads.ts::readHistoricalScene` retrieves `story.storyteller` and `story.execution` from the owned **live story row**, using them in the historic summary/source mode, while the immutable checkpoint separately stores `storyteller` and `execution`. Similarly `forks.ts` writes `checkpoint.premise` but takes live `source.storyteller/execution/usagePolicy` into the fork.

These values appear largely stable under current v1 writing paths. **Not a proven user-facing regression today.** They become historically incorrect if creative profile/execution values are mutable per scene, a capability central to the new file-first Writer's Library.

Historical *creative* pins should come from the committed boundary. Fresh authorization, current safety and new-branch **spend policy** must be separately established; copying old budget grants would also be wrong.

### G5: branch fork carries visible interactions but clears their origin

Both `forkLiveRevisionOne` and `forkFromSceneCheckpoint` remap the passage and set `sourceGenerationId: null`, `sourceGenerationPart: null` so an inherited paid generation is not counted as the branch's own execution. This is good accounting isolation.

However, `storyteller/admission.ts::prepareStorytellerResolution` requires `active.sourceGenerationId` and an interaction to recover/validate the hidden options/intent; the scripted path in `stories/resolution.ts::prepareScriptedResolution` similarly requires that source generation. The historical fork test checks the new interaction ID and state, but not submission of the inherited option.

**Source-level gap:** a copied visible interaction is insufficient to prove the fork can continue using the normal generated-choice path. End-to-end fork-choice execution has not been tested in this audit. Future design needs immutable **admitted intention/choice evidence** independent of the parent's paid provider operation, plus branch-local ID remapping.

### G6: narrative sequence is not the world-state event sequence

`packages/db/src/schema/stories.ts` comments explicitly that narrative revision selects the latest passage and control/timing state is separate. Activities, obligations, action executions, offers, deadlines and clock anchors may evolve without new passages.

**Implication:** a “snapshot at scene 37” must define its precise observation boundary. The sensible proposed meaning is **post-publication state at the scene-37 commit**, not an arbitrary later wall-clock moment when the reader opens scene 37. If a mechanical event commits after scene 37 but before passage 38, it must have its own ordered state boundary. Review/fork from 37 must not import that later event.

`packages/application/src/campaign/clock.ts::projectCampaignClock` only earns clock time when a specifically accepted activity or finite action owns the advancing slot and is not held; publishing an idle scene alone is **not proof that its clock runs during lost UI delivery**. The one-click launch design still needs an explicit no-accidental-autostart policy, but do not allege free-running idle clocks as a current bug.

## What already works well

- CAS objects and staged write/readback; a failed SQL transaction need not select incomplete objects.
- SQL story lock, expected revision/root, idempotent passage/transition identifiers and unique checkpoint selectors.
- V1 historical reader deliberately does not substitute current mutable mechanics on missing checkpoint.
- Fork remaps IDs, severs parent generation ownership and reanchors fictional clock to branch time.
- V1 purposely rejects unsupported states instead of synthesizing a fake snapshot.

## Resulting implementation pressure

**Must solve before “every scene forkable”:** consistent post-state capture (G3); checkpoint eligibility covering actual published scene categories (G1/G2); self-contained forkable choices (G5); precise as-of world-state and historic creative pins (G4/G6); source-identity/Library DAG improvements already identified in [historical scene design](HISTORICAL-SCENE-AND-PROVENANCE.md).

**Do not confuse:** cloning a parent's Temporal workflow, unsettled provider work, billing reserve, external side effects or physical document files **is not** preserving fictional active state.

See [Scene Commit V2](SCENE-COMMIT-AND-ACTIVE-WORK-DESIGN.md) and [migration/reconciliation gates](FORK-COMPATIBILITY-AND-MIGRATION-GATES.md).
