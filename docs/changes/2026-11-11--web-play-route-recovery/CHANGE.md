# Change W07: Accessible Play loading, errors and recovery states

**State:** Proposed. **Owner:** human repository owner (design approval required); **executor:** Cursor or another explicitly selected coding agent after approval. **Permission:** documentation planning only now; no application edits/tests/service/provider/deployment authorized by this packet.
**Type:** bounded code/test/config improvement, **not a gameplay feature**.
**Scheduling:** After stable snapshot/command state; can first prepare read-only UX scenarios.
**Source baseline:** GitHub `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d` (source inspected; no tests run); revalidate the branch, working tree, and actual source before Ready.

## Target alignment

- **Desired architectural end state:** [F9](../../engineering/targets/react-next.md#f9-accessible-resilient-ux-engineering-distinct-from-art-direction).
- **Audited gap:** [November 11 source audit](../../engineering/audits/react-next-gap-2026-11-11.md#diagnostic-findings-ranked-by-portfolio-engineering-importance): G08.
- **Why this slice belongs:** After stable snapshot/command state; can first prepare read-only UX scenarios. This contributes a checkable part of the target, not a free-standing cleanup campaign.

## Outcome and motivation

Add appropriately scoped Play route loading/error/not-found treatment, semantic and focus-safe recovery for existing pending/conflict/failed/blocked/uncertain states; ensure 401 goes through approved sign-in flow. Use existing visual language until a separate owner-approved art-direction target exists.

## Authority and source

- **Existing behavioral authority:** [client and identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), and [code quality](../../engineering/code-quality.md), selected according to the affected operation.
- **Actual source starting points:** `apps/web/app/play/[id]/page.tsx`, `apps/web/app/stories/error.tsx`, `apps/web/src/features/play/view.tsx`, `apps/web/app/style.css`, `docs/technical/client-and-identity.md`. Paths are inspected anchors, **not** permission to expand scope silently.
- **Required professional review routes:** [player-experience-design](../../../.agents/skills/player-experience-design/SKILL.md); [interaction and accessibility](../../../.agents/knowledge/interface-design-craft.md#5-behavior-feedback-and-accessibility); [Next.js error boundaries](https://nextjs.org/docs/app/api-reference/file-conventions/error). Consult these specific sections to choose the mechanism, not merely to check off a skill name.
- **Decisions that remain open:** Agree expected/uncaught error classification with Next 16 route boundaries and test representative mobile/keyboard cases in a real browser. A source-only audit cannot prove WCAG.

## Code scope, exclusions and safety

The **Outcome** above is the complete intended source/test delta; do not expand it based on unrelated findings. Validate the exact current owners before coding.

**Preserve/exclude:** No sweeping visual redesign, new design system, provider calls, disabling meaningful status, or automatic retry of story commands. Retain present Nest authority, server session/owner checks, stable story revisions, timed effects and billing holds. No private data or provider packets in tests/artifacts. No destructive DB action without separate authorization.

## Acceptance and negative proof

- **Normal acceptance:** Keyboard-only users can distinguish authenticated loading, genuinely missing content, recoverable upstream errors and current stored story outcome; focus is visible/restored and status is conveyed without requiring technical IDs.
- **Discriminating rejection/failure case:** Upstream failure must not claim an inaccessible story is deleted, an uncertain paid generation must not offer an automatic new paid attempt, and a stale response must not replace the current scene after recovery.
- **Verification ladder:** first a pure provider-free unit/component test where applicable, then only the narrow existing real browser/API integration needed to prove the cross-boundary claim; inspect database-reset side effects in [integration README](../../../tools/api-integration/README.md) before any run. Record exact commands/results, not imaginary green checks.

## Handoff and next action

**Next permitted step:** source revalidation and architecture/acceptance decision review only. Upgrade to Ready **only after** the owner has reviewed the [target](../../engineering/targets/react-next.md), this scope and its negative proof, and separately authorized implementation. Then use [Cursor handoff](../../../.agents/skills/cursor-handoff/SKILL.md) for a focused execution packet. Do not infer permission from queue order.

**Closing condition:** actual bounded diff + truthful focused verification + target F-criterion evidence + permanent documentation reconciliation. Return queue selection to `none` and retain history in Git.
