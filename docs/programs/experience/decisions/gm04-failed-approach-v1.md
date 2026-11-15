# GM04 | A failed approach changes what is possible next

**Status:** selected **product/content design recommendation** for 2026-11-15; code not yet authorized. The target is **one Pineapple scripted fixture** and reproducible proof, not a universal social cooldown. See [GM04 Change](../../../changes/archive/2026-11/experience/2026-11-13--gm-offer-distinctness/CHANGE.md) and [current SpongeBob sequence](../../../technical/playthroughs/spongebob.md#sb-02-a-failed-reassurance--current-gm04).

## Decision: a failed attempt is history, not a free re-roll token

In the current `packages/storyteller/src/fixtures/mechanical/pineapple.ts`, `calm-gary` performs Charisma/Persuasion DC 12. The failure branch has no mechanical effect, so `pineappleConsequence`, seeing `gary-alert=true` and `under-cover=false`, calls `pineappleOpeningPlans` again. A fresh offer can therefore replay the exact same reassurance with a fresh die, even though the previous command was correctly consumed.

**Choose an explicit character-state memory of the approach, not arbitrary loss of Gary's trust:**

- Add a seeded character fact `{id:'gary-reassurance-tried',value:false}` to the `pineapple-mechanics.v4` character seed. This means only "this approach has not yet been tried", not permanent relationship quality.
- The **failed** `calm-gary` outcome has a declared `fact.set.v1` effect setting `gary-reassurance-tried=true`, alongside existing prose that Gary remains tense. It does **not** flip `gary-alert`, mutate a story fact without evidence, apply a secret attitude penalty or add another die.
- Existing `withDeclaredFactTransitions` must produce and validate the matching failure declaration from the actual effect. The validated private `calm-gary` plan requires the new fact to be false, in addition to `gary-alert=true`. Current accepted offer replay still fails on operation/offer idempotency even before this state check.
- When `gary-alert=true`, `under-cover=false` and `gary-reassurance-tried=true`, `pineappleConsequence` must use an **explicit new offer branch**. It must not call `pineappleOpeningPlans` blindly. First choice: `take-cover`, same existing bounded automatic transition `under-cover=true`, with truthful tactical opportunity. Second choice: a grounded **doorway observation** (or the existing `keep-distance` only if it is upgraded to actually alter supported knowledge/position). A merely rewritten "Talk Gary down" is not allowed.
- In this fixture choose a narrow source-backed doorway observation: check Wisdom/Perception, five fictional seconds, difficulty based on the poorer doorway angle. On success it may declare the **existing** `delivery-at-window=rattling-parcel` story fact with passage evidence (only if that is not already canonically established); on failure it makes no fake discovery. This tests an information-seeking route different from persuading Gary. A follow-on identical Perception reroll problem, if reproduced, is a **separate quality finding** and must not be described as solved by GM04.
- If implementing that second branch would require unapproved new authority, preserve `take-cover` as the guaranteed mechanically distinct route and supply a safe deliberate "do nothing/keep distance" with honest limits. Report reduced offer breadth rather than fabricating mechanics.

**Important source discrepancy:** the opening prose already mentions a rattling damp parcel. A new story-fact declaration must therefore mean a **verified observation/recognition as a source-backed canonical fact**, not the first time the player could possibly know a parcel exists. The Storyteller must not claim a shocking discovery of something explicitly in the opening description. An alternative information target with actually new, supported knowledge is preferable when authoring the fixture; the exact final text must be inspected as part of acceptance.

## The scene's fixed state transition

| State | Mechanically valid result | Next choice principle |
| --- | --- | --- |
| Start: alert=true, cover=false, reassuranceTried=false | `calm-gary` offered alongside distinct tactics | The first reassurance may be attempted once |
| Roll 5 + Charisma 2 + proficiency 2 = 9 vs DC 12 | failure; `reassuranceTried=true`; alert stays true; no secret trust loss | Not another unchanged reassurance |
| After failed reassurance | `take-cover` remains allowed; another different grounded tactic may be offered | Fiction acknowledges failed approach; no automatic success |
| Take cover | `under-cover=true` once | Existing `inspect-from-cover` and `leave-cover` branch, not a second calm roll |
| Successful first reassurance | `gary-alert=false` as already implemented | Existing inspect-with-Gary branch preserved |
| Replayed command or old offer | idempotent return/conflict, no second roll/effect | Browser refresh cannot restore permission |

**Why not cooldowns?** No duration has meaningfully changed the premise, and a generic timer would make the player idle merely to farm another die. **Why not relational distrust?** Failure does not prove Gary now dislikes the character; adding an ungrounded relationship penalty would turn a quality fix into invented canon. A later new circumstance might legitimately allow renewed reassurance, but re-enabling it requires a separately admitted, truthful state transition, not a timeout.

## Verification fixture (non-negotiable)

1. Verify `pineapple-mechanics.v4` seed includes the new fact false. Capture the first offered private plan and public option from one and the same opening path. Do not accidentally combine authored opening plans with generated plans.
2. Fix RNG to d20=5, select `calm-gary` once. Assert exact receipt failure, exactly one committed `fact.set.v1` effect true + declaration, `gary-alert=true`, no success state, correct admitted duration (currently 5 fictional seconds for this plan).
3. Run the actual scripted `consequence` (not a fake choice array). Assert old `calm-gary` is absent, one grounded new avenue exists, and `take-cover` passes current plan validator with its original effects.
4. Execute `take-cover`; assert cover true and subsequent `inspect-from-cover` / `leave-cover` available; no second Persuasion roll, no duplicate receipt. A caller with stale previous offer ID cannot execute it.
5. Run the **success** branch independently (roll meets DC 12) and ensure calm-Gary route still exists. Run a different fixture (e.g. microbe/beacon) unchanged.
6. Reconcile `docs/technical/playthroughs/spongebob.md` with actual code evidence; the atlas's old "current" 0-tick note is stale compared to current plan `fictionalDurationSeconds:5`. Update only the claims genuinely verified by code/tests.

No paid model call, universal prompt change, new global social stat, forced combat, ItemStore rewrite or UI design is warranted.

## Acceptance / authority

This document selects **one credible method** for an authored fixture; it does not claim every failed check must prohibit trying again. Once owner authorizes [GM04](../../../changes/archive/2026-11/experience/2026-11-13--gm-offer-distinctness/CHANGE.md) and Cursor verifies the baseline, the Change can move to Ready. A changed label without durable supported fact is **not Done**.
