# Change W02: Typed, session-scoped Next server read boundary

**State:** Proposed. **Owner:** human repository owner (design approval required); **executor:** Cursor or another explicitly selected coding agent after approval. **Permission:** documentation planning only now; no application edits/tests/service/provider/deployment authorized by this packet.
**Type:** bounded code/test/config improvement, **not a gameplay feature**.
**Scheduling:** After W01; independent of client controllers.
**Source baseline:** GitHub `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d` (source inspected; no tests run); revalidate the branch, working tree, and actual source before Ready.

## Target alignment

- **Desired architectural end state:** [F1](../../engineering/targets/react-next.md#f1-serverclient-rendering-boundary) and [F2](../../engineering/targets/react-next.md#f2-authentication-privacy-and-api-ownership).
- **Audited gap:** [November 11 source audit](../../engineering/audits/react-next-gap-2026-11-11.md#diagnostic-findings-ranked-by-portfolio-engineering-importance): G05.
- **Why this slice belongs:** After W01; independent of client controllers. This contributes a checkable part of the target, not a free-standing cleanup campaign.

## Outcome and motivation

Extract one small server-only authenticated Nest read/error/timeout helper, used first by the Play and story-list server routes; remove redundant request-handling boilerplate without migrating game authority. Consider parallelizing independent story-list/draft-list reads after validating error policy; do not claim a measured speedup without a trace.

## Authority and source

- **Existing behavioral authority:** [client and identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), and [code quality](../../engineering/code-quality.md), selected according to the affected operation.
- **Actual source starting points:** `apps/web/src/lib/viewer.ts`, `apps/web/app/play/[id]/page.tsx`, `apps/web/app/stories/page.tsx`, `apps/web/app/stories/[id]/page.tsx`, `apps/web/next.config.ts` (inspection only unless needed). Paths are inspected anchors, **not** permission to expand scope silently.
- **Required professional review routes:** [frontend-engineering](../../../.agents/skills/frontend-engineering/SKILL.md); [API status and retry semantics](../../../.agents/knowledge/api-and-network-contracts.md#3-method-status-identity-and-retry-semantics); [browser session security](../../../.agents/knowledge/security-and-trust.md#3-browser-sessions-and-cross-origin-threats). Consult these specific sections to choose the mechanism, not merely to check off a skill name.
- **Decisions that remain open:** Determine response-status treatment for forbidden resources using current Nest contract; prove server-only boundary and auth/no-store header behavior without modifying underlying owner checks.

## Code scope, exclusions and safety

The **Outcome** above is the complete intended source/test delta; do not expand it based on unrelated findings. Validate the exact current owners before coding.

**Preserve/exclude:** No new Next API write handlers, DB access from Next, auth library replacement, speculative caching layer, deployment/proxy overhaul or broad page redesign. Retain present Nest authority, server session/owner checks, stable story revisions, timed effects and billing holds. No private data or provider packets in tests/artifacts. No destructive DB action without separate authorization.

## Acceptance and negative proof

- **Normal acceptance:** Permitted viewer sees server-rendered typed story/list content; 401 routes to sign-in, missing/inaccessible owner-scoped story does not reveal private details, upstream 5xx shows an appropriate failure rather than misleading 404; each private fetch is uncached.
- **Discriminating rejection/failure case:** An anonymous or different-owner user must never receive another person's story HTML or data from a shared cache; changing internal API origin must never be interpreted as client authority or a public response cache.
- **Verification ladder:** first a pure provider-free unit/component test where applicable, then only the narrow existing real browser/API integration needed to prove the cross-boundary claim; inspect database-reset side effects in [integration README](../../../tools/api-integration/README.md) before any run. Record exact commands/results, not imaginary green checks.

## Handoff and next action

**Next permitted step:** source revalidation and architecture/acceptance decision review only. Upgrade to Ready **only after** the owner has reviewed the [target](../../engineering/targets/react-next.md), this scope and its negative proof, and separately authorized implementation. Then use [Cursor handoff](../../../.agents/skills/cursor-handoff/SKILL.md) for a focused execution packet. Do not infer permission from queue order.

**Closing condition:** actual bounded diff + truthful focused verification + target F-criterion evidence + permanent documentation reconciliation. Return queue selection to `none` and retain history in Git.
