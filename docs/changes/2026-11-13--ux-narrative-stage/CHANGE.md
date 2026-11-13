# UX02 | replace form-centric Play with a readable living scene

**State:** Proposed. **Approval and owner:** design only; owner has not authorized Cursor to code.  
**Kind:** frontend behavior and composition refactor + tests.  
**Parent:** [Experience program](../../experience/implementation-program.md), M1. **Dependency:** UX01 shell.

## Cursor first-screen brief

> **Current-source map:** [Play ownership map](../../../apps/web/src/features/play/README.md), inspect `view.tsx`, `ui/campaign-play.tsx`, `ui/campaign-status.tsx` and currently used Storybook fixtures.  
> **Governing target:** [Now first viewport](../../experience/spaces/now.md#the-contract-of-the-first-viewport), [passage stage](../../experience/spaces/now.md#2-passage-stage), [experience thesis](../../experience/foundations/experience-thesis.md).  
> **Known trap:** a new passage may arrive via SSE/Query while a user is reading; forcibly scrolling to the latest paragraph or remounting the whole stage will harm reading and may resurrect stale choices.  
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
- Place a clear dedicated area to which UX03 will attach contextual intentions; do not implement new action types here.

## Authority and baseline

- Product contract [present experience](../../player-experience.md#inside-a-story), [scene vocabulary](../../concepts.md#player-and-world-concepts).
- Design [Now](../../experience/spaces/now.md), [accessibility](../../experience/system/accessibility-and-voice.md).
- Engineering [React Query ownership](../../engineering/targets/react-next.md#2-tanstack-query-architecture-exact-operating-contract).
- Source: current `PlayScene` reads one viewer/story-keyed snapshot; the source map says `useStoryLiveUpdates` invalidates Query and `view.tsx` renders current. Baseline GitHub main `8c91618` inspected 2026-11-13; **not browser-tested**, recheck after Cursor's other work.

## Scope

Expected `apps/web/src/features/play/view.tsx`, `ui/campaign-play.tsx`, focused display components, tests and Storybook. A few style tokens may extend UX01. Keep server authority, every existing submit/control command and source-visible status. If new nuanced view fields are needed, request a separate public projection contract, not frontend inference.

**Exclude:** opening/creation, Storyteller mechanics, new chatbot, map, fictional narrative generation, entire previous history reimplementation, free-form intentions and paid provider interactions.

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
4. Missing picture or missing optional character fields cannot crash layout.
5. Error boundary recovery on 503 must not submit a new game action.

**Evidence:** Storybook long-text/empty/hold/pending fixtures, RTL focus/semantics, narrow/wide screenshots, one authenticated browser case when safe and authorized. Visual review is mandatory, not inferred from snapshots.

## Handoff

Recheck current source and scope before marking Ready. UX03 will supply precise intention behavior; UX04 owns time/holds. If UI labels require unavailable server fields, split data contract rather than concealing it. Cursor returns source proof, render screenshots and unknown states.
