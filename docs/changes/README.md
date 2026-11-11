# Code-bearing Changes

**Current priority:** [engineering portfolio renewal](../../TODO.md). This is an implementation work queue, **not** a product-feature wish list, a technology shopping list, or an archive of previous project decisions. See the [Change standard](../../.agents/references/change-work-unit-standard.md) and [Change workflow](../../.agents/skills/change-workflow/SKILL.md).

Current change: none

**None is intentional.** The repository is currently refining its planning/documentation ecosystem; no implementation is selected or authorized. `pnpm repo:brief` must report this state without silently reviving an old gameplay plan. A linked Change indicates selection, **not** permission for provider spending, deployment, migration or unrelated code modification. Implementation requires its recorded state/owner approval and task-specific permissions.

**Portfolio readiness requirement:** significant refactors/modernization require a [target-first design](../../.agents/rules/target-driven-renewal.md), source-grounded gap audit, and exact criterion → Change → proof mapping. A list of code smells is not enough. Candidate packets may be `Proposed`; they do not become executable until the target and selected scope are approved.

## What belongs here

One `CHANGE.md` per **significant, bounded, code-bearing outcome**: source, test, script, schema, migration or executable configuration. This includes behavior, bugs, refactors, performance, security, tooling and architectural simplification. It need not add game functionality; a React maintainability improvement or correct realtime event boundary can be a Change. An investigation, product brainstorm, documentation-only cleanup, evaluation run, or broad modernization theme **is not** a Change.

Keep each packet minimal: problem and observed baseline; technical authority; smallest intended delta and exclusions; happy and discriminating negative case; safe verification; owner, state and next permitted step. Add `PLAN.md` only if multiple resumable slices justify it. For tiny localized edits, a task instruction and diff may suffice without creating a dossier.

## Queue

| Category | Packet | Scheduling and authority |
| --- | --- | --- |
| **Active** | **None** | Do not infer work from the presence of a folder |
| Parked gameplay Change | [S3a: continuity evidence report](2026-11-11--s3a-continuity-report/CHANGE.md) | Proposed, historically selected but **deprioritized**; no implementation authorization |
| Next portfolio Changes | Not yet specified | Select a focused expert review (e.g. React code quality **separately** from UI design) and inspect actual source before writing a packet |

The [legacy feature dossiers](../features/README.md) describe initiatives, prior proposals, evaluation and historical implementation. They are not queued Changes. Four evaluation/completed-history dossiers were retired with [preserved decisions and immutable sources](../features/RETIRED-2026-11-11.md); do not automatically import them into this queue. The explicitly owner-retained canon-invention policy remains dormant.

## Selecting and closing a Change

1. Owner chooses **one engineering outcome** from the [roadmap](../../TODO.md), not an entire React/backend/UX rewrite. Current source first; an improvement must have a baseline, competing alternatives and a reason to do it.
2. Settle required product/technical authority and choose one observable code delta, normal/negative acceptance and safe test. Write a concise `CHANGE.md`; if selected, replace the single `Current change:` declaration above with a relative link to that packet. `Proposed` is not `Ready`.
3. When explicitly approved, give Cursor or another executor the [bounded handoff](../../.agents/skills/cursor-handoff/SKILL.md), preserving adjacent behavior and excluding unrelated changes.
4. Compare actual diff and checks with the packet, document design/evidence at permanent owners, close the Change and return the declaration to `none`. Git retains history; don't cultivate a graveyard of active plans.

**Acceptance of the work system itself:** a fresh agent must correctly report no active Change now; recognize S3a as parked; classify a pure evaluation/doc edit as not a Change; and describe how an independently verifiable React refactor would become one. CLI checks and fresh-agent routing still need actual verification.
