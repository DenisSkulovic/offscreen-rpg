# UX02 | replace form-centric Play with a readable living scene

**State:** Proposed. **Approval and owner:** design only; owner has not authorized Cursor to code.  
**Kind:** frontend behavior and composition refactor + tests.  
**Parent:** [Experience program](../../experience/implementation-program.md), M1. **Dependency:** UX01 shell.

## Cursor first-screen brief

> **Current-source map:** [Play ownership map](../../../apps/web/src/features/play/README.md), inspect `view.tsx`, `ui/campaign-play.tsx`, `ui/campaign-status.tsx` and currently used Storybook fixtures.  
> **Governing target:** [selected Living Stage](../../experience/spaces/living-stage-blueprint.md#target-desktop-layout-current-scene-with-decision), [narrative/action threshold](../../experience/patterns/narrative-presentation.md#the-narrativeaction-boundary), [attention hierarchy](../../experience/patterns/state-and-attention.md#attention-priority-whowhat-deserves-the-stage).  
> **Known trap:** SSE/Query can publish a newer passage while the user reads: never steal scroll/focus or resurrect stale choices. The current Play sidebar mounts **History, Settings, and Technical IDs**. Moving those out of the main stage must preserve functional access, and opening/closing a settings drawer must not discard dirty React Hook Form edits.  
> **Scope/permission:** **Proposed only**. When authorized, recompose the present scene and status visually. Keep Play Query/command source ownership and game mechanics intact. UX03 owns the action grammar.

## Target alignment and alternatives

The current situation is **not** a backend state inspector. A playable scene has comfortable story typography, a relevant title/context, actual present prose and a clearly related action area. A narrative-first stage beats a generic message thread because the game owns scenes, long waits, people and real world history. It beats a statistics dashboard because current fiction is the primary job.

Alternative to test: a narrow editorial prose column with no contextual shelf versus an editorial column + light shelf. Do not introduce a permanent right rail just to use desktop width.

## One complete outcome

Recompose the present Play stage and adapt it to **true view states** without changing the authoritative command lifecycle:
- Show a human situation header, current passage title and paragraphs, legible reading width.
- Relevant status: current decision / ongoing / hold / no accepted activity / blocked. A state with no narrative image remains art-directed.
- One place for a relevant pending/uncertain status, not a spinner that erases the current prose.
- Long and short passages behave; an incoming update is discoverable but does not steal focus/scroll.
- Separate previously committed passage from a loading draft/candidate; never present uncommitted prose as current canon.
- Place a **structurally separated decision zone** for existing authorized choices, without adding new action types; UX03 owns refined option patterns.
- Remove **permanent** History, Settings and Technical ID panels from the narrative hierarchy, but maintain safe **on-demand access**: history may use an interim read-only disclosure until UX07, settings must preserve dirty edit/revision/conflict state across open/close, and developer IDs belong behind an explicit technical disclosure.

## Authority and baseline

- Product contract [present experience](../../player-experience.md#inside-a-story), [scene vocabulary](../../concepts.md#player-and-world-concepts).
- Design [Now](../../experience/spaces/now.md), [accessibility](../../experience/system/accessibility-and-voice.md).
- Engineering [React Query ownership](../../engineering/targets/react-next.md#2-tanstack-query-architecture-exact-operating-contract).
- Source: current `PlayScene` reads one viewer/story-keyed snapshot; the source map says `useStoryLiveUpdates` invalidates Query and `view.tsx` renders current. Baseline GitHub main `8c91618` inspected 2026-11-13; **not browser-tested**, recheck after Cursor's other work.

## Scope

Expected `apps/web/src/features/play/view.tsx`, `ui/campaign-play.tsx`, plus existing history/settings composition **only for ensuring functional access**, and focused components/tests/Storybook. Keep the current Query mutation owners; do not add a second state store. A few style tokens may extend UX01. Keep server authority, every existing submit/control command and source-visible status. If new nuanced view fields are needed, request a separate public projection contract, not frontend inference.

**Exclude:** opening/creation, Storyteller mechanics, new chatbot, map, fictional narrative generation, Journal data redesign (UX07), plan editing (UX12), free-form intentions, paid provider interactions and a general settings feature rewrite. Do not break Chamber or public Demo through shared CSS.

## Acceptance

**Normal:**
1. Long passage and one contextual decision render without chat bubbles or telemetry cards.
2. Story title/location/date appear only if known; a nonhuman scene need not invent physical geography.
3. A paused/held/no-active scene is understandable without reading a technical README.
4. 30-second pending provider work shows the last verified passage and truthful status; no false in-world aging.
5. Story passage navigation and browser hydration preserve visible text with no duplicate initial mount query side effects.

**Negative:**
1. SSE updates newer story while user reads earlier prose: no forced scroll or focus grab; an accessible new-content affordance appears.
2. Old story's passage cannot flash in new story's stage.
3. An acknowledged-but-not-settled operation cannot display a completed result.
4. Missing picture or missing optional character fields cannot crash layout; no raw revision substitutes for a missing story title.
5. Error boundary recovery on 503 must not submit a new game action.
6. Settings opened then closed during a dirty edit **preserves or explicitly guards unsaved values**; Journal affordance is functional if shown, never a dead navigation tab.
7. Chamber, scripted public demo, and existing creation remain functional after CSS/global layout changes.

**Evidence:** Storybook long-text/empty/hold/pending fixtures, RTL focus/semantics, narrow/wide screenshots, one authenticated browser case when safe and authorized. Visual review is mandatory, not inferred from snapshots.

## Handoff

Recheck current source and scope before marking Ready. Treat the [Living Stage blueprint](../../experience/spaces/living-stage-blueprint.md) as the chosen screen anatomy and collect real wide/narrow browser evidence. The owner explicitly authorizes code; a Proposed dossier isn't automatic execution permission. UX03 will supply precise intention behavior; UX04 owns time/holds. If UI labels require unavailable server fields, split data contract rather than concealing it. Cursor returns source proof, render screenshots and unknown states.
