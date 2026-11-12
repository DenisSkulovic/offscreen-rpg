# Change CH03 | Minimal valid state specimens and semantic overlays

> **Cursor start:** [fixture/source map](../../../packages/application/src/developer-tools/README.md) → `chamber-fixtures.ts`, `campaign/fixtures/mechanical-content.ts` and actual story/campaign contracts. **Target:** [C02/C03/C04/C09](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16); [protocol 3](../../technical/chamber-lab-protocol.md#3-semantic-fixtures-and-isolation); [audit H01/H12](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps).

**State:** Specified/Proposed, no code authorization. **Depends on:** CH01 (CH02 examples can be reused). **Baseline:** `470a5df`, static source only.

## One bounded implementation outcome

A versioned, content-hashed `FixtureRecipe`/semantic overlay constructor capable of describing a **minimal, valid game state** without traversing ordinary player story creation. First primitives: accepted finite work at 80% progress, an owned item, a due decision boundary. Expose typed parameter ranges, preconditions, incompatibility errors, deterministic IDs/seed and no hidden default fantasy concepts.

## Binding decisions

- Use Zod + **actual rule and application contract validators**, not a fake rule engine. Compose a few small primitives rather than a new entity-component system or inheritance hierarchy.
- A recipe is a **precondition description**, not a new player command. No database writes in CH03; CH04 owns persisted setup. No browser-supplied SQL or arbitrary JSON patch.
- Do not add absent humanoid character/inventory/world calendar to an abstract/nonhuman scenario. Preserve all existing `chamber.v1–v5` source meanings.
- A checkpoint version/hash must change if relevant semantic setup changes.

## Falsifiable proof

**Normal:** one immutable recipe represents an accepted shift partway to settlement; two identical invocations produce equivalent semantic state and stable hash.  
**Negative:** progress without an accepted plan, item owned by another owner, malformed deadline, duplicate entity identity or unsupported calendar fails before a side effect; error pinpoints violated prerequisite.  
**Check:** pure fixture/validator tests; no DB/worker/Next or live model. **Stop:** if real schema lacks a valid state shape, return evidence to architect rather than store an impossible one.

**Handoff:** only current fixture/contract/policy owners and this packet; a short new recipe API plus tests, not a general game redesign.
