# UX07 | Returning to a life and reading its actual history

**State:** Done (2026-11-13). **Approval:** Owner authorized continuing the UX sequence; Cursor landed UX07 (narrow truthful Journal; no “since you left”). **Kind:** frontend return/chronology behavior + tests. **Parent:** [experience program](../../experience/implementation-program.md) M2. **Dependencies:** UX02 and UX04 (Done); verified public history data.

## Cursor first-screen brief

> **Current-source map:** [Play owner](../../../apps/web/src/features/play/README.md); inspect history.tsx, ui/campaign-history.tsx, ui/campaign-records.tsx and shared/api/story-history-query.ts.
> **Primary target:** [return journey](../../experience/flows/return-and-memory.md#return-is-a-distinct-flow-not-a-permanent-modal) and [Journal architecture](../../experience/flows/return-and-memory.md#journal-information-architecture).
> **Known trap:** paged published passages are not necessarily a full event ledger or a reliable “last seen” record. A friendly LLM recap must not claim uncommitted facts.
> **Scope:** **Authorized for UX07.** Start with sourced Journal and honest “Recent developments.” “Since you left” needs a viewer-seen projection contract if not already supported — do not invent it.

## Target and alternative

The person returns after days and should understand **what actually happened, what did not, and what needs attention now**. The Journal is a focused long-life reading surface: brief sourced overview (only if available), chronology and inspectable original details. No compulsory chapters, no hundred-card activity feed.

Alternative rejected for the main stage: an unfiltered full chronology beneath the latest passage; it buries current agency. Journal is separate for reflection, with direct return to the actual current Now.

## One code-bearing outcome

- Source-anchored published passage chronology, authentic committed event summaries where projected, readable groupings and paginated earlier history.
- Small factual “Recent developments” panel for verified events, linking to current situation. Do not falsely label “Since you last visited” based on a login timestamp.
- Story-specific Journal navigation; old options are read-only. Browsing never advances game time.
- A true quiet interval is legitimate: no fabricated progression, threat or literary summary.
- Stable deep-link, scroll, focus, story identity and changing read-model version.
- If richer relevance/search/last-seen requires new backend data, stop at narrow truthful presentation and request a separate contract.

## Authority and baseline

[Reading a long life](../../player-experience.md#reading-a-long-life), [passage/summary vocabulary](../../concepts.md#execution-and-storage-concepts), [UX return](../../experience/flows/return-and-memory.md), [React Query history semantics](../../engineering/targets/react-next.md#2-tanstack-query-architecture-exact-operating-contract).

Current storyHistorySchema exposes paged {id,sequence,content} and nextBefore, with some campaign reports/events separately in CampaignView. This does not establish a complete read cursor or reliable relationship index. Main baseline 8c91618 inspected 2026-11-13; re-check source and DTO before Ready.

Likely code: apps/web/src/features/play/history.tsx, ui/campaign-history.tsx, ui/campaign-records.tsx, focused presentational components and tests. Authenticated Journal route is optional if reviewed. Preserve viewer/story Query identity and server authorization.

**Exclude:** model summarization on load, rewriting published passages, invented chapters or NPCs, unapproved memory indexing, hidden Storyteller directions, secret DCs and new notification pipelines.

## Acceptance and negative proof

**Normal:** an interrupted beacon shows the real 3/5 work progress, arrival and currently open decision; 20+ history entries page correctly; a long absent but idle character shows no imaginary hours; an older passage is browseable but not actionable; a nonhuman story reads without fantasy-specific metadata.

**Negative:** unpublished opening candidate never appears as historical canon; failed generated recap doesn't erase records; Story A cannot appear under viewer/story B; secret checks not exposed; stale notification doesn't resurrect past options; duplicate infinite Query page cannot duplicate passages; “Since you left” is forbidden until a true seen cursor exists.

**Evidence:** Storybook fact-rich and quiet cases, RTL pagination/race/identity, actual wide/narrow keyboard browser walk; no paid providers.

## Handoff

At readiness, inventory exactly which passages, activity events, receipts and per-viewer seen markers exist. Cursor implements a deliberately narrow truthful history first and separately identifies missing data contracts.