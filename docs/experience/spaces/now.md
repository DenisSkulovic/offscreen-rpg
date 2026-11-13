# Now | the living stage

**Status:** experience destination, not a JSX specification. The same **Now** space adapts to a scene, sustained activity, re-entry or hold. It is not a set of disconnected tools pages.

## The contract of the first viewport

Within the first viewport, answer in this order:

1. **Where/what is this life right now?** Contextual title and an authentic current passage or known ongoing commitment.
2. **Does something require me?** A meaningful decision, known wait, stopped/paused condition or no current commitment.
3. **What can I do?** Specific intentions, review controls, pause/change-course where allowed.
4. **What should I know before acting?** Known time/risk/cost and pertinent condition, with deeper detail on demand.

Do not fill empty visual space with fictional stats. The reading content is the hero; a scene of absence may be perfectly sparse.

## Desktop composition: active scene (selected situation-stage direction)

The initial three-column sketch in this design was deliberately challenged. **A permanent navigation rail plus permanent context sidebar risks recreating the existing dashboard**. Prefer a **single living situation stage**, with story identity, contextual status, narrative and actions in one coherent reading flow. A secondary context shelf may appear **only if decision-critical facts justify it**, not simply because desktop space exists. See [composition alternatives](../foundations/composition-experiments.md).

\`\`\`text
┌──────────────────────────────────────────────────────────────────────┐
│ ← Stories    Greywake Beacon          Now · Journal    Details · ⋯   │
├──────────────────────────────────────────────────────────────────────┤
│ THE BEACON LANDING                        Decision waiting            │
│ Storm coast · Dusk (only if the world truly knows these)              │
│                                                                      │
│                 THE STRANGER'S ARRIVAL                               │
│                                                                      │
│    The stranger stops beside the broken lens.                        │
│    He appears to know your name.                                     │
│    [Readable original passage, as long as needed]                    │
│                                                                      │
│    Repair suspended · 3/9 earned     [Review previous work]          │
│                                                                      │
│    ─────────────── WHAT WILL YOU DO? ──────────────────────────       │
│    [Ask who sent him]                                                │
│       A brief conversation                                           │
│    [Inspect the mark on his cloak]                                   │
│       An uncertain attempt                                           │
│    [Try something else] (FUTURE, only with supported engine)           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
\`\`\`

This is an **information-flow wireframe**, not a pixel template or commitment to a specific card treatment. An optional setting-specific atmosphere/illustration can frame the situation, but an absent image never leaves a hole. The action boundary must be explicit through grouping/structure, not only color. It is okay to scroll naturally through long prose. The current scene remains central even when a player opens contextual Details.

**Rejected as default:** equal-width columns for Now, telemetry and history; six persistent status cards; an unending assistant chat transcript; a permanent right-side configuration editor. For genuinely tactically dense situations, prototype a **temporary contextual shelf** and compare task success rather than forbidding richer context altogether.

## Mobile composition: the same scene, reprioritized

```text
┌──────────────────────────────────┐
│ ← Stories  Greywake       Details│
│ ● Decision waiting               │
│                                  │
│ Storm coast · Dusk               │
│                                  │
│ The stranger stops beside ...    │
│ [Full readable passage]          │
│                                  │
│ What will you do?                │
│ [Ask who sent him]               │
│ [Inspect the mark]               │
│ [Try something else] (future)    │
│                                  │
│ Journal · You (if relevant)      │
└──────────────────────────────────┘
```

No pinned element covers text. If there is enough prose to scroll, a person reads naturally; the choice group is encountered when relevant. Optional “Jump to current decision” is acceptable if content is long, but it never substitutes for a clear visual group. Respect viewport keyboard, text resize and reduced motion.

## Now state compositions

| State | Dominant region | Supporting context | Primary action | What MUST NOT be implied |
| --- | --- | --- | --- | --- |
| Current scene + offer | Narrative passage and relevant contextual choices | Known location, critical status | Specific verb-led choice | All choices guarantee their outcomes |
| Menu-only selection | Short situation summary and grouped local opportunities | Return to previous choice | Explore an option or choose actual action | Browsing moves fictional time |
| Submitted command, ACK unknown | **Last verified** scene plus frozen chosen intention | Small checking/status panel | “Check action status” where supported | Failed network means action did not happen |
| Admitted finite action | Committed intention and truthful processing state | Prior scene accessible | Usually none; recovery available | Admission already produced the result |
| Sustained commitment | Clear “You are [doing]” heading, actual progress, conditional expectation | Relevant history, change-course/stop controls | “View commitment” or permitted control | Completion/reward is guaranteed |
| Interrupted work | Development passage and decision | Preserved completed progress, suspended work | Respond to development | Original work kept advancing unseen |
| Return after change | Compact factual digest and *current* situation | Journal provenance, optional detail | Current available decision | A generated recap is authoritative canon |
| Manual pause | Preserved present and “Paused by you” | Remaining progress, pause scope | Resume if permitted | Time advanced during pause |
| Requires input | Current scene, explicit decision hold | Deadline/default if supported | Choose an action | Fictional danger secretly runs during a held solo decision |
| No active commitment | A calm situation and available options | Last completed activity | Choose next intention | Browser being open/closed advances time |
| Generation blocked/allowance exhausted | Most recent settled fiction plus exact hold explanation | Whether mechanical action already committed | Supported retry, inspect funding or no action | An unsent or retried model call can invent/undo effects |
| Ended story | Last true passage, reflective journal access | Fork rules if offered | Read story / perhaps fork | Story can resume on its own |

**Priority rule:** primary **fictional condition** and transient **request transport state** are separate dimensions. A pending HTTP request can coexist with a held scene; it should not replace the entire stage. A story can also be doing work while an optional literary report is unavailable. Never flatten these into one spinner enum.

## The main visual regions

### 1. Situation header

Show the story/situation title, known location or abstract situational label, an optional meaningful fictional date and a status expressed in human language. A microbe may show “Inside the colony · cycle 7,” not “Latitude unknown / Inventory empty.” Hidden time, identity or location should stay hidden.

Status must be text as well as color. “Waiting for your choice,” “Travelling,” “Paused by you,” and “Storyteller unavailable” are separate states with different actions.

### 2. Passage stage

A typographic reading measure (target roughly 60–80 characters, to be validated with actual fonts), generous leading, sensible paragraph grouping, preserved line breaks and deliberate long-text handling. Title and prose have distinct roles. No animated typewriter that delays reading or burdens assistive technology.

When a new passage is published, gently differentiate it from previously read material. Maintain reading position if someone is examining earlier text; never forcibly jump on a background SSE refresh.

### 3. Action zone

A small set of contextually valid intentions, grouped by meaning only if many. Each verb describes an attempt and includes important known stakes/time. “Read more” or “Consider route” may be a no-time exploration; “Begin the journey” may require a compact commitment confirmation. The action zone stays clearly associated with its parent situation.

### 4. Context shelf

Optional, noncompeting. Shows **at most the 1–3 facts immediately helpful to this moment** (e.g., broken arm, active beacon repair, a person you know). “All items” lives in You or World, and all previous passages in Journal. The shelf is **not** a telemetry dashboard.

### 5. System and recovery lane

One small persistent location for *relevant* pending/uncertain/blocked information. A blocked generation is not a separate fantasy scene. Explain exactly which part is blocked and whether already committed mechanics survive. A purely optional report failure should not occlude active gameplay.

## Sustained commitment sketch

```text
THE LONG ROAD TO THE OUTPOST
Travelling · roughly 4 hours remaining here (estimate)
Last settled: reached the valley checkpoint; road beyond not yet traversed.

[Progress only if there is a rule-defined progress measure]
Possible interruption: your journey may require attention.
[Travel details]      [Change course] (only if rules admit it)
You can close this page. Accepted travel continues within its limit.
```

The label **“4 hours remaining”** is conditional; if time cannot reliably be estimated, say “Next check at [time]” or “Completion time uncertain.” A travel progress bar requires a valid distance/progress model, not a guess based on elapsed wall time. Show achieved progress and predicted remaining separately.

## Narration / mechanics interaction

On resolved checks, attach a restrained “Check succeeded / failed” reveal that can expand to the saved roll and effect detail. Never show simulated dice before receipt admission as if they were random outcomes chosen by the frontend. Routine repeated checks collapse into one factual summary with a details route.

An interleaved scene may include a few moments of previous dialogue; it must not become a generic assistant/user bubble chat. Distinguish the player’s chosen *intention* from the character's actual spoken dialogue (which may be storyteller-authored) and from the world’s committed result.

## Writing and empty states

- No available options is not necessarily a bug. Provide a legible explanation and known continuation rather than inventing “Continue.”
- A blank character inventory is not a large empty panel asking the player to collect loot.
- If an image is unavailable, the typographic layout remains beautiful. Do not put a perpetually pulsing placeholder beside an otherwise settled passage.
- A screen displaying leaked internal names like “Offer path,” “ControlRevision” or “ActionExecution” fails the target, even if its controls technically work.

## Review scenarios

Use fixtures for: 10,000-character passage; one choice; 12 opportunities with groups; unsolved interruption; 3/5 work units earned with time elapsed but no progress; paused story; unknown command ACK; no current commitment; secret roll; nonhuman character without location/inventory. Show each in wide and narrow view. A reviewer must be able to narrate the *current state* correctly from a screenshot alone.
