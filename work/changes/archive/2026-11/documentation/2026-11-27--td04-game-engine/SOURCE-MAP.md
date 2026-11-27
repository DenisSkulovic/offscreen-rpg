# TD04 | source and claim map

Inspected main `a28693dcefe80a3242a870ed03a6c144b47f1ac7` via frozen original snapshot and documentation-only committed deltas. Source existence and historical proof, not new runtime certification. See exact sections below; all executable source unchanged.

## T01 | Engine authority and proof boundaries

Owned current headings / route:

- `docs/technical/engine/authority-and-transitions.md`: Connected solo gameplay: implementation contract; What is decided for the first proof; A minimum state ledger; Clock correction: the nearest implementation boundary; Situation authorization: reuse is not permission; Boundary follow-ups and task contracts; Commands, recovery and what the player sees; Chain and idle edges; Evidence and implementation discipline.

- `docs/technical/engine/concurrency-and-recovery.md`: Engine concurrency and recovery; Before, during, and after the lock; What C1 and C2 actually proved; Negatives that are already enforced in those slices; What is still not done; Recovery the player can see.

Controlling/current evidence anchors: `packages/story-engine/src/stories/resolution.ts#createStoryResolution`; `packages/story-engine/src/stories/continuation.ts#commitStoryContinuation`; `docs/technical/platform/execution-and-delivery.md#responsibility-at-the-database-boundary`. Selected transformation and negative are fixed in TASKS T01.

## T02 | Clock and calendar contracts

Owned current headings / route:

- `docs/technical/engine/calendars-and-world-time.md`: Calendars and consequential world time; Calendars label accepted time; One chronology, optional ways of naming it; Small explicit calendar modes; Variable months, leap rules and eras; Scheduled consequences, seasons and uncertainty; Shared settlement and deadline collisions; Worked example: two months to prepare; Storyteller context and cost; QA evidence map.

- `docs/technical/engine/chronology-and-activities.md`: Deliberate execution, action time and Storyteller readiness; Permission, interval, hold, settlement, interruption; Units and responsibility — current implementation; Permission to advance; Every authored option declares time semantics; A selected action has two independent completion requirements; Decisions with deadlines; Worked traces and acceptance checklist.

- `docs/technical/engine/ticks-and-tags.md`: Fictional-time and tag contracts; What the arithmetic does not do; Fixed real-second scheduling and fictional time; Tag definitions and applications; Context compilation and authority; Acceptance traces.

Controlling/current evidence anchors: `packages/game/src/time.ts#earnedGameSeconds`; `packages/game/src/activities.ts#nextBoundaryGameSecond`; `packages/story-engine/src/storyteller/runtime.ts`; `packages/story-engine/src/storyteller/saved-generation-publish.ts`. Selected transformation and negative are fixed in TASKS T02.

## T03 | Mechanics and activity authority

Owned current headings / route:

- `docs/technical/engine/mechanics-and-capabilities.md`: Rules, admitted actions and storyteller consequences; Supported mechanisms and the future kernel; Content and authority; Admitted action and time; Consequence narration; Opportunity boundary; Prepared local opportunities; Persistence and known limits; Activity history and diagnostics.

Controlling/current evidence anchors: `packages/game/src/checks.ts#resolveCheck`; `packages/game/src/activities.ts#settleProcessBoundary`; `packages/game/src/effects.ts#applyOutcomeEffects`; `packages/game/src/offers.ts#selectOfferAction`. Selected transformation and negative are fixed in TASKS T03.

## T04 | Historical branches and lifecycle

Owned current headings / route:

- `docs/technical/engine/lifecycle-and-compatibility.md`: Story creation, control and completion; Five owners; Forked continuities; Drafts and generated previews; Scripted chamber initialization; Start exactly the reviewed story; Distinguish lifecycle from interruption; Membership and settings changes; Finish and delete; Workflow replay compatibility.

Controlling/current evidence anchors: `packages/story-engine/src/stories/forks.ts#createStoryForks`; `packages/story-engine/src/stories/scene-checkpoint-v2.ts#projectV2HistoricalCampaign`; `packages/story-engine/src/stories/continuation.ts#lockedCheckpointMatches`. Selected transformation and negative are fixed in TASKS T04.

## T05 | Selected architecture and source routing

Owned current headings / route:

- `docs/technical/engine/selected-architecture.md`: Selected engine architecture; Five contracts; Failure model; Alternatives that lose for now; Transitional package extraction selected for MA06A (2026-11-21); Post-MA08 internal ownership target and enforcement; Source-reality checkpoint: what the selected architecture has not proved (2026-11-22); Package-boundary evolution criterion after MA08 (proposed, not a new package commission); Six logical subsystems; Causal spine; Non-negotiables; Ownership lines; Selected near-term module ownership cuts (MA05A / MA05B); Selected next ownership boundaries (MA05C, MA05D, MA05E); Preferred capture shape; World-neutral capability kernel; Sparse identities; What stays open; Why this can evolve; Production API versus outer Lab dependency boundary (MA12, planned 2026-11-22).

- `docs/decisions/D-0001--modular-engine.md`: D-0001 | Modular engine, not an LLM-led chat; Choice; Rejected for now; Revisit; Continuity on 2026-11-19.

- `packages/story-engine/README.md`: Story engine.

Controlling/current evidence anchors: `apps/game-authority/src/launch-put.ts#createLaunchPutService`; `apps/worker/src/activities/index.ts#createWorkerActivities`; `packages/story-engine/src/stories/index.ts`. Selected transformation and negative are fixed in TASKS T05.


## Verified observations and limits

resolveCheck, earnedGameSeconds, selectOfferAction, settleProcessBoundary are concrete pure/typed mechanisms; createStoryResolution and commitStoryContinuation are separate application routes. createStoryForks and projectV2HistoricalCampaign exist, not a historical play-forward acceptance claim. runtime.ts and saved-generation-publish.ts both default realDurationMs to 20,000; callback only establishes adapter existence. D-0001 current working selection must not be revoked by editorial work. Story Engine README old Application re-export is obsolete because packages/application absent. Current launch/worker route exists; old checkpoint is dated, no full distributed proof.

Keep affected typed dependencies and headings stable. Shared architecture/STATUS routes assigned to integration; any further consequential source contradiction is planner-owned, not an executor design decision.
