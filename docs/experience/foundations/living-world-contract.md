# The living-world contract | what makes this game worth returning to

**Status:** product-experience design target, not a declaration that the current engine demonstrates it. Related authority: [vision](../../vision.md), [gameplay](../../gameplay.md), [time](../../time-and-autonomy.md), [continuity](../../continuity-and-consequences.md). Independent challenge: [temporal models](temporal-philosophy.md).

## The uncomfortable question

Imagine a user invests seven real evenings repairing a beacon, slowly earns equipment, meets somebody at a tavern, and returns after three days away. If the screen merely says **“You earned 12 coins”** and displays a generic new encounter, the game has fulfilled its bookkeeping but missed its promise.

What the user actually wanted was evidence of **a life**: effort gave the character history; the world retained that history; something small from an earlier day now changes what can happen.

**The north star is not “world simulation.” It is continuity that gives choices weight.** We should not create the illusion of life by making the clock tick forever, emitting constant notifications or running one LLM per NPC.

## Five independently necessary properties of a living experience

| Property | Player-observable proof | False substitute |
| --- | --- | --- |
| **Situated present** | I understand what my character perceives and what I can attempt now | A paragraph plus unrelated process widgets |
| **Earned time** | An action that consumes effort cannot deliver its reward merely because I clicked | A CSS countdown attached to an immediate reward |
| **Remembered consequence** | A particular earlier choice or commitment affects a later event, offer, relationship or fact | An LLM sentence “You remember everything” without grounded source |
| **Bounded independent continuation** | What I explicitly allowed continues offscreen and stops at the declared limit/hold | A browser tab spinner or limitless autopilot |
| **Fair surprise** | Something unplanned can interrupt or reshape progress without violating captured authority, visibility and risk | Arbitrary plot twist to keep me engaged |

**All five matter.** A beautiful scene without durable consequence is interactive fiction theater; deterministic clocks without compelling remembered events are a cron scheduler.

## The essential distinction: continuity vs simulation

A believable tavern does **not** require tracking every patron's breakfast, bank account and GPS position. It requires stable identities and consequences at points where interaction makes them important.

- The player helps a traveler carry a chest. It is a small action, perhaps with an admitted check and time cost.
- Days later the traveler recognizes them or refers back to the chest, **only if the source history and Storyteller context permit it**.
- That recognition might create a new opportunity. If it changes actual privileges, inventory, money or relationship state, the engine admits the supported effect explicitly.
- An absent unrelated patron need not be simulated while never relevant.
- If the Storyteller cannot recall the earlier chest, do not improvise a claim that it was remembered.

This is **event-anchored continuity**, not exhaustive world modeling. It is the high-value target for long-story memory.

## The relationship between waiting and desire

A ten-hour journey isn't emotionally meaningful merely because the ETA is ten hours. The player needs at least one or more of:

1. **Purpose:** the destination is important to their current intention.
2. **Opportunity cost:** those ten hours could have been spent on a genuinely different path.
3. **Uncertainty:** completion, interruption and condition changes are governed by meaningful known/unknown rules.
4. **Accumulated effort:** partial progress is preserved and losing it has understandable consequences.
5. **Aftermath:** arrival changes where they are, what they know and can do; later scenes can remember the trip.

Without these, the UI is selling a waiting simulator with nicer typography. This is why [Citizen Sleeper's discussion of choosing how to spend time](https://news.xbox.com/en-us/2023/03/14/citizen-sleeper-episode-3-purge/) is relevant without importing its dice-cycle economy.

## Player freedom is not the absence of constraints

A sandbox succeeds when intention is broad **but consequence is trustworthy**.

- **Curated valid options** should be easy to choose and clearly situated, not a universal fixed “three choices.”
- **Custom intentions** should eventually let the player express plausible alternatives with interpret/review/admit stages, but not dictate outcomes or hidden canon.
- The Storyteller can improvise within the pinned world and rules, while the application enforces effort, resources, knowledge boundaries and accepted facts.
- Rejecting an impossible action honestly may strengthen immersion more than yielding to everything.
- A player can deliberately spend several days doing nothing dramatic. Quiet should not be pathologized as insufficient engagement.

The authored choice and free-intent future are **complementary**, not opposing religions. Which one is primary should depend on evidence from actual player interactions.

## The player doesn't want to supervise the software

In no normal player flow should the user have to reason about:
- task attempts, provider dispatch and repair rounds;
- worker revisions and receipt digests;
- model context windows;
- success/failure branches stored as JSON;
- cron-like successor horizons in seconds;
- server-side read-model freshness as a gameplay objective.

Those details are important engineering work. They belong in the Chamber or an explicitly advanced technical diagnostic area, not the fictional stage.

Player equivalents:
- “What am I doing?”
- “What did it cost?”
- “What changed?”
- “Can I change course?”
- “What will continue if I leave?”
- “What needs me now?”

If any primary player page fails to answer its relevant questions, it is underdesigned no matter how many components it contains.

## The emotional design of returning

The user need not come back to ten guaranteed surprises. There are three valid returns:

**Quiet earned return:** “Your repair is now 6/9. No new decision is waiting.” It matters because progress was earned and preserved.

**Interrupted return:** “Your journey stopped when a stranger arrived. You have not reached your destination. Your previous progress is retained.” It matters because the world responded, and the player has agency now.

**Still idle return:** “No activity was accepted, so nothing advanced.” It matters because the world was honest; but over time this may weaken the 'life continues' fantasy and motivate a better bounded standing-routine mechanic.

The user should never be forced to read 27 equally prominent work checks before locating the current situation.

## A durable relationship example, intentionally modest

A traveler asks to borrow a compass. The player agrees and it transfers through a validated item effect. They cross a difficult road together and part ways. A week later, the traveler appears in another legitimate authored scene.

The return encounter is meaningful if:
- the same person is identified from real durable source;
- the compass transfer has actually been committed (it is **not** still in the player's pack);
- the traveler may remember receiving help, without the Storyteller fabricating an irreversible alliance;
- the player can act differently now;
- the Journey/Journal can link to the original meeting.

It does **not** require a global affection number or constant NPC simulation. A tiny continuity feature can deliver more feeling than a giant autogenerated city.

## Relationship to the visual direction

The [living situation stage](composition-experiments.md) is the recommended shell because it gives the above moments room to land. But the **mechanic is the experience**: no art direction can compensate if old choices never matter. Motion is used to mark committed changes, not to manufacture the sense of a busy world when nothing is advancing.

## A practical product-quality evaluation

Take a deterministic, source-grounded scenario with:
- two genuinely different initial intentions;
- a sustained task with both success and failure checks;
- one interruption;
- a choice whose outcome affects an encounter several turns later;
- a return after an interval;
- a recovery/failure path that does not lose committed state.

Ask an unfamiliar participant after 10 minutes:

1. *What has your character actually accomplished?*
2. *Which of your earlier decisions matters now, and how?*
3. *What will happen if you close the browser?*
4. *What are you curious to discover next?*
5. *Which point felt like filling out a form rather than playing a game?*

A positive answer to 1–3 demonstrates comprehension and trust. **Question 4 is the essential motivational test**. Question 5 catches a UI that passes functional checks while still feeling like enterprise software.

## Decision still open

The ideal **temporal permission model** is not settled. [Strict commitment-bound time vs bounded standing life](temporal-philosophy.md) needs player testing and an implementation cost review. Until then, preserve the current engine contract; the UI must be truthful while the design continues challenging its ability to fulfill the original fantasy.
