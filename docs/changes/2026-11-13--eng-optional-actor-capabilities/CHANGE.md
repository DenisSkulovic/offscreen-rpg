# ENG02 | A nonhuman actor can play without invented HP, body or inventory

**State:** Done (pure envelope + compatibility bridge; no DB migration). Owner authorized the design gate on 2026-11-13 after ENG01. **Kind:** versioned pure actor/rules representation with application/reader compatibility and a genuinely nonhuman game fixture. **Authority:** [world kernel](../../engine-architecture/decisions/world-capability-kernel.md), [legacy compatibility](../../engine-architecture/decisions/canon-compatibility-and-migration.md), [identity](../../engine-architecture/decisions/actor-identity-and-ownership.md).

## Settled design (executable)

1. **Actor envelope v1** (`packages/game/src/actor.ts`): `{ version: 1, name, capabilities[], facts, quantities }` with statically registered capabilities `srd-abilities.v1` and optional `health.v1`. Duplicate capability kinds rejected.
2. **Legacy Character bridge:** old JSONB without `version` still parses as `characterSchema`. `hp`/`maxHp` are a present pair or entirely absent — never one-sided, never “missing means 0”.
3. **Checks** use a health-free `CheckSubject`; inapplicable abilities still fail closed.
4. **Adapters:** `actorFromLegacyCharacter`, `legacyCharacterFromActor`, `parseActorState` (envelope or legacy).
5. **Migration:** none. Campaign `character` JSONB stays; no backfill. Public DTO remains `characterSchema` (now health-optional). Frontend already omits HP when absent.
6. **Fixture:** `microbe.v3` opening seed no longer invents HP.

## Landed evidence (2026-11-13)

**Ran:** `pnpm --filter @offscreen/game test` (43 pass) including `actor.test.mjs` — human round-trip keeps health; microbe has no health and can sense a gradient; strength check rejected; one-sided hp rejected. Application build + fixture specimens after storyteller rebuild.

**Not in this packet:** DB actor table, form-change invalidating in-flight plans, Storyteller prompt redesign, public `kind: 'actor.v1'` DTO split, disposable SQL microbe campaign playthrough.

## Original goal (satisfied for the pure/rules cut)

One nonhuman actor performs a supported D&D-style check without manufactured HP; existing human Character documents remain valid under the legacy adapter.
