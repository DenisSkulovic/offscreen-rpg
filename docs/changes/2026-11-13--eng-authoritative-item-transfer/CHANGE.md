# ENG01 | A mechanically admitted action transfers one scarce object exactly once

**State:** Done (pure and application transition lanes). Owner authorized this packet on 2026-11-13. Disposable SQL/worker settlement proof was **not** run. **Kind:** one code-bearing game capability across pure rule, authoritative SQL action settlement and existing public receipt. **First engine implementation recommendation.** **Product authority:** [chosen first gameplay slice](../../engine-architecture/decisions/first-gameplay-slice.md), [identity and ownership](../../engine-architecture/decisions/actor-identity-and-ownership.md), [canon/version compatibility](../../engine-architecture/decisions/canon-compatibility-and-migration.md). **Source baseline:** GitHub main after presentation calibration; rechecked before implementation.

## First-screen brief for Cursor

> **GOAL:** One *already offered* valid finite mechanical action can cause exactly one transfer of an existing unique item from its current story-local holder to another predeclared, authorized holder at the **earned settlement boundary**, under one transaction with its action receipt. Reuse the existing `story_item` registry and narrative transfer semantics. Never transfer an object merely because a model proposed the outcome, a browser clicked or an ETA reached zero.
>
> **SOURCE FIRST:** `packages/game/src/effects.ts` and `immediate-actions.ts`; `packages/application/src/campaign/action-executions.ts` and `action-execution-transition.ts`; `packages/application/src/stories/persistence.ts::applyStoryItemEffects`; `packages/db/src/schema/stories.ts::storyItem`. Nearest tests: `packages/game/test/immediate-offer.test.mjs`, `tools/api-integration/test/stories-core.integration.ts`. Only widen to actual callers/Storyteller schema when a demonstrated contract dependency requires it.
>
> **KNOWN TRAP:** current `applyOutcomeEffects(character)` cannot accept a DB item effect. Splitting effects must be explicit and fail closed, not silently ignoring new kinds. The existing precomputed finite result digest only covers character, story facts and time, **not item holder**. New item-mutating outcomes must resolve/validate at the due boundary, not use that unsafe predictive shortcut.
>
> **NO CODE AUTHORIZATION YET.** Owner must explicitly select this Change, state which current branch Cursor may edit and approve only safe verification actions.

## Why the game needs this

The pre-POC can transfer items through a narrative continuation but mechanically admitted game actions normally change only character quantities/facts. The player should be able to **attempt a meaningful transfer, earn its time, and have possession change authoritatively** even when the narrator fails. This is a small proof that future game capabilities can have one causal pipeline rather than becoming a list of special-case prose effects.

## Narrow behavior to implement

1. **Offer:** one controlled existing Storyteller/scripted mechanical plan offers to hand over an **existing registered item**. This is a supported attempted action; the outcome may be guarded by one existing finite check. Do **not** accept free-form player text as a command.
2. **Admission:** current story owner/actor, offer ID, expected revision, current item/source holder and declared target are validated. An immutable operation is accepted; item remains at original holder. Standard time and command-receipt lifecycle apply.
3. **Execution:** finite wait until the admitted real/fictional time boundary, with existing holds/world obligations taking precedence. If a relevant item/state change invalidates the action at settlement, explicitly block/interrupt under a documented rule instead of applying an invented effect.
4. **Resolution:** only the *valid committed outcome* emits a typed versioned `item.transfer.v1` effect; it is not sent through character-only `applyOutcomeEffects`. In the **same transaction as the gameActionReceipt**, apply the SQL conditional holder transfer with the current holder precondition.
5. **Persistence:** the saved receipt includes item identity, exact effect and actual outcome; old story item ID and current holder remain the source of truth. Reentrant workers/HTTP retries cannot execute the transfer twice.
6. **Narration:** a later Storyteller passage can refer to the saved transfer; narration failure must not undo/redo the item or reroll the check. The first successful fixture may use a scripted/no-provider narration.
7. **Public read:** existing authorized snapshot `items`/receipts reflects the real holder. The UI is not changed by this packet; only use existing current DTOs without leaking hidden data.

## One semantic transfer owner, two compatibility entry points

The existing **narrative** `item.transfer.v1` and new **mechanical** outcome must obey identical conditional holder/uniqueness semantics. Extracting a focused shared transaction helper is permissible, but do not introduce a second storage table, duplicate item model, general `WorldEntity` abstraction or dual-write to `campaign.character.inventory`.

The existing `outcomeEffectsSchema` and `ImmediateActionPlan` support only character effects. Introduce the new effect as an **additive, tagged union** at the appropriate rule boundary or split outcomes explicitly. Never alter interpretation of old stored plan v1. The exact type definitions are Cursor's implementation decision **within these constraints**; if compatibility cannot be preserved, stop for architect review.

## A world-neutral demonstration, not a universal-world claim

**Fixture H: Harbor**. A brass compass exists and belongs to the player. A supported brief hand-over attempt uses current clock/check rules. Only on valid settlement does `holderKey` change to Mara. A later passage can reflect the new holder without granting another copy.

**Fixture A: Abstract signal**. A unique logical token is held by one story-local process and transfers to a declared receiving process using the **same rule and registry**. No assumed hands, bags, money or coordinates. This fixture **does not yet remove mandatory HP/D&D scores**; optional actors are ENG02.

**No global actor table** in this Change. Only two registered holder keys relevant to the fixture; no arbitrary destinations invented in a provider prompt.

## Failure cases that must be discriminating

- Double-submit same operation and duplicate Temporal delivery produce **one receipt, one holder change, no second roll**.
- Same operation ID with changed requested body is rejected.
- At admission, missing item or wrong source holder rejects before accepting time/cost.
- After admission but before settlement, item becomes unavailable or world obligation fires; **no phantom transfer or speculative publication**.
- Failed ability check yields no successful transfer.
- Worker crash before DB commit retries safely; crash after commit cannot repeat effect.
- Narrative source generation fails after transfer; actual ownership and receipt remain.
- Existing narrative `item.create/transfer` tests still pass, including create-then-transfer and rollback.
- Old mechanical fact/quantity actions still settle; no change in inherited time/rolls.
- Unrecognized effect kind is rejected, not discarded, and item holder cannot be changed by a UI field alone.
- Story/viewer authorization protects current holder when information is private.
- No unapproved model provider dispatch or destructive live DB use.

## Source-ownership and scope guard

**Likely changes:** pure `@offscreen/game` effect/plan resolution and validation; a focused SQL item-transfer helper in existing story/campaign application path; action-execution settlement; narrow fixture/test coverage and compatible existing public receipt parser where necessary. A helper may be extracted, but maintain transaction ownership in application.

**Do not edit:** frontend Play/Next, general Storyteller prompt engine, Temporal workflow definitions, world generator, new player actor tables, broad relational graph, arbitrary item creation, dynamic plugin system, database sharding, existing provider budget semantics. No root-format rewrite, no blanket formatting changes.

**Data migration policy:** **expect no schema migration**. If a new DB table, destructive migration or global `Character` change becomes necessary, **stop and request a revised Change**, not a tacit scope expansion.

## Evidence to return

**Fast proof:** existing `packages/game` targeted pure tests with scripted admitted object transfer and a failed/due-boundary case.  
**Authoritative proof:** accepted command → worker settlement → SQL `story_item` holder/receipt (test with a separately approved disposable DB), including duplicate request/worker retries, a failed check and narration unavailable.  
**Compatibility proof:** old narrative item transfers and old mechanical quantity/fact tests still pass.  
**Human-visible proof:** current typed public snapshot reports actual holder, not a guessed prompt line.

Return changed paths, observed test commands/results, one normal/one negative trace, migration declaration (“none” or explicitly required), source mismatches and unproved parts. Do **not** claim LLM creativity or general nonhuman actor representation from this single feature.

## Readiness and exit

**Design decision and source seam are settled enough to start after explicit owner authorization.** At start, Cursor rechecks `main`/branch/worktree and exact source owners. A failing type compatibility or unknown item-holder authorization question must be reported, not answered by creating a new subsystem. **Keep ENG02, player UX and future custom intent unselected.**

**Successful user sentence:** “I tried to give Mara the compass; the game spent the proper time, then really transferred it once. When I came back, the world still knew who had it.”

## Landed evidence (2026-11-13)

**Effect split:** optional `worldEffects` (`item.transfer.v1`, max 1, default `[]`) on immediate outcomes. Character `outcomeEffectsSchema` / `applyOutcomeEffects` unchanged. Failed-check branches may not declare a transfer.

**Settlement:** admission rejects a wrong current holder; item-transfer plans skip the character/facts/time pending fence; at due time a wrong holder interrupts with no roll; a valid positive branch applies `applyStoryItemEffects` in the same transaction as the receipt.

**Fixtures:** `packages/application/src/campaign/fixtures/item-transfer-plans.ts` — Harbor compass and abstract process signal.

**Ran:** `pnpm --filter @offscreen/game test` (40 pass); application `item-transfer-transition` and related samples; disposable live SQL `packages/application/test/eng01-item-transfer.live.test.mjs` (2 pass: automatic transfer + duplicate command, failed check / admit conflict / mid-flight wrong-holder interrupt). **Migration:** none.
