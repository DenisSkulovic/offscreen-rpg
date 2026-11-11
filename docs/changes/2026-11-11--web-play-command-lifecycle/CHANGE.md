# Change W04: Recoverable Play intent and command lifecycle

**State:** Proposed. **Owner:** human repository owner (design approval required); **executor:** Cursor or another explicitly selected coding agent after approval. **Permission:** documentation planning only now; no application edits/tests/service/provider/deployment authorized by this packet.
**Type:** bounded code/test/config improvement, **not a gameplay feature**.
**Scheduling:** After W01+W03; focus ordinary Play and campaign commands.
**Source baseline:** GitHub `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d` (source inspected; no tests run); revalidate the branch, working tree, and actual source before Ready.

## Target alignment

- **Desired architectural end state:** [F5](../../engineering/targets/react-next.md#f5-one-recoverable-mutation-model).
- **Audited gap:** [November 11 source audit](../../engineering/audits/react-next-gap-2026-11-11.md#diagnostic-findings-ranked-by-portfolio-engineering-importance): G03.
- **Why this slice belongs:** After W01+W03; focus ordinary Play and campaign commands. This contributes a checkable part of the target, not a free-standing cleanup campaign.

## Outcome and motivation

Define a small typed command state transition and stable operation/payload identity for Play choice/control and campaign command flows, reusing the authoritative snapshot controller. Consolidate identical retry/conflict handling while preserving endpoint-specific legality. Don't fold preview/presets/Chamber into a huge generic sender.

## Authority and source

- **Existing behavioral authority:** [client and identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), and [code quality](../../engineering/code-quality.md), selected according to the affected operation.
- **Actual source starting points:** `apps/web/src/features/play/view.tsx`, `apps/web/src/features/play/use-campaign-command.ts`, `apps/web/src/features/play/resolution-recovery.tsx`, `apps/web/src/lib/story-transport.ts`, `apps/api/src/modules/stories/controller.ts`. Paths are inspected anchors, **not** permission to expand scope silently.
- **Required professional review routes:** [state, mutations and optimism](../../../.agents/knowledge/frontend-state-and-async.md#5-mutations-and-optimism-are-temporary-claims); [idempotency and retries](../../../.agents/knowledge/api-and-network-contracts.md#3-method-status-identity-and-retry-semantics). Consult these specific sections to choose the mechanism, not merely to check off a skill name.
- **Decisions that remain open:** Decide the minimal common state interface after tracing the actual 200/202/409/400/401 and recovery semantics; a single universal helper is not an objective.

## Code scope, exclusions and safety

The **Outcome** above is the complete intended source/test delta; do not expand it based on unrelated findings. Validate the exact current owners before coding.

**Preserve/exclude:** No Storyteller/provider retry without authorization, API schema redesign, charging inference, new app framework, replacement of backend idempotency or silent command re-dispatch. Retain present Nest authority, server session/owner checks, stable story revisions, timed effects and billing holds. No private data or provider packets in tests/artifacts. No destructive DB action without separate authorization.

## Acceptance and negative proof

- **Normal acceptance:** UI distinguishes submitting, accepted/pending, conflict, uncertain completion and reconciled saved state; one intent preserves one stable UUID/payload across allowed retries and routes the final snapshot through the same version owner.
- **Discriminating rejection/failure case:** Inject timeout after backend commits and retry the *same* operation key; ensure one effect and no false settled outcome. Simulate 409 after a competing update; current server state wins without reusing a stale intent.
- **Verification ladder:** first a pure provider-free unit/component test where applicable, then only the narrow existing real browser/API integration needed to prove the cross-boundary claim; inspect database-reset side effects in [integration README](../../../tools/api-integration/README.md) before any run. Record exact commands/results, not imaginary green checks.

## Handoff and next action

**Next permitted step:** source revalidation and architecture/acceptance decision review only. Upgrade to Ready **only after** the owner has reviewed the [target](../../engineering/targets/react-next.md), this scope and its negative proof, and separately authorized implementation. Then use [Cursor handoff](../../../.agents/skills/cursor-handoff/SKILL.md) for a focused execution packet. Do not infer permission from queue order.

**Closing condition:** actual bounded diff + truthful focused verification + target F-criterion evidence + permanent documentation reconciliation. Return queue selection to `none` and retain history in Git.
