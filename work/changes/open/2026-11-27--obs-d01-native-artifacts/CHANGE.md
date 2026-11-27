# OBS-D01 | Normalize native observability artifacts

**State:** Proposed (current sprint); independent readiness and explicit commission pending. **Kind:** PATCH, behavior-preserving source migration. **Baseline:** main `627ed819dbae86bee934700f50ee879682bc0b12`. **Integration:** main; dedicated `change/obs-d01-native-artifacts` worktree after commission. Human integration custodian; ChatGPT planner.

## Outcome

Five native Helm releases use maintained values/, locks/ and root expected-inventory.json; render and install share ordered values argv. Both profiles render exactly the same parsed documents, inventory and image pins as before. No old runtime path or descriptor alias remains.

Authority: [accepted artifact ownership](../../../../docs/technical/platform/observability-native-infrastructure.md#artifact-ownership), [design](../../../designs/open/observability-developer/README.md). Extracts T01 from [archived OBSERVABILITY-DEVELOPER](../../archive/2026-11/observability/2026-11-27--observability-developer/CHANGE.md). D04 later owns overlay/predecessor variants. No new values, chart/image updates, network pulls, cluster reads/writes, application instrumentation or unrelated refactor. Preserve original checks, chart order, storage arguments and install-only semantics.

## Execution and proof

[TASKS](TASKS.md): two serial assignments; [SOURCE-MAP](SOURCE-MAP.md): exact move/caller map; [PROOF](PROOF.md): before/after parsed parity, focused normal and negative tests, cleanup. Parent captures baseline before edits, dispatches T01 then T02, runs combined proof and reviews exact diff. Estimated active implementation 8–12 minutes excluding Helm test time, subject to independent review. No new join child.

## Closure

Require exact parity, all eight moves, five unchanged chart archives, unchanged lock semantics, zero template calls for corrupt final archive/missing or malformed final YAML, exact full installer argv parity across five releases × two profiles (only the eight-path migration's five values paths normalized) and passing affected suites. Reconcile infra README and canonical realization only after proof. No live acceptance claim. The [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) defends this D01-only integration exception, not the broader staged boundary. Explicit owner acceptance, independent G0–G7 readiness, local collision/caller census, commission and actual offline proof remain required. Until accepted, the R5 joint rule binds. After acceptance and successful parity, the custodian may integrate this slice alone, without claiming any live certification or authorizing legacy proof execution. No auto-next; global queue unchanged.
