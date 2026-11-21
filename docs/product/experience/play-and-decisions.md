# Play and decisions

**Owns:** the in-story interaction surface: what the player sees, chooses, and waits on. **Does not own:** mechanical resolution or Storyteller prose quality.

## Main view

Center on the current scene: evocative presentation, concise narration, the character’s situation and the interaction currently available. During a journey it might say estimated arrival; estimates change when circumstances change.

An illustration can establish atmosphere. It need not regenerate every sentence; a delayed image must not block play. Possessions, character details and earlier passages should be accessible without competing with the scene. A map is not required to understand every setting.

## Choosing

At a meaningful decision, present a small set of **distinct** contextual options. Cautious, direct, strange or deliberately inactive responses are allowed when they make sense. There is **no required universal number** of choices.

Selecting an option commits an intention. Show that it was received; do not leave an apparently clickable choice while its result is being prepared. Some consequences follow immediately; others begin an interval during which the player can leave.

**Negatives:** neither repeated clicks nor reloading should produce free rerolls, duplicate actions or endless regeneration. Rate limits protect resources but must not disguise whether a meaningful action is available. The POC uses pre-generated contextual options with no free-text gameplay intervention; free-intent paths remain explicitly deferred product design.

## Choice honesty

The Storyteller and the application authorize choices. The UI may organize and disclose them. It may not invent or remove meaningful action authority.

- The label names the attempt, not a promised effect.
- The current situation stays visible. Known duration, cost, interruption and apparent risk sit with the specific choice, without spoilers.
- Navigation and action look different. A submenu does not spend fictional time.
- One command is accepted per stable intent. There is no required number of choices.
- A “do nothing” control is a real wait, decline or acceptance, not a decorative extra button.
- Do not invent a “Use item” option or an “Other…” box that executes raw text. Free-form intention stays a future mechanic.
- The player never sees offer-path syntax or successor horizons in fictional seconds.
- Do not render every kind of decision as the same large card. Density follows the decision: a short reply, a local opportunity, a costly check and a running task are different.

## Waiting

Authenticated live stories at `/play/:id` show a saved journey wait against the server deadline, including Pause/Resume when the interval is controllable. Reloading does not restart that wait. Agency between offered decisions needs deliberate limits—the player should understand whether they can change course now and what that means.

See [time and autonomy](../gameplay/time-and-autonomy.md) for when fiction advances; this doc owns only the player-facing honesty of the wait UI.

## Denied, waiting, error, lost connection, and a stale offer

- **Denied.** A blocked or unauthorized intention stays visibly not accepted.
- **Waiting.** A received intention shows that it was received. The waiting label is not a completed world consequence.
- **Error.** Validation failure, provider rejection, timeout, and uncertain billing stay different states. Creation uses the same split in [Create the opening](entry-and-onboarding.md#creation-information-architecture).
- **Lost connection.** The last published passage remains readable. A missing response is not a new success.
- **Stale offer.** A choice from an older situation is not the current command. Reloading does not turn it into a second accepted action.
- **Uncertain submit.** An uncertain submit stays uncertain. It is not presented as success.

Command identity stays in [Choice honesty](#choice-honesty). The current passage stays in [Reader jobs](living-book-poc.md#reader-jobs-and-non-negotiable-outcomes).

## Terminal access is a second presentation, not a second authority (selected future CL01)

A player may eventually choose a terminal-based client to read scenes, choose offered intentions, see waits and held states, inspect history, fork a saved scene and resume. **The Web remains the primary interface.** Terminal is a distinct input/rendering presentation over the same authenticated public StorySnapshot and command/receipt APIs, with no private Writer prompts, SQL rows, provider secrets, or alternate fictional clock. Campaign nested options are exploration until an action-bearing leaf commits; interaction responses preserve the existing frozen operationId, digest and expectedRevision. After ambiguous network failure, recover the same operation instead of inventing a second action. Browser-approved story-only device pairing is the intended sign-in path; copying a browser session cookie or granting Admin rights is not acceptable. Machine-readable JSON is only the authorized player view, enabling coding agents to verify real play without DOM automation. **This is a selected unimplemented target, not evidence of a working terminal client.** [CL01 Change](../../../work/changes/open/2026-11-22--cl01-terminal-player-client/CHANGE.md).
