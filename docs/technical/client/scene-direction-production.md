# Storyteller art direction | Bounded author → publication → reader target

**State:** **CONDITIONAL TECHNICAL TARGET**, design approved for investigation but **no automatic provider-writing change is approved** (2026-11-17). Source/protocol facts are verified; the exact production seam and spend policy require a design gate. [Product expression](../../product/experience/design-system-and-expression.md), [existing V1 resolver](presentation-runtime.md), [Storyteller publication owner](../storyteller/generation-and-publication.md), and [Phase 3 art-direction study](../../../work/designs/open/player-experience-refoundation/phase-3/02-ART-DIRECTION-PRODUCER-AND-QUALITY-GATES.md).

## Three independently verifiable links

**A. Frontend interpreter exists.** `apps/web/src/features/play/presentation/{types,parse,resolve,contrast}.ts` define finite `ScenePresentationV1`: palette, gradients, bounded lighting, texture, two small motion roles, exact-target choices, approved media IDs. `resolveLivePresentation` consumes only matching appearance and supports silent fallback.

**B. Optional saved read/projection path exists.** `packages/contracts/src/stories.ts` has `current.appearance` with source identities and opaque directive; `packages/application/src/stories/reads.ts` projects a saved appearance only when story+passage match; `apps/web/src/features/play/model/live-presentation.ts` resolves it. This is **not** proof that the model ever created the directive, or that every publication writes one.

**C. Creator is unproven.** `packages/storyteller/src/tasks/task-contracts.ts` and `playable-proposal.ts` primarily author V1 title/paragraphs/next actions. The inspected `packages/application/src/{stories,generations}/` publication owners do not establish a verified scene-direction producer. Do not invent one by appending random data to JSON or treating `playablePresentation` as the visual-style protocol; it currently means converting a playable proposal into prose/interaction.

Link C remains unproven. This page does not authorize a provider call. A saved V1 appearance stays in [Selected presentation language](presentation-runtime.md#selected-presentation-language-v1). Scene tokens do not restyle a command or an error state: [Tokens](semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette).

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

**First implementation proof:** deterministic, provider-free, source-matched fixture goes through **the real persistence/read/Play chain** and turns the book's surrounding environment a different color while prose/choices/status remain unchanged. If that cannot be done without schema/migration or new publisher authority, document the exact gap before widening scope. The existing optional contract does not guarantee an existing write seam.

**Creative quality gate:** identical unchanged prose/options in ordinary, cave, space, abstract and quiet scenes, 5 consecutive passages with stable story signature, bad directive and no directive, 200% text, forced colors and reduced motion; judge coherent atmosphere, no flashing full re-theme, no genre presets, exact-target choice behavior. Measured model validity, narrative coherence and costs must justify enabling model authoring.

## Exclusions / stop rules

- No paid live Storyteller calls in a deterministic bridge Change, no global default spend, no new parallel agent loop or LLM-generated HTML.
- No rich text V2 score, automatic media generation or historical appearance storage in the V1 bridge Change.
- No new backend endpoint or schema migration simply for an aesthetic experiment unless a separately approved Change explicitly authorizes it.
- If model-authored direction deteriorates narration or fails security/identity/cost gates, keep deterministic/fixture capability and record **not adopted**, rather than force the feature.

This is a **target for phased exploration**, not evidence that the full pipeline exists. Work selection remains under [Change queue](../../../work/changes/README.md).