# Autonomy and absence | let life happen without turning the player into a scheduler

**Status:** target interaction with **future engine-dependent portions**. Clock authority remains [time-and-autonomy](../../time-and-autonomy.md). Some accepted-plan support exists in the current contracts; comprehensive default responses and notifications are not demonstrated.

## Five independent policies, one understandable product

| Policy | The player should understand | Not secretly bundled with |
| --- | --- | --- |
| **Current committed activity** | What work/travel/rest is authorized to continue | General character freedom |
| **Absence horizon** | How long or until what boundary the accepted plan may continue | Infinite time advancement |
| **Event response behavior** | Whether danger/questions stop for me or use a specifically authorized fallback | Notification frequency |
| **Storyteller initiative** | How proactively developments emerge within accepted rules | Automatic control of my character |
| **Pause and contact** | Whether I manually pause, and when I get notified | The game deciding to resolve a threat |

Do not reduce all five to one “Autonomy: On/Off” toggle. Such a toggle is simple to implement and impossible to trust.

## A player-friendly acceptance pattern

At the end of a quiet scene or activity choice, offer **Continue while I’m away** when eligible. A compact sheet translates permitted rules into a natural intention:

**Plan:** “Rest, then patrol the village road until dawn.”  
**Stop:** “At a decision or if your condition becomes unsafe.”  
**Limit:** “Up to 8 fictional hours under this story’s pace.”  
**Control:** “You can check progress and pause if the current rules permit.”  
**Response:** “You will be asked before your character makes a consequential decision.”

These are **illustrative values**, not universal limits or promises that all stories have dawn, roads or health bars. Plans are finite, conditionally admitted and revalidated between steps. The ability to set a horizon must come from an actual rule.

This is not a six-row cron form with trigger, webhook, retry policy and process ID. The advanced inspector may expose precise terms, but ordinary play should remain narrative and comprehensible.

## Player absence scenarios

### A. No accepted commitment

The world does **not** tick merely because the browser is shut. Returning says “No activity was underway.” This prevents the game from silently burning all resources or inventing consequences.

### B. Accepted quiet work

The character continues supported work through admitted boundaries. No page poll, extra LLM call or click is needed per hour. On return, show actual earned progress, costs and events. If it finished quietly, the game should not require a mandatory narrator turn just to mark completion.

### C. Event needs attention

An interruption stops incompatible work at a committed boundary. If no default response was authorized, the story holds and asks for a decision. Returning should lead straight to the event, with preserved previous progress.

### D. Approved fallback (future)

A character may choose according to a specifically declared absence policy, but only when a supported response option/default exists and the deadline/authority permit it. The UI should show, before leaving, what could be chosen on the player's behalf. “Let the Storyteller decide anything” is not a safe default.

### E. Expired horizon

Stop at the agreed limit. Do not silently chain new activities, regenerate entire plots or run idle world time. Clearly show “Your plan ended. No activity is underway.”

### F. Spending exhausted

Optional reports can wait if rules allow the active routine to proceed; a mandatory interpretation hold must stop the affected continuation. Resuming a provider budget must not override manual pause or quietly charge an overage.

## Attention and notification policy

Notifications report *real committed developments or needed decisions*, not system polling. Distinguish:
- **Update:** “Your patrol ended; here's what changed.” No urgent action.
- **Decision:** “An event is waiting for your answer.” Include real response deadline/default only if admitted.
- **Issue:** “The Storyteller could not continue this part of the story.” No misleading danger alarm.

Notification presence never implies time progresses in an otherwise idle story. Quiet hours alter contact, not character danger or autonomy. Old links must resolve to the current situation rather than a stale action.

## Control copy and semantics

| Situation | Allowed phrase when true | Dangerous alternative |
| --- | --- | --- |
| Active task and control permitted | “Pause repair” | “Cancel” if this merely suspends |
| Active task cannot stop until boundary | “Change course after next safe point” when rules support it | “Stop now” that lies |
| Manual pause | “Resume story” | “Restart,” suggesting lost progress |
| Suspended work | “Resume repair: 3/5 earned” after revalidation | “Repair again,” losing identity |
| No active plan | “Choose your next intention” | “Continue living,” implying an invisible agent |
| Pending future leg | “Next: patrol (conditional)” | “Patrol scheduled: guaranteed” |

## Consent and risk edge cases

- A player authorizes a patrol but not auto-combat: a threat requires a hold if no safe authorized fallback is defined.
- A solo story allows pause. In shared play the same visible control may be unauthorized; do not invent “global pause” by role assumption.
- A player changes pace during an approved plan: rules decide if/how its real deadlines move; the review should describe that.
- A second plan is proposed while incompatible work exists: explain suspension/abandonment semantics before committing.
- Storyteller intensity changes: do not treat it as permission for the character to act independently.
- No action is active, but “Storyteller initiative high”: this alone does not advance the clock.

## Research before a general autonomy expansion

Test three policies with unfamiliar players: **stop at every decision**, **continue bounded routine but stop at decisions**, **allow narrowly pre-approved fallback**. Ask what users expect after a day away and compare it to actual state. An autonomy UI is successful when user expectations match backend behavior, not when it has fewer toggles.

**Implementation gate:** any broader autoplay/default response, horizon or pause scope needs new versioned rule/command contracts and failure tests. Do not let a visual design Change invent them.
