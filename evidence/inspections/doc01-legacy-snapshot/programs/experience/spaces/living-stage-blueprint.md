# Living Situation Stage | selected first-player screen blueprint

**Decision status:** **designer-selected end-state** for the first UX implementation. Owner approval and rendered evidence remain pending; application code is untouched. This is the **layout and interaction authority** for UX01–UX04, not the accidental current `PlayScene`. Other sources: [experience thesis](../foundations/experience-thesis.md), [source critique](../evidence/current-ui-source-audit.md), [state/attention](../patterns/state-and-attention.md), [choice grammar](../patterns/choice-surface-decision-rules.md).

## The visual and product thesis

**A living situation, framed like a field journal, with understated instruments for time and consequence.** The player's character is central; the software's subsystems are not. The space transforms between reading, deciding, working and returning **without a new navigation paradigm for each mechanic**.

**Chosen composition: one primary stage.** No permanently attached second sidebar, no dashboard grid, no globally persistent progress rail, no chatbot bubbles. A secondary context shelf may be evaluated **only when a genuine choice requires simultaneous comparison of multiple known facts**, never as a default.

This design is a substantive decision; Cursor is not invited to replace it with a familiar SaaS template because that is easier to code.

## Stage anatomy and default order

The primary screen has **six conceptual regions**; some can be omitted when content does not support them.

| Region | Purpose | Always displayed? | Player attention |
| --- | --- | --- | --- |
| **A. Story frame** | Back to Stories, identify this one life; Now, Journal (when functionally available), Details/settings | Story identity and Back: yes; other links only if functional | Low |
| **B. Situation band** | Known location/context, fictional date if relevant, one accurate “Decision waiting / Repairing / Paused” label | Present **when grounded**, can be sparse | Medium |
| **C. Narrative stage** | Published current passage or truthful ongoing commitment; original title and prose | Yes, unless loading/recovery prevents reading | Highest |
| **D. Situational memory** | One compact known fact crucial to the choice: interrupted repair, possession, condition | Conditional | Medium |
| **E. Decision/action threshold** | Relevant authored choices or permitted process controls; clear text/structural separation | Only when authorized action exists | Highest when decision available |
| **F. Secondary destinations/status** | Journal, detailed character/world, settings, technical recovery/diagnostics | Conditional or behind an explicit control | Low except critical recovery |

**No region can invent data** to keep a symmetrical layout. There is no empty picture rectangle, no 0/0 character HUD and no “Story version 9” in place of a location.

## Target desktop layout: current scene with decision

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  ← Stories      This story / situation         Now   Journal*   Details ⋯ │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  THE BEACON LANDING                             Waiting for your choice    │
│  Known place, time/cycle only when supplied                              │
│                                                                           │
│                 SOMEONE AT THE DOOR                                       │
│                                                                           │
│          Someone in a soaked harbor coat has climbed                     │
│          onto the landing. They stop beside the mechanism.               │
│          "Is the light being repaired?"                                   │
│                                                                           │
│          [Further paragraphs in the same comfortable measure...]         │
│                                                                           │
│          Repair stopped · 3/9 earned    [Inspect work]                    │
│                                                                           │
│          ────────── What will you do? ─────────────────────────           │
│                                                                           │
│          Ask who sent the visitor                                        │
│             Brief conversation                                           │
│                                                                           │
│          Withdraw to the shelter                                         │
│             Leave the landing without losing your work                   │
│                                                                           │
│          [Try something else]  FUTURE, until engine admits it             │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

**Text/position rules:**
- Story-frame height is **content-sized**, compact and does not occupy a fixed 20% of viewport.
- Narrative line length is tuned for reading (starting design target ~60–75 characters per paragraph line, not a universal pixel width).
- Situation and narrative titles are distinct only when source provides two meaningful titles. Do **not** repeat “Current scene” above every passage or manufacture an extra location header.
- Relevant remembered work is an **inline fact strip** after prose and before decision, not a permanent panel competing with it.
- **Choices follow a structural separator** plus a semantic heading. Different actions are distinguished by verb and stakes, not solely color.
- A quick ordinary dialogue gets **compact option rows**, not tall cards. Significant accepted activity may receive a larger review surface.
- If the prose is long, the player scrolls naturally; a “Jump to current decision” shortcut may be offered if necessary, without hiding prose or auto-scrolling against the user's reading intention.
- Colors/textures/art direction are governed separately by [visual language](../system/visual-direction-and-tokens.md); no forced fantasy parchment.

`*Journal`: it is a **destination in the end-state**. If UX01 ships before UX07 builds a dedicated Journal, a visible Journal affordance must lead to a **working existing read-only history surface** or be deferred. **No dead tab and no fake route.** The stable final name is Journal.

## Target desktop layout: an ongoing commitment

The active work screen is not a progress dashboard. It has a situated statement of what the character is doing and a carefully selected factual instrument.

```text
← Stories       Greywake                Now   Journal*   Details ⋯

THE BEACON LANDING                             Repair underway
The lantern is dark. The same work continues on the exposed mechanism.

REPAIRING THE SIGNAL
3 of 9 repair units earned

Last verified: one successful attempt, one failed attempt.
Next work check: about 12 minutes here (if server supplies an estimate).
Completion is uncertain; no reward has been recorded.

[Review work history]       [Pause repair] (only if authorized)

You may close the page. This accepted work continues to its admitted
limit or interruption.
```

**Omit:**
- generic “mechanical boundaries settled” counters;
- a countdown that grants completion when reaching zero;
- a 33% ETA falsely calculated from 3/9 earned;
- a list of every other available action when the current authorization doesn't permit them;
- a second large narrator paragraph every minute;
- Storyteller provider status/cost controls mixed into the fictional work.

If a meaningful new event interrupts, the **current scene returns to the foreground** and work becomes the single fact strip. Never keep an animated "Repairing..." banner active through an incompatible hold.

## Target desktop layout: ordinary quiet life

```text
← Stories       Greywake                Now   Journal*   Details ⋯

MORNING AT THE HARBOR                     Nothing underway

The wind smells of salt. The harbor watch is changing shifts. The
lantern remains dark, but nothing requires you to act immediately.

──────── How would you like to spend time? ─────────

Continue your earlier repair
   3/9 earned · same saved commitment, if currently reauthorized

Visit the watchhouse
   A contextual conversation if offered by the current scene

Wait and observe
   A bounded time commitment, not closing your browser

[Plan a little ahead] (only if finite accepted plans are supported here)
```

Quiet does **not** imply the world is secretly ticking. If no authored opportunities exist, remove the question and explain true inactivity; the UI may link Journal/Settings, but those aren't in-world actions.

## Target desktop layout: return after absence

```text
← Stories       Greywake             Now   Journal*   Details ⋯

RECENT DEVELOPMENTS
  ✓  Beacon repair reached 3/9.
  ·  The next repair attempt made no progress.
  !  A visitor arrived. Work stopped.
  [Inspect source entries]

NOW: SOMEONE AT THE LANDING              Waiting for your choice
[Current published narration]

──────── What will you do? ─────────
[Ask who sent the visitor]
[Withdraw to the shelter]
```

“Recent developments” becomes “Since you last opened this story” **only** when a reliable viewer-specific baseline is implemented. Keep the digest to 2–4 decisive facts, expandable to Journal; no infinite automatic tick feed. If no new facts exist, do not manufacture a return ceremony.

## Target desktop layout: holds and uncertainty

**Rule:** preserve last verified fiction while a **separate literal system-status lane** explains the problem. The appearance of a hold must not make the game look like an error-prone form. Different holds can coexist and need precise action authorization.

```text
THE WATCH'S CLAIM                 [Last verified]
[Readable saved passage]

STATUS
  Checking whether your "Inspect the badge" attempt was accepted.
  The next move is not available until this is confirmed.
  [Check action status] (GET existing operation; never new action)
```

Other examples: **Paused by you**, **Storyteller unavailable**, **Allowance reached**, **Decision waiting**, **No activity underway**. Each has its own truthful recovery. A failed optional historical report does **not** erase the current scene.

## Small screen: deliberate reflow, not desktop compression

```text
┌───────────────────────────────────┐
│ ‹ Stories   Greywake          ⋯  │
│ Waiting for your choice          │
│                                   │
│ SOMEONE AT THE DOOR               │
│ [Readable full narrative prose]   │
│                                   │
│ Repair stopped · 3/9 saved        │
│ [Details about repair]            │
│                                   │
│ ── What will you do? ──────────   │
│ [Ask who sent the visitor]        │
│ [Withdraw to shelter]             │
│                                   │
│ [Journal] [Details] (if working)  │
└───────────────────────────────────┘
```

- One actual reading column, logical DOM order, no horizontal scroll at narrow widths or 400% zoom.
- Critical status is visible without opening Details. The full source passage remains available.
- Touch targets are comfortable and spaced; WCAG 2.2 SC 2.5.8 minimum is 24×24px with exceptions, but important option rows should aim for generous touch areas rather than merely meeting the minimum.
- No sticky footer covering text or duplicated action buttons that could dispatch twice. If a long passage makes choices hard to locate, a nonmutating “Jump to choices” link may improve navigation.
- The user can close overlays and return to the same scene/focus. No hover-only states.
- On-screen keyboard cannot occlude a future custom-intent draft or commit confirmation.

## Story switching and navigation rules

- On authenticated story A→B, the stage never flashes A's title/prose/action as B. The viewer/story Query keys and local offer state reset according to current architecture.
- Journal and Details inspection are **non-time-spending**; opening a record is not automatically an in-world attempt.
- Old history entries do not contain active choice buttons. A recent notification opens **current** Now unless a safe read-only target was intended.
- A story title is not guaranteed in the current `StorySnapshot` projection; do not fabricate persistent title from revision or auto-captured first paragraph. The first slice may display the actual published passage title or a verified library title if safely available.
- An unknown character/location/date is omitted or given a meaningful **known unknown** label only when necessary.
- Settings are not embedded as a constantly visible form beside the story. Access through a clear out-of-fiction Settings control; preserving its RHF dirty state/Query revisions is mandatory.

## Character/world adaptivity

A microbe may have sensing and exposure, but no gold, backpack, world map or humanoid skills. A bodiless mind may have no fixed geographic location. The **same stage** works using contextual condition names and a few truthful facts. World/You are conditional **details destinations**, not mandatory six-tab navigation.

No image is mandatory. A world-specific illustration can add atmosphere but never authorizes facts or leaks hidden map knowledge.

## Motion rules for the first stage

- Ordinary choice click: immediate interaction feedback; no success animation until backend settles.
- New **published** passage: subtle transition keyed to immutable passage/event identity, no replay on refetch.
- Work at earned milestone: modest factual progress cue; not a rolling real-time productivity counter.
- Interruption: active work visuals stop; new published scene becomes focus.
- Missing provider: retain latest verified content; no continuous animated "AI thinking" stage replacing it.
- Reduced motion preserves every status and action.

**No Motion library is mandatory for UX01/UX02.** CSS transitions suffice unless a specific real scene change needs coordinated, measurable effects. See [motion](../system/motion.md).

## Anti-default UX rejection checklist

The first implementation **fails** if:
1. Current prose sits in one box while History/Settings/Technical Details occupy a permanent right rail.
2. Every option includes “Add as later activity,” even in a tense dialogue.
3. A story with no meaningful location shows `revision 23` where a reader expects atmosphere.
4. Every mode is identical cards with a different status badge.
5. The player must look at raw fact IDs, fictional-second horizon or mechanical boundary counts to play.
6. A static image slot or map appears for a nonhuman abstract world.
7. A client countdown claims work completed before a server receipt.
8. A stale offer remains interactive after a newer scene arrives.
9. An error forces the player to resubmit a potentially paid/irreversible operation.
10. A screen reader can't identify the current passage and active choice zone.
11. The page is pretty in one screenshot but requires a separate explanation for what happens if the browser closes.
12. A primary nav tab leads to an unimplemented/dead surface.

## Implementation source ownership and phasing

- **UX01** owns the **frame and layout primitives**: story identity/back, spacing/type/surface tokens, responsive single-stage container and safe navigation affordances. It does **not** move Play state ownership or implement Journal/World/You features.
- **UX02** owns the **published narrative/situation composition** and movement of existing sidebar content *out of the primary reading area* where a working destination exists. It uses current `StorySnapshot`; no new mechanic.
- **UX03** owns action patterns, preventing technical options/plan UI dominating scenes.
- **UX04** owns detailed truthful time, holds and committed vs predicted states.
- **UX07/UX08** own the final Journal and contextual World/You destinations.
- **UX12** owns plan-ahead UI, not the single-action choice.
- **UX09/UX10** own public demo and motion after the main experience is coherent.

**Crucial scope:** a Storybook screenshot of this composition is **design evidence**, not server/Storyteller proof. No code changes are implied by saving this Markdown file.

## Required browser critique after UX01/02

For a **source-grounded** scene and an **honest mock** of an interrupted activity, capture:
- 1440px desktop, 768px medium and 375px phone;
- first viewport plus scrolled decision area with long prose;
- two realistic nonhuman/abstract states with missing optional data;
- 400% zoom, keyboard, focus navigation and reduced motion;
- hidden/failed image (should not affect layout);
- state after switching stories and while an older passage is being read.

A human must judge whether the player sees **a world, a situation, an intention and continuity**, not a table of process controls. If the stage still feels like a styled CMS page, challenge the absence of atmosphere and the relevance of action/context, not merely change button colors.
