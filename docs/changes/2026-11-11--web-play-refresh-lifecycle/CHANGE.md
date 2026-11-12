# Change W05 | One bounded, visibility-aware Play snapshot refresh lifecycle

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no source edits, CLI/DB reset, browser service run, provider call, deploy or migration authorized by this packet.  
**Code baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source-inspected, no runtime tests). Executor must revalidate the current branch and preserve unrelated work.  
**Dependency:** W01 + W03; after W04 is desirable if command and refresh share an owner.

## Why this is a Change

**Target:** [React/Next end-state](../../engineering/targets/react-next.md), criteria **F3 F4 F6 F9**. **Gap:** [2026-11-12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G18**.  
**Desired single code/test/config outcome:** Play refresh is a read-only, cancellable, bounded lifecycle with explicit hidden/visible/reconnect/error behavior and a single W03 reconciliation path.

**Observed source owners:** `apps/web/src/features/play/view.tsx`, `apps/web/src/lib/story-transport.ts`, `apps/web/src/features/developer-tools/chamber/use-chamber-play.ts` (read/comparison), `apps/web/src/features/stories/opening-preview.tsx` (read/comparison).

## Proposed design contract (not an invitation to redesign)

Schedule at most one read per active Play resource, only when snapshot indicates unresolved work. Use cleanup on unmount, story/viewer change and dependency transition, plus abort/ignore for late completion. When document hidden, suspend repeated polling and immediately schedule a fresh authorized read on visibility/focus return; on recurrent GET failures show actionable stale-status/refresh affordance and bounded retry/backoff. Avoid wall-clock claims of authoritative completion. Timer only reads GET; neither timer nor effect may dispatch generation, resolution, controls, or provider calls. No generic event-bus/polling framework.

## Expected bounded implementation

1. Extract only the resource-scoped refresh lifetime policy, controlled by current snapshot and browser visibility.
2. Route manual/command/timer reads to the same W03 accept path, prevent overlap and timer reset loops.
3. Test hidden-tab, offline/reconnect, settling while hidden, rapid A→B and Strict Mode mount/cleanup.

## Falsifiable acceptance and proof

- **Normal case:** Pending/held Play becomes current after backend update or returning to visible tab without duplicate mount fetch and without unnecessary settled-state polling.
- **Discriminating negative case:** Two concurrent timers or late A GET cannot overwrite B; 503 does not cause unbounded 2s failures or claim success; hidden tab never dispatches a mutation.
- **Check and evidence:** Fake clock/visibility events in web component tests; controlled browser test with no provider calls when permitted. Record request-count/time strategy and source-only limits.
- **Completion receipt:** Document exact conditions to start/stop/resume reads, what errors look like, real request-count observation if measured.

## Boundaries, alternatives and stop conditions

- **Keep / do not touch:** No SSE, WebSocket, React Query adoption, Chamber/Preview wholesale rewrite, application worker changes or UX redesign.
- **Principal risk:** Do not accidentally stop required reconciliation forever when a tab hides; resync explicitly on show. Do not create an Effect loop from unstable callbacks.
- **Alternative tested conceptually:** keep the existing owner with focused tests/repair instead of extracting modules; any larger framework/library must show that it meets these exact invariants with lower total maintenance and session complexity.
- **Stop/refer back:** if actual API semantics, resource lifetime, policy or source changed so this contract no longer holds, report the contradiction and revise the owning target/packet with the human. Cursor may choose local code techniques, **not** change product policy, authorization or paid-call behavior on its own.

## Executor handoff once approved

Read the [target](../../engineering/targets/react-next.md) criteria **F3 F4 F6 F9**, audit **G18**, [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md) and the source owners above. Implement **only this outcome** in reviewable diff(s); preserve existing behavior. Run the cheapest truthful check including the negative case; return changed paths, exact commands/results, unknowns and next proposed Change. Do not infer implementation authority from this packet's presence.
