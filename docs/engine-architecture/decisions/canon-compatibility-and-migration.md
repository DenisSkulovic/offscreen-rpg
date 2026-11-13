# Decision E-D03 | One owner per fact, with additive migration and pinned old semantics

**Status:** target authority/compatibility policy, not a migration approval. Source owners: [canonical files](../../technical/canonical-files.md), [game rules](../../technical/rules-and-activities.md), [engine release](../evolution-and-release.md).

## Authority is by meaning, not storage vendor

| Fact | Current authority | Future evolution |
| --- | --- | --- |
| Accepted command/time/activity/holds | PostgreSQL campaign, execution, activity and receipt rows | Versioned capability policies without breaking settled history |
| Unique scarce object ownership | `story_item` with story-scoped key and conditional transfer | Keep one registry for ENG01; typed actor/holder later |
| Rule check and effect | Captured plan, stored dice/effects, atomic SQL state transition | Explicitly versioned new effect families |
| Published original narration | `story_passage` and immutable source-passage hash | Versioned canonical object store with SQL root promotion |
| Descriptive identities/lore | Versioned source-linked canonical documents | Stable identity/attribution, private vs player-known |
| Inference cost | Generation/attempt/usage ledger | Preserve reservation, dispatched, uncertain and settled states |
| Derived summary/search | Rebuildable index/read projection | Never independent mechanical authority |

The same item must **never** have two mutable sources of ownership. Documents may reference and describe SQL mechanics; they cannot privately move an item by rewriting a Markdown sentence. Exportability is served by versioned snapshots and source manifests, not double-entry fictional bookkeeping.

## ENG01 compatibility, by old/new case

- Old narrative `StoryContinuation.effects` with `item.create.v1` and `item.transfer.v1` stays valid and idempotent.
- New mechanical action may admit a **versioned item transfer** outcome under a supported offer, while legacy `quantity.change.v1` and `fact.set.v1` work unchanged.
- New item effect must not enter `applyOutcomeEffects(character)` and be silently ignored; the application must explicitly apply world-owned effects and persist them alongside one action receipt.
- Reuse existing `story_item` table initially. If an additive DB index/constraint is proposed, it requires an explicit named rationale and rollback plan. **No mass rewrite** to add item transfer.
- Old `immediateActionPlanSchema` envelope may stay version 1 only if the new discriminated effect kind is additive and old plans retain identical semantics. A new plan version is required if interpretation, mandatory fields or state changes are incompatible.
- Old in-flight finite actions must settle with the old effect resolver; no new precomputed item effects are accepted under the character/storyFact/time-only digest.
- Old provider tasks and old public DTOs continue to parse or fail through an explicit compatibility gate, never a partial new schema.
- No Storyteller prompt expansion to arbitrary item creation in ENG01. Scripted fixture suffices to prove the mechanical effect.

## ENG02 compatibility is a different order of difficulty

Today `characterSchema` has mandatory HP and all six D&D scores. Simply making `hp?` optional would propagate unchecked assumptions into checks, action plans, Storyteller tasks and public campaign readers. An HP-less organism is **not** an HP=0 dead human.

Proposed future migration path:
1. Introduce a versioned *pure* actor-capabilities representation and a legacy reader/adapter.
2. Preserve existing `Character` decoding for old campaigns, stored plans and settled receipts.
3. Model absent health/body/possession as **absent capabilities**, not zeroed placeholders.
4. Demonstrate a chosen nonhuman scenario with a real relevant check, a real timed activity and a valid effect, **without phantom money or HP**.
5. Expand public DTOs only after rules state is true, with a compatible reader for old clients.
6. Keep old in-flight operations pinned on old rules; schema migration is not permission to reroll or change past outcomes.
7. Prefer no destructive backfill until versioned reading/transition tests pass on old JSONB samples and old/resumable activities.

This is an independent Change. It is **not** part of ENG01.

## Rule and workflow versions

An accepted action captures enough versioned rule/effect/settings data to settle under the terms the player agreed to. Deployment cannot silently change required effort, dice calculation, risk or ownership prerequisites mid-flight.

Old workflows, tasks and receipts must remain decodable during rolling upgrades, including Temporal replay. Temporal's guide recommends controlling history growth with Continue-As-New and versioning deployed workers; these are future release foundations, **not** prerequisites to this offline ENG01 fixture.

## Failure recovery contracts

- Object staged, SQL root commit fails: unreferenced immutable object is an orphan, not published canon.
- SQL receipt commits but narration fails: outcome remains authoritative; narration can recover under the same captured source.
- New code cannot decode a pinned old action: stop/hold with typed compatibility error, never guess a new interpretation.
- Rollback after a new lawful effect: preserve committed fact, disable incompatible **future** writes if necessary; do not delete player history.
- Derived index deleted: recover from original source and receipts, without new in-world effects.
- Different API/worker replica reads same root: object-store adapter must verify content by hash and authorization; local filesystem alone isn't proof.

## First implementation compatibility acceptance

| Case | Required outcome |
| --- | --- |
| Old narrative transfer replay | Same holder, no second transfer |
| Old quantity/fact mechanical action | Same admitted time and roll semantics |
| New item effect | One real holder change and one receipt |
| New action interrupted | No phantom ownership or end reward |
| New action succeeds, narration fails | Item remains transferred, status shows truthful hold |
| Old accepted work during deployment | Keeps exact progress/settings rule identity |
| Invalid item or holder | No state changes, no provider cost |
| Actor without health (future ENG02) | Valid state, not coerced zero |
| Public read of hidden holder | No private source leak |

**Handoff threshold:** ENG01 should be implementable without altering the main DB schema or mass-migrating `Character`. If Cursor discovers otherwise, do not broaden silently. Return the source conflict and revise this decision.
