# Notifications and re-entry | the game contacts a person, not a telemetry system

**Status:** product UX destination and **future infrastructure dependency**. Original product [vision](../../vision.md#the-experience-on-screen) includes offscreen updates and one eventual channel. Current technical [notification design](../../technical/notifications.md) and [time/autonomy](../../time-and-autonomy.md#notifications-and-reliability) govern mechanics; this file defines what the **player** should receive and how clicking a notice behaves.

## The product problem

An offscreen game must let the person **leave it alone**. If the browser constantly demands attention, it is not really offscreen play. If important interruptions go unannounced, users may believe their approved plan continued while the game was held. Notifications should close that trust gap without becoming a slot-machine nudge system.

**Every message must report a real committed development or a real need for an action.** No speculative “your character might be in danger” sent from an unpublished Storyteller candidate.

## Three notification classes

| Class | Trigger | Player value | Typical priority |
| --- | --- | --- | --- |
| **Decision** | A valid current decision was published and your response is needed | Return and exercise agency | High if a real deadline exists; otherwise ordinary |
| **Meaningful development** | A supported accepted activity/plan finished or a significant event was committed | Know what changed | Normal |
| **Service/allowance issue** | Required continuation is blocked, or a committed action's narration needs recovery | Know why progress stopped | Operational, not fictional drama |

**Never send a message per scheduler tick or activity roll.** A ten-hour journey may have many checks and zero messages until a real event or completion requires notice.

## Message contract

A useful notification can answer:
- **Which story?** Human-readable identity the player recognizes.
- **What is verified?** “Your journey has stopped at the pass” versus “Something mysterious is happening.”
- **Does it need action?** “A decision is waiting” distinct from “You may read the report.”
- **When is it due?** Real response deadline **only when actually admitted**, with locale/time-zone clarity.
- **Where will the link lead?** The **current authorized Now** state, not an old interactive command.

The message **must not contain a secret event that was not published** or sensitive private story text in lock-screen previews by default. Personal users may choose more detailed previews through an explicit setting.

## Sample messages, with truth conditions

**Decision (published, indefinite hold):**  
“Greywake · A stranger has interrupted your repair. Your decision is waiting.”  
No urgency countdown, because the solo scene has no deadline in the current default.

**Decision (future eligible deadline):**  
“Greywake · Your response is needed before 20:30 local time. After that, the approved fallback will apply.”  
Must actually have a supported deadline, fallback and clear time zone.

**Completed work:**  
“Greywake · Beacon repair finished. Your recorded result is ready.”  
Only after **actual** settlement; not merely when ETA reaches zero.

**Optional report:**  
“Greywake · A report on the road patrol is available.”  
Cannot pretend this is a new controlling choice or halt all other authorized work.

**Provider blocked:**  
“Greywake · The Storyteller could not finish the next scene. Your committed progress is saved.”  
Only if the server truly knows the receipt/progress is preserved.

## Notification preference architecture

Separate controls for:
- **Channels** (where supported: email, app, push, messaging).
- **Types** (decision, significant result, service issue).
- **Quiet hours** (when to contact the human).
- **Preview privacy** (generic versus detailed).
- **Digest frequency** (if later supported).
- **Game autonomy and deadlines** (NOT notification settings).

**Critical invariant:** silencing a channel does not make the game safer or the story pause. It changes communication only. If someone wants to avoid a dangerous unattended event, they must adjust an actual gameplay policy or pause where supported.

## Delivery truth and stale links

- An old notification links to a **verified current situation** via authenticated story identity.
- If the decision already resolved, show what happened and a factual “This moment has passed.” Never resurrect the option or replay the old action ID.
- Duplicate delivery doesn't create another scene/event.
- A late message does not imply the story paused until delivery; the server is authoritative.
- A user with a signed-out or expired session can authenticate and safely return to current Now.
- A notification after account/story deletion cannot expose private text through a stale link or archived push payload.
- A viewer no longer authorized for a shared story must not continue receiving private updates.

## Re-entry from a notification

**Decision:** navigate directly to Now, show verified current scene/action group and a short context line: “Your repair was interrupted at 3/9.” If there is a return digest, keep it compact so it does not hide the actual decision.

**Report:** navigate to relevant Journal entry or Now with a factual acknowledgment. If currently in a newer urgent decision, favor current Now and link the old report.

**Problem:** navigate to the appropriate exact recovery state without generic Retry that may resubmit paid work.

**Clock update:** no notification needed. A client can refresh derived displays through normal authenticated GET/SSE when viewed.

## Privacy and trust

A lock screen can be visible to others. Default to **story title + general state** rather than private romance, politics, medical descriptions or specific mature narrative plot. Allow explicit opt-in for richer previews later. Avoid sending raw model text, hidden checks, provider identifiers, account balance or detailed plot twists into untrusted push payloads.

A party member's notification can reveal only information they are authorized to see. "Your friend chose to betray you" is an obvious spoiler/privacy leak if the result has not been published to that viewer.

## Experience evaluation

Test a full offline interval with:
1. No commitment: **no** invented activity notification.
2. Quiet repair: one completion message at actual settlement, not per check.
3. Interruption: one decision message tied to a valid published offer.
4. Old link after scene changed: current truth and source, no stale choice.
5. Notifications off/quiet hours: contact changes, world policy unchanged.
6. Multiple devices: duplicate delivery but one settled action.
7. Logged-out/other viewer: no private cross-account leak.
8. Blocked generation: specific service explanation and saved progress.

**Success:** the game can disappear from the person's attention for hours and still be trusted. A high notification open rate is not evidence of healthy offscreen play if the messages are noisy or manipulatively urgent.

## Engineering boundary

This file does **not** authorize email/push integration or background jobs. A future code Change must choose a supported channel, use the existing outbox/commit identity, enforce viewer privacy, respect budget/spending policy, and test idempotent delivery. An automation or reminder is not a substitute for canonical in-game event notification semantics.
