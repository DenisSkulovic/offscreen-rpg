# Phase 1 | Now: situation, choice and temporal-state grammar

**Status:** OPEN DESIGN. This describes the intended player comprehension, not a new engine state machine or component implementation.
**Sources:** `docs/product/experience/play-and-decisions.md`, `docs/product/gameplay/time-and-autonomy.md`, `docs/product/foundations/concepts.md`, `docs/technical/client/state-and-server-boundary.md`; current `PlayScene` and `StoryFrame` from source archive `9e821c6e15bb`.

## 1. The current situation is the composition nucleus

The opening question is **“What is true and what can I do?”**, not **“Which widget is active?”** One Now composition always offers:

1. **Identity and orientation**: which story; known current world/time/situation if supplied; a low-noise system status.
2. **Narrative anchor**: the latest **published** prose, with its original passage identity and appropriate atmosphere. A pending operation never replaces this with imagined completion.
3. **Action threshold**: a meaningful current decision, admitted ongoing activity with relevant safe controls, explicit hold/recovery, or intentional quiet when nothing can be done.
4. **Contextual affordances**: World, You, relevant possessions, source-backed records and Journal, revealed when useful and not falsely standardized across all worlds.

These are semantic layers, **not** a prescribed four-card layout. Some situations use a long passage and sparse margin; others use short prose and carefully displayed option comparisons. The first pixel and the most luminous object are not necessarily a button.

## 2. State grammar: one dominant truth plus compatible secondary facts

We propose **one dominant task-state presentation** with explicit secondary details, derived from the existing authoritative projections. This is a presentation taxonomy, not a new persisted enum.

| Dominant player situation | Must communicate | Primary available action | Must NOT imply |
| --- | --- | --- | --- |
| **A. Decision available** | Current passage + exactly which authored intention(s) may be selected | Commit an actual offered option | The option guarantees success; reading consumes time |
| **B. Accepted intention, reconciling** | A click was captured/admitted or its acknowledgement is ambiguous | Wait for authoritative state / explicit same-intent recovery as allowed | A second selection or free reroll is safe |
| **C. Accepted process underway** | Admitted activity, source-backed progress/deadline, honest expected next development | Leave, or actual authorized pause/change where present | Completion is earned early; timer is infallible |
| **D. Process paused** | Paused controllable interval, retained remaining time and consequences | Resume only if server permits | Real time keeps earning progress during pause |
| **E. Mechanics settled, narration pending** | Earned committed result vs not-yet-published creative continuation | Safe refresh/observe; scoped recovery if allowed | New scene/offer is already published |
| **F. Provider/publication blocked** | Last committed passage, known blocker, possible charge/unknown charge, exact safe next action | Reconcile, refresh or authorized recovery | Retrying blindly cannot create duplicate costs |
| **G. Deliberate quiet/hold** | No currently offered decision; whether any authorized execution remains | Inspect, leave, wait, or clearly enabled explicit action | Fiction will advance merely because tab is closed |
| **H. New return context** | What happened since known foreground checkpoint; coverage, source links, current Now | Continue to Now/choose immediately | Recap itself is a new committed event |
| **I. Offline/stale read** | Last-known snapshot age/uncertainty and limited reliability | Refresh when connected; no unsafe commit | Cached text proves the world has not changed |
| **J. Inaccessible/deleted** | The story cannot be safely shown under current permissions | Return to Stories/sign in as appropriate | Private historical content remains browseable in cache |

These states are not mutually exclusive internally. For example an activity can still be accepted while Storyteller narration preparation is uncertain. **Priority must follow verified game authority, not a generic frontend “loading” boolean.** Show both facts without letting uncertainty overwrite already committed progress.

## 3. A presentation ordering rule

When multiple facts exist, decide the visual hierarchy by this ordering:

1. **Access and privacy boundary** first. Never show unauthorized story text.
2. **Irreversible or ambiguous operation safety** next: has an action already been accepted; can the user retry anything safely?
3. **Current actionable decision** when genuinely available, never buried under an optional recap.
4. **Saved consequences and accepted progress** plainly distinguish committed from preparing.
5. **Narrative prose and atmosphere** make the state intelligible and emotionally felt.
6. **Auxiliary context** only if it meaningfully informs the decision or reading experience.

This does not mean warning banners always occupy the top of the story; it means status is semantically and interactively impossible to miss when unsafe action would follow from misunderstanding.

## 4. Choice grammar, not universal option cards

| Interaction family | Experience contract | Visual-design question for Phase 2/3 |
| --- | --- | --- |
| **Brief response** | Short, conversational, potentially rapid, still with admitted time semantics | Can it feel conversational without chat bubbles or fake typing? |
| **Embodied/world intervention** | Distinct authored attempts, known cost/risk/duration beside the choice | Can we compare careful/dangerous actions without equal-weight dashboard cards? |
| **Extended commitment** | Explicit time/effort and possibility of interruption; clear commit boundary | What visually conveys “this may take real hours” without gamified countdown theater? |
| **Decision with checks** | Player chooses attempt; mechanical outcome later follows saved rules/rolls | How show tension without pre-rolling visual dice or spoiling private DC? |
| **Deliberate inactivity** | An actual accepted wait/decline when authored; not a decorative button | How to distinguish “Let it be” from merely closing the tab? |
| **Explore a nested option** | UI-only inspect/back with no spend or fictional time | How to mark exploration vs irreversible commitment accessibly? |
| **Rescue/recovery** | Retrying an identical frozen operation or reading a receipt only when allowed | How to keep recovery outside the fictional choice typography? |
| **No offer** | A legitimate quiet state, or explicit blocker, whichever is true | Can absence feel intentional and understandable? |

The authoring contract controls how many actions exist and their identity. The UI never pads a scene to exactly three options, introduces universal “Other…” free text, or renders a misleading “Use inventory item” command. An unfinished offer submenu must reset when the authoritative offer identity changes.

**Choice copy template (product guideline, not runtime string formatting):** a verb naming *intent* + relevant short clarification; attach known cost/duration/risk as separate readable supporting information. Avoid “Succeed in escaping” when the only admitted action is “Attempt to escape.”

## 5. Design for time without lying

We have at least four different temporal concepts; never fuse them into one progress bar:

1. **Real elapsed time**: wall-clock duration of a saved process when the engine admits that behavior.
2. **Fictional elapsed time**: authorized world duration, not a side effect of reading or loading.
3. **Mechanically earned progress**: verified quantity/progress and settlement; an expectation is not a receipt.
4. **Generation/publication latency**: model/task work, which is not itself fictional life and may incur provider spending.

The interface can show “the journey is underway; expected arrival...” when the server supplies it, with appropriate uncertainty. It cannot show "Arrived!" solely because a local timer hit zero. Likewise a quiet interval with no authorized execution must not receive a “world is still evolving...” spinner.

**Leaving the page:** an exit or close is not an action-selection event. At most we can communicate what is already admitted and what will remain held.

**Pausing:** pause/resume is an engine-authorized control and may not be universally available. Its affordance is a system control, visually distinct from an in-fiction choice.

**Returning:** the summary may report admitted public events in a scoped coverage window. A recent digest is not automatically "since last time" unless visit evidence justifies it.

## 6. Arrival and transition choreography

**When a new published passage becomes current:** preserve previous published prose until the newer authorized version is present; then a modest passage transition may communicate publication. The passage ID, not the title/string similarity or a model token stream, anchors the change.

**When a choice becomes an admitted process:** remove unsafe repeated action affordances; show a clear change in situation and real progress semantics. A small transfer of visual attention from intention to ongoing-state block can create meaning. Do not animate the final reward.

**When a player receives a return recap:** introduce it as a concise scannable prelude alongside Now; after dismissal, preserve a path to the source items and Journal. No forced “watch this animation” or scrolling wall before choice.

**When an action fails/blocks:** keep the *last committed text* present and the recovery visible, rather than resetting the whole stage into an empty generic alert.

**When a scene changes atmosphere:** animated environmental transitions must respect user reduced motion, asset failure and permission bounds. The Storyteller may color the performance, not the platform's status/focus/action authority.

No transition or animation is approved yet. These are **interaction jobs for later motion prototypes**, not a Motion/GSAP implementation spec.

## 7. Responsive and accessible interaction commitments to test

- **Long passage + choices:** the important action may be far below the opening paragraphs. Design a nonintrusive “current decision” access pattern without detaching choices from context.
- **Short passage + no offer:** the page should feel deliberately spacious, not broken or visually barren.
- **Screen reader:** narration/title, status changes, choices and safe recovery need predictable reading order; progress polling must not flood announcements.
- **Keyboard:** actual offered options reachable, focus stable after refresh or new passage; Back/inspect does not steal focus from pending commands.
- **Mobile one-handed use:** consequential commit must be explicit; never turn a huge atmospheric panel into an accidental tap target.
- **Slow network:** the last committed source remains intelligible; stale and failed reads never become a silent permission to act.
- **No imagery / low contrast backgrounds:** always retain readable text and strong focus independent of world appearance.

## 8. Source reality and gaps (as of the pinned archive)

`StorySnapshot` has current passage, authored interaction, waiting, resolution, optional campaign and optional appearance. The current `PlayScene` resolves display via `resolveLivePresentation`, shows legacy or campaign offers, includes waiting and recovery, and passes Journal as `#story-journal` inside details. The code contains specific status messages but has **not** established the desired state-specific compositions or an end-to-end human-tested experience. The optional appearance consumer exists; a normal production authoring pipeline still needs verification before claims about dynamic live scenes.

**Gate:** a test participant can tell what is current, what is already committed, what remains pending, whether leaving or pausing changes anything, and whether a visible control is a real game command.
