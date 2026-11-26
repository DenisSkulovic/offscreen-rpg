# Mastra

## Fit
TypeScript agent framework with tools, memory, workflows, model routing and observability. [Core 1.86.0 tag](https://github.com/mastra-ai/mastra/tree/@mastra/core@1.86.0), Nov 25, Apache-2.0 core, Node >=22.13. Inspected manifest aliases three AI provider protocol generations, includes server, telemetry and retry dependencies; wider footprint than small loop SDK. [Agent source](https://github.com/mastra-ai/mastra/blob/@mastra/core@1.86.0/packages/core/src/agent/agent.ts) contains durable resume logic, lease claims and suspension machinery; not evidence that all effects are exactly-once. Relevant methods include resumeGenerate/resumeStream and tool approval paths; selected source anchors only, not audit of 17k-line class.

## Temporal integration distinction
[May 12 announcement](https://mastra.ai/blog/introducing-temporal-workflows) describes @mastra/temporal, core >=1.32.0, createWorkflow -> Temporal Workflow and createStep -> Activity. This supports durable workflow steps, not necessarily every inference inside agent.generate within a step. Must establish whether current agent integration exposes per-round Activity boundary; exact @mastra/temporal package manifest and source not retrieved in this pass (tool call budget reached). Do not claim unsupported behavior. Mastra also has its own persisted agent suspension/resume, raising ownership question analogous to LangGraph.

## Control
[Tool hooks](https://mastra.ai/docs/agents/tools) before/after, argument transform and suspend/approval. After hook does not run for skipped/declined tools; don't use after hook as complete authorization audit. Must test hooks for nested agents, workflows, memory, MCP and all provider retries. Its model routing and memory could be valuable in isolation; avoid replacing our versioned Library, spending and game authority with generic store.

## Specimen
If primary cohort fails, inspect exact Temporal package and agent durable loop source; model call inside Activity vs per-model Activity; reproduce crash after first model, tool effect, approval interruption and concurrent resume. Verify custom provider and direct metering, no default gateway egress, no unmanaged memory/index writes. Compare number of distinct state stores and adapter complexity. Confirm all hosted/telemetry opt-ins disabled. No proof.

## Assessment
Reserve, likely overbroad for initial target. Could be a great platform if we intentionally adopted its conventions; currently those overlap with capabilities we explicitly own. Keep it as an alternative rather than reinventing agent loop if narrower SDKs fail.
