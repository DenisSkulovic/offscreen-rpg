# AC06 | inspected source and ownership

Repository `DenisSkulovic/offscreen-rpg`, source baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`; reviewed target `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`. Existing source is inspected from the lean snapshot `53d88b455f42` and GitHub compare to current main; affected implementation files for this batch did not change between these revisions (the repository lifecycle/tooling changes elsewhere are current and not source targets). New paths are explicit planned artifacts, not existing files. Verify relevant HEAD and prerequisites before dispatch. No local WSL or active worktree inspection was available to planner.

## Gap and callers

- Predecessor contracts, `admitMission`, `assembleContext`, `createMissionLedger/resolveOutcome`, `selectCapabilities/createSdkTools` are exact frozen internal dependencies. No legacy application code.
- Pinned Vercel `generateText` source [0411a13d](https://github.com/vercel/ai/blob/0411a13df36b20bf6c67c82c1056e99d0e48257b/packages/ai/src/generate-text/generate-text.ts): onStepEnd selected over deprecated onStepFinish (lines 595–622, 702); `stepToolCalls` invalid skipped near 1490; inserted tool-error near 1621; stops on length/content-filter/unfinished; return parses nonempty text even nonnormal finish near 1930. `step-result.ts` supplies toolCalls/toolResults/content/text/finishReason. `onStepEnd` only for completed step; inspect returned steps as final cross-check, don't double-count. Do not infer success from result.text or output parsing.
- Pinned Temporal integration [165fe93b](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/vercel-ai-sdk/src/provider.ts): `TemporalLanguageModel` constructor accepts ActivityOptions; workflow import only; nonstreaming invokeModel via proxyActivities. Cancellation delivered to plugin through heartbeat/abortSignal; `activities.ts::heartbeatUntilDisposed` uses timeout/2. No plugin root in workflow bundle.
- Native SDK has no custom loop needed; use onStepEnd to make ledger sticky before next round, stopWhen with isStepCount + fault predicate. Test fixture-only host uses separate Worker setup, no runtime production registration. Temporal owns progress and cancellation. AC08 proves native edge behaviors; if API cannot meet semantics stop to planner, not replacement loop.

## Write boundary

- `packages/ai/agent-core/src/loop/generate.ts`
- `packages/ai/agent-core/src/runtime/execute.ts`
- `packages/ai/agent-core/src/telemetry/summary.ts`
- `packages/ai/agent-core/src/workflow.ts`

All app/legacy package source, migrations, deployments and production registrations remain unchanged. No source extraction or legacy reorganization in E1. Parent owns only its own packet closure and serialized target updates; no broad rename. [Group schedule](../README.md) governs cross-Change locks.
