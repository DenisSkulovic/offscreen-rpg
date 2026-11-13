# Gameplay mechanics reassessment | keep the promise, challenge the machinery

**Status:** product-design review and **recommended future changes**. Existing mechanics are not automatically ideal because they are implemented. This document changes no rule contract or runtime by itself.

The engine's mechanics should serve **lived consequence and believable agency**, not become the UI's subject. The original fantasy is not a job simulator, not a digital character sheet and not an endlessly improvising AI chat. It is an inhabited story where real effort has weight.

## Preserve these foundations

| Foundation | Why it matters | UI implication |
| --- | --- | --- |
| Intention ≠ outcome | No narration or player sentence can grant success | Use attempted verbs, show committed receipt/results |
| Real waiting for earned commitments | Rarity and attachment come from time and effort | Clear real-time waits and honest milestones |
| Authoritative deterministic checks | A failed roll must remain failed | Saved-roll inspectability, no fake rolling |
| Durable continuity | People, objects, relationships and choices survive | Source-linked Journal and return |
| Relevant rather than exhaustive worlds | The fantasy does not need 10,000 simulated NPCs | Contextual World space, no census |
| World-neutral engine | Microbe, sentient cloud, prisoner or ship pilot all belong | Conditional sheets, no universal map/economy |
| Bounded cost and control | Unbounded paid inference is not a game mechanic | Separation of in-game action and provider allowance |
| A quiet life is valid | Not all stories are an endless combat loop | No surprise quota or compulsory quest list |

These are **experience invariants**. Their current exact implementations can still change if a better rule preserves the promised result.

## Challenge 1. Does a menu-only player have enough agency?

**Current:** pre-generated contextual actions; no free-text gameplay in POC.  
**Risk:** the game feels like clicking a branching novel authored by an LLM, rather than inhabiting an imagined world.  
**Recommendation:** keep authored options as discoverable safe defaults but plan bounded **custom intentions** as a separate game contract, not a textbox patch. See [free-intent design](../patterns/free-intent-future.md).  
**What could weaken this recommendation:** tests where most players prefer the clarity of choices and custom attempts cause excessive rejection/cost. A template-first middle ground may win.

## Challenge 2. Does “ordinary life” become meaningless repetitive clicking?

**Current direction:** prepared local life and repeated authorized activities can run without fresh generation.  
**Risk:** “Fish → wait → collect fish → fish again” becomes a chore treadmill. Real time alone doesn't turn bland content into meaning.  
**Recommendation:** make repetition a **relationship with the world**, not a loop of button presses. Routine should be efficiently renewable within rules; results should be compact; exceptional moments gain distinction because of contextual consequences, changed relationships, risks or remembered choices. The Storyteller may stay quiet for days; quiet should feel intentional rather than empty product design.

Do not invent mandatory rewards, quest chains or constant dramatic interruptions. Evaluate a full simulated week of ordinary life before adding routine types.

## Challenge 3. Is the pace model undermining earned progress?

The docs allow faster/instant pace in supported configurations. For a solo sandbox, that may serve experimentation; for “walk for ten real hours to reach Gnisis,” it weakens the very proposition that effort makes gains precious.

**Recommendation to evaluate:** two **clearly labeled experiences**, not hidden timers:
- **Earned-life pacing:** realistic-feeling elapsed effort as a central promise; changes explained and possibly bounded/fixed per story.
- **Exploration / showcase pacing:** deliberate faster experimentation, explicitly not the same emotional achievement contract.

This is a proposed product choice, **not** a change to the existing pace schema. If acceleration exists within a running life, show how it affects expectations and avoid claiming equal long-term stakes across radically different modes. Do not implement hard restrictions without testing the actual appeal of slow time.

## Challenge 4. Can I truly leave and the character still live?

The maintained contract correctly **does not advance an idle world without authorized action**. But the original promise “life continues while away” demands that authorization be *pleasant and easy*, rather than building a scheduler with a queue editor.

**Recommendation:** plain-language bounded routines and explicit “while away” behavior. A player can commit to “Rest, then resume patrol until morning; stop if danger needs me” without learning workflow syntax. Character autonomy at decision points is separately consented to, not inferred from active work. See [autonomy/absence](../patterns/autonomy-and-absence.md).

## Challenge 5. Is every action worth a new narrator turn?

No. A known routine should resolve quietly unless rules/Storyteller policy call for narration. Conversely, a tense encounter may deserve several rapid, developed passages without an activity screen between each. This is already a strong direction in [gameplay](../../gameplay.md). The UX must protect it by using **different composition for rapid presence versus long waiting**, not by imposing one mechanical form.

## Challenge 6. Is “interesting” being mistaken for “always dramatic”?

The Storyteller can be proactive, but its creative profile is not permission to force an event every interval. Quiet domestic stories, farcical worlds and frightening survival scenarios all need different rhythms. Initiative, danger, pace and canonical invention are independent. Avoid a universal threat meter or “engagement algorithm” that secretly turns up danger when the user hasn't clicked.

## Challenge 7. D&D foundation vs universality

D&D-style checks are the baseline, but must not imply humanoid values apply to a sentient cloud. A readable **You** space can show only abilities relevant to the current form; unavailable actions are *inapplicable*, not failures with a fabricated score. Mechanics may need alternate supported abstractions for unfamiliar worlds while retaining deterministic rule authority.

The UI should make the game feel grounded without exposing a spreadsheet of six stats beside every poetic line.

## Challenge 8. Does persistence create understandable stakes or merely friction?

If something takes hours, a mistake or loss can matter. But hidden irreversible penalties or silent delayed outcomes will feel unfair rather than meaningful. Before a long/high-stakes commitment, explain **known** duration, resource risk and intervention controls. Uncertain narrative danger stays uncertain. Reward uncertainty is fine; obscuring whether an accepted action is still ongoing is not.

Death or permanent loss remains a *captured campaign risk policy*, not a UI designer's surprise. Current connected POC risk is nonlethal; the final UX should support future risk variants without pretending they exist now.

## Challenge 9. Story agency under future multi-player conditions

Solo holds, instant choices and pace changes are easy compared with shared fictional time. Do not generalize solo UI controls to “Pause everyone” or “Choose for your friend.” An invited friend should control only their own character; any shared progression policy needs distinct owner/participant authority before the interface offers it.

## Mechanic priorities and decisions

| Priority | Product question | First evidence | Resulting work |
| --- | --- | --- | --- |
| P0 | Can someone tell actual progress from forecast? | Work/interruption user tests | Now/time projection UX |
| P0 | Can a new player understand and accept one action? | First-play task | Choice/commitment UX |
| P0 | Does returning reveal authentic continuity? | Absent-day fixture with receipts | Journal/return UX |
| P1 | Can unattended life be authorized without a workflow editor? | Bounded plan prototype | Autonomy policy + potential engine change |
| P1 | Do curated options feel sufficient? | Free-intent studies with real utterances | Separate custom-intent engine proposal |
| P1 | Is slow pacing attractive in repeated play? | Several-day rehearsal, honest opt-in | Pace presentation and rules decisions |
| P2 | Is a map useful enough for varied settings? | Spatial vs abstract story tests | Optional world map experiment |
| P2 | Can groups share time without incoherent choices? | Multiplayer rules prototype | Separate shared-game design |
| P2 | Does richer visual/sound ambience improve comprehension? | Quiet, tense, nonhuman prototypes | Conditional art investment |

**Decision boundary:** “Recommended” is not approved new game behavior. When an experience recommendation contradicts [gameplay](../../gameplay.md), [time](../../time-and-autonomy.md) or a typed contract, first author an explicit product/rules decision and its normal/negative acceptance. Cursor must not change mechanics while implementing CSS or choosing an icon.
