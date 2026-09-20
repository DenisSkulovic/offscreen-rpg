# Playthroughs

This walkthrough makes the intended experience tangible. Characters, wording, durations and outcomes are illustrative. They do not require goblin mechanics, apple mechanics or separate software concepts called nodes and events. Unsettled behavior is identified where it affects the experience.

The [gameplay execution atlas](technical/playthroughs/README.md) is the technical companion: concrete scenes/options, exact worked dice and timing, activity interruptions/chains, Storyteller context/tools and illustrative token ledgers for every benchmark below, plus SpongeBob and the beacon fixtures. Read these high-level examples for the feeling, then the corresponding trace to examine authority and implementation gaps. The [proposed connected POC](technical/playthroughs/poc.md) selects a small proof without making every example a release requirement.

These playthroughs are a living product reference, not disposable scaffolding for the current implementation. Preserve and maintain them as behavior evolves. Add or extend a benchmark when a new story, world, kind of character, chronology or social arrangement puts a genuinely different assumption under pressure. A benchmark may remain deliberately ahead of the runtime; its gap should stay visible and link to the owning contract rather than being erased or rewritten as though the limitation were intended.

## 1. Arrive and create

A visitor sees an example of a character's life interrupted by a choice. They select “New story,” sign in through OAuth and reach creation. A returning player instead finds their existing stories and the same creation action. An empty account should not require navigating an empty dashboard first.

The player writes: “I am a wizard crossing the mountains to reach a haunted house.” They choose a whimsical but dangerous storytelling direction and a pace suitable for occasional attention during the day. The premise could equally support horror or gentle comedy; selecting this character does not determine the storyteller's style.

They invite a friend, who establishes a companion for the journey. Both see the premise and shared expectations for pace and unattended choices. The generated preview introduces the pair, their immediate surroundings and a reason to reach the house. They correct any misunderstanding before starting.

## 2. Set out

The opening presents the mountain path and several possible intentions. The party decides to take the pass. How that joint decision is collected is still open; for this example they agree, so there is no conflict to resolve.

The scene changes to the journey. A background illustration may show the travelers, while the main text describes their movement and estimated arrival. There is no need to refresh the image or generate prose every minute. The players can leave the page.

The story may already have prepared an interruption. Nothing about that preparation belongs in the visible chronology. If the party changes route before reaching it, the old continuation must not fire blindly.

## 3. Meet the goblin

Partway through the journey, a notification brings the players back. A goblin blocks the path, offering an apple and a pear. The view makes clear that a response is available and, if applicable, when a default will be selected.

The wizard's options might be to accept either fruit, tell a joke, wait or attack. These are different intentions, not a mandated five-button template. The companion may also have a role, but the wizard's player cannot choose the companion's response.

The wizard chooses the apple. A short processing state acknowledges the choice, then the consequence follows promptly: the wizard is tiny, inside the apple beside a seed. There is no artificial two-hour delay between accepting the fruit and seeing this immediate result.

## 4. Wait inside the apple

The wizard chooses to wait and observe. The presentation settles into darkness around the seed and explains that time is passing. This does not require fresh narration while nothing changes.

In the solo version, the goblin might carry the apple away. In the shared version, the companion is still outside and may act. We cannot truthfully schedule five hours of uninterrupted waiting if the companion picks up, cuts open or destroys the apple in the meantime. Their action would change both characters' circumstances.

For this branch, assume nobody intervenes and the apple stays with the goblin. Several real hours later, a notification reports that the goblin is about to eat it. The wizard now has a response window and contextual ways to attempt escape. The story must remember who has the apple, who is inside and what capabilities remain plausible.

## 5. Respond or miss the window

If the wizard's player responds in time, resolve that intention. If they do not, use a permitted autonomous choice and record that the character acted without the player. A late response cannot replace an outcome already applied.

The precise handling of a companion's simultaneous rescue attempt needs a shared decision rule. It must not accidentally produce both a successful rescue and the wizard being swallowed because two continuations ran independently.

If the story is explicitly paused before resolution, its countdown stops. Group permission to do this remains to be chosen. Closing a browser alone does not pause the story.

## 6. Return and conclude

The next morning, a player sees the current situation and a short account of what happened during their absence, including delegated actions and meaningful changes. They can inspect the full chronology if interested. An old phone notification opens this current state rather than reviving the old choice.

An eventual conclusion could be escaping the goblin and reaching the house, abandoning the journey or dying during the attempt. The storyteller should connect the conclusion to what happened. Whether the survivors can start another adventure as the same characters is an open product choice, not an assumed continuation feature.

## What the first playable build should demonstrate

Walk through creation, a shared scene, a quiet interval, an immediate consequence, a timed autonomous choice and a return after absence. Repeat the core flow alone. Verify that changes of intention invalidate incompatible prepared developments, notifications reflect the current story, and progression survives pause and restart.

Measure inference during both waiting and active exchanges. Show that a remembered fact changes a later outcome. This makes orchestration, persistence and efficient AI visible through an engaging experience rather than requiring a large simulated world.


# Long-life benchmark playthroughs

The wizard-and-goblin walkthrough exercises orchestration and interruption. The following examples exercise a different requirement: whether a character becomes valuable through accumulated real time and persistent consequences.

These are benchmark experiences, not requirements for setting-specific subsystems. Names, currencies, durations and mechanics are illustrative.

## Vvardenfell benchmark: a life that takes time

This is the clearest reference experience.

Imagine beginning an Elder Scrolls-style campaign on Vvardenfell: a newly arrived prisoner with almost nothing, released into Seyda Neen. The application is not reproducing a particular commercial game's quests or mechanics; the setting is useful here as an illustrative benchmark for the desired feeling.

The character owns poor clothes, a little money and whatever history creation established. There is no immediate montage in which the storyteller declares that three weeks passed, the character trained extensively and now owns fine armour unless the player deliberately selected a pace or abstraction that permits that.

### Work

The character finds temporary work standing guard at an Imperial outpost. Another run might offer warehouse work in Seyda Neen during an admitted day or night shift. The Storyteller chooses and explains the locally plausible terms; the engine does not contain an Imperial-job or warehouse subsystem. If the shift matters mechanically, its accepted opportunity references a supported calendar phase or tick window, states whether work may merely start there or must remain inside it, and records what happens when the window closes. “Clearly daytime” in prose is not enough authority, and a world without days can use its own named cycle or no recurring schedule at all.

The player accepts a one-hour real-time shift.

The current state now says, in effect:

- activity: standing guard;
- location: the fort;
- expected completion: about one real hour;
- expected compensation: several septims if the shift completes normally.

The coins are not granted at the beginning.

The player closes the application.

Nothing interesting needs to happen. The game does not call an LLM every minute to narrate looking at a wall.

Fifty minutes later, however, the storyteller may determine that someone approaches the gate and requires judgment. The shift is interrupted by a meaningful situation. The player can return, respond, leave the character to a permitted autonomous reaction or miss the opportunity.

If no interruption occurs, the shift completes. The committed result records the elapsed activity and earned compensation.

Five such unremarkable shifts can be meaningful precisely because they consumed actual time. Twenty septims are no longer an arbitrary number emitted by prose; they represent part of the character's recent life.

### Travel

Later the character decides to walk from Seyda Neen toward Gnisis.

Given the campaign pace, known route and character circumstances, the trip is expected to take roughly ten real hours.

The character does not teleport because the player closed the browser.

During the journey, relevant state records that they are travelling and how the unfinished journey is progressing. They cannot simultaneously spend those same hours guarding a fort in Seyda Neen.

Most of the journey may be quiet.

Several hours later something may happen: another traveller starts a conversation, poor weather changes progress, the character notices something worth investigating, or an attacker blocks the road.

An interruption establishes a new current situation. The original arrival estimate is no longer blindly authoritative.

If nothing interrupts the journey, the character eventually reaches the destination and the arrival becomes committed history.

### Accumulation

Over five real days the character might:

- work several shifts;
- spend some of the earnings on food and travel;
- meet the same guard captain repeatedly;
- acquire a cheap cuirass;
- receive a small favour from someone they helped;
- learn that one road is unsafe;
- carry an object whose history now matters.

None of these needs to be numerically spectacular.

Together they create ownership.

The cuirass matters because obtaining it took time. The captain matters because the relationship has history. The road matters because the player remembers what happened there.

The storyteller should be able to call these things back later because they are established state and history, not merely details remembered opportunistically by a language model.

### Risk

The player later chooses something reckless.

If the campaign allows lethal consequences and the fiction warrants it, the character can die.

The engine must not silently protect them because they have five days of accumulated progress.

The loss is painful precisely because the preceding life was real enough to value.

That does not mean arbitrary punishment. Consequences must remain plausible, risk must be understandable enough for meaningful agency, and storyteller difficulty should follow the selected campaign style.

But persistence without the possibility of meaningful loss produces collectibles rather than stakes.

### Why ordinary ChatGPT cannot provide this experience by itself

A plain conversational storyteller can say:

“After ten hours you reach Gnisis.”

It can say this immediately after the player chooses to leave.

It can also forget how much money the character had, change the distance later, accidentally restore an item that was sold, grant contradictory skills or compress weeks of advancement into the next message.

Offscreen RPG exists specifically to put authoritative application behavior between intention and narration:

**intend → commit activity → real time passes → interruption or completion → validate consequence → commit state → narrate the result**

The language model provides judgment and storytelling inside that loop. It does not get to erase the loop.

## Space benchmark

A pilot accepts a cargo contract whose journey takes sixteen real hours at the selected campaign pace.

Cargo is actually assigned to the ship. Fuel or other supported costs are committed consistently. Payment is not received until delivery.

The player goes to sleep.

During the night the journey may remain uneventful, encounter a mechanical problem, receive a distress signal or be interrupted by something that requires judgment.

Ignoring the distress call can preserve the original route. Investigating it consumes time and changes the situation.

Several days later, the player's modest ship feels valuable not because its statistics are large, but because they remember the contracts, repairs and risks through which they obtained it.

No dedicated galactic-economy simulator is required to create that attachment.

## Small or abstract benchmark

The same principle must survive settings where money, equipment and geography make no sense.

A microorganism may spend real time reproducing, moving through an environment or surviving an adverse condition. Its meaningful persistent state might be position, colony relationships, available energy, mutations or environmental facts.

An abstract entity might spend time forming connections, accumulating influence or completing some setting-specific process.

The software must therefore support durable activities, relevant state and consequences without assuming that every character has a wallet, armour slots, employment or human-scale movement.

## Routine-to-scene benchmark

Owner brainstorming on 2026-09-19: Batman in Gotham selects rest and then crime patrol before the player sleeps. Eight in-game hours of rest, a day's plan and a crime boss carrying a katana are illustrative, not mandatory mechanics or event content.

The admitted rest completes under its rules. The next permitted routine rechecks readiness and starts. Routine patrol checks record only outcomes supported by its captured scope; there are no fresh model calls for checks, logs, ordinary completion or a permitted queue transition. Preparing the plan may have needed generation earlier. One run can remain quiet throughout and still yield meaningful earned results.

In another run, a due occurrence or relevant state condition requests an unusual development. The runtime commits work up to that boundary and records one escalation. The Storyteller prepares a situation and meaningful options from those facts, such as the confrontation. It must not retroactively decide that the patrol was never performed or that a previously committed reward was unearned. The detailed scene and subsequent attempts use the same character/resources as the routine.

If the player is away, the visible policy determines whether to hold or apply a captured permitted fallback after a response window. No assumed consent to a whole generated battle follows from “patrol.” After resolution, the remaining plan is revalidated; it may continue, be blocked or need replacement. Returning explains which results came from routine execution and which decisions were delegated.

Contrast with the Seyda Neen life: conversation with a guard can reveal a destination immediately, while walking to Balmora takes actual time at the selected pace. Three real hours is an illustrative experience, not a global duration. Arrival commits only when the route rule succeeds. The trip can be entirely uneventful. A microbe's growth followed by migration, or an abstract entity's connection work followed by contemplation, should fit without a patrol/combat/calendar subsystem.

The benchmark fails if it requires a model call to end rest or start patrol, if a fixed probability effectively guarantees a constant string of dramatic interruptions, if restarting routines farms fresh event rolls, or if an unresolved event is skipped by the queue. It also fails if every positive consequence is forced through a timer: a real gift or supported immediate discovery is still a legitimate change.

## Chained journey with selected narration

Further owner brainstorming: travel from Seyda Neen to Balmora, sleep there, spend time chatting at its tavern, travel to the Gate, sleep, then travel toward Red Mountain. This is an illustrative itinerary, not a required route, geographic claim or content pack.

The accepted chain can keep the first arrival quiet, report the rest with a factual log, and request vivid narration at the Gate. A tavern entry can be an extended social routine, or its follow-up may open a conversation with choices. Optional events may arise during any eligible leg, several legs or none. Scheduled gate narration does not depend on winning an encounter roll.

One configured gate arrival narrates and starts the permitted rest. Another opens a consequential choice and holds the onward itinerary. A late descriptive passage reports the saved arrival rather than claiming the character is still at the gate. If an event changes route access or the player's intent, revalidate or explicitly revise the remaining legs while preserving committed travel and costs. The itinerary cannot award travel progress or arrival rewards a second time on top of its entries.

Acceptance compares the same mechanical completion with quiet, narrated-and-continuing, and interactive-held policies. This prevents either compulsory generation or a blanket prohibition on consequence narration from becoming the architecture.

## Benchmark questions

When evaluating future features, ask:

- Does this preserve the difference between intending something and completing it?
- Can meaningful progress require real elapsed time without constant narration?
- Can an interruption invalidate or alter an unfinished activity?
- Are earned resources, relationships and consequences committed consistently?
- Does accumulated history make later choices more consequential?
- Can the same machinery support radically different settings?
- Are immediate actions still immediate rather than receiving artificial timers?
- Can the player leave and later understand what actually happened?
- Can meaningful loss occur when the fiction and campaign rules allow it?

A feature that makes these experiences harder to support should be treated with suspicion even if it simplifies the current fixture.
