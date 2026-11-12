# Change CH07 | Coherent inspector, causal event observations and semantic deltas

> **Cursor first look:** [application developer map](../../../packages/application/src/developer-tools/README.md) → `chamber-inspector.ts:createChamberInspector.inspect` and [inspector panel](../../../apps/web/src/features/developer-tools/chamber/README.md). **Target:** [C06/C08/C10](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol `6](../../technical/chamber-lab-protocol.md#6-observations-assertions-and-reports), [audit H07](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** current inspector fetches public snapshot and SQL facets separately; do not label a mixed revision a single atomic state.

**State:** Specified/Proposed, no source permission. **Depends on:** CH04 and CH06. **Code baseline:** `470a5df`, not a reproduced runtime failure.

## One code-bearing result

A typed, bounded **lab observation** capability that captures relevant authoritative facets at one named step and computes semantic `before/after` deltas, stable action/receipt/correlation IDs, version/time, changed/unchanged/blocked effects and a truthful cause/status. Reuse rich current inspector queries, but separate data acquisition/normalization from hundreds of JSX rows.

## Binding decisions

- For related SQL facets use one repeatable-read view/snapshot version where practical; otherwise publish per-facet version and mark a *cross-version* inspection, never fabricate atomicity across DB/Temporal/provider.
- Only collect domains requested by the scenario (`public-story`, `mechanics`, `persistence`, `worker`, `documents`, `provider`, `transport`). Default summary is small; deep private JSON on explicit drill-down.
- Normalize volatile UUID/timestamp **only when comparing runs**, not when inspecting true evidence. A meaningful no-op needs a typed reason: rejected, blocked, pending, not-due, stale or legitimate no-change.
- CH09 owns durable run reports; this Change produces typed `Observation`, `SemanticDelta` and `AssertionResult` at a real step boundary. No invented application command or provider workflow.

## Proof

**Normal:** one item transfer or finite activity produces before/after with exactly the actual changed state, revision and persisted receipt, preserving current inspector richness.  
**Negative:** intentionally interleaved worker publication cannot yield an “atomic v7” report combining facets from different versions without warning; private payloads absent from default response.  
**Verification:** pure semantic diff tests, then one narrow authorized DB snapshot consistency test. **Preserve:** existing inspector API compatibility until workbench migration.

**Handoff:** inspect only the current inspector's query sections and relevant schema; no wholesale React redesign or automatic logging platform.
