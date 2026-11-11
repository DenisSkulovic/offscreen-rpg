# Change W06: Cohesive CampaignPlay composition and derived state

**State:** Proposed. **Owner:** human repository owner (design approval required); **executor:** Cursor or another explicitly selected coding agent after approval. **Permission:** documentation planning only now; no application edits/tests/service/provider/deployment authorized by this packet.
**Type:** bounded code/test/config improvement, **not a gameplay feature**.
**Scheduling:** After W03/W04 where required; do not parallel edit their files.
**Source baseline:** GitHub `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d` (source inspected; no tests run); revalidate the branch, working tree, and actual source before Ready.

## Target alignment

- **Desired architectural end state:** [React/Next F criteria](../../engineering/targets/react-next.md#end-state-architectural-contract): F7 (with F9 semantic preservation).
- **Audited gap:** [November 11 source audit](../../engineering/audits/react-next-gap-2026-11-11.md#diagnostic-findings-ranked-by-portfolio-engineering-importance): G07.
- **Why this slice belongs:** After W03/W04 where required; do not parallel edit their files. This contributes a checkable part of the target, not a free-standing cleanup campaign.

## Outcome and motivation

Refactor only `CampaignPlay` into meaningful presentational sections for current state, activities/time, contextual actions and prior reports, with pure derived selectors where valuable. Keep state/command ownership in one understandable place; avoid one component per paragraph or a generic UI framework.

## Authority and source

- **Existing behavioral authority:** [client and identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), and [code quality](../../engineering/code-quality.md), selected according to the affected operation.
- **Actual source starting points:** `apps/web/src/features/play/campaign-play.tsx`, `apps/web/src/features/play/use-campaign-command.ts`, `apps/web/src/features/play/view.tsx`, `packages/contracts/src/campaign.ts`. Paths are inspected anchors, **not** permission to expand scope silently.
- **Relevant professional lenses:** architecture-decision-space; frontend-engineering; player-experience-design. Use selected `.agents/skills/` and `.agents/knowledge/` sections before design/execution; do not preload everything merely for ceremony.
- **Decisions that remain open:** Before extraction, diagram which sections are pure view/derivation and which coordinate interaction. Document the strongest reason to **keep** a cohesive section un-split.

## Code scope, exclusions and safety

Refactor only `CampaignPlay` into meaningful presentational sections for current state, activities/time, contextual actions and prior reports, with pure derived selectors where valuable. Keep state/command ownership in one understandable place; avoid one component per paragraph or a generic UI framework.

**Preserve/exclude:** No new gameplay mechanics, no new visual theme, no rewriting the command API, no splitting by line-count quotas, no new global store. Retain present Nest authority, server session/owner checks, stable story revisions, timed effects and billing holds. No private data or provider packets in tests/artifacts. No destructive DB action without separate authorization.

## Acceptance and negative proof

- **Normal acceptance:** An engineer can trace a choice, an accepted activity and a paused action through a small number of clearly owned modules; all currently available controls and public semantics remain intact.
- **Discriminating rejection/failure case:** A staged successor choice, disabled action, held campaign clock, paused/resumed activity and receipt/history still render and behave identically under provider-free fixtures; no new game outcome is inferred from the UI.
- **Verification ladder:** first a pure provider-free unit/component test where applicable, then only the narrow existing real browser/API integration needed to prove the cross-boundary claim; inspect database-reset side effects in [integration README](../../../tools/api-integration/README.md) before any run. Record exact commands/results, not imaginary green checks.

## Handoff and next action

**Next permitted step:** source revalidation and architecture/acceptance decision review only. Upgrade to Ready **only after** the owner has reviewed the [target](../../engineering/targets/react-next.md), this scope and its negative proof, and separately authorized implementation. Then use [Cursor handoff](../../../.agents/skills/cursor-handoff/SKILL.md) for a focused execution packet. Do not infer permission from queue order.

**Closing condition:** actual bounded diff + truthful focused verification + target F-criterion evidence + permanent documentation reconciliation. Return queue selection to `none` and retain history in Git.
