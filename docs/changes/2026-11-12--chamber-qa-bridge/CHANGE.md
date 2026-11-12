# Change CH10 | QA journeys reconciled with executable mechanical scenarios

> **Cursor first look:** [application developer map](../../../packages/application/src/developer-tools/README.md) → `qa-journeys.ts:open/recordStage/finalize` and `qa-catalog/*`, [current UI](../../../apps/web/src/features/developer-tools/chamber/README.md). **Target:** [C01/C10/C11/C15](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16); [protocol `9](../../technical/chamber-lab-protocol.md#9-catalogue-evolution-and-handoff); [audit H02/H09/H12](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps).

**State:** Specified/Proposed; **no code work now**. **Depends on:** CH01, CH06, CH09. **Baseline:** `470a5df`.

## One code-bearing outcome

Bridge the existing **15 versioned manual QA journeys** and the new executable scenario registry **without replacing the trusted append-only human evidence journal**. A case/stage can reference a machine-run `LabRun`, its assertions and evidence tier when such a driver exists, or remain explicitly human/manual/planned. Catalogue search by mechanic/cost/availability should distinguish “stage instructions” from “runnable scenario.”

## Binding design

- Preserve current `qa_run`, `qa_run_stage`, Git/dirty provenance, case snapshots, expectedRevision/ordinal and human 0–2 rubric. No fabricated auto-pass for historical/manual observations and no rewriting older records to newest case version.
- `driver: api-script/browser-automation/manual-chamber` in current schema is **a label only**, not a guarantee of an executor. Add an explicit link/driver binding from selected case stage to versioned scenario+lane when available.
- Automated assertion result is computed by the scenario driver, never accepted as a plain operator-selected string. Human narrative quality remains human-judgment with referenced evidence.
- Unavailable variants show truthful missing prerequisites and do not launch provider or apply ad hoc default data. Existing QA export remains compatible; CH09 evidence references augment rather than replace it.

## Proof

**Normal:** one existing activity or item-transfer stage can launch/link a real offline LabRun and show machine-pass with its trace; a separate subjective Storyteller stage remains manual.  
**Negative:** a user cannot mark machine assertion passed without a successful matching recorded LabRun; old run data remains identical after case catalog evolves; billable QA stays unavailable offline.  
**Check:** pure registry/QA adapter tests plus narrow local DB roundtrip when authorized, no provider.

**Handoff:** inspect exact QA open/record/finalize and one case module; do not rewrite the 15-case catalog wholesale.
