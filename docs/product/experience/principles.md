# Experience principles | player-facing non-negotiables

**Owner (DOC01 P2):** what the browser experience must never compromise. Reconciles `journeys/player-experience.md` lead + `programs/experience` README non-negotiables ([compare](../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/EXPERIENCE-CLAIM-COMPARE.md)).  
**Does not own:** React/presentation runtime ([technical client](../../technical/client-and-identity.md) / React target), game rules, or staff Admin UX.

## Core promise

The player follows a character’s life through scenes, choices and periods of waiting. Opening the website should feel like **returning to a situation**, not administering a simulation.

## Non-negotiables

- The character may be a person, microbe, distributed mind or something stranger. No mandatory body sheet, inventory, currency, map or tavern.
- No chapter model or compulsory plot structure. Scenes can continue through many choices; quiet periods are meaningful.
- A player chooses **intentions**, not guaranteed outcomes. The rules engine—not the UI or model prose—decides committed consequences.
- Fictional time advances only through **accepted commitments**, not merely because the browser is open or closed.
- A timed process may be interrupted; a result is not earned at its start. Never animate a false success.
- Provider spending, generation outcomes and technical recovery need honest states and explicit consent where required.
- Portfolio honesty: the public demonstration must communicate the unique promise **without lying** about simulated vs durable behavior.

## Demo vs live

The public `/demo` route is an authored browser prototype (quiet interval, choices, consequences, chronology). It needs no sign-in or provider. Demonstration time advances manually; refreshing starts over. These controls explore presentation—**not** production rules for time or absence.

Authenticated live stories must show truthful waits against server deadlines (including Pause/Resume when controllable). Reloading must not restart an accepted wait.

## Human validation honesty

Landed UX/PX/PF portfolio work is **not** a claim that human UX comprehension is validated. New UI work still requires an owner-selected Change.
