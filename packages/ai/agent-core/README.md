# Agent Core

`@offscreen/agent-core` is the selected E1 grouped workspace for generic mission contracts and, in later Changes, Workflow-safe execution. Selected meaning stays in the [Agent Core technical contract](../../../docs/technical/platform/agent-core.md#concrete-mission-contract) and the [package map](../../README.md). This package does not own story fiction, storage adapters, billing, or provider wire protocols.

## Current source

The public root export is serializable `AgentDefinitionV1`, `MissionV1`, and `MissionOutcomeV1` plus `missionWorkflowId`, which returns `agent-core-e1-${missionId}`. There is no Worker, client, or model import in that closure. The `./workflow` export path is declared; `src/workflow.ts` is not part of this Change and arrives with the native loop.

`pnpm --filter @offscreen/agent-core build` and `typecheck` compile `src`. `test` runs `node --test test/*.test.mjs` and must stay offline. `qualify` is explicit (`node test/qualification.mjs`) and is never invoked by `test`. Fixtures, runtime, and live qualification are absent until successor Changes. Build, typecheck, ordinary tests, frozen install, and joint proof are **NOT RUN** here; AC08 owns them. AC-M04 remains open until that qualification.

## Limits still in force

One synthetic text model, static fixture tools, and retained Temporal history only. No production consumer, real provider, SQL, or package move. Future gates are the [intentionally limited resolution](../../../docs/technical/platform/agent-core.md#intentionally-limited-resolution-and-future-gates) table. Medium findings AC-M01 through AC-M04 stay with their named owners in that contract.
