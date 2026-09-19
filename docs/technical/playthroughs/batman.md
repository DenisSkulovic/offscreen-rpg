# Batman: a night away is not a night of model calls

Companion to the [overnight benchmark](../../playthroughs.md). This entire extended routine/queue flow is **target behavior**, not implemented Batman content. Values below are fixture choices, not required campaign defaults.

## BM-01: the player makes a bounded plan

After an active scene in Gotham, the player sees:

> The immediate lead has gone cold. You can rest before another patrol, keep investigating this lead, or stop for now.

They choose an admitted plan: **rest for eight fictional hours, then patrol for up to six fictional hours**. The confirmation explains the plan horizon, stop-on-event policy and what routine patrol may do. It does not promise six crime bosses or authorize arbitrary lethal combat.

Fixture: one tick = one fictional minute; rate = two ticks per real minute. Total planned duration = 840 ticks = seven active real hours. Rest uses 480 ticks, patrol at most 360. Permission covers routine execution and bounded supported routine outcomes, **not unattended decisions inside a new major scene**. The first target uses hold-on-event. No generic “Batman would do the right thing” personality delegation is assumed.

Plans could be proposed once by a Storyteller or selected from already admitted content. The zero-call claim begins **after admission**, not at character creation. No new generation is needed just to enqueue existing intentions.

## BM-02: rest, then revalidate patrol

At tick 0, rest starts. The fixture selects a clock wait with one completion effect that clears an existing tired condition. It does not roll every minute to decide whether Batman is asleep. If a different rest rule needs interrupted-rest quality, it must define that explicitly; eight elapsed hours alone is not universal recovery semantics.

At tick 480, the rest receipt commits exactly once. Its quiet follow-up tells the chain to attempt the next entry. Patrol revalidates location, capability, available capacity, horizon and required equipment access. If an injury or missing equipment makes it ineligible, the plan is blocked with a reason. The engine does not ask a model to invent a substitute crime-fighting mission.

Example player return before that boundary: “Resting; patrol is next if still feasible.” No regeneration and no “while you were away” paragraph is required for this truth.

## BM-03: quiet patrol with actual uncertainty

Fixture rule: every sixty eligible patrol ticks, make a Wisdom/Perception DC 12 check with +4. Success records one resolved routine lead; failure records none. This is a deliberately bounded abstract patrol rule, **not a full combat simulation**. It does not create six named criminals or roll every punch. A patrol outcome can later use a richer supported rule if the product needs it.

After each completed patrol hour, a separate occurrence check uses `d20 <= 2`. Its purpose is eligibility for a special story development, not whether Batman succeeds at routine patrol. At most one event is admitted in this plan; its consumed/cooldown state survives restart. Exact cadence/odds are illustrative, and low-surprise profile prose alone does not configure these mechanics.

| World tick | Patrol hour | Work draw, +4 against 12 | Routine leads total | Occurrence draw |
| ---: | ---: | --- | ---: | --- |
| 540 | 1 | 12 → success | 1 | 17 → none |
| 600 | 2 | 4 → failure | 1 | 8 → none |
| 660 | 3 | 9 → success | 2 | 14 → none |
| 720 | 4 | 16 → success | 3 | 6 → none |
| 780 | 5 | 7 → failure | 3 | 19 → none |
| 840 | 6 | 10 → success | 4 | Quiet branch: 11 → none; event branch: 1 → candidate |

Six routine checks and six occurrence checks do not imply twelve calls. In the quiet branch, patrol completes at the horizon; the character goes idle under the accepted policy. A factual return view reports rest complete, four routine leads resolved, no unresolved scene. No fresh LLM tokens and **no generation tasks** during this admitted routine.

“Lead” is a fixture quantity/evidence label, not a mandatory currency in all worlds. Rewarding skill progression or district safety would require separately admitted effects; neither follows from attractive narration.

## BM-04: the event branch at the sixth hour

The alternate occurrence draw of 1 requests a bounded event at tick 840. The boundary policy gives a required interactive event precedence over chain completion/idle handoff. The routine's final earned result is retained; the resulting scene hold is also retained.

Two distinct designs must not be mixed:

- If the admitted occurrence commits only an **event candidate**, “a katana boss exists here” is not yet a fact. Event preparation must propose and admit the relevant actor/situation before publication. If optional generation is unavailable, the captured candidate policy may defer/skip it without falsifying an encounter.
- If the admitted rule already commits a **specific hazard**, that hazard remains even if generation fails. Required continuation holds; a budget failure cannot make the attacker vanish.

This fixture chooses a candidate that becomes a required scene only when its supported event proposal is admitted. The first solo design temporarily holds progression at the escalation boundary during preparation. Spending authorization is independently checked; routine permission is not model-spend permission. The exact event/world-entity admission contract is still missing.

Once admitted, the scene could read:

> A figure steps from the station stairwell, an oversized katana scraping the tile. He names the witness you escorted last night. “You should have left that one alone.”

The witness reference is allowed only if retrieved committed history supports it. Otherwise the scene must use another grounded motive; familiar-sounding continuity cannot be invented to make the scene seem deep.

## BM-05: meaningful options, not a generated combat movie

Possible target choices:

| Choice | Distinct intention | Requirements and limits |
| --- | --- | --- |
| Withdraw toward the lit station | Reduce exposure, accept losing the lead | Supported movement/escape resolution; not automatic teleportation |
| Keep distance and question him | Learn motive without accepting a duel | A grounded check or assured exchange; failure stakes admitted beforehand |
| Disable his footing with a gadget | Controlled confrontation | Established gadget/capability and supported effect/resource cost |

Do not offer the third if gadget inventory/use is unimplemented. Full katana combat, attacks, initiative and death rules are not provided by the current ability-check subset. For the first proof, use a bounded supported nonlethal situation and label its scope honestly.

The response allowance begins when a usable scene/offer is published, not when generation was queued. No answer under this fixture means hold, not an invented winning fight. A later fallback variant could retreat only if the player explicitly permitted that category and the current state admits a bounded safe action. It cannot authorize unsafe combat because “Batman is brave.”

Player resolves one choice; mechanics commit; D explains the result and proposes feasible next intentions. Patrol does not silently continue past the original six-hour horizon. A fresh plan requires fresh acceptance.

## BM-06: what happens if the player is still asleep

At return, show “Rest completed; patrol ran for six hours; a new encounter awaits,” with the stop tick, routine outcomes and held scene. Do not claim seven subsequent hours of productive patrol elapsed while the event was unresolved. The exact fixture hit at hour six is reproducible design data, not a promise that the game wakes the agent at that time every night.

If the player manually paused during generation, successful publication must preserve that manual hold. If they cancel remaining planned work, completed rest and patrol outcomes remain; the already-admitted event is not deleted. A failed report may be omitted only if the reporting policy allowed it; a required event cannot be handled that way.

Cost from an already accepted plan: quiet branch Q = zero; event plus one resolved choice = E + D, nominal 11k–22k input and 1.9k–4.2k output. Setup/opening, optional recap, retries and exploration are excluded and must be added when actually used.

The design succeeds if sleeping creates earned, inspectable value and sometimes a meaningful reason to return—not guaranteed drama, limitless unattended rewards or a wall of paid filler.
