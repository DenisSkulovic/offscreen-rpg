# Google Agent Development Kit (TypeScript)

## Fit
Agent types, runner, session/event flow, workflow graphs and delegation. Source release [2.5.0](https://github.com/google/adk-js/tree/b1b94c0d501c3d1eb028aa413d783d6573f6c785), core/src/runner/runner.ts and core/src/workflow/graph.ts; Apache-2.0 core. Core dependencies include Google GenAI/Vertex, OTel, MikroORM and Zod, so footprint may exceed narrower candidates. Do not equate dependency on Google packages with mandatory hosted service. Need neutral model adapter proof.

## Temporal boundary
[TemporalModel](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/google-adk/src/model.ts#L143-L206) proxies model calls when in Workflow, but outside Workflow resolves real LLM directly. This is a specific bypass seam: production composition must never expose unguarded non-Workflow path. [Worker activities](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/google-adk/src/activities.ts#L89-L161) resolve custom modelProvider or LLMRegistry; fallback must be disabled by our provider or reject unknown routes. [HTTP retry setup](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/google-adk/src/activities.ts#L455-L526) explicitly pins Google client single attempt and classifies status/headers into Temporal retry policy. Still not custody. [activityAsTool](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/google-adk/src/tools.ts) maps tool to Activity. Source also tracks absorbed model failures and node retry/abort; inspect how graph or node retries may issue additional paid attempts. Guide's in-memory runner in Workflow uses recorded state; do not add separate session authority by default.

## Current compatibility warning
Plugin peer @google/adk >=2.0.0 <2.4.0 excludes inspected 2.5.0 release. Upstream integration README labels Google ADK public preview while rolling docs/announcement may differ. Treat maturity as version-specific, not GA claim. Pin compatible release before experiment. [Integration guide](https://docs.temporal.io/develop/typescript/integrations/google-adk-agents), [upstream manifest](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/google-adk/package.json).

## Risks and specimen
Prove custom provider (not just Gemini), exact reasoning/tool/usage mapping, no LLMRegistry fallback, scoped Activity arguments, interrupt/resume, parallel graph nodes and cancellation. A node retry must not convert uncertainty into new dispatch permission. Avoid built-in persistence and hosted tools unless justified. Verify session data and telemetry destinations. Compare core dependency footprint and TypeScript/Zod peers to primary cohort.

## Assessment
Reserve contender, not eliminated. Useful if graph-driven delegation becomes central; currently peer-version lag and portability risk make it less efficient to investigate first. Reconsider if primary cohort fails or ADK compatible release offers distinctive needed behavior. No runtime proof.
