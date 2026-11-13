# Interaction grammar | intentions, offers, actions and commitments

**Status:** recommended player-facing semantics. **Game authority:** [concepts](../../concepts.md), [gameplay](../../gameplay.md), [D&D rules](../../game-rules.md), [execution](../../technical/execution.md). This document changes no mechanics by itself.

## Four different things a control can do

| UI interaction | Effect on game time | Player-facing language | Example |
| --- | --- | --- | --- |
| **Explore / inspect** an offered possibility, relevant item, journal or menu | None | “Look at the options,” “Inspect pack,” “Back” | Expanding the tavern opportunities |
| **Propose** a custom interpretation (future) | None until accepted | “Try something else,” then reviewed interpretation | “I want to lure the guard outside” |
| **Accept** a finite action or timed commitment | Its admitted duration is authoritative | Verb-led, with known wait/risk/cost | “Ask about the seal,” “Repair the beacon” |
| **Control** an already active commitment | Changes state only under supported rules | “Pause journey,” “Change course,” “Resume repair” | Suspending work without losing earned progress |

Never implement all four as identical “Select / Continue / Submit” buttons. A button that only expands a menu must not imply it spent time. A typed command must not be executed as freeform SQL on the world's canon.

## Scene action area

Present a concise **What will you do?** region after the current relevant narration. Distinct options, not a compulsory fixed three or four; each must have a meaningful verb and different intent. The Storyteller might offer one, six grouped into two directions, or none. High-pressure situations promote only urgent relevant options; ordinary local life can show reusable opportunities.

An action card may include:
- **Intent:** what the character attempts, not what the Storyteller promises will happen.
- **Known commitment:** “A few moments,” “About 3 hours in the world / ~20 minutes here,” or “Begins ongoing work.” Exact language depends on admitted rules and pace.
- **Known stakes:** resource payment, visible known risk, possible interruption or required prerequisites. Hidden facts and secret DCs are not leaked.
- **Action type:** menu exploration (no time), immediate attempt (time may still pass), long commitment, or deliberate wait.
- **Eligibility:** explanation if disabled for a known reason. The UI must not fabricate actions simply because prerequisites are present.

Avoid stacking identical secondary labels on every card. Show detail only when it helps choose between options. An ordinary dialogue should not read like a legal contract.

## Confirmations only where stakes warrant them

- Low-cost, ordinary authored immediate action: selecting may commit directly once command acceptance is unambiguous.
- Major commitment with real wait, known risk, irreversible cost, interruption of existing work or spending implications: review a **small confirmation sheet** explaining *what will start* and how/when the player can intervene.
- No confirmation for inspecting, opening a sub-menu, browsing history or returning from Journal.

Never show confirmation merely because it is easy to implement a modal.

## Hybrid free intention (future feature; not current POC)

**Why:** an AI DM restricted forever to a dozen pre-authored buttons falls short of the creative fantasy. **Why not simply add a textbox:** model interpretation, rules admission, invalid intent, payment, safety and reentry are hard product contracts.

Proposed two-stage design:
1. Player chooses **Try something else**; a brief composer opens with situational guidance and a visible boundary: “Describe what you want to attempt. Outcomes are decided by the world.”
2. The system privately interprets the proposal into a *possible* bounded action or asks for a necessary clarification. This stage **does not spend fictional time or mutate canon**. Show the interpreted intent, known commitments and uncertainty.
3. The player **Accepts this attempt**. An immutable idempotent command goes to rules admission. If unsupported or impossible, show why and preserve the input for editing. If admitted, execute and preserve the committed receipt as usual.
4. After uncertain acknowledgment, recover the existing operation; never silently reinterpret and charge again.

Constraints:
- “I kill the king instantly” is an attempted intention, never an accepted guarantee.
- Text cannot add permanent facts, author NPC opinions, spend someone else's currency or retcon history.
- No open custom input during an incompatible decision hold, background commitment or shared-player conflict without a specifically designed rule.
- Secret information stays secret. Invalid suggestions are handled with constructive, world-appropriate feedback, not technical JSON.
- Rate limits, generation allowance and malicious input handling need their own explicit budget/security design; this is **not ready for Cursor implementation** merely because the UX is now described.
- Accessibility: preserve the draft, make the interpretation review navigable and provide text alternatives to stylized icons.

**Alternative to research:** limited intent templates with slot filling may be cheaper and more predictable than arbitrary text for the first supported custom-intent iteration. Test real utterances before deciding.

## A rapid conversation

One scene may contain many passages and intentions. Keep a readable narrative rhythm: new passage, coherent action group, committed outcome, next relevant passage. Do not append dozens of chat role bubbles and scroll to the bottom automatically if the person is still reading above. Each action may consume supported fictional time, but animation latency and reading do not.

Meaningful emotional/social choices are legitimate even without a new inventory effect. A tragic inevitability is not an excuse to offer three fake “avoid tragedy” options.

## A quiet situation

Prepare locally relevant opportunities such as inspect, repair, rest, visit or wait. One choice may open another choice group without spending time; a real repeated task needs admitted rules. Repeated content should be compact and recognizably repeatable, not identical long prose or a stream of generic “Day passed” cards.

An explicit **Wait / Observe / Do nothing for X** action has real game semantics only if admitted. The absence of player input is *not* a wait action. A story with no active commitment is **not progressing**.

## A long commitment

Before accepting, show estimated real wait (when meaningful), fictional work or travel, existing commitments affected, permissible interruption behavior and possible unknown events without spoilers. During progress, present **what has been achieved**, **what remains uncertain**, and **what will happen when an event requests attention**.

Never display predicted pay as already owned, projected position as current location, or a future scene as already canon.

## Visible dice and uncertain outcomes

When a check has settled, show a small result annotation with optional detail: purpose, committed dice result, modifiers and consequences, subject to information visibility. A reveal animation may *celebrate a saved roll*, not randomly spin until reaching a chosen face. Group routine checks into a summary, with inspectable underlying records. Do not reveal secret DC or hidden encounters.

## Asynchronous acceptance

The interaction state sequence is **available → submitted (local) → acknowledged/admitted → settling or ongoing → published/settled**; sometimes an uncertain acknowledgment requires recovery. Do not replace the scene with a spinner when the old scene and submitted intention remain useful context.

- On submission, freeze the intended command and stop second clicks, without pretending success.
- A 202 or transport acknowledgment is not completion; describe the actual known phase.
- On conflict, refresh the canonical scene and explain that the chosen option changed; do not replay a stale choice.
- On failure after mechanics committed, preserve their outcome while clearly identifying failed narration.
- Loading must not send another command.
- The only way to undo a world effect is through a supported new in-world action, not client back navigation.

## Anti-examples (reject in design review)

- “Pay 6 septims” displayed immediately after starting a shift.
- “Continue” at an arrival that already has an authorized next activity.
- A list of six disabled controls with no explanation instead of one relevant action.
- A choice promising a specific success or hidden encounter before a roll.
- Text input that treats player statements about the world as authoritative facts.
- An instant “Skip travel” that bypasses an earned-time contract while retaining rewards.
- A retry that duplicates paid generation or a settled mechanical receipt.

## Negative acceptance scenarios

Two fast clicks accept only one immutable action; switching stories cannot submit stale options; browser back from a menu incurs no game time; one failed roll cannot be re-animated as a new roll; a paused job preserves progress and cannot still display “working”; a custom-intent proposal never changes state before explicit acceptance.
