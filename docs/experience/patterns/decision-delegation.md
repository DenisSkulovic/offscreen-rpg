# Decision delegation | personality with permission, not unsupervised AI control

**Status: future gameplay + UX design, NOT APPROVED FOR IMPLEMENTATION.** Source of product intent: [vision](../../vision.md) (“unanswered choices normally lead to an autonomous response”). Current authority: [time/absence](../../time-and-autonomy.md#response-windows-and-absence) (first solo slice holds decisions indefinitely, timed defaults separate); [character control](../../player-experience.md#playing-with-friends). Do not confuse desired future behavior with current runtime.

## What the player is asking the game to do

**“When I am away, let my character act consistently with the personality and limits I approved, but stop before a decision I would actually want to make.”**

The goal is a more believable autonomous life, not an excuse to turn the player into a bystander or let a model choose irreversible behavior at its whim.

## Four separable questions

| Policy | Player-facing question | Example | Cannot be conflated with |
| --- | --- | --- | --- |
| **Whether a decision can expire** | “How long should the story wait for me?” | Indefinitely / a specified supported real window | Fictional action duration |
| **Which choices may be delegated** | “What may the character decide without me?” | Decline trivial offers, seek cover when eligible | Storyteller narrative initiative |
| **How a fallback is selected** | “Based on what stable preference/rule?” | Cautious profile prioritizes avoiding unnecessary injury | Unbounded unconstrained model prose |
| **When to stop regardless** | “Which events always need me?” | Serious injury, permanent loss, controlling another player | Notification preference |

You cannot build a trustworthy autonomy experience with a solitary **Auto on/off** switch.

## Initial policy candidates and recommendation

### Option A. Indefinite manual hold (current safe first solo)

A relevant decision pauses affected fictional time until the player responds. No game-time spending while deciding. **Strength:** perfect agency and safety. **Weakness:** the character appears inert during long absence.

### Option B. Explicit narrow fallback at a published decision (first engine experiment)

An authored offer may include **one or more domain-validated fallback-eligible options**; the player has explicitly approved a class of fallback before leaving and knows when it may be used. If the real response deadline passes, the server may choose only a still-eligible allowed option, through the same immutable action/clock/effect path.

**Recommendation for the first GM07 scope:** start here, with a deterministic fallback such as *decline a harmless invitation*, *maintain current safe posture*, or *take an authored withdrawal option*. Do **not** start with automatic combat or important social commitments.

### Option C. Personality-guided bounded selection (longer-term target)

A versioned personality/behavior policy ranks **already-offered allowed** candidate responses within the captured permissions. A bounded model could potentially help interpret preferences, but it **may not invent executable choices**, bypass prerequisites, reveal secrets or choose for another player. Mechanical admission still owns the result.

**This is the fantasy the original vision suggests**, but it is **not** the first code packet and needs separate model/cost/evaluation work.

### Option D. Unbounded automatic AI control (reject)

The Storyteller freely decides actions whenever the player is away, with no consent/restrictions. This risks arbitrary irreversible outcomes, privacy problems, unacceptable provider spending and unfalsifiable behavior. The fact that a model can write convincing prose does not make such autonomy fair.

## Decision semantics: a concrete encounter

Mara is repairing a beacon, 3/9 earned. A stranger arrives and work is suspended. The published options are:
1. **Ask who sent him** (conversation).
2. **Withdraw to the harbor shelter** (already admitted safe retreat).

For first bounded fallback:
- The player previously selected “During my absence, if a low-stakes encounter permits safe withdrawal, I allow my character to withdraw after the deadline.”
- The actual published offer **specifically marks** option 2 as fallback-eligible under captured policy.
- The decision becomes visible at a declared real deadline. The player has time to respond; fiction remains held while deciding.
- Before expiry, player chooses 1 normally and it wins; the scheduled default must be canceled/neutralized without a second action.
- At expiry, if *still current* and permitted, option 2 is admitted **once**, with its ordinary time/effect rules.
- If offer changed, deadline wasn't actually published, provider was unavailable, or withdraw became invalid, **hold rather than invent a replacement**.
- The Journal records **“Your approved fallback chose to withdraw”** with source and time. On return the player can see exactly what was done on their behalf and why.

**No invisible courage/HP/risk policy:** “cautious” is not a license to guarantee safety or automatically pass a contested check.

## What the player configures

At creation or in editable story settings, show a concise **While away** section. A supported initial summary could say:

> **At story decisions:** Wait for me indefinitely.  
> **In the future:** When approved, permit only specific safe fallback actions after a declared window.  
> **Serious decisions:** Always stop for me.

Only actually supported options should render as selectable. Locked campaign policies are shown with explanation. Not all players will choose autonomy, and a high-drama Storyteller profile cannot silently turn it on.

**No decision-level settings flood:** default behavior can be summarized once. At a particular new decision, show a real deadline/default only if admitted. The player may inspect what the approved fallback would do without being shown hidden future encounters.

## Technical authority requirements (proposed, not present proof)

- A bounded **versioned delegation grant**, scoped by authenticated viewer/character/story and allowed classes of actions or exact offered option family.
- A **published** current decision with valid real deadline. Starts when available to the user, not while private generation is underway.
- Valid candidate list prepared by Storyteller, admitted by application and filtered under policy; never arbitrary text from a provider.
- At expiry, atomic revision/offer/actor revalidation, idempotent operation key and exactly one selected action.
- Apply normal time, dice, resources, consequences and publication. Generation failure cannot erase the committed selection or invite a new provider call without rules/cost authority.
- Independent suspension/pausing semantics for manual pause, decision hold, required Storyteller task, provider quota and shared-party authority.
- Explicit provenance in public history that the action was automated under prior consent.
- A user may revoke **future** delegation where the rule permits; revocation cannot retroactively undo already committed effects.
- No cross-player control. The character's owner approves their own policy even in a shared campaign.

## UX states that must be distinguishable

| State | Player-visible explanation | Forbidden implication |
| --- | --- | --- |
| No autonomy granted | “Waiting for your response.” | Character will pick automatically |
| Fallback granted, decision window open | “If you don't answer by 20:30, your approved retreat option may be used.” | Unknown consequence is guaranteed |
| Player responds first | Ordinary accepted action and outcome; fallback canceled | Both actions occur |
| Deadline expires, fallback settles | “Your approved fallback chose to withdraw.” | The player personally clicked it |
| Deadline expires, fallback invalid | “The story is still waiting for a decision; the approved fallback was no longer available.” | New arbitrary action chosen |
| Provider unavailable before offer | “The next scene could not be published. No response window started.” | Player missed an unseen deadline |
| Manual pause held | “Paused by you; no automatic response is currently being processed.” | Autonomy bypasses pause |
| Shared actor scope differs | “Your character's response is pending; another member controls theirs.” | Owner can choose for everyone |

## Fairness and accessibility

Real response windows are not in-world action durations. The interface must explicitly explain whether players can extend/pause them and how assistive-technology users are treated. WCAG 2.2 SC 2.2.1 timing guidance may apply; exceptions for essential real-time behavior require actual justification, not a fictional danger excuse.

Do not use **push-notification delivery** as proof the user saw an offered decision. Link and scheduling semantics are server-owned. If a player mutes messages, the accepted fallback policy doesn't automatically change.

## What would weaken this recommendation?

- Players overwhelmingly prefer indefinite holds and experience fallback as a loss of control even when consented.
- Real deadline/default policies cannot be made fair in infrequent-use, asynchronous multiplayer.
- A deterministic safe retreat frequently becomes invalid, giving no feeling of autonomy.
- Model-assisted personality ranking causes materially more unanticipated harmful choices than explicit simple policies.
- The bookkeeping/provenance needed to keep behavior honest costs more than the benefit for the first release.

These are reasons to simplify/defer, not to enable an unbounded toggle.

## Gate before real implementation

Prove an offline two-offer scenario with one approved fallback and one explicit deadline, then three adversarial races: **player response at expiry**, **pause or revoke before expiry**, **offer changed while deadline was pending**. All settle exactly one result. The first GM07 slice should contain no real provider calls.

A future **personality-guided choice evaluator** is a separate additional project requiring its own policy corpus, expectation tests and price/budget limits.
