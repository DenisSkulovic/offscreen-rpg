# DIR01 | Prove current persisted appearance read→UI chain with deterministic data

**State:** Done (2026-11-18). **Order/dependency:** UI03 is Done. This packet proves the existing appearance projection into the book. No new paid call and no new writer.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md) and [Scene-direction production](../../../../../../docs/technical/client/scene-direction-production.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

A reliable provider-free integration/contract fixture demonstrates that a **matching saved V1 appearance** is read as part of current StorySnapshot, validated and rendered as scene backdrop/lighting while original prose and current choice authority stay unchanged.

## Code owners and baseline

`packages/contracts/src/stories.ts`, `packages/application/src/stories/reads.ts` and nearest existing read tests, `apps/web/src/features/play/model/live-presentation.ts`, Play presentation tests/Storybook. Prefer test code only; no new writer unless test harness already provides safe seed.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Reinspect exact current appearance storage representation and current passage source checks. Use sanctioned test fixtures or in-memory DB only; no production DB migration or new REST endpoint.
2. Construct two otherwise identical published V1 source fixtures: matching safe `appearance` with backdrop/lighting/choice target; and absent/invalid/stale appearance. Read through actual existing service/read schema boundary into a snapshot and `resolveLivePresentation` into `StoryFrame`.
3. Assert same source/offer ID/action payload across both, with only bounded atmosphere and optional valid treatment changing. Test wrong story ID, wrong passage ID, stale campaign offer, unapproved media ref, malformed CSS-like color and no-direction fallback.
4. If no safe persistence seeding path exists, create **only a smaller read-path integration test** and record the missing writer seam as a blocker for DIR02. Do not fake a full roundtrip in documentation.

## Acceptance: normal and discriminating negative

Normal: matched V1 appearance yields source-faithful backdrop variation and legitimate choices.
Negative: stale/invalid/missing metadata does not throw, leak prior story's style, add paid calls, change statuses or act as a command. Test the actual read service, not only `resolveFixture`.

## Explicit non-scope and safety

No storyteller prompts, generation, new contract V2, art generation, history appearance, schema migration, provider calls, physical pages.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps a scene apart from the current choice, and this packet does not rewrite that page. | docs/technical/client/scene-direction-production.md#three-independently-verifiable-links | No art approval and no new genre. |
| Technical | changed: docs/technical/client/scene-direction-production.md#three-independently-verifiable-links records the projection proof and the missing publication writer. | docs/technical/client/semantic-design-foundation.md#regression-and-evidence-gates | A wrong passage id does not restyle the book. |
| Code | changed: packages/application/src/stories/reads.ts projects a saved appearance only when the story and passage match. Negative: a wrong passage id is omitted, and the book keeps the same option ids. | apps/web/src/features/play/model/live-presentation.ts | No command identity change. No database seed. No model call. |
| Related | changed: work/changes/README.md and STATUS.md record this read proof and leave DIR02 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start DIR02. |

## Verification and completion receipt

Plan guard returned ok before the source edits. Base SHA `40f788ecf6f8f4d80695cb984d58ee784fce6b28`.

Implemented files: packages/contracts/src/stories.ts, packages/contracts/test/scene-appearance.test.ts, packages/application/src/stories/reads.ts, apps/web/src/features/play/ui/appearance-roundtrip.test.tsx, apps/web/src/stories/story-frame.stories.tsx. Owners: docs/technical/client/scene-direction-production.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

apps/web/src/features/play/README.md was not edited. No command handler changed. No database seed was added. No publication writer was added. DIR02 still owns that seam.

Proof: `node --test` completed scene-appearance.test.js (3). `vitest run` completed appearance-roundtrip.test.tsx (3), live-presentation.test.ts (3), and storybook-isolation.test.ts (2). `pnpm --filter @offscreen/contracts build` completed. `pnpm --filter @offscreen/application typecheck` completed. `pnpm --filter @offscreen/web typecheck` completed. Storybook `Experience/StoryFrame` Saved appearance at 320px kept the document scroll width at 320. The backdrop was the saved color, lighting was dim, and Walk and Wait stayed enabled. No model call.

The Storybook specimen shows an already accepted appearance. The projection cases, including the wrong passage and the rejected asset src, are in the tests. A physical database row was not written.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps a scene apart from the current choice, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at 40f788ecf6f8f4d80695cb984d58ee784fce6b28 | reviewed | A wrong passage id left the book without the saved backdrop | The product page already links the technical owner. No route moved. |
| docs/technical/client/scene-direction-production.md#three-independently-verifiable-links | technical | changed: link B now records the projection proof, and it records that the database seed and publication writer remain unproved | docs/technical/client/scene-direction-production.md and packages/contracts/src/stories.ts over 40f788ecf6f8f4d80695cb984d58ee784fce6b28 | fixture-tested | A wrong passage id, a missing value, and an asset src outside the public schema were omitted | The page names DIR02 as the writer seam |
| docs/technical/client/semantic-design-foundation.md#regression-and-evidence-gates | technical | unchanged: the evidence gates were not rewritten by this read proof | docs/technical/client/semantic-design-foundation.md over 40f788ecf6f8f4d80695cb984d58ee784fce6b28 | reviewed | The book test did not call fetch | No map edit |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over 40f788ecf6f8f4d80695cb984d58ee784fce6b28 | reviewed | The appearance cue does not submit a choice | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over 40f788ecf6f8f4d80695cb984d58ee784fce6b28 | reviewed | The hostile example URL was not applied to a choice | No map edit |
| docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | technical | unchanged: the publication owner was not edited, and this packet does not add an appearance writer | docs/technical/storyteller/generation-and-publication.md inspected at 40f788ecf6f8f4d80695cb984d58ee784fce6b28 | reviewed | No publication writer was added | DIR02 remains the writer seam |
| STATUS.md | evidence | changed: the note records the projection proof and leaves the database seed and DIR02 without this program's code | STATUS.md over 40f788ecf6f8f4d80695cb984d58ee784fce6b28 | reviewed | The note does not claim a persisted roundtrip or a model call | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.