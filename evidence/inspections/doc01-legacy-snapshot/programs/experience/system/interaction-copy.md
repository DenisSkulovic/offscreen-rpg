# Player language contract | a serious game must not sound like a job runner

**Status:** UX writing guide with illustrative string patterns. This is **not** a localization file and not executable game logic. The product's story tone can be playful or solemn; the surrounding system must remain literal, short and trustworthy.

## Three voices, one coherent experience

| Voice | Owner | Can it be unreliable? | Example |
| --- | --- | --- | --- |
| **Story prose** | Storyteller, according to campaign direction | Yes, in-character beliefs and limited perspective can be unreliable | “The stranger's hand hesitates near the badge.” |
| **Game fact / consequence** | Validated domain projection | No, unless explicitly labeled as a character's belief | “Beacon repair: 3 of 9 units earned.” |
| **System / controls** | Offscreen RPG interface | No: must accurately describe admitted action and its state | “Your attempt was accepted. The result is still being prepared.” |

Do not ask the Storyteller to author UI recovery or financial/permission copy. A sarcastic Storyteller can joke in fiction; a retry label must not be coy about whether it might charge the player again.

## Structural copy vocabulary

| Avoid internal phrase | Player-facing default | Usage guard |
| --- | --- | --- |
| CampaignView / snapshot | **Story** / **Current situation** | Don’t call it a “Campaign” unless that word is genuinely clear to players |
| Offer / option node | **What will you do?** and a specific verb | Options are attempts, never guaranteed consequences |
| Decision hold | **Waiting for your decision** | Don't imply a real deadline unless one exists |
| Action execution | **You are [doing X]** / **[X] is underway** | Only when admitted and active |
| Contribution process | **[N] of [M] [units] earned** | Only if defined and public; do not call “percent complete” indiscriminately |
| Mechanical boundary | **Next work attempt** / **Next update** | Only if relevant; hide most in routine details |
| SuccessorPaths / activity plan | **While you're away** / **Your plan** | Must have approved horizon, stop conditions |
| Horizon in fictional seconds | **Continue until [known in-world boundary]** or a human-readable duration | Never dump raw seconds into primary UI |
| Current world conditions | **What you know** / **Current circumstances** | Only verified, visible facts; never private model assumptions |
| Character facts | **About you** / **Condition** | No raw schema IDs |
| ControlRevision / passage ID | **Technical details** in a developer-only inspector | Never substitute for situational context |
| Storyteller task pending | **Storyteller is preparing the next passage** | Distinguish accepted mechanics from prose preparation |
| Provider unavailable | **The Storyteller cannot continue right now** | Clarify which part is held and what is saved |
| Usage window exhausted | **Storyteller allowance reached** | Give binding limit/reset when known; no invented ETA |
| GET failed | **Could not check the latest story state** | May still show last verified state, labeled stale |

## Writing a choice

**Grammar:** attempt verb + meaningful object/circumstance, without claiming success.

Good: **“Inspect the badge from the doorway”** with secondary “Uncertain check · takes a few moments.”  
Bad: **“Discover whether the badge is genuine”** when success is uncertain.  
Good: **“Ask the stranger who sent him”**.  
Bad: **“Get the stranger to reveal his employer”** when they may refuse.  
Good: **“Begin repairs”** with “Progress depends on work checks.”  
Bad: **“Finish the beacon”** when it will take hours of effort.

Choice summary order when stakes matter: **intention → most relevant known limitation → time/cost**. Don't automatically put “Apparent risk:” and “Fictional duration:” under every small dialogue option; normal conversation should feel like conversation.

The action area's question can vary by mode:
- **Decision scene:** “What will you do?”
- **Quiet opportunities:** “How would you like to spend your time?”
- **Work suspended:** “What now?” followed by contextual options.
- **Custom intention (future):** “Try something else” with clarification “Describe what you want to attempt.”
- **No valid options:** don't show a question that has no answer.

Avoid creating 10 virtually synonymous choice buttons to imply agency. In a single-action moment, one meaningful path can be enough.

## Time language and its truth conditions

| State | Proposed copy | Avoid |
| --- | --- | --- |
| Earned progress | “Repair: 3 of 9 units earned.” | “66% complete” based on elapsed ticks |
| Last checkpoint | “Your last repair attempt made no progress.” | “Still working successfully” |
| Real-time forecast | “Next attempt in about 12 minutes.” | “Done at 16:08” when interruptions can move it |
| Estimated completion | “Estimated completion: around 18:00, if work continues uninterrupted.” | “Arrives at 18:00” as guaranteed fact |
| Fiction vs real | “About 2 hours in the story; around 10 minutes here.” | “2:00 left” without naming the clock |
| Literal wait | “Waiting by the road. 20 of 30 in-world minutes passed.” | “Progress earned” for waiting |
| Paused | “Paused by you. No fictional time is passing.” | “Still working” |
| Interrupted | “Repair stopped when the stranger arrived. 3 of 9 units remain earned.” | “Repair failed / restart task” |
| No active commitment | “Nothing is underway. Time will not advance until you choose.” | “Your world is running” |
| Expired estimate awaiting server | “Expected time reached. Checking what happened…” | “Completed!” before server receipt |
| Frozen history | “Recorded on Day 4” | “Next action available” on a past passage |

**When the game has no Earth-like calendar:** use its actual units or simply “Some time will pass in this world.” Do not invent days, kilometers or humans for a microbe. If world time lacks a known label, leave that detail out.

## Separate admitted and settled actions

| Transport/domain condition | Suggested status | Safe action |
| --- | --- | --- |
| Click received locally, server pending | “Sending your attempt…” | None until known |
| Accepted for execution | “Your attempt was accepted. The outcome is not known yet.” | Observe or leave, according to the rules |
| Lost acknowledgment | “We are checking whether your attempt was accepted.” | **Check status**, not “Try another move” |
| Settled mechanic, awaiting prose | “The outcome is recorded. The Storyteller is preparing its account.” | Read committed details if available |
| Settled and published | Show actual consequence and next choices | New offered intention |
| Conflict/stale option | “The situation changed before that choice could be accepted.” | **View current situation** |
| Invalid/unsupported action | “That attempt isn't available in the current circumstances.” | **Back to choices**, or edit future custom intent |
| Provider task blocked | “The next scene cannot be prepared with the current allowance.” | Specific supported recovery / no invented retry |
| Cannot confirm server state | “Latest status couldn't be confirmed. Your last verified story is shown below.” | **Refresh**, GET-only |

Never display financial/legal certainty beyond what the service has recorded. A fixed retry operation may still consume bounded generation allowance if permitted by policy; don't label it “Free retry” without real authorization.

## Autonomy/plan copy

**Before acceptance** the user should know:
- “While you're away, [accepted activity] may continue until [horizon].”
- “If a decision is needed, the story [stops / uses exactly the preapproved fallback].”
- “Unfinished future steps are conditional, not guaranteed.”
- “You can [pause/inspect/change] only if current rules allow.”
- “Your selected speed affects how long this will take in real time.”

**After completion:** “Your plan ended at [known boundary]. No activity is underway.” Do not say “Life keeps running” unless a subsequent approved standing routine exists.

**No autopilot consent by adjective:** selecting a “Restless” Storyteller must not quietly authorize arbitrary attacks, trades or social choices while absent.

## Return digest labels

- **Recent developments** when only a bounded recent public-event view exists.
- **Since your last visit** only if a reliable authenticated per-viewer seen baseline exists.
- **Nothing progressed** when no committed time moved.
- **While you were away** when the scoped window is actually known and events were committed.
- **Your earlier work is preserved** only when the same persisted commitment identity exists and remains resumable as reported.
- **Now** always points to the live verified situation, not a previous notification decision.

The digest tells verified *changes*, not why the Storyteller thinks they were meaningful. An optional narrative recap may tell the story of facts, with source links, but cannot invent people, possessions or results.

## Negative microcopy tests

- “You have arrived” cannot show if only the expected deadline passed and canonical state is still travelling.
- “Pause” cannot secretly abandon/restart and discard earned work.
- “Retry” cannot mean a new paid operation without stating that.
- “No new developments” cannot be inferred from a stale offline snapshot; instead say the latest state couldn't be checked.
- “New scene” is not just a late historical report that didn't change player choices.
- A scripted demo never calls itself a durable live world.

## Editorial voice rules

Prefer short active clauses; one thought per status. Avoid technology nouns, exclamation-mark floods, emoji-only labels and strings that overpromise. The game should feel literary because **the prose is good**, not because every system error pretends to be written by a sea captain.

Use approved world names only for the fixture whose lore they belong to. Localization must not assemble ambiguous fragments like “X · Y · paused: Z” across arbitrary languages. Numerical and time formatting should use locale-aware routines and explicit units.
