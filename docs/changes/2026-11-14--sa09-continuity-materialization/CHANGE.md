# SA09 | A significant fictional relationship survives creation, retrieval and return

**State: Proposed / design-complete 2026-11-14. No code authorization.** Depends on source/evidence lineage SA05; may use SA04 indexed root reuse. This is a **specific narrative continuity behavior**, not a universal entity database.

## Cursor first-screen

> **Goal:** when a published consequence establishes a named relationship/favor/gift with future relevance, the model's descriptive source patch can be validated, persisted and later retrieved at the correct revision, and an unrelated later scene can recall it without inventing or changing mechanical ownership.
>
> **Authority:** [vision memory promises](../../storyteller-architecture/vision-and-quality-constitution.md), [durable memory discipline](../../storyteller-architecture/context-and-retrieval.md#recall-across-months-and-content-types), [historical POC observed absence of descriptive records](../../engineering/connected-poc-proof.md#memory-reinspection--2026-10-23).
>
> **Source:** `packages/storyteller/src/tasks/index.ts::documentChangeRules`, `packages/storyteller/src/tasks/result-validation.ts::validateStorytellerResult`, `packages/application/src/storyteller/publication.ts::publishStorytellerResult`, `application/storyteller/canonical-knowledge.ts::loadCanonicalKnowledge`, current descriptive-document/continuity note tests.

## Intended bounded delta

1. Select one **source-authored** gift/favor/relationship fixture where a later meaningful scene legitimately needs the identity. Clarify the criterion for an identity/relationship update: stable distinctive person, material change in trust/access/commitment, specific source evidence. Do **not** turn every mentioned noun into an entity or auto-generate everything.
2. Adjust schema/prompt/source validation only as needed so a consequence can propose **one source-linked descriptive record patch** (or update), grounded in the current verified publication and revision. Keep typed item holder/effects exclusively in game rules; a narrative record is not a second item ledger.
3. Ensure publication stages immutable document changes with source passage IDs and root CAS, that branch/revision supersession and rejected candidate leave canon intact, and that a later task can find the record through appropriate direct/lexical cue. Use SA05 evidence trace to distinguish “saved”, “selected”, “in actual final prompt”, “referred to”.
4. Add a second **non-material example** (passing anonymous crowd mention) proving no document, and a disputed/attributed claim where canonical status must remain uncertain. Low-drama facts should not be discarded solely because they aren't plot-critical.
5. **Don't introduce independent paid maintenance** by default. Updates can be proposed on an already required consequence turn; broader episode/director maintenance is future conditional work.

## Acceptance / negatives

**Normal:** gift to named person is source recorded, distinct descriptive memory links accepted transfer and dialogue, 20 unrelated mocked passages later the correct exact recipient/conditional relationship is available and cited, and the resulting passage respects current item ownership.

**Negative:** passing background person not materialized; hallucinated favor or invalid source patch rejected; another person with same name not conflated; fork root isolation; source history updated after an intervening change uses latest fact; private thought never appears as public relationship. A failed transfer cannot be remembered as a successful gift.

**Proof:** pure task/schema/doc patch tests, provider-free long-memory corpus (200/2000 scenes) and narrowly approved disposable document+SQL integration if publication changed. Report actual source/use chain; no paid generation. **Out:** GM05 factual event feed, social relationship mechanics, another model call per NPC, unbounded knowledge graph, global plot planner.
