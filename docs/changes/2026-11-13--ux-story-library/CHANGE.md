# UX05 | Stories library that feels like returning to lives

**State:** Done (2026-11-13). **Approval:** Owner authorized continuing the UX sequence; Cursor landed UX05.
**Kind:** frontend composition and behavior plus tests. **Parent:** [experience implementation program](../../experience/implementation-program.md), M2. **Dependency:** UX01 shell (Done).

## Cursor first-screen brief

> **Current-source map:** [Stories owner map](../../../apps/web/src/features/stories/README.md) and [App Router map](../../../apps/web/app/README.md). Inspect the live story list, draft list and authenticated stories page.
> **Primary target:** [Stories library](../../experience/spaces/stories-library.md#core-question).
> **Known trap:** the current story list schema exposes id/title/storyteller/status, not necessarily pending decisions, active work, or latest committed situation. Do not infer “Continuing” from elapsed time.
> **Permission:** **Authorized for UX05.** No provider or gameplay code, no assumption that rich attention projections already exist beyond the current list `status` string.

## Target alignment and alternative

The user has multiple lives. Each story should answer whether it needs attention, genuinely continues, is paused, or has no activity underway, insofar as the server can establish that fact. Drafts have a separate **Continue creation** route. The stage feels like returning to a small library of worlds, not managing records.

Alternative to challenge: a uniform filterable card grid. Useful for many stories, but a featured story with a clear return action may serve the typical player better. Test both on realistic names and states; do not blindly copy a SaaS dashboard.

## Outcome

- Focused hero/return story, other stories in compact readable list/grid, separate draft space.
- Short title/premise and human-readable progression description from actual authorized data; optional snippet only when really available.
- One explicit **Enter story** and one **Create story** action, clearly distinct from draft continuation.
- Intentional empty-state copy, pagination, keyboard navigation, responsive behavior and long/non-Latin titles.
- Loading, error, session expiry and story switching preserve viewer identity and don't start a game operation.
- If real attention data are not currently projected, ship a restrained honest card rather than pretend to know whether a story is running.

## Authority, source and excluded work

Product [arriving/returning](../../player-experience.md#arriving-and-returning); UX [Stories](../../experience/spaces/stories-library.md); engineering [Query identity](../../engineering/targets/react-next.md#2-tanstack-query-architecture-exact-operating-contract).

Likely owners: apps/web/src/features/stories/live-story-list.tsx, draft-list.tsx, app/(authenticated)/stories/page.tsx, and relevant Storybook/tests. Current infinite Query/SSR hydration and pagination must remain. Baseline main 8c91618 inspected on 2026-11-13; re-inspect the evolving code before Ready.

**Exclude:** new automatic ticking, notification infrastructure, automatic generation on list load, public discovery, raw status dashboards, provider spending, or speculative backend changes. If server lacks a required summary, file a separate typed public-projection Change.

## Acceptance and negative proof

**Normal:** a live story and two drafts are unmistakably distinct; multiple true story states are correctly described where known; pagination preserves order, long title remains identifiable, narrow layout offers obvious actions, empty library invites first play.

**Negative:** last modified is not evidence of an active commitment; paused cannot appear as continuing; story A data never appear in B or a different viewer; loading never triggers Play POST; a failed GET cannot silently replace a known story with “deleted”; returning to a story never advances the fictional clock.

**Evidence:** Storybook states, pagination and identity RTL, wide/narrow captures and keyboard/zoom checks. No paid provider or database-reset operations without separate permission.

## Handoff

Before Ready, inspect precise list DTO and identify genuine versus wished-for attention fields. Cursor implements the narrow truthful composition and reports fields requiring a separate projection contract.