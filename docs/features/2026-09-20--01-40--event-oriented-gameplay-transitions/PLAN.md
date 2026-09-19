# Implementation plan

Feature: [Event-oriented gameplay transitions](FEATURE.md).
Execution scope: approved incremental refactor of finite-action and activity settlement; no gameplay change or generic event bus.
Implementation owner: Codex at the owner's request; reviewer: Codex diff review.

## Phases

### E1 — finite-action transition seam

- Outcome: finite-action settlement produces an explicit typed transition whose state, lifecycle fact and follow-up intents are applied atomically by the application boundary.
- Owners: `packages/application/src/campaign` plus architecture/application navigation docs.
- Invariants: one transaction, one roll/receipt, exact target tick, existing story hold and consequence workflow, no provider call.
- Checks: source-level main/wait/retry trace and a focused application TypeScript build after the coherent coding tranche, if useful under the current verification policy.
- Exit: settlement no longer directly imports narration or hold implementations, and the transition/follow-up switch is exhaustive.
- Status: implemented; focused application typecheck passed.

### E2 — activity transition seam

- Outcome: activity completion emits the same typed follow-up language while its process-specific settlement policy remains separate.
- Owners: activity settlement, report/scene adapters and relevant QA documentation.
- Invariants: quiet stays quiet; reports remain historical/non-controlling; scenes own the campaign hold; chains revalidate before continuation.
- Checks: source trace of quiet/report/scene, interruption and retry paths; batched package checks only after the edits.
- Exit: downstream behavior can change without adding another branch to mechanical progress calculation.
- Status: implemented; focused application typecheck passed.

### E3 — consolidation and fitness boundary

- Outcome: duplicated lifecycle coordination is reduced where the two migrations demonstrate a stable common shape; permanent docs and import boundaries prevent regression.
- Owners: campaign application modules and lightweight architecture checks if an existing mechanism fits.
- Invariants: no speculative universal execution table or generic subscriber framework.
- Exit: durable decisions live in permanent docs, progress is accurate, and this feature folder can be removed.
- Status: pending E2.

## Current checkpoint

- Current phase and exact next action: E3; review the two demonstrated shapes for only stable shared lifecycle coordination, add a lightweight boundary safeguard if it pays for itself, then fold final documentation and remove this feature folder.
- Base/reviewed Git revision and relevant uncommitted changes: E1 is committed/pushed at `af3a834`; E2 activity policy and adapter changes are pending commit.
- Actual checks/results for this revision; checks not run: `pnpm --filter @offscreen/application typecheck` passed after both E1 and E2. No runtime or broad suite was run under the POC verification policy.
- Unresolved findings/blockers: no blocker. Accepted-plan continuation remains synchronous domain coordination by design; it is not being disguised as an asynchronous event.
- Provider spend and accounting certainty: no provider calls; $0 model spend. Cumulative OpenRouter usage/balance not verified.
