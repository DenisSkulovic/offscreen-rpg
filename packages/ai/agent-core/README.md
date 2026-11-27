# Agent Core

`@offscreen/agent-core` is the selected E1 grouped workspace for generic mission contracts and, in later Changes, Workflow-safe execution. Selected meaning stays in the [Agent Core technical contract](../../../docs/technical/platform/agent-core.md#concrete-mission-contract) and the [package map](../../README.md). This package does not own story fiction, storage adapters, billing, or provider wire protocols.

## Current source

The public root export is serializable `AgentDefinitionV1`, `MissionV1`, and `MissionOutcomeV1` plus `missionWorkflowId`, which returns `agent-core-e1-${missionId}`. There is no Worker, client, or model import in that closure. The `./workflow` export path is declared; `src/workflow.ts` arrives with the native loop.

Internal admission is `admitMission` and `assembleContext`. `createMissionLedger` / `resolveOutcome` keep a per-run step and tool budget: denial outranks limit, then failure, then a normal nonempty stop. These modules do not import Temporal or the AI SDK. Requested tools are copied and never expanded. The fixture envelope is 1–3 steps, 2 tool attempts, and 4096 UTF-16 code units of instructions or input.

`pnpm --filter @offscreen/agent-core build` and `typecheck` compile `src`. `test` runs `node --test test/*.test.mjs` and must stay offline. Admission and limit tests import `dist`. `qualify` is explicit (`node test/qualification.mjs`) and is never invoked by `test`. Test fixtures live under `test/fixtures/` and are not a public export. They provide two immutable definitions, a conversation-driven `e1-synthetic` model, and a guarded synthetic tool Activity. The model plugin download hook rejects every request with `download-disabled`. There is no real provider, network, file, or credential access. A local `tsc --noEmit` passed for the admission source. Focused `node --test test/fixtures.test.mjs` passed on the AC07 branch. Package `build`, the admission/limit tests, and joint proof are **NOT RUN**. AC08 still owns native qualification, including the ungranted-tool case. AC-M03 and AC-M04 remain open until that qualification.

## Limits still in force

One synthetic text model, static fixture tools, and retained Temporal history only. No production consumer, real provider, SQL, or package move. Future gates are the [intentionally limited resolution](../../../docs/technical/platform/agent-core.md#intentionally-limited-resolution-and-future-gates) table. Medium findings AC-M01 through AC-M04 stay with their named owners in that contract.
