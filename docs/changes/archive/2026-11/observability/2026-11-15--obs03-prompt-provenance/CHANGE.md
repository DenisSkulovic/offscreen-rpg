# OBS03 | One real consequence G retains its exact prompt-component and source provenance

**State: Done (2026-11-15).** **Kind:** one purpose-specific Storyteller compiler/selector instrumentation Change, strict small provenance persistence and provider-disabled equality tests. **No prompt rewrite, provider spend, raw-archive retention migration, new public task union or gameplay mechanics.** **Evidence:** [obs03](../../../../../programs/observability/evidence/obs03-prompt-provenance-2026-11-15.md). Product/technical authorities: [prompt source map](../../../../../programs/observability/technical/storyteller-prompt-source-map-v1.md), [context contract](../../../../../programs/observability/technical/context-provenance.md), [archive codecs](../../../../../programs/observability/technical/archive-codecs-and-evolution-v1.md), [source custody](../../../../../programs/observability/technical/protected-artifact-store-v1.md).

## Cursor first screen

> **Result:** for one actually admitted consequence generation G, an authorized diagnostic reader can answer **which code-backed instruction, Storyteller profile, campaign settings revision, pinned canon/root and selected/loaded/pruned evidence** formed its final compiled task request. Every claim has a stable source ref/reason and checksum. Instrumentation must make **no change** to task/request/output schema or serialized bytes.
>
> **Current code to inspect:** `packages/storyteller/src/tasks/index.ts::requestFor/prepareStorytellerTask`; `context/index.ts::contextRequestSections/boundStorytellerContext`; `packages/application/src/storyteller/{canonical-knowledge,task-admission,context-capture,capture-materialization}.ts`; `providers/openrouter.ts::buildOpenRouterRequest/inspectOpenRouterRequest`; current `storytellerTaskSchema v17` and `generation.input`. Preserve `pending-consequence` and interrupted/committed capture compatibility.

## Landed V1 pilot

- Catalogue of system code-constant component SHAs exported without altering `requestFor`.
- `buildConsequencePromptProvenance` / `persistPromptProvenance` sidecar at Stage-2 promote (same G).
- Reuses `documentSelection.omitted`, catalogue loaded/selected status, `contextManifest` omitted/required passages.
- Held provisional G: no fake completed task/packet provenance.
- Duplicate promote: one row via PK `generation_id`.

## Proven

| Fixture | Result |
| --- | --- |
| Compiled request / inspect packet SHA unchanged | pass |
| Consequence sidecar redacted (no system prose bodies) | pass |
| Promoted consequence persists one manifest | pass |
| Held before ready: no manifest | pass |

## Deferred

Admin S3 grant/UI, opening/report purposes, transport-edge byte equality (OBS00-B/C), raw archive retention.
