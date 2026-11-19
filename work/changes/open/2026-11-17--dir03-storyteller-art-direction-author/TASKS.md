# DIR03 | Composer route: optional art direction, no model spend

**Baseline:** 584b594; **packet:** Ready but provider-free projection already landed; live creative trial unapproved. **Default model:** Composer Standard, VERIFY. Source owners: `packages/storyteller/src/tasks/task-contracts.ts`, `provider-schema-projection.ts`, `packages/application/src/storyteller/publication.ts`, `stories/scene-appearance.ts`, `apps/web/src/features/play/presentation`.

**Source observations:** `appearanceSuggestion` is an optional contracted output field. task-contracts.ts strips or validates suggestions; provider schema projection supports this optional field. `publication.ts` passes `result.appearanceSuggestion` through the reviewed attached publication route. The Play presentation parser/resolver already exists. These are not proof the live model will produce artistically useful suggestions.

## T01 | Validate optional sidecar and no-impact fallback | PLANNER-READY
Read the five owners and `packages/application/test/scene-appearance.test.mjs`, `apps/web/src/features/play/presentation/resolve.test.ts`. Run focused **provider-free** tests under current package scripts. Positive: valid constrained suggestion remains attached to its source and renders; missing suggestion yields normal readable text. Negative: malformed HTML/CSS/URL or wrong-source suggestion is discarded/refused **without failing otherwise valid narration, rerolling, spending money or changing game state**. Report which tests actually ran, not product-quality conjecture.

## T02 | Only if source validation fails | PLANNER-BLOCKED UNTIL T01
ChatGPT maps one exact schema or source-attachment mismatch, then dispatch one Composer PATCH in task-contracts / publication / resolver with one negative. No second art agent, provider-schema overhaul or new renderer.

## T03 | Live aesthetic trial | **NOT AUTHORIZED**
Requires separate approved model/usage budget and explicit quality protocol; no Cursor agent should spend tokens to “try it.” Keep packet open with source-tested adoption decision, not pretend creative quality is proved. **Grok is not a substitute for a live aesthetic evaluation.**
