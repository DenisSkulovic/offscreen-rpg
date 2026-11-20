# DIR02 | Attach validated V1 art direction to an exact published passage safely

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Done (2026-11-18). The publication insert can store a server-validated scene subset. The worker does not pass a candidate. No model call and no migration.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md) and [Scene-direction production](../../../../../../docs/technical/client/scene-direction-production.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps a scene apart from the current choice | docs/product/experience/design-system-and-expression.md | A saved scene still does not change the choice |
| Technical | changed: docs/technical/client/scene-direction-production.md#three-independently-verifiable-links records that the publication insert can store a validated scene subset | docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | Ordinary publication still has no model-authored scene |
| Code | changed: packages/application/src/stories/persistence.ts stores an optional appearance, and packages/application/src/storyteller/publication.ts supplies it only after the settled and stale fences. Negative: an invalid candidate does not roll back the passage and is not stored | packages/contracts/src/stories.ts | The worker call does not supply a candidate |
| Related | changed: STATUS.md records the writer limit and leaves DIR03 unselected | work/changes/README.md | Queue selection is not permission to start DIR03 |

## Verification and completion receipt

Baseline `a508ab1422870b60763fcf8ff7350c6045fd8220`. Contract scene tests: 5, 0 failures. Publication appearance tests: 3, 0 failures. Book fixture: 4, 0 failures. SQL publication was not executed. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged because a stored scene still does not change the current choice | apps/web/src/features/play/ui/appearance-roundtrip.test.tsx dirty against a508ab1422870b60763fcf8ff7350c6045fd8220 | fixture-tested | the subset fixture keeps the walk and wait ids | the heading stayed in place |
| docs/technical/client/scene-direction-production.md#three-independently-verifiable-links | technical | changed: link C names the optional subset writer and the empty ordinary publication | packages/application/src/storyteller/publication.ts dirty against a508ab1422870b60763fcf8ff7350c6045fd8220 | source-observed | a settled or stale publication still returns before the insert | the heading stayed in place |
| docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | technical | unchanged because the result schema still has no art-direction field | docs/technical/storyteller/generation-and-publication.md at a508ab1422870b60763fcf8ff7350c6045fd8220 | source-observed | the page does not mention appearance | the heading stayed in place |
| packages/contracts/src/stories.ts | code | changed: a publication candidate accepts only the scene subset and the server source | packages/contracts/src/stories.ts dirty against a508ab1422870b60763fcf8ff7350c6045fd8220 | fixture-tested | a caller-supplied source, a gradient, and a remote URL are omitted | packages/contracts/test/scene-appearance.test.ts |
| packages/application/src/stories/persistence.ts | code | changed: the continuation insert stores appearance only when the caller supplies one | packages/application/src/stories/persistence.ts dirty against a508ab1422870b60763fcf8ff7350c6045fd8220 | source-observed | opening, fork, and campaign continuation inserts still omit it | the column stays optional |
| packages/application/src/stories/scene-appearance.ts | code | changed: the publication passage id is the staged id or the generation id, and an invalid candidate adds no appearance | packages/application/src/stories/scene-appearance.ts dirty against a508ab1422870b60763fcf8ff7350c6045fd8220 | fixture-tested | a rejected candidate keeps the passage id and stores nothing | packages/application/test/scene-appearance.test.mjs |
| STATUS.md | related | changed: the note records the subset writer and the empty ordinary publication | STATUS.md dirty against a508ab1422870b60763fcf8ff7350c6045fd8220 | source-observed | the note does not say a model authored the scene | the status page still points at the queue |

exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/open/backlog-convergence-2026-11-18/README.md because the backlog map records that this writer is finished
exception: work/designs/README.md because the design index counts this writer as finished
exception: work/designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md because the handoff must not ask for this writer again
exception: work/designs/open/player-experience-refoundation/phase-3/README.md because the phase map records this writer

DIR03 stays unselected. This packet does not start it.