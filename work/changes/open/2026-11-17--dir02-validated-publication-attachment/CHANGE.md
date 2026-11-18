# DIR02 | Attach validated V1 art direction to an exact published passage safely

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Ready for deterministic exact-transaction appearance writer implementation (2026-11-18); missing INSERT value is explicitly in scope, no provider or migration.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md) and [Scene-direction production](../../../../docs/technical/client/scene-direction-production.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

A **deterministic author-independent** V1 directive can be associated with one exact committed passage through the existing authoritative writer and read as current appearance, without modifying gameplay settlement.

## Code owners and baseline

Potential source in `packages/application/src/generations/`, `packages/application/src/stories/` and DB source owners; exact function must be identified at HEAD; shared contract may already support optional appearance; web reader remains unchanged.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Investigate exact generation settlement and source publication fence. Write a small decision receipt identifying source ID, commit transaction, persistence field/ownership, rollback and idempotency. **Stop** if the existing schema/writer cannot safely support the attachment.
2. Given a deterministic safe `ScenePresentationV1` fixture and explicit passage/offer IDs, validate all bounded fields and target identity before saving; never accept raw CSS/HTML/external URLs. Unknown/invalid directives drop as decoration.
3. Attach appearance **atomically with the published passage** if already supported, or through an approved idempotent exact-source fenced path. Do not patch newer Now, settled game state or prior published prose.
4. Use existing read→Play path and test a successful fixture, duplicate attempt, concurrent newer publication, stale offer and invalid asset. Missing directive always falls back cleanly.
5. Document source writer and real limits. Do not use a separate paid artist or expand existing charge authorization.

## Acceptance: normal and discriminating negative

Normal: one deterministic directive survives authoritative publication, reload and source-matched client render, with exact original text/offer.
Negative: stale concurrent publication does not overwrite new Now; duplicate callback is idempotent; invalid direction causes no story rollback, provider retry, cost or stale style; no historic material falsely appears as original.

## Explicit non-scope and safety

No paid/model authored output, multi-pass loop, new history API, V2 prose score, image generation, CSS/DOM strings, or migration without separate explicit authorization.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps a scene apart from the current choice, and this packet does not rewrite that page. | docs/technical/client/scene-direction-production.md#three-independently-verifiable-links | No art approval and no model author. |
| Technical | changed: docs/technical/client/scene-direction-production.md#three-independently-verifiable-links records whether the publication insert writes appearance. | docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | A stale publication must not restyle a newer passage. |
| Code | unchanged because packages/application/src/stories/persistence.ts insertContinuationPassage does not write appearance, and packages/application/src/storyteller/publication.ts returns before that insert when the publication is already settled or the story revision moved. Negative: a stale revision does not update the current passage. | packages/db/src/schema/stories.ts | No new writer, migration, or API. |
| Related | changed: work/changes/README.md and STATUS.md record the writer finding and leave DIR03 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start DIR03. |

## Verification and completion receipt

Plan guard returned ok before the finding was written. Base SHA `1fd338fd2ff4b11710d11c42a079e34f52c63da6`.

No executable file was edited. Inspected: packages/db/src/schema/stories.ts, packages/db/migrations/0002_fair_magus.sql, packages/application/src/stories/persistence.ts, packages/application/src/stories/initialization.ts, packages/application/src/stories/forks.ts, packages/application/src/storyteller/publication.ts, packages/application/src/stories/continuation.ts, packages/application/src/campaign/persistence.ts. Owners updated: docs/technical/client/scene-direction-production.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

Decision: `story_passage.appearance` is an optional jsonb column. `insertContinuationPassage` inserts the new passage and does not set it. `publishStorytellerResult` returns before that insert when `storyteller_publication.state` is already `published` or `stale`, and when `current.revision` is not `task.source.narrativeRevision`. The opening, fork, and campaign continuation inserts also omit the column. No generation result carries a directive. Adding an unused argument would not make a saved row. A new writer would be a separate change. The disposable integration harness was not started. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps a scene apart from the current choice, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at 1fd338fd2ff4b11710d11c42a079e34f52c63da6 | reviewed | A scene column that the writer leaves empty cannot restyle a choice | The product page already links the technical owner. No route moved. |
| docs/technical/client/scene-direction-production.md#three-independently-verifiable-links | technical | changed: link C now names the insert that omits appearance and the publication returns that happen before it | docs/technical/client/scene-direction-production.md and packages/application/src/stories/persistence.ts over 1fd338fd2ff4b11710d11c42a079e34f52c63da6 | reviewed | A stale or already settled publication returns before the passage insert | The page does not claim a persisted roundtrip |
| docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | technical | unchanged: the publication owner was not edited and still does not mention appearance | docs/technical/storyteller/generation-and-publication.md inspected at 1fd338fd2ff4b11710d11c42a079e34f52c63da6 | reviewed | No publication writer was added | DIR03 remains blocked on spend and quality |
| STATUS.md | evidence | changed: the note records that the publication insert does not write appearance and that no writer was added | STATUS.md over 1fd338fd2ff4b11710d11c42a079e34f52c63da6 | reviewed | The note does not claim a saved row or a model call | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.