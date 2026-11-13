# UX04 | make earned time visible without lying about progress

**State:** Proposed. **Approval and owner:** design only; Cursor not yet permitted to implement.  
**Kind:** player-facing status/progress/hold behavior + focused tests; potential **separate** public-projection request if gaps discovered.  
**Parent:** [Program](../../experience/implementation-program.md) M1. **Dependencies:** UX02, UX03.

## Cursor first-screen brief

> **Current-source map:** [Play source map](../../../apps/web/src/features/play/README.md), `ui/campaign-activity.tsx`, `ui/campaign-status.tsx`, `ui/campaign-records.tsx`, `model/campaign-projections.ts`, `view.tsx`; inspect `packages/contracts/src/campaign.ts` only for public DTO fields.  
> **Governing target:** [time and truth](../../experience/patterns/time-and-truth.md#keep-four-clocksconditions-conceptually-separate), [Now state compositions](../../experience/spaces/now.md#now-state-compositions).  
> **Known trap:** elapsed fictional time is NOT productivity; an expired client countdown is NOT a settled reward; paused/suspended work doesn't silently advance.  
> **Scope/permission:** proposed only. Rendering/refactoring supported states, **no new scheduling logic** and no provider calls.

## Target and skeptical alternative

A journey/work/recovery is an actual condition of a life. Make it emotionally tangible and understandable, not a task runner with a progress widget. The running view should state what the character is **attempting**, what was **committed** and what remains **conditional**. A simple textual milestone is preferable to a false percentage.

Alternative: one all-purpose “progress %” is cheap and visually polished but mechanically wrong for contribution work, travel with interruptions, or unknown processes. Reject it.

## One bounded outcome

On the Now stage:
1. Present real active commitment title, state, achieved progress and conditional next boundary/real wait only where present and allowed.
2. Distinguish contribution, literal wait and unmodeled travel. Use progress fractions **only** for supported metrics.
3. Surface actual pause, decision, interrupted work, no committed action, generation failure, usage block and uncertain accepted action as distinct player-language conditions.
4. Communicate saved progress during interruption (e.g., beacon 3/5) without keeping a running animation while held.
5. Put relevant stop/resume/change-course controls only where the backend's currently admitted command allows. Never invent an “Abandon” button because it looks useful.
6. Retain an optional inspectable roll/effects record after settlement; no premature dice animation in this Change.

## Authority and baseline

- Game [time and autonomy](../../time-and-autonomy.md), [activity mechanics](../../game-rules.md#first-rules-subset), [receipt/hold semantics](../../technical/committed-time.md).
- UX [time truth](../../experience/patterns/time-and-truth.md), [autonomy](../../experience/patterns/autonomy-and-absence.md).
- Existing `CampaignView` has `activity` with `progress.kind = contribution|wait`, `actionExecution`, `holds` and public `worldTime`; `StorySnapshot` has `waiting`, `resolution`, `decision`. Those are **inspected schemas**, not a guarantee that all desired view states are returned at runtime.
- GitHub main baseline `8c91618` inspected 2026-11-13; revalidate after concurrent W-series work.

## Code scope / non-goals

Likely Play `ui/campaign-activity.tsx`, `ui/campaign-status.tsx`, `model/campaign-projections.ts` and new status presentation pieces; relevant tests/Storybook. Keep exact existing API and Query ownership. If public data lack clear pause authority or predicted boundary, **display less** and create a separate data-projection contract/change. No local clock ownership, unsupported change-course commands, automatic queueing, custom plans, admin metrics or layout-wide timers. **UX04 may display a true accepted plan status but does not build its editor**; the finite, consented plan composition belongs to [UX12](../2026-11-13--ux-offscreen-planner/CHANGE.md).

## Acceptance and contrary evidence

**Normal:**
- Contribution activity: “3/5 units earned” remains at 3 after a failed check even if fictional time increases.
- Literal wait: elapsed fraction shown from admitted seconds; forecast labeled conditional, refresh from server.
- Work at 3/5 interrupted by stranger: work visually stops; scene/action becomes primary; 3/5 preserved.
- Paused work visibly halted across reload. No active commitment explains no fictional time advances.
- When a countdown reaches zero but settlement remains pending, status says it is checking/settling, **not completed**.
- Generation and usage holds differ; already committed mechanics are preserved with an appropriate narrative explanation.

**Negative:**
- Browser clock must never increment earned work or apply reward.
- Changing pace cannot grant more progress or duplicate ticks.
- Unknown ACK cannot trigger a fresh POST on mount.
- Backend reports blocked even though previous version had a running activity: old animation stops and labels refresh.
- A hidden/unknown dueAt is not displayed as a fabricated completion time.
- API secret work plans/hidden DCs do not leak through visual inspector.

**Proof:** contribution-failure and wait tests, paused/blocked/reload fixtures, command recovery RTL, representative browser flow; no paid generation. If needed for connected proof, request separate, explicitly permitted disposable DB work.

## Handoff

Cursor may implement this only after reviewed target and current DTO suitability. If time semantics conflict with destination UX, bring back an explicit **game mechanics decision**, not a silent frontend workaround. Visual acceptance requires watching the live state transition in a browser, not merely inspecting Typescript.
