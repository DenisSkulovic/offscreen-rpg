# ENG02 | A nonhuman actor can play without invented HP, body or inventory

**State:** Proposed, **NOT Ready**. **Kind:** versioned pure actor/rules representation with application/reader compatibility and a genuinely nonhuman game fixture. **Dependency:** ENG01 mechanical capability boundary reviewed; [world kernel](../../engine-architecture/decisions/world-capability-kernel.md) and [legacy compatibility](../../engine-architecture/decisions/canon-compatibility-and-migration.md) finalized against current source. **No code or migration authorized.**

## Cursor first-screen brief, after design gate

> **Goal:** one admitted nonhuman actor performs a relevant D&D-style or supported world check and a bounded long activity with an applicable capability state **without manufacturing an HP value or humanoid inventory**; existing human Character campaigns, plans, rolls, receipts and Storyteller tasks remain valid.
>
> **Start:** `packages/game/src/state.ts` `characterSchema`, `checks.ts`, `activities.ts` and `immediate-actions.ts`; `packages/contracts/src/campaign.ts`; `packages/application/src/campaign/persistence.ts` and `reads.ts`; pin legacy fixtures and pending action representations. Never delete an old actor decoder.
>
> **Known trap:** marking `hp` optional in `Character` is insufficient: checks, effects, activity completion estimates, Storyteller contexts and stored JSON plans expect the previous shape. The absent-health actor is **not** dead or immortal; no default HP means no applicable health domain.

## Scope and competing alternatives

Preferred: **versioned actor capability envelope** with D&D rules as one supported capability, optional health/body/possession and a **legacy adapter**. Do not build dynamic plugin loading from user-authored world packages. A small discriminated static union is sufficient for the first two actor forms.

Alternative (keep all fields mandatory, mark abilities inapplicable) remains an acceptable compatibility adapter for old stories but not a permanent end-state. A pure generic fact map is rejected because it cannot validate form-specific checks and effects.

## One normal fixture, two compatibility guards

**New microbe:** no HP, pockets, money, terrain coordinate, mandatory physical gender. It can sense a chemical gradient with a supported rule check and spend a bounded real-time effort absorbing energy. A changed environmental condition may interrupt; progress retains exact earned units. A Storyteller can describe it but cannot invent human equipment. The actor's capability set is explicit and may be changed only by a valid versioned effect.

**Existing human:** old `srd-5.2.1-subset.v1` character, full scores/health, existing active work and saved roll remain readable and settle identically under the legacy adapter.

**Old stored action:** one captured finite/long activity begun before the new actor envelope still decodes under its previous version and settles without reinterpreted scores or additional rewards. A current actor transformed after acceptance forces explicit eligibility/compatibility policy rather than treating a stale plan as valid.

## Code boundaries

Expected pure actor schema, capability applicability/check/effect adapters, versioned parsing for stored JSONB, minimum required application/read DTO changes and targeted tests. **Do not** implement a universal ECS, multi-character database, combat engine, private entity graph, world generator, full migration framework or arbitrary LLM magic.

A new persistence schema or backfill requires a separate approved migration/rollback plan with actual legacy samples; it is not automatically authorized by this dossier. No DB side effects without a disposable environment.

## Negative acceptance

- Missing health does not produce `HP 0`, `dead`, `infinite health` or a fake HUD.
- An inapplicable skill/ability fails admission; it does not silently substitute Strength or a generic DC.
- No materialization of money/items merely because a game display expects them.
- Existing human tests and pending actions remain semantically identical.
- On reload/retry the same accepted check never rerolls due to a different actor decoder.
- Old Storyteller task payloads remain supported or explicitly version-held; no private state leaks.
- A form-change invalidates an already prepared incompatible action under real authority rather than changing its saved outcome after the fact.
- New microbe effort settles/interrupts under actual time boundaries, not an instantly awarded quantity.

## Verification and readiness

First prove in pure fixtures, then an authorized disposable-DB test of legacy/new state and a real current public projection. No provider calls. **Ready gate:** architect specifies exact actor/capability envelope, legacy compatibility and one tiny migration strategy after ENG01 source review. Cursor may not invent a universal actor model on its own.
