# Leaving the game deliberately | offscreen handoff flow

**Status:** player journey destination. The current engine supports explicit individual commitments and some bounded accepted chains; generalized standing routines, default reactions, notifications and broad autonomy are **future mechanics**. Technical source: [accepted-plan semantics](../../time-and-autonomy.md#bounded-plans-for-absence). Product alternative: [time models](../foundations/temporal-philosophy.md).

## User intent

“I'm done playing for now. What exactly will my character keep doing, what could happen, and when will I have to come back?”

This should take **seconds**, not configuring a scheduler. A user might be leaving for three hours, eight hours or a week. The game must state **what was authorized**, not merely that an “Autonomy” toggle is enabled.

## The three levels available in a designed UI

### Level 1 | Leave an already accepted task running

**Common case:** the player commits to one supported repair, journey or wait. If it continues in the backend without an open tab, **no separate exit ritual is necessary**.

Near the task status: “You can close this page. This work continues until its admitted limit or an interruption.” This information must be true for the current server task and not merely a reassuring slogan.

Actions: **Back to Stories**, **Review work**, and any genuinely supported **Pause**. Do not ask “Continue while I’m away?” after the activity is already accepted and guaranteed to continue: that adds a redundant confirmation and hints that closing the page might cancel it.

### Level 2 | Authorize a short bounded itinerary (near-term where engine supports it)

**Entry:** from a quiet situation where the Storyteller has already authorized several compatible tasks. An affordance “Plan a little ahead” opens a **single focused review sheet**, not an advanced queue editor.

```text
PLAN YOUR NEXT STRETCH

Start with
  [Secure the loose tools]

Then, if still possible
  [Return to beacon repair (3/9 already earned)]

Stop when
  [These tasks finish]     (if supported)
  [After a bounded in-world duration]

If an unexpected decision is needed
  [Stop and wait for me]   (current safe solo default)

What can change
  Work may be interrupted; next steps are checked
  again when their turn arrives.

[Back]                          [Begin this plan]
```

**Important:** this is a *conceptual UI*. If actual accepted plan contract requires an exact horizon in game seconds, the app can calculate/admit it from a **human-readable world duration** captured by the current rules, but must not invent calendar mappings. A bounded plan may need a fixed horizon even if the UI describes natural stopping conditions.

### Level 3 | Standing-life handoff (future)

**Entry:** an existing consistent role/routine is available and its supported rules can be captured. A possible user sentence: “Keep repairing the beacon each morning when conditions permit. Stop if an unusual event needs my decision or the allowed time ends.”

**Mandatory preview:** what can repeat, how many times, where time stops, known resource/risk caps, whether the character may choose among prepared safe alternatives, and what cannot happen without fresh consent. Never generate this from an arbitrary instruction and call it “accepted” without typed rule admission.

This level must be designed with the **engine**, not implemented in UX02/03/04 as a decorative toggle.

## Decision to leave does not equal a new command

The browser closing/tab navigation is never the authority trigger for progression. One previously accepted activity/plan already owns whether time advances. “Leave for now” should usually be a navigation action. The UI may suggest an explicit handoff **before** leaving if there is nothing underway, but do not automatically create a plan or spend model tokens merely because the user moved away.

**Avoid the classic illusion:** “Your character will keep living!” is false if no commitment exists. Tell the truth: “Nothing is currently underway. You can begin an activity or leave the story as it is.”

## From a quiet harbor scene: precise journey

Assume H4 has reauthorized secured-tool task B and saved repair A (3/9). The player wants B then A without hovering over the page.

1. **Discover:** “Plan ahead” appears as an optional secondary action in a quiet moment, not next to every dramatic choice.
2. **Choose first:** “Secure the tools.” Show that this begins B and doesn't retroactively finish it.
3. **Choose next:** “Resume existing repair A, still 3/9 earned.” The UI must not clone A just because the label was chosen again.
4. **Review bounds:** human-readable supported horizon, stop at any new decision, prerequisites rechecked, resource/risk limits visible.
5. **Commit once:** one immutable accepted plan identity, no duplicate on button mash/reload. Only the **first activity** is admitted to run now.
6. **Leave:** no browser polling required; server resumes/settles in background within bounds.
7. **On return:** show which entries actually completed, what remained blocked, current condition and if a decision is waiting. The entry “Repair A completed” appears only if its reward and final check were settled.

**Current UI conflict:** player-facing `Add as a later activity` and `Successor horizon in fictional seconds` controls were observed in `ui/campaign-offer.tsx`; these are good evidence of an implementation-oriented flow to replace, not a desirable game grammar. See [source audit](../evidence/current-ui-source-audit.md).

## A future step becomes ineligible

If securing tools changes the environment or someone has moved the beacon, the next step is **revalidated at its start**. The plan may stop as blocked. The return should say: “The repair did not resume. The work area was no longer available.” It must not silently skip failed prerequisites unless an approved skip/fallback explicitly exists.

**This protects agency:** the player authorized a conditional plan, not a promise that the future world would comply.

## Change course, pause, cancel pending, abandon

These are **four different meanings**, and may have different backend support.

| Intent | Player-language copy | Rule implication | UX guard |
| --- | --- | --- | --- |
| Pause current execution | “Pause repair” | Retain progress; stop eligible time | Only when supported and server-confirmed |
| Cancel future plan legs | “Cancel the remaining steps” | No new successor starts; current task may continue | Do not accidentally abandon current work |
| Change course while working | “Change what happens next” | Usually suspend current participation, preserve earned progress, admit replacement | Requires real domain rule; not a generic UI switch |
| Abandon a saved task | “Give up this repair” | Potentially irreversibly lose ability to resume and/or progress | Separate explicit high-stakes confirmation |

**Do not use the word Cancel for all four.** A user should know whether current work will continue if future plan legs are canceled.

## Consent when risk matters

A routine can have bounded known risk without disclosing private encounter chance. Before accepting a plan, state meaningful public risks and required intervention behavior. “Stop if danger needs your choice” is different from “Fight automatically.” Do not assume that choosing an aggressive Storyteller authorizes attacks or irreversible trades while absent.

For multiplayer, a player cannot choose on behalf of a partner simply by making a group plan. Shared time, party travel and pause authority need their own admitted contract; near-term solo UX cannot secretly define these policies.

## Resume after absence: four screen outcomes

| Actual world after leaving | What the player sees first | What they can do |
| --- | --- | --- |
| Still running first task | Current effort and next verified boundary | Leave again / permitted control |
| First task done; second active | Concise factual transition, current work | Inspect, maybe pause |
| Interrupted by new decision | **Current scene** and action; old task shown suspended | Resolve scene |
| Plan exhausted/blocked | “Your plan stopped here” and why | Choose fresh authorized intention |

Do **not** show a spinner called “Autonomy active” for a completed plan with no next step. Do not require clicking through report-only text between already accepted compatible legs.

## Small-screen interaction

Planning is a **modal sheet/dedicated focused subview** with clear title, logical summary and natural-language stop conditions. The player sees first action, next actions and bounds before confirming, without long forms or horizontal multi-column drag/drop. Editing a future step should preserve the other choices and not spend fictional time. Keyboard and touch must have equal parity.

## Acceptance criteria

- Player can accurately answer: **“What happens if I close this page?”** after one work start.
- Plan review identifies **which commitments are future conditionals** and the hard bound; not guaranteed accomplishments.
- Wrong/duplicate click cannot accept two plans.
- Cancel pending doesn't cancel active repair or discard 3/9 progress.
- Interruption holds incompatible future legs and presents a decision; no hidden auto-combat.
- No fictional time advances if the user leaves with no admitted activity/plan.
- When a plan step fails eligibility, the UI explains the blocker and preserves truthful history.
- Future standing-routine controls are absent until tested and supported; no fake checkbox.
