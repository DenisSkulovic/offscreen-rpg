# Change W05: One identity-aware Play refresh lifecycle

**State:** Proposed. **Owner:** human repository owner (design approval required); **executor:** Cursor or another explicitly selected coding agent after approval. **Permission:** documentation planning only now; no application edits/tests/service/provider/deployment authorized by this packet.
**Type:** bounded code/test/config improvement, **not a gameplay feature**.
**Scheduling:** After W03; may follow W04 for shared reconciliation owner.
**Source baseline:** GitHub `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d` (source inspected; no tests run); revalidate the branch, working tree, and actual source before Ready.

## Target alignment

- **Desired architectural end state:** [F6](../../engineering/targets/react-next.md#f6-revalidation-and-live-update-strategy).
- **Audited gap:** [November 11 source audit](../../engineering/audits/react-next-gap-2026-11-11.md#diagnostic-findings-ranked-by-portfolio-engineering-importance): G06.
- **Why this slice belongs:** After W03; may follow W04 for shared reconciliation owner. This contributes a checkable part of the target, not a free-standing cleanup campaign.

## Outcome and motivation

Centralize Play's read-only refresh scheduling and cancellation around one story identity/version owner. Preserve the existing immediate server-supplied snapshot, pause/hold semantics and 2-second diagnostic baseline unless evidence favors another interval. Specify background/foreground behavior and visible recovery from persistent read failure.

## Authority and source

- **Existing behavioral authority:** [client and identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), and [code quality](../../engineering/code-quality.md), selected according to the affected operation.
- **Actual source starting points:** `apps/web/src/features/play/view.tsx`, `apps/web/src/lib/story-transport.ts`, `apps/web/src/features/developer-tools/chamber/use-chamber-play.ts` (comparison only), `apps/web/src/features/stories/opening-preview.tsx` (comparison only). Paths are inspected anchors, **not** permission to expand scope silently.
- **Required professional review routes:** [Effects and lifetimes](../../../.agents/knowledge/frontend-state-and-async.md#2-effects-are-lifetimes-not-generic-event-handlers); [React sync with Effects](https://react.dev/learn/synchronizing-with-effects). Consult these specific sections to choose the mechanism, not merely to check off a skill name.
- **Decisions that remain open:** Choose an explicit pause/resume policy for hidden tabs and re-entry, verifying whether an unresolved operation requires background polling; rely on a fresh authoritative read when visible.

## Code scope, exclusions and safety

The **Outcome** above is the complete intended source/test delta; do not expand it based on unrelated findings. Validate the exact current owners before coding.

**Preserve/exclude:** No SSE/WebSockets introduction, new backend events, service workers or unrelated Chamber/preview refactor. Retain present Nest authority, server session/owner checks, stable story revisions, timed effects and billing holds. No private data or provider packets in tests/artifacts. No destructive DB action without separate authorization.

## Acceptance and negative proof

- **Normal acceptance:** Pending/held Play status refreshes without resubmitting commands, terminates on unmount/resource switch and reconciles once through the resource-safe snapshot policy; errors lead to truthful refresh controls.
- **Discriminating rejection/failure case:** Navigate A→B during A poll, hide/restore the tab or inject repeated offline reads; no A rendering under B, no timer duplication, no expensive mutation and no unbounded retry storm.
- **Verification ladder:** first a pure provider-free unit/component test where applicable, then only the narrow existing real browser/API integration needed to prove the cross-boundary claim; inspect database-reset side effects in [integration README](../../../tools/api-integration/README.md) before any run. Record exact commands/results, not imaginary green checks.

## Handoff and next action

**Next permitted step:** source revalidation and architecture/acceptance decision review only. Upgrade to Ready **only after** the owner has reviewed the [target](../../engineering/targets/react-next.md), this scope and its negative proof, and separately authorized implementation. Then use [Cursor handoff](../../../.agents/skills/cursor-handoff/SKILL.md) for a focused execution packet. Do not infer permission from queue order.

**Closing condition:** actual bounded diff + truthful focused verification + target F-criterion evidence + permanent documentation reconciliation. Return queue selection to `none` and retain history in Git.
