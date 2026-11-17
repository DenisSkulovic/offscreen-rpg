# DIR01 | Prove current persisted appearance read→UI chain with deterministic data

**State:** Ready after UI03; may execute before UI07 if UI03 landed (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI03 book component boundary; the existing `current.appearance` contract; no new paid call.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md) and [Scene-direction production](../../../../docs/technical/client/scene-direction-production.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Verification and completion receipt

Targeted contract/application/web Vitest or test DB integration with exact test output; clearly distinguish source read path from any unproved publication writer.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.