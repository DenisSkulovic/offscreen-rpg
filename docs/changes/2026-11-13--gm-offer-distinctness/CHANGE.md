# GM04 | A failed reassurance changes the next meaningful option

**State:** Proposed, **not Ready**. **Owner approval:** none; Cursor must not change source without separate authorization. **Kind:** one narrowly bounded fixture/game-content change + tests. **Parent:** [mechanics program](../../experience/mechanics-evolution-program.md). **Dependency:** current scripted SpongeBob/Gary benchmark still exhibits the same failure at implementation time.

## Cursor first-screen brief

> **Current-source map:** [scripted SpongeBob benchmark](../../../docs/technical/playthroughs/spongebob.md#sb-02-a-failed-reassurance--current), [application mechanical source map](../../../packages/application/README.md#mechanical-selection-and-consequence); inspect authored fixture §packages/application/src/campaign/fixtures/content/mechanical-openings.json§ and scripted output source §packages/storyteller/src/fixtures/mechanical.ts§.
> **Primary target:** [Storyteller choice distinctness](../../experience/foundations/storyteller-experience-quality.md#2-distinct-plausible-agency), [failure response](../../experience/foundations/storyteller-experience-quality.md#one-worked-red-team-example-repeated-persuasion).
> **Known trap:** changing only option text does not prevent reroll spam; inventing an unadmitted “trust loss” to justify different dialogue violates canon.
> **Scope:** proposed only. One fixture's failed check and next authored options; no global Storyteller novelty algorithm.

## Target and competing approach

Current SpongeBob/Gary example allows a failed Persuasion attempt to leave the same relevant facts and potentially regenerate the same option. A player can keep trying identical reassurance until the d20 cooperates. **This is an agency/game-design bug**, not a UI styling bug.

Minimal credible fix: explicitly record the attempt or contextual shift in a supported typed fact/term, and have the next offer acknowledge that approach was tried. The new set can offer **cover**, **observe**, **change method**, **wait** if admitted; no fake automatic success or unsupported negative reputation.

Alternative: allow repeat attempts at a real time/resource cost when fiction logically permits. If repeat is meaningful, change the terms/context and explain it. Reject silently resetting the same free reroll.

## One bounded result

- On the fixed benchmark failed reassurance, commit an admitted, bounded **approach attempted** state (or an equally explicit actual rule-supported circumstance) while Gary remains alert.
- The next scripted offer no longer presents the identical unsupported attempt unchanged. It includes at least one grounded different tactic that survives domain admission.
- The consequence passage acknowledges the failed approach and does not pretend Gary is calmer.
- Another world/fixture is unchanged. No automatic generalized penalty or arbitrary new fact creation.
- Repeat/duplicate requests against the consumed offer cannot reroll the same result.

## Authority and inspected baseline

[Gameplay rules](../../../docs/game-rules.md#authority), [SpongeBob case study](../../../docs/technical/playthroughs/spongebob.md), [Storyteller quality bar](../../experience/foundations/storyteller-experience-quality.md), [offer admission](../../../docs/technical/rules-and-activities.md#content-and-authority).

The technical atlas explicitly marks repeated reassurance as a design gap. Confirm this still reproduces in **current source** before moving Ready. If already corrected by Cursor, mark **Superseded/Cancelled**, not an excuse to add a duplicate fix.

## Scope and exclusions

Local content fixture, deterministic scripted task/offer mapping and focused tests. Update atlas if behavior changes. No provider calls, new universal ability rules, production AI judge, undo/reroll mechanism, forced combat, global social-affinity metric or UI redesign.

## Acceptance and negative proof

**Normal:** D20 fixed failure (5 + 2 + 2 = 9 vs DC 12), Gary still alert, attempt remembered; subsequent offer makes a changed approach available without another identical free reassurance roll; one other source-backed option leads to a different mechanical/narrative state.

**Negative:** old consumed offer replay rejected; no duplicated dice/effects; user cannot simply reload to restore original option; no unadmitted “Gary trusts you less” fact; failure is not secretly converted to success; world time follows the selected current action-time contract rather than an old scripted zero-tick assumption; unrelated microbe/beacon fixture remains valid.

**Evidence:** deterministic source/contract fixture tests and focused Storybook scene choice snapshots if later needed. No need to invoke live LLM or connect provider.

## Ready gate

First reproduce on latest main and confirm a precise minimal state effect. Owner approves the desired alternate option set. Then Cursor implements and demonstrates one meaningful branch, one negative replay and no regression. This is a valuable **quality slice**, not a substitute for a full Storyteller evaluation.
