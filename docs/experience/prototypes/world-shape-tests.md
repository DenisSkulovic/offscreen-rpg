# World-shape prototypes | when the game is not a medieval person with a backpack

**Status:** interaction scenarios and UI **design fixtures**, not a claim that the engine already supports every transformation or activity. Source contrasts: [nonhuman atlas](../../technical/playthroughs/nonhuman.md), [wizard/apple target](../../technical/playthroughs/wizard.md), [SpongeBob fixture](../../technical/playthroughs/spongebob.md). Deliberately test worlds with different scale, agency, risk and tone against **the same** interface grammar.

## A game world is not a skin over medieval UI

A reusable product interface cannot assume:
- a humanoid with every D&D attribute applicable;
- a physical location on a map;
- currency, gear, level-up, combat or ownership;
- a face or avatar that can be drawn;
- a calendar that counts days, or an activity that should be measured in hours;
- a guaranteed “move” verb or a one-person decision in multiplayer.

The UI should represent **situation, applicable capabilities, authored choices, accepted time and consequences**. Those are cross-world primitives. Everything else is optional content.

## Prototype A | the microbe and the gradient

### Scene, from the current prepared fixture

    THE GRADIENT IS BREAKING
    Exposed · no current commitment

    The strong chemical gradient breaks apart.
    A weaker pocket of nutrients persists away
    from the disturbance.

    WHAT WILL YOU ATTEMPT?

    [Follow the weaker gradient]
      Sense a possible safer route.
      Outcome uncertain.

    [Contract away from the disturbance]
      Take a known protective posture.

    [You: Sensing / current condition]

**What the current data actually mean:** the microbe has applicable Constitution 14, Wisdom 12 and proficient environmental sensing, but other generic D&D scores are not necessarily applicable. There is no required currency or human inventory. In the existing fixed test a Wisdom sensing roll totals **11 against DC 12** and fails. The failure leaves the organism exposed, not “you lose your sword.”

**UX requirements:** No HP meter labeled as a soldier injury readout, money dropdown, humanoid character art or city map. If HP is applicable in this fixture, display it in a contextually relevant condition panel rather than making it the universal story shell. Show a settled failed environmental sensing check only after the saved receipt arrives.

### Extended activity: energy absorption (target, not existing runtime proof)

Current target design proposes a six-unit growth process, two per successful contribution, once per four environmental-cycle ticks, with a five-second real-time tick. A readable active state:

    ABSORBING ENERGY
    2 of 6 growth units earned
    Next attempt: about 20 real seconds
    In-world measure: environmental cycles
    [Details] [Pause if allowed]

The UX says **“2 of 6 growth units,” not “2 gold,” “Day 3,” or “Energy per hour.”** A failed attempt can leave growth at 2/6 while cycles advance. The number is rules-derived and does not imply earned offspring.

At target tick 8 an environmental change can interrupt absorption: nutrient access is lost. The scene becomes **“The pocket has gone thin”** with choices to remain/attempt a supported migration or protectively contract. Accrued 2/6 remains. A later validated migration may reauthorize the same retained personal growth, not invent a whole new job.

**Red-team case:** if the screen asks for “Where do you want to travel in kilometers?” or shows “0/50 inventory,” this isn't world-neutral.

## Prototype B | a wizard inside a goblin's apple (future mechanics)

**Source status:** mainly future architecture stress test in the maintained wizard atlas. Current runtime lacks full authoritative transformation, containment and multiplayer control; the screen below is **not a ready frontend Change**.

### Before

    THE MOUNTAIN PASS
    Travelling · 30 of 120 route units reached

    A goblin sits on the wall, apple in one
    hand and a pear in the other.

    [Take the apple]
    [Ask why he is so generous]
    [Decline and keep distance]

The intended accepted consequence may be a transformation, but the option must not reveal all private future details. High-risk creative profile permits *some* magical surprise subject to captured risk policy; UI must not imply “harmless purchase” if acceptance is highly consequential without warning.

### After, when the game actually supports it

    INSIDE THE APPLE
    Decision available · journey interrupted

    The apple's skin curves around you.
    You are close to a seed. The goblin's
    voice booms from beyond the red wall.

    [Wait and listen for a bounded interval]
    [Try an applicable spell to bore an opening]
    [Call to your companion]

    CONTEXT
    Your form: tiny (when actually committed)
    Your position: inside apple A
    Previous journey: held at 30/120 route units
    Companion: outside, not under your control

**What changed:** this is a coherent *new situation*, not a travel-page modal. The location is a containment relationship, not a coordinate. No omniscient “map interior” is required. The wizard's abilities and available actions are revalidated by the new form.

**A later hazard:** at tick 90 the goblin prepares to bite the apple. That is an **event needing a response**, not proof the wizard was swallowed. The UI must not fast-forward to a loss while the decision is held. Any countdown refers to an explicitly authorized **real response deadline**, not the remaining game ticks.

### Multi-player caveat

The companion outside may have an independent player. The wizard's player must not see “Command companion” unless rules and consent authorize it. Shared pacing, conflicting travel decisions and player-specific notifications are a separate multiplayer product contract. A beautiful UI cannot solve authority by making one player an invisible party leader.

## Prototype C | SpongeBob, Gary and the parcel (current scripted fixture)

**Source status:** current mechanical opening and immediate resolutions, with known gap that selected short actions currently consume zero fictional ticks; the selected deliberate-time correction is not yet fully implemented.

### First scene

    THE PINEAPPLE
    Gary is alert · a parcel rattles outside

    You wake to find Gary bristling beside
    the window. The parcel on the sill is wet
    and makes a sound that could be a knock.

    [Slip behind the sofa]
      A known protective move.
    [Talk Gary down]
      Persuasion, uncertain.
    [Call from the doorway]
      Keep some distance.

The tone can be absurd and a little anxious without the global app behaving like a cartoon toolbar. A reader should be able to laugh at the situation while system controls remain clear.

### After a failed reassurance

Current fixed roll: d20 **5 + 2 Charisma + 2 proficiency = 9**, below DC 12. The UI may reveal the actual failed check. Gary remains alert. An important *design gap* from the product atlas is the repeated identical Persuasion offer when the fact state hasn't changed.

**UX cannot fix this by changing button colors.** The game ought to remember “reassurance tried” or supply a genuinely changed approach, but that is a game/Storyteller quality decision and needs a separate rules/authoring Change. Our UI should not pretend the second identical offer is a new meaningful option merely by relabeling it.

Next meaningful option after moving behind sofa: **Watch window from cover** or **Come out beside Gary**. Cover is actual saved state, not descriptive wallpaper.

### Quiet continuation

The story can resolve without dramatic confrontation, and the UI should let the player choose a normal local action afterward. A SpongeBob episode need not turn into a combat system every time a parcel arrives. A quiet, a comic and an eerie story all use the same scene/choice/time grammar and different fiction.

## Cross-world component stress test

| Component | Harbor repair | Microbe | Apple wizard | Pineapple/Gary |
| --- | --- | --- | --- | --- |
| Situation header | Beacon landing | Chemical gradient | Apple interior | Pineapple window |
| Applicable “You” facts | Repair proficiency, tools | Sensing, exposure | Tiny form, containment, spell applicability | Gary alert? known relationship; cover condition |
| Progress | Contribution units (3/9) | Growth units (2/6) | Route units (30/120) held | Finite immediate actions |
| Time | Generic ticks (test rate), not fictional minutes | Environmental cycles | Admitted journey ticks | Short actions; current zero-time limitation |
| Key interruption | Stranger arrives | Nutrient access lost | Goblin bite warning | Rattling parcel |
| Common false UI | Always-running repair bar | Gold/inventory/city map | Coordinate path from inside apple | Repeated Persuasion spam treated as fresh |
| What remains common | Authored intention → admitted result → verified time/consequence → next scene or hold | Same | Same | Same |

## Decision rule before implementing any “universal” component

If a component only works for the beacon, it is a **beacon-specific visual** or a candidate for redesign, not a universal core primitive. If it works for all four examples **without lying about unknown state, timed actions, character form or agency**, it may be suitable for the core system.

Test the contrasts in Storybook with honest labels: **current**, **proposed mechanics**, **scripted only**, and **no provider call**. Do not claim the wizard transformation is working because a designer can draw the UI.

**Pass:** after seeing these four variants, unfamiliar people recognize one consistent game grammar while also perceiving genuinely different worlds. **Fail:** all stories look like the same fantasy job-board app with different nouns.