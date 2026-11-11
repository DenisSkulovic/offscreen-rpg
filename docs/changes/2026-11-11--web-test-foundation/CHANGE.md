# Change W01: Isolated React/Next unit and component test foundation

**State:** Proposed. **Owner:** human repository owner (design approval required); **executor:** Cursor or another explicitly selected coding agent after approval. **Permission:** documentation planning only now; no application edits/tests/service/provider/deployment authorized by this packet.
**Type:** bounded code/test/config improvement, **not a gameplay feature**.
**Scheduling:** First; baseline for following frontend Changes.
**Source baseline:** GitHub `a92695e8dbf4403aa7e52e8ff9a66dbe760ea06d` (source inspected; no tests run); revalidate the branch, working tree, and actual source before Ready.

## Target alignment

- **Desired architectural end state:** [React/Next F criteria](../../engineering/targets/react-next.md#end-state-architectural-contract): F10 (with F3/F4 as first proof candidates).
- **Audited gap:** [November 11 source audit](../../engineering/audits/react-next-gap-2026-11-11.md#diagnostic-findings-ranked-by-portfolio-engineering-importance): G04.
- **Why this slice belongs:** First; baseline for following frontend Changes. This contributes a checkable part of the target, not a free-standing cleanup campaign.

## Outcome and motivation

Add a fast, provider-free `@offscreen/web` test command and focused pure/component checks. Evaluate Vitest + React Testing Library against existing Node test/Playwright infrastructure; choose one simple setup, not two competing runners. Preserve the existing integrated Playwright tests under `tools/api-integration`.

## Authority and source

- **Existing behavioral authority:** [client and identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), and [code quality](../../engineering/code-quality.md), selected according to the affected operation.
- **Actual source starting points:** `apps/web/package.json`, `apps/web/src/lib/story-transport.ts`, `apps/web/src/features/play/view.tsx`, `tools/api-integration/test/stories-browser.integration.ts`. Paths are inspected anchors, **not** permission to expand scope silently.
- **Relevant professional lenses:** test-strategy; testing-and-quality-evidence; frontend-engineering. Use selected `.agents/skills/` and `.agents/knowledge/` sections before design/execution; do not preload everything merely for ceremony.
- **Decisions that remain open:** Select a single web-local test runner compatible with installed Node 24/Next 16/React 19 and report its incremental maintenance cost. If current source fails a desired target test, record it as a gap and leave that test unmerged or explicitly red pending the owning Change.

## Code scope, exclusions and safety

Add a fast, provider-free `@offscreen/web` test command and focused pure/component checks. Evaluate Vitest + React Testing Library against existing Node test/Playwright infrastructure; choose one simple setup, not two competing runners. Preserve the existing integrated Playwright tests under `tools/api-integration`.

**Preserve/exclude:** Do not fix app behavior to make tests green; don't write imagined expectations, execute integration DB resets or replace existing end-to-end coverage. Retain present Nest authority, server session/owner checks, stable story revisions, timed effects and billing holds. No private data or provider packets in tests/artifacts. No destructive DB action without separate authorization.

## Acceptance and negative proof

- **Normal acceptance:** A fresh agent can run a documented focused web test command with no DB reset, worker startup or game-provider call; initial tests truthfully validate current version-selection and a representative visible component state.
- **Discriminating rejection/failure case:** A deliberately lower same-story version must not replace a newer one; a fake server success must not be counted as proof of Nest-side authorization or exactly-once effects.
- **Verification ladder:** first a pure provider-free unit/component test where applicable, then only the narrow existing real browser/API integration needed to prove the cross-boundary claim; inspect database-reset side effects in [integration README](../../../tools/api-integration/README.md) before any run. Record exact commands/results, not imaginary green checks.

## Handoff and next action

**Next permitted step:** source revalidation and architecture/acceptance decision review only. Upgrade to Ready **only after** the owner has reviewed the [target](../../engineering/targets/react-next.md), this scope and its negative proof, and separately authorized implementation. Then use [Cursor handoff](../../../.agents/skills/cursor-handoff/SKILL.md) for a focused execution packet. Do not infer permission from queue order.

**Closing condition:** actual bounded diff + truthful focused verification + target F-criterion evidence + permanent documentation reconciliation. Return queue selection to `none` and retain history in Git.
