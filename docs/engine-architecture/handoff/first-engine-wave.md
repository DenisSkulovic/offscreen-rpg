# Cursor engine handoff | implement ONE lawful gameplay effect, not an engine rewrite

**Status: PREPARED FOR OWNER AUTHORIZATION, NOT YET CODE-AUTHORIZED.** 2026-11-13. **First packet:** [ENG01 authoritative item transfer](../../changes/2026-11-13--eng-authoritative-item-transfer/CHANGE.md). **Permanent authority:** [first-gameplay-slice decision](../decisions/first-gameplay-slice.md), [actor/holder identity](../decisions/actor-identity-and-ownership.md), [compatibility](../decisions/canon-compatibility-and-migration.md). [Final readiness](../evidence/final-readiness-review.md) and [implementation queue](../implementation-program.md) explain why *other* engine Changes remain unselected.

## Executive intent

The existing engine already has credible time, receipts, transactional authority, outbox/Temporal and model-publication boundaries. Do not throw them away. The first extension should demonstrate a new **mechanically meaningful** outcome: an admitted, time-spending choice can transfer **one existing unique story item** only at valid settlement, exactly once, and its consequences persist independently of model narration. The current `story_item` registry already owns item possession via narrative continuation; reuse it. This is one vertical slice, **not** a general entity-system, optional-actor migration or world-simulation overhaul.

## Copy/paste executor prompt (only after owner authorizes code)

```text
ROLE: Cursor, implementation executor. One approved bounded Change.
DO NOT redesign the engine/product; don't run later proposed Changes.

GOAL:
Extend an existing accepted finite mechanical action to perform a
versioned unique-item transfer at its earned settlement boundary,
using the already-authoritative story_item registry and one receipt.
No transfer at selection, no duplicate ownership from replay,
no item created by a Storyteller sentence.

PRODUCT/ARCHITECTURE AUTHORITY:
- docs/engine-architecture/decisions/first-gameplay-slice.md
- docs/engine-architecture/decisions/actor-identity-and-ownership.md
- docs/engine-architecture/decisions/canon-compatibility-and-migration.md
CHANGE: docs/changes/2026-11-13--eng-authoritative-item-transfer/CHANGE.md

START WITH CURRENT SOURCE (RECHECK IT):
1. packages/game/src/effects.ts and immediate-actions.ts
2. packages/application/src/campaign/action-executions.ts
   and action-execution-transition.ts
3. packages/application/src/stories/persistence.ts::applyStoryItemEffects
4. packages/db/src/schema/stories.ts::storyItem
5. packages/game/test/immediate-offer.test.mjs and the item-transfer
   integration test in tools/api-integration/test/stories-core.integration.ts

IMPLEMENT:
- One supported item.transfer.v1 mechanical outcome on an authored
  scripted/fixture offer; existing current item and declared holders only.
- Preserve genuine finite action duration/check and normal holds.
- Resolve/validate item-dependent outcome at DUE boundary, not early
  using character/storyFacts/time-only prediction digest.
- Under one story-locked SQL transaction: conditional existing-holder
  transfer + saved game action receipt/roll/event when valid.
- Explicitly separate world/item effects from character-only effects;
  fail closed on unsupported types, never silently drop them.
- Keep the old narrative item.create/transfer semantics and all old
  quantity/fact effects, in-flight plans and receipts unchanged.
- Use the current authenticated public item/read projection honestly.

DO NOT:
- Build a new inventory, Entity table, plugin framework, ECS,
  Actor model, or Character/HP migration.
- Touch frontend Play, creation, UX01–UX12 or Storyteller prompt design.
- Invent new provider-supported arbitrary item creation/free-text actions.
- Change clock ownership, Temporal versioning, budget or source root.
- Run paid providers, destructive tests, deploy, or commit/push without
  explicit owner instruction. Preserve Cursor's existing worktree changes.

PROVE:
- Normal: 10s in-world transfer attempt, valid check, only then one
  SQL holder change and one saved mechanical receipt.
- Negative: failed check, missing/wrong holder, interruption before
  settlement, duplicate HTTP command and duplicate worker wake.
- Narration unavailable after committed transfer: item still owned
  by the new holder, no extra effect.
- Existing narrative item.create/transfer and existing mechanical
  quantity/fact tests still pass.
- Abstract unique signal token fixture uses same transfer rule,
  with no requirement for a human bag/currency.
- Identify test lanes actually run: pure vs disposable DB vs worker;
  never claim unrun connected proof.

RETURN BEFORE ANY NEXT CHANGE:
- Exact files/diff, effect schema/version choice and SQL authority path;
- Actual test command/output and any tests NOT run;
- Normal and negative saved state/receipt evidence;
- Compatibility/migration impact (expected: no DB schema migration);
- Whether any assumption in the spec contradicted current code;
- Remaining product/security risks and the next possible Change.

STOP AND REPORT if a large schema migration, arbitrary holder
authorization model, new paid provider behavior or engine redesign
appears necessary. DO NOT expand the implementation to "fix it all".
```

## One crucial unsettled local choice to settle **inside** ENG01

When possession becomes invalid **after** a valid action was admitted but before it reaches its due boundary, the engine must not commit a successful transfer. The preferred first policy is:

1. If a controlling scheduled world event interrupts before or at due time, respect the existing interruption/clock precedence and do not resolve or transfer.
2. If the item is no longer held by the declared source at the due boundary, mark an **explicitly sourced ineligibility/interruption** after the permitted elapsed time, without drawing a fresh success result or fabricating possession. Do not apply a successful check outcome and then throw a database exception that causes infinite worker retries.
3. If the item is still present, perform any actual relevant check and only apply transfer on an admitted success.
4. Keep the recognized old narrative item-transfer path unchanged.

This is a proposed rule boundary, not permission to invent a full new activity status enum. If the existing receipt/interruption contract cannot express a truthful held outcome without broad changes, STOP: bring the exact mismatch back for design review. The no-transfer invariant takes precedence over a convenient status label.

## Why the first code slice is intentionally narrow

The first attempt at world-neutral mechanics should teach us whether a new effect can be included **without** changing fifty modules. If this is hard, that is real architecture evidence for a later capability-registry refactor. If it is easy, resist building a registry just because a diagram predicted one.

The second possible outcome, optional actor capabilities (ENG02), affects old `Character` payloads and is a more serious migration. It **must not** be automatically started after ENG01.

## Preflight after frontend work

The engine docs currently live on `design/engine-architecture-reset-2026-11-13`, based on `main@a313d0aa`. Cursor's frontend work may have updated main/worktree meanwhile. When the user authorizes code:

1. Read the current root `docs/changes/README.md` and confirm no different active Change/source owner is being edited.
2. Start from the latest *real code* branch, not a stale engine-design snapshot; bring only required Markdown specs/Change into it (without overwriting completed UX indexes).
3. Reinspect actual source/tests and identify changed assumptions before edits.
4. Owner explicitly chooses whether Cursor may create a branch, commit/push or use a disposable integration database. No destructive or paid tests from this Markdown alone.
5. Select **only ENG01**. All other ENG and UX GM proposals remain unselected.
6. Run staged narrow tests then return for architecture review.

A future handoff branch can be assembled from the latest code once the frontend has settled. **Do not auto-merge the entire old design branch over it.**

## Review criteria after ENG01

The designer will challenge actual code and evidence for:
- Did one transfer really settle once under the existing story lock and clock?
- Are legacy narrative transfers and new mechanical transfers one consistent rule?
- Was item ownership never treated as model-authored truth?
- Could a new effect family be added without copy/pasting command settlement?
- Did the first implementation reveal that actor identity is too weak?
- Did it sneak new fields into old stored rule versions?
- Were errors/holds honest rather than endlessly retryable or invisible?
- Does the change improve the **game**, not merely improve an abstraction?
- Does its implementation preserve the modular monolith's strong boundaries?

**Then** reconsider ENG07 memory evidence, ENG04 bounded reads, and ENG02 optional actors based on the observed results, not the numerical order in the roadmap.
