# Change W03: Identity-safe story snapshot reconciliation

**State:** Proposed. **Owner:** human repository owner (design approval required); **executor:** Cursor or another explicitly selected coding agent after approval. **Permission:** documentation planning only now; no application edits/tests/service/provider/deployment authorized by this packet.
**Type:** bounded code/test/config improvement, **not a gameplay feature**.
**Scheduling:** After W01; before command/refresh migrations.
**Source baseline:** GitHub `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d` (source inspected; no tests run); revalidate the branch, working tree, and actual source before Ready.

## Target alignment

- **Desired architectural end state:** [F3](../../engineering/targets/react-next.md#f3-identity-and-state-ownership) and [F4](../../engineering/targets/react-next.md#f4-versioned-snapshot-reconciliation).
- **Audited gap:** [November 11 source audit](../../engineering/audits/react-next-gap-2026-11-11.md#diagnostic-findings-ranked-by-portfolio-engineering-importance): G01–G02.
- **Why this slice belongs:** After W01; before command/refresh migrations. This contributes a checkable part of the target, not a free-standing cleanup campaign.

## Outcome and motivation

Create a pure, tested resource-scoped snapshot acceptance/reconciliation policy and apply it to the Play screen. Ensure route/story identity changes reset or isolate story/history/operation-local state deliberately. Limit Chamber changes to adapter compatibility if genuinely required; otherwise plan them separately.

## Authority and source

- **Existing behavioral authority:** [client and identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), and [code quality](../../engineering/code-quality.md), selected according to the affected operation.
- **Actual source starting points:** `apps/web/src/lib/story-transport.ts`, `apps/web/src/features/play/view.tsx`, `apps/web/src/features/play/history.tsx`, `apps/web/app/play/[id]/page.tsx`, `packages/contracts/src/stories.ts`. Paths are inspected anchors, **not** permission to expand scope silently.
- **Required professional review routes:** [frontend state inventory](../../../.agents/knowledge/frontend-state-and-async.md#1-state-inventory-before-library-choice); [race testing](../../../.agents/knowledge/testing-and-quality-evidence.md#5-concurrency-fault-injection-and-sequence-coverage). Consult these specific sections to choose the mechanism, not merely to check off a skill name.
- **Decisions that remain open:** Source-inspect App Router remount behavior and validate it with a controlled browser navigation rather than assuming a mounted instance survives. Choose parent keying versus explicit resource identity controller according to observed behavior.

## Code scope, exclusions and safety

The **Outcome** above is the complete intended source/test delta; do not expand it based on unrelated findings. Validate the exact current owners before coding.

**Preserve/exclude:** No global state library, rewriting Nest snapshot schema, business-state mutations, SSE/WebSockets or unrelated UI style changes. Retain present Nest authority, server session/owner checks, stable story revisions, timed effects and billing holds. No private data or provider packets in tests/artifacts. No destructive DB action without separate authorization.

## Acceptance and negative proof

- **Normal acceptance:** The Play page renders the correct authorized story snapshot, preserves monotonic same-story versions including correct equal-view resolution handling, and has explicit behavior for a new story identity.
- **Discriminating rejection/failure case:** Resolve a delayed A fetch after navigating to B, and v13 after v14 for one story; neither can replace B or v14. A wrong-story command response cannot pass through as a later view version.
- **Verification ladder:** first a pure provider-free unit/component test where applicable, then only the narrow existing real browser/API integration needed to prove the cross-boundary claim; inspect database-reset side effects in [integration README](../../../tools/api-integration/README.md) before any run. Record exact commands/results, not imaginary green checks.

## Handoff and next action

**Next permitted step:** source revalidation and architecture/acceptance decision review only. Upgrade to Ready **only after** the owner has reviewed the [target](../../engineering/targets/react-next.md), this scope and its negative proof, and separately authorized implementation. Then use [Cursor handoff](../../../.agents/skills/cursor-handoff/SKILL.md) for a focused execution packet. Do not infer permission from queue order.

**Closing condition:** actual bounded diff + truthful focused verification + target F-criterion evidence + permanent documentation reconciliation. Return queue selection to `none` and retain history in Git.
