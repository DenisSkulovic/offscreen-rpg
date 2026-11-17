# UI07 | Make the design foundation demonstrable and regression-testable

**State:** Ready after UI03/UI05/UI06 (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI01–UI06 appropriate surfaces; this Change adds executable QA fixtures/tests, not another UI library.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

A curated Storybook design-system specimen matrix and runnable provider-free regression checks prove shared semantic roles, fallback and interaction safety across the Book, Stories and Create.

## Code owners and baseline

`apps/web/src/stories/`, `apps/web/.storybook/`, existing a11y/MSW fixtures; targeted test helpers and optionally a narrow Playwright script if existing runner supports it.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Add compact component and composed-page specimens: Book Now/Journal, Stories, Create, Action, SystemNotice and BookContents. Use real source-like prose and legitimate IDs; no random changes for image beauty.
2. Fixture matrix: Greywater/ordinary, cave, ship, abstract microbe-like, quiet no-art, malformed/missing V1 presentation, long Russian/RTL string, six options, pending/blocked/error, large text, reduced motion and forced-colors.
3. Provider-free CI-friendly checks: render without JS exceptions, source prose and option identities invariant, no hidden choice/focus trap, contrast-critical semantic states, controlled viewport screenshots or measurable DOM invariants. Any images/screenshots remain *evidence*, not proof of Storyteller authority.
4. Produce a concise human-review checklist and explicit failures rather than falsely marking visual taste as automated `green`. Avoid adding unbounded snapshot galleries or flaky animation timing.
5. Output a documented design-system usage inventory and duplication audit based on actual components.

## Acceptance: normal and discriminating negative

Normal: deterministic tests run on current code and give actionable failure reports; Storybook shows consistent semantics across three main surfaces.
Negative: invalid creative direction cannot affect status/choice eligibility, no paid provider invocation, tests do not leak private mock data or depend on network/actual generative output.

## Explicit non-scope and safety

No automatic approval of final art direction; no huge golden-screenshot corpus, new hosted visual SaaS or gameplay source changes.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Verification and completion receipt

Actual commands/results recorded (Vitest, Storybook build, selected browser/axe checks); saved evidence paths, failing cases and clearly stated manual review gaps.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.