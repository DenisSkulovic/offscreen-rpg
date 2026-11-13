# Choice surface decision rules | turn an AI-generated option set into game interaction

**Status:** UX normative proposal, not a change to rule-admitted offers. Read with [interaction grammar](interaction-grammar.md), [Storyteller-quality standards](../foundations/storyteller-experience-quality.md), and [state/attention](state-and-attention.md). The **Storyteller/application** authorizes choices. The UI can organize and disclose authorized choices, not invent or remove meaningful action authority.

## The main design problem

A generic “options” renderer has very little idea whether it is displaying:
- two immediate dialogue responses,
- ten local activities,
- a dangerous action with a costly check,
- an informational submenu,
- an extended task that will occupy hours,
- an already-running task's permitted controls,
- a decision which has no safe alternative.

Rendering all six as identical large cards, with the same buttons, creates a mechanical-looking interface even when the prose is good. Different *player decisions* deserve distinct **interaction density**, while preserving one recognizable grammar.

## Core choice rules

1. **The label describes the attempt** (verb + object/intention), not a promised effect: “Study the badge,” not “Prove his identity.”
2. **Keep the situation visible.** A choice isn't a detached command card; the current text explains why it exists.
3. **Expose consequential known information before commit.** Duration, cost, irreversible interruption and apparent risk belong near the specific choice when they matter, without spoilers.
4. **Navigation and action are visually different.** A submenu/collapsible group is not time-spending.
5. **Only one command is accepted per stable intent.** Duplicate submit, uncertain ACK, stale revision and lost connection use existing receipt rules.
6. **Do not add fake agency.** A “do nothing” option means an actual deliberate wait, decline or acceptance of consequence, not a decorative fourth button.
7. **No single compulsory number of choices.** One, two, six and no options can all be correct given context.
8. **Never automatically invent a "Use item" option.** Only current authored/admitted choices can be submitted.
9. **Player language is separate from developer syntax.** The user never sees offer path arrays or successor horizons in fictional seconds.
10. **Custom free intent is future mechanics**, not a magical “Other…” option that executes raw text.

## Four presentation patterns, selected by what the person decides

### P1. Immediate dialogue or expressive choice

**When:** a small number of short, meaningfully distinct responses; the player is primarily participating in the scene.

\`\`\`text
WHAT WILL YOU DO?

Ask who sent him
    A brief conversation

Keep your distance
    Decline further contact
\`\`\`

**Behavior:** minimal chrome, simple action rows with strong focus/hover state. Direct commit where no special warning is warranted. If an option has a significant known time/resource stake, show it rather than forcing every dialogue through a confirmation sheet.

**Reject:** a 200px-tall card per sentence with icon, status badge, preview button and “Add as later activity.”

### P2. Local opportunity collection

**When:** a quiet location provides several *already authored* repeatable opportunities. A small set may be shown directly; many may be grouped by meaningful category or displayed in a compact list.

\`\`\`text
SPEND SOME TIME IN THE HARBOR

Repair the signal       (resume same 3/9 earned)
Observe the water       (bounded wait, no reward)
Visit the watchhouse    (new situation if admitted)
\`\`\`

**Behavior:** grouped if useful, compact rows, show eligibility only when relevant. An exploratory category can drill into a submenu without advancing time, with a clear Back path. Avoid an always-visible empty grid to imply the engine has generated "work", "trade", "fight", "eat", "sleep" from character stats.

**Reject:** universal job board columns, redundant risk/time labels on everything, automatically refarming one-time opportunities.

### P3. High-stakes / sustained commitment

**When:** starting a task that affects current work, resources, substantial real waiting or known serious consequences.

\`\`\`text
BEGIN THE MOUNTAIN CROSSING
You intend to take the northern pass.
About 10 real hours here under the selected pace (estimate).
This route can be interrupted; reaching the pass is not guaranteed.
Your current repair work would remain suspended [if actually true].

[Begin journey]   [Stay at the village]
\`\`\`

**Behavior:** one compact *review* if stakes warrant it. It explains the known cost, not a binary legal disclaimer and not a game-plan spreadsheet. Acceptance uses one immutable operation. **Don't double-confirm every ordinary action**: use the action itself as the confirmation when consequences are small and visible.

**Reject:** click start → immediately show arrival; two models of progress; hidden abandonment; universal confirmation modal for “Ask a question.”

### P4. Change existing accepted commitment

**When:** an action is already in progress, paused, suspended or planned. The player may have valid rules-aware controls, but the UI cannot make them up.

\`\`\`text
REPAIRING THE BEACON
3/9 earned · still active
[Pause repair]      (if permitted)
[Review commitments]

Or after interruption:
REPAIR SUSPENDED
3/9 preserved · cannot advance while the stranger waits
[Answer the stranger]
\`\`\`

**Behavior:** controls label their actual semantics. “Pause” means preserve time/progress. “Cancel upcoming steps” doesn't abandon current work. “Change course” may require a new engine-level admission contract. “Abandon” is high stakes and requires explicit known consequence.

**Reject:** a single “Cancel” reused for pause/abandon/plan removal.

## Selection by option count (heuristic, not hard rule)

| Number of distinct available intentions | Candidate UX | Danger |
| --- | --- | --- |
| **0** | No “What will you do?” question if no valid answer; display true quiet/hold/status | Invent a “Continue” to hide lack of content |
| **1** | One clear action; contextual stakes where necessary | Fill page with fake alternatives |
| **2–4** | Direct rows below narrative | Overdesign giant cards |
| **5–8** | Direct concise rows or light semantic grouping; test comprehension | Arbitrary grouping hides a useful choice |
| **9+** | Meaningful staged menu or category grouping **if authored structure supports it** | Client invents hierarchy that changes offer IDs, submits wrong path or hides critical offers |

Never impose these as runtime thresholds without browser/human study. A dramatic scene with eight genuine options may need all of them; a quiet town with six categories may be easier grouped.

## Cognitive load is not simply number of buttons

Two options that require remembering a private fact from six screens ago may be harder than six obvious short intentions. Relevant context can be embedded **near the choice** without revealing secrets. A known "You promised to return the lens" fact may be promoted beside a related option; unverified beliefs must be labeled as such.

A screen needs to help players make *meaningful* decisions, not merely minimize clicks. Progressive disclosure should not bury known danger or estimated eight-hour cost inside a third-level tooltip.

## Confirmation policy matrix

| Action | Default confirmation | Reason |
| --- | --- | --- |
| Open Journal/World/You, expand details | **None** | Non-time-spending read/navigation |
| Open authored menu branch | **None** | No fictional time or world mutation |
| Short dialogue/ordinary observation with disclosed stakes | **None** | Confirmation would slow rapid scene rhythm |
| Begin multi-hour work/travel | **Compact review if important facts aren't already clearly presented** | Explains duration and ongoing authority |
| Replace/suspend active commitment | **Explain affected work and preservation before commit** | Prevent surprises |
| Abandon progress or irreversible in-world consent | **Explicit consequence confirmation** | Player bears genuine loss |
| Retry paid generation after uncertain outcome | **Not generic confirmation; protocol-specific recovery** | May have billing/idempotency implications |
| Proposed custom intention (future) | **Interpretation preview, then explicit accept** | Raw text isn't valid action authority |

If confirmations become an obstacle after repeated low-risk actions, simplify them; don't remove the known-risk explanation.

## Critical anti-cheating semantics

- For any option, the **Storyteller controls proposed choices; code admits eligible action**, and the browser can display only validated public terms.
- Choosing a submenu does not change time, but an admitted five-second conversation can.
- A failed ability check is not a “button didn't work” UI failure. It is a completed, consequential attempt with a saved roll; never present retry as transport recovery.
- An action labeled "Wait" requires an actual supported wait and horizon. Closing the tab is **not** Wait.
- A return/history entry may *quote* the option chosen long ago; it is **read-only**, with no actionable controls.
- A free-intent proposal must explicitly show **interpretation vs acceptance**, and needs provider usage authorization before it exists in the live UI.

## Rejected samples

| Tempting design | Why it is bad |
| --- | --- |
| Every choice is a full-width hero card with stats, icons and Add to Plan | Replaces participation with project management |
| Every card has an estimated reward bar | Makes outcomes feel guaranteed |
| One persistent “AI asks what you do” input in all states | Prompts can override rule authority, even during incompatible work |
| All options always visible, including hidden/impossible ones | Spoils secrets, confuses availability |
| Client auto-generates action options from items and location | The engine didn't admit those actions |
| Missing data replaced with generic three-choice filler | Lies about current situation |
| Reroll button on a failed story check | Violates earned consequences |
| New “Continue” button after every quiet report | Turns the life into compulsive clicking |

## A small compositional proof to demand

Create provider-free Storybook/browser fixtures for:
- One option; two dialogue options; eight authored local activities; nested menu; high-stakes timed journey.
- A withheld option where only safe public eligibility copy is available.
- A consumed/stale offer that updated while a person was reading.
- A double click and a lost ACK.
- A failed saved ability check with no reroll.
- A quiet state with genuinely no offer.

Watch a person narrate their own intent. If they say **“I clicked a button”** but cannot express what their character attempted, the UI has failed even when request serialization is correct.
