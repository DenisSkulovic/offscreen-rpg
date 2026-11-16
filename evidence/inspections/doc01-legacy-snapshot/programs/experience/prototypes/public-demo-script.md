# Greywake: an original 90-second public demonstration script

**Status:** scripted demo **design content**, not current code, provider proof or a new game rule. May be used as original text content when UX09 is authorized, after editorial review. This authored fiction is intended to demonstrate **intention → admitted work → committed milestone → interruption → return**. No unlicensed franchise characters, maps or art.

## Purpose and strict truth boundary

The public visitor needs to *experience* what makes Offscreen RPG different before sign-in. However a true ten-hour commitment cannot be honestly compressed into 90 seconds in real play.

**Permanent visible context label:** “Interactive preview · time is simulated here · resets when refreshed.” This label is visually secondary but accessible at any point. The sample is finite and locally scripted; it **never claims to be a live AI Storyteller or persistent authenticated world**.

Do not call it “Play Offscreen RPG for free” if it's only a rehearsal. A later true sandbox/trial is a separate, explicitly cost-bounded architecture.

## The story premise

Greywake's harbor lantern has been unlit for four nights. The player is its temporary keeper. A folded notice, sealed with the harbor-watch mark, sits beside the damaged mechanism. Someone below is coming up the stairs. The repair takes time; the paper and the visitor might matter.

Tone: restrained coastal mystery, not a manufactured cliffhanger every sentence. No need for fantasy combat, universal character sheet or physical map.

**Public visible facts at entry:** signal lantern unlit, mechanism damaged, folded notice present, stranger not yet visible.  
**Private scripted events in demo:** a visitor arrives at a predefined simulated work milestone; their claim may be examined; outcomes depend on earlier inspection. These are **fixture script conditions**, not general model intelligence.

## UX opening (screen D0)

**Situation:** THE GREYWAKE LANTERN · late afternoon · nothing underway.

> The lantern above Greywake has been dark for four nights. Your hands smell of oil from a failed repair. From the landing you can hear the harbor bell counting boats home.
>
> A folded notice lies on the workbench, still sealed. The glass housing is open, and the damaged gear can be reached without taking it apart again.

**Primary offered intentions:**
- **Begin repairing the lantern** — an extended task; progress depends on successful work.
- **Read the sealed notice** — a brief inspection; no work progress.

**Decision rationale:** player can choose *time investment* or *information*. Both are meaningful, and neither guarantees success. Avoid buttons named “Option A” and “Continue.” The layout should make current situation and actions readable with no art.

## D1A | repair first

On selection of **Begin repairing**, present a compact confirmation only if the prototype demonstrates a meaningful long commitment; otherwise accept directly with known stakes.

**Accepted scripted state:** repair work A starts at 0/9. A simulated passage of time is a **separate user action explicitly labeled “Jump to next moment in this preview.”** It is never an accelerated real game action.

After the simulated first work check:
- Repair A = **3/9 earned** (fictional script; not a real D&D roll unless an actual recorded fixture says so).
- Time progressed under demo simulation.
- The visitor is approaching; full work completion did not occur.

**Status display:** “Repairing the lantern · 3 of 9 work units earned. This preview advances to meaningful moments, not real time.”

### D1B | notice first

On selection of **Read the sealed notice**, display this authored passage:

> The paper gives way at the crease. Under the harbor-watch seal, the message is short: *Do not light the lantern until the evening patrol has inspected the passage.*
>
> No signature follows. A pencilled note at the bottom reads: *Ask the watch why.*

**Recorded scripted fact:** notice-read=true. The UI shows “You know what the notice says” as remembered evidence; it does **not** create a permanent item transfer or consume work time unless the authored attempt specifically declares it.

Then offer **Begin repairing the lantern** and **Leave the mechanism untouched**. If the player begins repair, the same D1A work milestone is used. If they leave it untouched, the stranger arrives with work A absent; the later scene must **not** show fabricated 3/9 progress. This gives an honest branch that affects the return digest.

## D2 | the visitor arrives

**Narration** (slight variation by current work state):

> Someone stops at the top of the stair. Water runs from the stranger's coat onto the stone. “Still dark,” they say, looking past you at the open lantern. “That may be for the best.”
>
> They wear the dark band of the harbor watch. It could be genuine. Their hand stays carefully away from the workbench.

**If repair active:** work A **interrupts**; 3/9 earned units remain stored; no reward.  
**If no repair started:** there is no fake interrupted progress card.  
**Current decision:** 
- **Ask why the lantern should stay dark.**
- **Inspect the stranger's watch mark.** (An uncertain attempt in a live game; in the scripted preview, preauthored result)
- **Send the stranger back to the stair.** (An attempt, not guaranteed physical compliance)

**When notice-read=true:** add a grounded contextual reference or a distinct option **“Show the written order.”** Do **not** show that choice if the paper was never read and the character has no compatible knowledge/authorization. This is the small *memory payoff*.

**Avoid automatic disclosure:** the visitor's claim may remain ambiguous. The goal is to demonstrate that the game remembers what the player actually learned, not that every mystery resolves in 90 seconds.

## D3 | a consequential response

Two coherent scripted branches suffice for the short demo:

### Branch: Ask why

> “Because someone has been sailing without a light,” the visitor says. “That part sounds simple until you ask who needed the darkness.”
>
> They glance at the folded notice. “Did you read that?”

Record that the visitor spoke; offer an optional short follow-up and then move toward return preview. Do not invent that the watch is truthful or that the mystery is solved.

### Branch: Show the written order (only if known)

> You place the note between you. The visitor reads it once without touching the seal.
>
> “Then you already know this came before I did,” they say. They step aside from the workbench, but they do not leave.

Record their reaction and changed position. Do not imply all danger is gone merely because the visitor physically moved. The earlier notice choice has altered the scene, even though a broader plot is not yet resolved.

**In either branch:** the preview can show how a resumed commitment would appear *if it were reauthorized*. It must never start repair automatically unless scripted rules/fixture explicitly allow it.

## D4 | simulated absence and return

Show a small explanation: “In a real story, a permitted activity can continue while the browser is closed. This preview will now jump to the next meaningful saved moment.”

A button **“Preview returning later”** moves the demo through a chosen **simulated** interval. The return is accurate to the branch:

- If repair started and was interrupted: “Repair reached 3/9, then stopped when someone came upstairs. Your earlier work is preserved. The stranger's question still needs an answer.” No reward and no completion.
- If the notice was read: “You learned that the harbor watch ordered the lamp dark. That knowledge changed what you could ask.” Show the prior source passage link inside the scripted Journal preview.
- If no work started: “No repair work was completed. The lantern remains dark.” No fake work meter.
- If a later scripted resolution is offered and accepted: clearly distinguish an **admitted new action** from retroactive grant of work.

**Final frame:** the current situation remains open and relevant; optional short line “In a persistent story, this is where your saved life would continue.” Clear actions: **Create a persistent story** (only if real creation route works), **Replay preview**, and **How earned time works**. No claim the preview has authenticated server persistence.

## Navigation and time constraints

- Aim to reach first action immediately after the title/premise; human test target under ~45 seconds to engage.
- The entire sample can be completed in roughly 60–120 seconds by skimming; no hard 90-second countdown. Reading time is free and not artificially charged.
- A “Jump to next meaningful moment” is allowed only **within the labelled scripted demo**, never in an authentic earned-life game with committed time.
- The preview supports Back for UI navigation but **not world undo** unless Restart is used. Branch state is local to this scripted rehearsal.
- Refresh resets sample and tells user so. Browser-only behavior must remain clearly distinct from server persistence.
- Preserve keyboard focus and announce new passages politely without forced scroll.
- Keep narration/choices visually separated even in high contrast and without any illustration.

## Script state matrix

| Step / local input | Known scripted facts | Primary presentation | Dangerous false implication |
| --- | --- | --- | --- |
| D0 none | lantern dark, notice present | quiet landing + 2 distinct choices | repair already running |
| D1A repair → preview jump | A=3/9 earned | real-time simulation label + earned milestone | finished/rewarded |
| D1B notice | notice-read | note passage and different future option | reading note repairs lantern |
| D2 visitor | stranger present; A held if started | interrupted / decision scene | work still progressing |
| D3 ask | claim spoken | consequence narrative | claim confirmed true |
| D3 show letter | notice-read required; reaction | changed encounter | visitor definitively friend/foe |
| D4 return | factual branch history | digest and current decision | live persistent server state |

## How this changes when promoted from script to live product

A genuine Storyteller/rules implementation would require immutable offers, actual rules admission, action duration, accepted process identity, settled d20/receipts if relevant, model narrative constrained by effects, canonical entity/item/fact provenance and a real re-entry cursor. None can be asserted by the scripted demo. The demo communicates the **vision**; a separate real-play sample must prove the runtime.

## Editorial review before any code

Read every passage aloud. Cut empty atmospheric filler. Confirm no contradictory physical state (visitor at stair vs workbench), no implausible guaranteed trust outcome and no false time claims. Show two unfamiliar players both branches: can they articulate **what the game remembered** without an explanation? If not, strengthen the actual branch consequence rather than adding a tutorial tooltip.

**The portfolio promise is experiential:** a small action today should matter tomorrow. The script should earn that claim, not just announce it.
