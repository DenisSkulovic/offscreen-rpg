# Storyteller art direction | Bounded author → publication → reader target

**State:** **CONDITIONAL TECHNICAL TARGET**, design approved for investigation but **no automatic provider-writing change is approved** (2026-11-17). Source/protocol facts are verified; the exact production seam and spend policy require a design gate. [Product expression](../../product/experience/design-system-and-expression.md), [existing V1 resolver](presentation-runtime.md), [Storyteller publication owner](../storyteller/generation-and-publication.md), and [Phase 3 art-direction study](../../../work/designs/open/player-experience-refoundation/phase-3/02-ART-DIRECTION-PRODUCER-AND-QUALITY-GATES.md).

## Three independently verifiable links

**A. Frontend interpreter exists.** `apps/web/src/features/play/presentation/{types,parse,resolve,contrast}.ts` define finite `ScenePresentationV1`: palette, gradients, bounded lighting, texture, two small motion roles, exact-target choices, approved media IDs. `resolveLivePresentation` consumes only matching appearance and supports silent fallback.

**B. Optional saved read/projection path exists.** `packages/story-interface/src/stories.ts` has `current.appearance` with source identities and opaque directive. `projectStoredSceneAppearance` keeps a saved value only when the story and passage match, and drops a value that fails the public schema, including an asset src that is not a path, https URL, or localhost URL. `packages/story-engine/src/stories/reads.ts` calls that projection from `readSnapshot`. `apps/web/src/features/play/model/live-presentation.ts` resolves a match into the book. DIR01 fixture-tested the projection and the book: a matching directive can change backdrop and lighting, and the prose and option ids stay the same. A wrong passage, a missing value, and an unapproved asset leave that atmosphere off. This is not a database seed. A model is not the source of the directive.

**C. Publication can store a validated scene subset.** `story_passage.appearance` exists (`packages/db/migrations/0002_fair_magus.sql`). `publishStorytellerResult` still returns before the insert when the publication is already `published` or `stale`, and when `current.revision` is not the captured revision. On the insert that does run, `publicationAppearanceWrite` chooses `stagedDocuments.passageId` or `publicationPassageId(generationId)` and may attach `makeValidatedAppearanceForPublication`. The stored source is those server ids. The accepted directive is only schema version 1, a six-digit backdrop, and lighting of `neutral`, `dim`, `diffuse`, or `radiant`. A candidate with another field, a color string, a remote URL, or a caller-supplied source is omitted, and the passage still publishes. The worker still does not pass `internalAppearance`. `storytellerResultSchema` accepts an optional `appearanceSuggestion` using that same subset. `validateStorytellerResult` removes a missing, null, malformed, or over-budget suggestion before narration admission, so the passage and its offers still validate and no repair is requested. A suggestion is over budget when its JSON exceeds 400 bytes or contains more than one six-digit color. HTML, CSS, a freeform URL, and a genre key are removed with the other malformed values. A valid suggestion becomes the candidate on the consequence insert that already calls `publicationAppearanceWrite`, unless the caller passed an internal candidate. The transmitted provider schema omits the field. An output with no suggestion still stores an empty appearance. Opening, fork, playable continuation, and campaign continuation inserts still omit it. This page does not authorize a model call.

Link C is the optional subset writer. An ordinary publication with no valid suggestion still stores no appearance. This page does not authorize a model call. A saved V1 appearance stays in [Selected presentation language](presentation-runtime.md#selected-presentation-language-v1). Scene tokens do not restyle a command or an error state: [Tokens](semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette).

## Product authoring policy to establish before production calls

The Storyteller may **propose** optional artistic direction tied to the exact passage; it never chooses gameplay outcomes or system UI. First option is **same-task bounded optional style fields** if the provider schema and accepted cost envelope permit them without lowering story coherence. An independent paid art director is a separate, nondefault budgeted feature and must be compared on coherent fixtures, not enabled by instinct.

**No mandatory art direction:** a model that outputs no usable directive still publishes complete, readable prose and the legitimate current offer. A rejected directive must not trigger a reroll, new generation, charge, timeline advance or revised option. The valid Storyteller result and the optional style should settle independently but be tied to the same **committed source** at publication.

### Proposed publication protocol

1. Capture authorized story/passage/offer source and operation/settlement identity; determine whether appearance is eligible and funded.
2. Obtain bounded style suggestion from a sanctioned task output or a deterministic test fixture. Never from arbitrary CSS/HTML or untrusted image URL.
3. Validate structured values and target identities **server-side at the actual publication boundary** before saving, and revalidate in the frontend resolver. A scene directive is auxiliary and cannot make an otherwise invalid fiction/result publish.
4. Write or associate appearance with the same published passage **atomically or via an explicitly idempotent, source-gated attachment contract**. If it arrives late, it may decorate only the matching existing passage; do not silently recolor a newer Now.
5. Current read projection contains matching approved directive/assets only; wrong story/passages/offers are rejected. History currently lacks a stored appearance projection; **do not claim historic fidelity** until a separate history read contract is designed.
6. Record source identity, schema version, validation-rejection reasons, coverage, retries and real provider cost without leaking private generated prose, prompts or asset URLs.

**First implementation proof:** DIR01 proved the provider-free projection and book render. A matching saved value can change backdrop and lighting while prose and option ids stay unchanged. DIR02 stores the subset on the consequence insert when a candidate exists. The 2026-11-19 section records the optional suggestion. `readSnapshot` can read a stored value. Inserts that receive no valid suggestion still leave the column empty. Do not describe the projection test as a persisted roundtrip. A later writer has to be an explicit source-gated attachment, not a silent update of a newer passage.

**Creative quality gate:** identical unchanged prose/options in ordinary, cave, space, abstract and quiet scenes, 5 consecutive passages with stable story signature, bad directive and no directive, 200% text, forced colors and reduced motion; judge coherent atmosphere, no flashing full re-theme, no genre presets, exact-target choice behavior. Measured model validity, narrative coherence and costs must justify enabling model authoring.

## Exclusions / stop rules

- No paid live Storyteller calls in a deterministic bridge Change, no global default spend, no new parallel agent loop or LLM-generated HTML.
- No rich text V2 score, automatic media generation or historical appearance storage in the V1 bridge Change.
- No new backend endpoint or schema migration simply for an aesthetic experiment unless a separately approved Change explicitly authorizes it.
- If model-authored direction deteriorates narration or fails security/identity/cost gates, keep deterministic/fixture capability and record **not adopted**, rather than force the feature.

This is a **target for phased exploration**, not evidence that the full pipeline exists. Work selection remains under [Change queue](../../../work/changes/README.md).

## 2026-11-18 deterministic writer

DIR02 stores an optional server-validated scene on the same publication insert. The subset is a six-digit backdrop and one of four lighting values. The worker does not supply `internalAppearance`. A duplicate or stale generation still returns before that insert. [Writer blueprint](../../../work/designs/open/backlog-convergence-2026-11-18/DIR02-WRITER-BLUEPRINT.md). SQL publication of a row was not executed in this packet. The contract tests and the book fixture cover the subset.

## 2026-11-19 optional suggestion

A generation result may include `appearanceSuggestion`. Admission keeps only the DIR02 subset and otherwise publishes the passage without it. The provider request schema does not contain the field, and this page still does not authorize a model call. The consequence publication insert reads that admitted suggestion. Playable continuation does not write the column.
