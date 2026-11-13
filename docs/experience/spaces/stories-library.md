# Stories library | choose the life that needs you

**Status:** end-state experience. This page is a modest entryway, not the game itself or an operations console.

## Core question

“I have three different lives. Which one is doing something, which one needs me, and how do I return?”

Lead with the **most relevant existing story** (last opened or genuine attention need; rules to rank can be simple and deterministic). A story tile contains: title/premise, one-line last *confirmed* situation, an understandable **current progression state**, last meaningful change if known, and a clear **Enter story** action.

Do not build a table of database statuses. Do not show backend activity IDs, timestamp columns, model price, raw revisions or generic “View” buttons.

## Distinguish these classes of stories

| Player label | Meaning | Expected action |
| --- | --- | --- |
| **Needs your decision** | Canonical decision currently open | Enter at current choice |
| **Continuing** | An admitted commitment has a real active bound | Enter and inspect actual progress |
| **Paused by you** | Manual pause persists | Enter and choose if/when to resume |
| **Waiting for you to begin** | No accepted activity, no action in flight | Enter and choose next intention |
| **Stopped: explanation** | Mandatory generation or other condition blocked | Enter for exact recovery |
| **Ended** | A terminal story state is truly committed | Read the history or supported fork |
| **Draft** | Not yet a started story | Continue creation |

These are **derived player descriptions**, not an instruction to add matching database enums. A story list that cannot honestly distinguish them needs a revised public projection or a narrower display; do not infer “Continuing” from title/last modified alone.

## Layout

- Featured return card for a meaningful current story, then a compact list/grid of other stories.
- Separate **Drafts** from active stories so “Continue setup” cannot be mistaken for “Return to life.”
- One visible **Create a story** affordance; an optional **Try demo** link for unfamiliar accounts.
- Elegant empty state: small promise, one prepared beginning and custom creation action; not an empty “No records found” panel.
- Mobile: one-column, clear status text, meaningful row click target, minimal menu. Account/settings controls are unobtrusive.
- Long story titles and oddly named nonhuman premises should not break layout or be truncated so severely that two stories look identical.

## Surface states

Initial loading has a genuine content skeleton only as needed. Empty state is distinct from error. Auth/session expiry preserves no private cached content in the next account context. A story being removed/updated in another tab should not leave a clickable stale action. Derived attention state may update after SSE; use server reads and version reconciliation rather than running client timers to infer progress.

## Portfolio first impression

A recruiter who comes from GitHub may reach the demo without creating an account. If they choose account play, the library should demonstrate the conceptual distinction between “story continues while away” and “nothing underway” before requiring advanced configuration. It should be visually inviting rather than a list of test fixtures with internal names.

## Negative checks

No story status is fabricated from the mere passage of real time. Draft not treated as a live story. A paused story is never labeled “Continuing.” A blocked provider task cannot appear as successful progress. Switching viewer identity does not show another account's story titles even momentarily.
