# The ten-hour journey | what long earned-time travel should feel like

**Status:** product vision **thought experiment**, not a tested current travel engine. Original benchmark: travel from **Seyda Neen toward Gnisis in a Vvardenfell story** might take roughly **ten real hours** under one selected pace. This is an imaginative scenario, **not** a claim of route distance, travel adapter, ETA or current implementation. Rules authority remains [time/travel](../../time-and-autonomy.md#travel-duration-and-progress).

## Why this journey matters

If a player decides to spend ten real hours getting somewhere, the reward is not a better loading screen. The journey should *feel invested*. They might go to work in their real life while the character crosses Vvardenfell. On return, the game could reveal an actual arrival, an interruption or unfinished travel. The player must know **which** is true.

A long wait is a design risk. Players need enough orientation and emotional continuity to remain curious without the app manufacturing a message every 60 seconds. A real-time wait alone is not depth.

## Before departure | the commitment must be honest

**Context:** the Storyteller has established a viable authored route and rules support a specific travel process. The player selects an intention.

\`\`\`text
LEAVE SEYDA NEEN
Travel toward Gnisis

Expected real wait: about 10 hours at this story's pace.
This is an estimate. Interruptions, conditions or
unexpected events may change the journey.

Your destination is not reached until travel
really completes.

[Begin journey]       [Stay here]
\`\`\`

**What could be disclosed when known:** rough fictional duration, declared route, accepted horizon, known food/cost or capacity requirements, existing work suspended, risk of interruption. Do not invent mandatory hunger, weather or currency rules just because fantasy travel is involved.

**What is private:** scheduled ambushes, hidden rolls, future plot revelations and exact undiscovered places. Don't turn a progress card into spoiler text.

## First return after 90 real minutes | meaningful but quiet

The player opens Now, sees:

\`\`\`text
ON THE ROAD TO GNISIS
Journey underway

Last verified milestone: [known route state]
Estimated remaining here: around 8½ hours, if
conditions remain unchanged.

Nothing needs your attention right now.
Your accepted journey continues without the page open.

[Review journey]   [Journal]
\`\`\`

The page may have a restrained atmospheric map, route motif or landscape image **only if content knows enough to show it accurately**. If progress is temporal but position unknown, do not draw a moving dot at 15% of a route. The only thing a clock proves is elapsed admitted time.

It is okay for **nothing fresh** to have been narrated. The value of the journey is not paid-prose-per-minute.

## Interruption at hour 4 | the story takes over

Assume an **admitted** hazard/encounter commits at an eligible world boundary and stops incompatible travel. The user opens a notification or the site and finds:

\`\`\`text
THE ROAD IS BLOCKED
Decision waiting · Journey interrupted

[Current published prose describing the event]

[Choose a supported response]
[...another valid response...]

Your journey is stopped. The last established
travel milestone is preserved.
No additional route distance is being earned.
\`\`\`

This is a **real scene**, not a toast on top of a still-running 10-hour progress bar. The four hours of actual earned travel do not vanish, but exact spatial position must come from admitted route mechanics. A partial journey is not automatically “40% of distance” just because 4/10 hours elapsed.

**Deadline meaning:** a real response window, if supported, begins when valid options are published. It is not the remainder of the travel ETA. No default action without explicit captured policy.

## Player returns after eight real hours | no false arrival

If the hazard stopped travel at hour four, return tells the truth: “Your journey stopped when an encounter required your attention. It has not continued since.” The player should be able to understand **why** eight hours away did not equal eight hours of progress.

Alternative: if the player had admitted a safe default or a bounded plan permitted an authorized response, the engine may have continued only under those explicit rules. The UI reports the action taken on the character's behalf and its real receipt, not a fabricated helpful ending.

## No interruption branch | quiet arrival

If all admitted travel conditions complete without needing narrative intervention, the engine commits actual arrival and effects once. A short factual arrival may be sufficient. If a Storyteller scene is required, generation is scheduled separately and may finish after travel; the UI distinguishes **travel finished** from **arrival prose pending**.

After arrival:
- The player knows the destination really has been reached.
- Known location/route evidence updates, but hidden future lore does not appear.
- Previously accepted next steps may start only if authorized and newly eligible.
- The Journal preserves travel origin, earned route segments/milestones and time.
- The player has a new situation or local opportunities if explicitly authored.

A purely descriptive arrival should not demand another click when an admitted successor may legally continue.

## What about a map?

**Map is an optional spatial expression**, not the fundamental UI. Some settings can offer a known-world map and a known route, giving the player a strong sense of distance. Other settings have abstract spaces, portals, non-Euclidean dimensions or no geography.

A valid route visualization requires:
1. known geography/graph and visibility constraints;
2. supported mapping between committed progress and spatial position;
3. explicit uncertainty / segments not reached;
4. interruption preserving exact route state;
5. no hidden future destination/progress leak.

If these are unavailable, display a **journey timeline of actual milestones** rather than a deceptive topographic map. A dotted line for expected future route must be clearly distinguished from solid recorded travel. Do not implement drag-and-drop map travel as a free relocation hack.

## How should the character feel present during ten hours?

We can create atmosphere without continuous inference:
- A committed start passage describing setting and intention.
- A stable journey situation with a known milestone and risk semantics.
- Occasional **meaningful** factual progress boundary if relevant.
- Fresh authored/Storyteller passage only when the narrative has a genuinely new event or an explicitly admitted report policy.
- A “read what led here” journal and optional art.
- A meaningful interruption/arrival on server authority, not based on browser polling or optimistic animation.

The interface should not encourage **compulsively checking every minute** to harvest narrative. Good offscreen play makes leaving feel legitimate.

## Four clocks and statuses to keep separate

1. **Fictional elapsed travel:** governed by approved route process and world time.
2. **Real conditional estimate:** forecast of the next meaningful boundary, affected by pace and interruption.
3. **Actual current position / route milestone:** saved, known geographic/progress state, never inferred from elapsed ratio alone.
4. **Storyteller narration readiness:** a separate generation/publishing task after an admitted event or completion.

If the travel view cannot represent these without confusing them, the product and read models need an explicit redesign; CSS cannot fix a false authority claim.

## Risk and fairness

Travel may be genuinely dangerous. The Storyteller should not protect earned gear because it took ten hours to acquire, but irreversible losses must follow captured campaign risk and admitted checks. “You have a risky road ahead” may be honest without disclosing hidden rolls. An unexpected event can be fair while its precise cause is secret; a player should still understand **when and why travel stopped**.

Do not force every world into Vvardenfell. Run the exact same semantics through a space voyage, a medical recovery, a quiet sea crossing and a microbial migration as cross-world tests.

## Acceptance challenge

Ask a first-time player at four screenshots: **pre-departure, hour 1, interrupted hour 4, return hour 8**. They should independently know:
- What they intended;
- What progress is actually recorded;
- What is predicted, not earned;
- Whether they can leave again;
- Whether their character is in danger or waiting for them;
- Why the story didn't silently reach Gnisis while the game was held.

If the screen makes them ask “But did I arrive?” or “Does closing this tab stop it?” we have not delivered the promised game.
