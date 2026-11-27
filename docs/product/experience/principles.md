# Experience principles | player-facing non-negotiables

**Owns:** what the browser experience must never compromise.  
**Does not own:** React and presentation runtime ([client boundary](../../technical/client/state-and-server-boundary.md)), game rules, or staff Admin UX. Shared campaigns are a [deferred design](../../../work/designs/backlog/shared-play/README.md), not a principle on this page.

## Core promise

The player follows a character’s life through scenes, choices and periods of waiting. Opening the website should feel like **returning to a situation**, not administering a simulation. The reader is owed a situation to read, intentions to choose from, time that moves only when something was accepted, and honest states while the world works.

## Who owns each reader promise

This page states the promise; the owner below holds the detailed claim. Follow the link for conditions and exceptions.

| Promise | Canonical claim |
| --- | --- |
| Current published passage | [Reader jobs](living-book-poc.md#reader-jobs-and-non-negotiable-outcomes) |
| Saved original history | [Reading a long life](return-and-journal.md#reading-a-long-life). The first POC limit is [POC Journal](living-book-poc.md#poc-journal-intentionally-modest). |
| Command identity | [Choice honesty](play-and-decisions.md#choice-honesty) |
| Waiting, denial, error, and an uncertain submit | [Denied, waiting, error, lost connection, and a stale offer](play-and-decisions.md#denied-waiting-error-lost-connection-and-a-stale-offer) |
| Scene expression | [Product promises](presentation.md#product-promises), bounded by [Visual hierarchy and ownership](design-system-and-expression.md#visual-hierarchy-and-ownership) |

Three limits hold across every row. Scene styling does not recolor system danger or focus. A generated synopsis does not replace the original published passage. An uncertain submit is not shown as success. A final palette, art direction, and an accessibility exception for fiction stay unaccepted.

## Non-negotiables

Reader rights, grouped by what the reader is owed.

**A situation, not a simulation dashboard**

- The character may be a person, microbe, distributed mind or something stranger (nonhuman lives are first-class). No mandatory body sheet, inventory, currency, map or tavern.
- No chapter model or compulsory plot structure. Scenes can continue through many choices; quiet periods are meaningful.

**Choices are intentions**

- A player chooses **intentions**, not guaranteed outcomes. The rules engine—not the UI or model prose—decides committed consequences.

**Time is accepted, not ambient**

- Fictional time advances only through **accepted commitments**, not merely because the browser is open or closed.
- A timed process may be interrupted; a result is not earned at its start. Never animate a false success.

**Truthful waits and states**

- Provider spending, generation outcomes and technical recovery need honest states and explicit consent where required.

**Honest demonstration**

- Portfolio honesty: the public demonstration must communicate the unique promise **without lying** about simulated vs durable behavior.

## Demo vs live

**Public `/demo` (authored prototype).** The route is an authored browser prototype (quiet interval, choices, consequences, chronology). It needs no sign-in or provider. Demonstration time advances manually; refreshing starts over. These controls explore presentation. They are **not** production rules for time or absence, and demo time is never real game time.

**Authenticated live stories.** A live story shows truthful waits against server deadlines (including Pause/Resume when controllable). Reloading must not restart an accepted wait.

## Human validation honesty

Landed UX/PX/PF portfolio work is **not** a claim that human UX comprehension is validated. New UI work still requires an owner-selected Change.
