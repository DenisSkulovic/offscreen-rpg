# Story direction and controls | serious decisions, quiet presentation

**Status:** proposed player experience. Game authority remains [Storyteller settings](../../storyteller-settings.md), [time](../../time-and-autonomy.md), [usage policy](../../technical/usage-policy.md) and the selected [React settings lifecycle](../../engineering/targets/react-next.md).

## Settings are not part of the fiction

A story may be surreal, manipulative, comic or unreliable. **Settings copy must remain precise.** A player should know what they can change, what is locked, whether a change affects active work, and whether it costs money. Do not hide these behind a gear icon with 40 unrelated technical inputs.

Organize controls by **player intent**, not schema:
1. **Storytelling**: style/profile, narrative initiative, invention limits, content tone.
2. **Time and absence**: pace, active accepted plans, pause behavior and permitted default responses.
3. **Consequences**: captured risk policy, capabilities/rules where configurable; locked fields explained.
4. **Notifications**: where/when to contact, independently of autonomy.
5. **Usage**: remaining allowance, current binding limit, future window, extra-spend consent if supported.

The first view shows a sentence for each group. Expand to edit only the one relevant to the player's goal. Fields with a large blast radius get a preview of actual consequences.

## A copy-driven setting example

Instead of:
- `speedMultiplier = 60`
- `generationProfile = custom-4`
- `autonomousFallback = true`

Show:
- **Pace:** “One real minute moves the world forward by one fictional hour while an accepted activity is running.” (Only if this mapping is actually selected.)
- **Storyteller:** “Quiet and observant. You decide your own character's actions.”
- **While away:** “Continue approved routines until the chosen limit. Stop for decisions.”
- **Spending:** “Next required narration is held when your allowance is exhausted. No automatic extra charge.”

These sentences are examples of what a valid configuration might mean, not defaults that currently exist.

## Editing and conflicts

- “Save” commits a specific settings revision; do not automatically send model generation.
- The settings form must preserve dirty edits across background Query refreshes, with visible conflict recovery and no silent overwrite.
- When a pace change affects a running commitment, preview the **new real estimate** and clarify that prior earned progress and fictional durations remain.
- Locked story settings display the captured value and why they cannot be changed. Don't fake editability by letting a toggle move and rejecting it on Save.
- Changing Storyteller does not reset history or character state.
- Canon invention may be tightened but cannot exceed pinned foundation ceilings; never reinterpret prior canon silently.
- Risk cannot change as a side effect of selecting a scary narrative tone.

## Provider and cost honesty

The experience should not force players to know model vendors to create or enjoy a story. Advanced providers and usage policy can appear under account/advanced settings. But **where an operation can consume a limited balance or cause a charge, the user needs a truthful summary**. A failed provider operation after mechanical settlement is a different issue from lack of remaining allowance or a network failure.

An external budget refresh is not permission to override a player's explicit pause. Retry controls must identify whether they are fetching an old result or authorizing new paid generation.

## Pause and abandon are not interchangeable

**Pause** suspends supported progression while preserving work and state. **Abandon** intentionally gives up a specific commitment only when rules allow, with explicit effects. A generic “Reset story” button should not exist beside daily play controls. Forking, if supported, is a separate new story branch, not undo in place.

For shared stories, settings authority belongs to actual captured permissions. Do not expose controls that claim one participant can control everyone without an explicit rules contract.

## Acceptance walk

User enters settings from a paused beacon story, switches creative tone (editable), sees that pace is locked, changes notification quiet hours (without changing active world risk), saves one revision and returns to the same paused situation. Another browser tab has updated the settings: the first tab sees a conflict with preserved draft instead of overwriting. No provider generation occurs just by entering/leaving settings.
