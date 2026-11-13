# ENG08 | Provider-authored mechanical plans cannot transfer unowned items

**State:** Done (2026-11-13). Provider-authored new `worldEffects` rejected by default; exact `{source:'authorized', key}` and authored fixtures preserved. **Kind:** admission/validation and negative tests, **no new gameplay feature**. **Authority:** [post-wave review](../../engine-architecture/evidence/postwave-implementation-review.md), [one-owner domain authority](../../engine-architecture/domain-authority.md).

## First-screen Cursor brief

> **GOAL:** A model-generated mechanical action proposal cannot become a playable transfer of a story item solely by naming its real current holder. Only a **trusted previously authorized exact plan reference** or a future separate granted actor/item capability can include a world effect. For this Change, provider-authored **new** `worldEffects` are rejected by default, while scripted/fixture and exact authorized reference plans still work.
>
> **SOURCE:** `packages/game/src/immediate-actions.ts::validateImmediateActionProposal`, `packages/storyteller/src/tasks/task-contracts.ts` mechanical opening proposal/reference handling, `packages/application/src/storyteller/publication.ts` generation validation, `packages/application/src/campaign/actions.ts`. Add nearest provider-free tests.
>
> **TRAP:** checking only `story_item.holderKey===fromHolder` is **existence**, not **actor permission**. A system prompt stating "don't transfer items" is not a validator. Don't block legitimate existing scripted/authorized fixture actions.

## Source-specific risk

`immediateActionPlanSchema` gained optional `worldEffects` in ENG01. Generated opening/continuation action plans use that schema, and `validateImmediateActionProposal` does not currently validate item holder identity or permission. `campaign/actions.ts` checks that the mentioned item is still held by the named `fromHolder`, which is necessary but not a grant for the player's actor to take someone else's item.

**Example wrong behavior to prevent:** a provider proposes `item.transfer.v1` from `'mara'` to `'player'` for a preexisting unique item, with an automatic outcome. If holder is `mara`, the old admission path can accept the apparent mechanical effect despite no domain permission/attempt to win it.

This is a **source-level authorization gap**, not an assertion a real model has already exploited it.

## Narrow accepted behavior

1. When normalizing **new provider-authored** candidate mechanical plans, reject any nonempty `worldEffects` before publication/admission (even if the exact item exists).
2. When the provider only **selects a trusted pre-authorized plan by reference**, preserve that captured plan and its exact effect where currently supported. Model-supplied reconstruction is not a trusted reference.
3. Keep prior scripted fixtures and existing ENG01 SQL settlement unchanged, including same item and holder validation at actual due boundary.
4. Leave a later **typed actor/item authority grant** for future GM free-intent/AI-action scope. This packet must not invent a universal actor registry.
5. Validation errors remain bounded and provider-safe, without exposing private owner/item catalogues.
6. No direct SQL writes in the proposal validation layer. Only previously admitted action settlement may transfer an item.

## Discriminating proof

- Provider proposes `worldEffects:[item.transfer.v1]` from an NPC-owned object to the player's holder -> **rejected before publish**.
- A provider proposes transfer from the player's item to an unauthorized recipient -> rejected without a trusted authoring grant.
- Provider selects an **exact authorized plan reference** with valid frozen effect -> remains permitted if the existing contract allows it.
- Provider returns the same plan body instead of referencing it -> must not be treated as preauthorized merely because strings happen to match, unless the current explicit reference normalization cryptographically/structurally proves identity.
- Provider proposes no world effects -> previous fact/quantity/dialogue options still validate.
- ENG01 scripted harbor/abstract transfer -> still performs due-boundary checked transfer and matches old receipts.
- No paid LLM provider calls necessary; use mocked provider output.
- No cross-viewer private ownership leak in returned validation diagnostics.

## Exclusions

No new item types, no full actor/controller IDs, no new inventory, no database migration, no frontend changes, no source refactor and no remote provider spend.

**Stop if** a trusted reference and a generated body are indistinguishable in existing task contracts: report that precise blocker, design a small discriminated `reference vs proposal` contract and preserve old task readers rather than silently treating all plans as trusted.

## Review outcome

Cursor must return exact paths, one negative produced-plan test, one authorized-reference positive test, existing ENG01 proof regressions, and whether any current published model plan now contains a legacy world effect. Do not authorize ENG09 or ENG05 automatically.
