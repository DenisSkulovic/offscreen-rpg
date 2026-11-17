# Phase 3 | Storyteller-directed environment, without giving the model the UI

**Status:** conditional study underpinning DIR01–03. In-source read bridge **exists**; trustworthy automatic producer **not established**. Implement deterministic proof before making an LLM do extra work.

## Three layers to reconcile

1. **Storyteller truth output**: validated `passageContentSchema` title + paragraphs, current authoritative choice/offer, settlement/fence. Source: `packages/storyteller/src/tasks/{task-contracts,playable-proposal}.ts`, `packages/application/src/{stories,generations}`.
2. **Published source-scoped appearance**: optional `current.appearance` with source IDs/opaque directive/approved asset catalog in `packages/contracts/src/stories.ts`; `packages/application/src/stories/reads.ts` checks story/passage identity.
3. **Frontend interpretation**: `apps/web/src/features/play/model/live-presentation.ts` and `presentation/{parse,resolve,types}.ts`. It can consume safe V1 directives but a valid fixture is not evidence of model generation.

## Recommended artistic production policy

Let the Storyteller attend to fiction first. Art direction is an **optional tiny structured sidecar**, preferably from the same already-budgeted generation if compatible with provider schema and quality. No separate model call by default. Only valid source-bound fields can be published. Lack of direction produces a neutral but complete book scene.

**Story style vs scene state:** story signature persists in a controlled way; scene direction changes only with verified context. Lighting may evolve slowly across 5 related passages. The renderer's book shell stays the same. Never repaint the book into an entirely different technology because the character is a microbe or in a spaceship. Limit loud effects to explicit important moments.

**No fake cues:** red/accent on an option is not evidence the choice is dangerous; color treatment cannot promise results. A whimsical "bloodstain" cannot be generated from the narrator's dramatic metaphor and passed off as real document evidence. Unsupported illustration slots remain empty/omitted without breaking content.

## Source authority and persistence gates

- Directive must be versioned, schema-valid (not merely a frontend string), and scoped to exact saved story/passage/offer identities, with idempotency and budget recorded.
- At publication choose an atomic association with the exact passage, or a separate idempotent source-fenced attachment; do **not** alter settled game mechanics or reuse prior generation without identity proof.
- A stale/pending/failed suggestion must not alter current style or trigger a paid reroll; late art can decorate only the passage it was approved for.
- Historical Journal currently returns only original title/paragraphs. Rich historic look needs separately designed stored source and authorized read path; no fake "this old page looked like this" claims.
- Separate measured **validity, narrative quality, cost, latency, continuity and visual benefit** for model-generated sidecar vs a neutral/deterministic baseline. If benefit unproven, *do not adopt*; preserving the renderer language is still valuable.

## Go/No-Go examples

Identical prose/options with four validated directions (cave/ship/nonhuman/quiet), a 5-passage stable life, long noisy source, wrong passage ID, corrupt CSS-like input, stale offer, absent approved asset, reduced motion/forced colors, no art and pending/uncertain generation. Verify that both technical and fictional semantics remain truthful.

**DIR01** tests existing read path end-to-end with deterministic fixture and no paid model. **DIR02** can implement the minimum validated publication attachment only after proving real source/publisher seam and asking for separate design authorization if new schema/migration is required. **DIR03** adds optional model-authored fields only after cost/quality and operator approval; it must be deferred, not forced, if the policy cannot fit the existing envelope. **V2 rich text is explicitly later work** with its own accepted score contract, not a hidden extension of DIR03.