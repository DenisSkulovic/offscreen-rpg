# Change CH16 | Replay, differential comparisons and laboratory proof

> **Cursor first look:** [scenario-run protocol](../../technical/chamber-lab-protocol.md#6-observations-assertions-and-reports), [application owner map](../../../packages/application/src/developer-tools/README.md) and [target C03/C09/C10/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16). **Source gap:** [H04/H08/H14](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** matching raw UUIDs, timestamps or Storyteller prose is not proof of mechanical correctness.

**State:** Specified/Proposed, not authorized for source edits. **Dependencies:** CH04, CH06, CH07, CH09, CH11, CH12, CH15; CH13 where worker/DB evidence is claimed. **Source baseline:** `470a5df`.

## Bounded implementation outcome

Make an observed Chamber failure **replayable** from a versioned scenario+fixture+seed+steps+fault manifest, and compare two isolated runs/code revisions by **typed semantic deltas, named invariants and causal trace**. Provide a compact CLI command and workbench reproduce/compare/export action. Finish with bounded provider-free C01–C16 evidence; do not claim completion from a list of screen features or a mock.

## Binding design

- Replay creates a fresh isolated run; refuses incompatible fixture/code/schema inputs without an explicit reviewed migration. Never rewrite historical QA run data or rewind Temporal/provider external effects.
- Compare stable domain outcomes (time earned, effect/reward count, revision, authorizations, receipts, public view and causal ordering). Show exactly which volatile IDs/timestamps were normalized. Keep raw authoritative values in original run evidence.
- Matching outputs do not establish a pass unless their **named invariant** is satisfied. Human narrative/prose differences remain labeled subjective and excluded from mechanical equality.
- Report actual services started, cold/warm elapsed time and evidence tier for Bench/Sandbox/Connected. No live provider call or destructive user DB operation.
- At exit, map [C01–C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16) to demonstrated, blocked or design-only evidence, not decorative checkmarks.

## Proof and limits

**Normal:** a duplicate-settlement failure has a portable capsule; the same deterministic specimen reproduces its invariant, and comparison to a corrected revision identifies exactly which mechanical receipt/delta changed.  
**Negative:** stale fixture hash, changed schema, wrong owner, disabled lane, hidden provider attempt or overbroad normalization blocks or fails.  
**Verification:** pure Bench replay first, authorized isolated Sandbox compare second, then one bounded real Connected acceptance and measured wall time where relevant.

**Handoff:** selected run/diff/evidence source and this packet only. Do not redesign the lab, rewrite game mechanics or build a universal tracing platform.
