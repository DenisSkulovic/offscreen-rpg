# OBS05 | Stop reporting unproven model ignorance as forensic fact

**State: Done (2026-11-15).** **Scope:** bounded Storyteller SA05/SA01 diagnostic-label correctness and versioned provenance-only read adapter, provider-disabled tests. **Evidence:** [obs05](../../../../../programs/observability/evidence/obs05-evidence-claim-truth-2026-11-15.md). Authority: [claim semantics](../../../../../programs/observability/technical/evidence-claims-and-quality-v1.md), [source context](../../../../../programs/observability/technical/context-provenance.md) and [the read-only Turn Capsule](../../../../../programs/observability/technical/forensic-turn-capsule-v1.md).

## Why this is a real source issue

- `classifyFailure` returned `model-ignored` for final-included discovered memory/passage with no citation — proves **uncited** only.
- Defaulted stage inputs from final task are **derived**, not observed retrieval.
- Publication defaults do not prove each source was semantically incorporated.
- Task-only `inspectOpenRouterRequest` is derived packet binding, not transport proof.

## Landed contract

1. **V1 preserved:** `createStorytellerEvidenceLineage` / `storyteller-evidence-lineage.v1` unchanged for fixture compatibility.
2. **V2 observation:** `createStorytellerEvidenceLineageV2` emits `packet-included-uncited` instead of treating uncited inclusion as model cognition.
3. **Observation origin** on each stage; missing producer inputs → `derived-from-task` / unknowns listed.
4. **`claimPublished`** separate from generation publication presence.
5. **`packetBinding: task-request-derived`** — does not claim actual transmitted bytes (OBS00-B/C still required for that).

## Proven

| Fixture | Result |
| --- | --- |
| V1 suite still passes | pass |
| V2 packet-included-uncited, no model-ignored string | pass |
| V2 selected-then-pruned retained | pass |

## Deferred

Admin Context Inspector UI, transport-edge packet binding, OTel attributes, raw content grants.
