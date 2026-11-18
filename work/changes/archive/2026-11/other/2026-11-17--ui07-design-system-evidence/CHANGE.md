# UI07 | Make the design foundation demonstrable and regression-testable

**State:** Done (2026-11-18). **Order/dependency:** UI01 through UI06 are Done. This Change adds evidence, not another UI library.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps platform status apart from a scene, and this packet does not rewrite that page or approve a final palette. | docs/technical/client/semantic-design-foundation.md#regression-and-evidence-gates | Visual taste stays a human gap. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#regression-and-evidence-gates records the provider-free matrix and the human gaps. | docs/product/experience/design-system-and-expression.md#experience-acceptance | A malformed presentation cannot change choice eligibility. |
| Code | changed: apps/web/src/features/play/ui/story-frame.tsx is the rendered book in the evidence test. Negative: a malformed direction leaves the same option ids enabled and does not call fetch. | apps/web/src/stories/story-frame.stories.tsx | No gameplay handler changes. No screenshot corpus. |
| Related | changed: work/changes/README.md and STATUS.md record this evidence and leave UI08 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start UI08. |

The new story and inventory files are apps/web/src/stories/design-system-matrix.stories.tsx and apps/web/src/stories/design-system-inventory.md.

## Explicit non-scope and safety

No automatic approval of final art direction; no huge golden-screenshot corpus, new hosted visual SaaS or gameplay source changes.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Verification and completion receipt

Plan guard returned ok before the evidence files. Base SHA `b0ab1ee268446535691783db1089f02571bdd234`.

Implemented files: apps/web/src/stories/design-system-evidence.test.tsx, apps/web/src/stories/design-system-matrix.stories.tsx, apps/web/src/stories/design-system-matrix-fixtures.ts, apps/web/src/stories/design-system-inventory.md. Owners: docs/technical/client/semantic-design-foundation.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

apps/web/src/features/play/ui/story-frame.tsx was not edited. apps/web/src/features/play/README.md was not edited. No gameplay handler changed. No screenshot corpus was added.

Proof: `vitest run` completed design-system-evidence.test.tsx (5) and storybook-isolation.test.ts (2). `pnpm --filter @offscreen/web typecheck` completed. ESLint on the new TypeScript files reported no errors. Storybook `Experience/Design system matrix` showed the Russian and Arabic passage, six enabled choices, the Stories title Ashfall Approach, a disabled Saving action, and an error notice. At 320px the document scroll width stayed 320. The malformed story kept the passage and the Ask choice, and the page did not contain the hostile example URL. No model call.

Human gaps stay in apps/web/src/stories/design-system-inventory.md. Visual taste is not an automated result. Storybook a11y remains `todo`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps platform status apart from a scene, and this packet does not edit that page or approve a palette | docs/product/experience/design-system-and-expression.md inspected at b0ab1ee268446535691783db1089f02571bdd234 | reviewed | The inventory says this is not a final art approval | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#regression-and-evidence-gates | technical | changed: the heading now records the fixture matrix, the fetch negative, and the human-gap inventory | docs/technical/client/semantic-design-foundation.md and apps/web/src/stories/design-system-evidence.test.tsx over b0ab1ee268446535691783db1089f02571bdd234 | fixture-tested | A malformed direction left six option ids enabled and fetch was not called | The inventory names the stories and the gaps |
| docs/technical/client/semantic-design-foundation.md#component-criteria | technical | unchanged: the shared-control criteria were not rewritten by this evidence packet | docs/technical/client/semantic-design-foundation.md over b0ab1ee268446535691783db1089f02571bdd234 | reviewed | The matrix uses the existing Action, SystemNotice, and StoryFrame | No map edit |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules were not rewritten | docs/technical/client/semantic-design-foundation.md over b0ab1ee268446535691783db1089f02571bdd234 | reviewed | The viewport style did not assign danger, focus, or reader ink | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over b0ab1ee268446535691783db1089f02571bdd234 | reviewed | The evidence render does not submit a choice | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over b0ab1ee268446535691783db1089f02571bdd234 | reviewed | The hostile example URL was not applied to a choice | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already requires keyboard, focus, and error semantics, and it was not edited | docs/technical/client/accessibility-and-performance.md over b0ab1ee268446535691783db1089f02571bdd234 | reviewed | The closed Contents menu had no Journal link, and the pending action was disabled | The inventory records that a physical keyboard ring was not automated |
| STATUS.md | evidence | changed: the visual-system note now records the matrix as fixture-tested and leaves UI08 and DIR01 through DIR03 without this program's code | STATUS.md over b0ab1ee268446535691783db1089f02571bdd234 | reviewed | The note does not claim final art approval or a screenshot corpus | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.