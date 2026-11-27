# OBS-D01 | Normalize native observability artifacts

**State:** OWNER-RELEASED — OFFLINE SOURCE ONLY; independent readiness verdict not yet PASS. **Kind:** PATCH, behavior-preserving source migration. **Inspected source:** main `e7a6eed5789401737701d2bff38a1b54ec3085d4` (prior inspected source and intervening docs-only observability edits; recheck affected anchors). **Integration:** `implementation/observability-developer`. The OBS-D01 source branch is already merged there. Do not recreate `integration/observability-developer`. The planner owns the packet.

## Outcome

Five native Helm releases use maintained values/, locks/ and root expected-inventory.json; render and install share ordered values argv. Both profiles render exactly the same parsed documents, inventory and image pins as before. No old runtime path or descriptor alias remains.

Authority: [accepted artifact ownership](././././docs/technical/platform/observability-native-infrastructure.md#artifact-ownership), [design](./././designs/open/observability-developer/README.md). Extracts T01 from [archived OBSERVABILITY-DEVELOPER](././archive/2026-11/observability/2026-11-27--observability-developer/CHANGE.md). D04 later owns overlay/predecessor variants. No new values, chart/image updates, network pulls, cluster reads/writes, application instrumentation or unrelated refactor. Preserve original checks, chart order, storage arguments and install-only semantics.

## Execution and proof

[TASKS](TASKS.md): two serial assignments; [SOURCE-MAP](SOURCE-MAP.md): exact move/caller map; [PROOF](PROOF.md): before/after parsed parity, focused normal and negative tests, cleanup. Parent captures baseline before edits, dispatches T01 then T02, runs combined proof and reviews exact diff. Estimated active implementation 8–12 minutes excluding Helm test time, subject to independent review. No new join child.

## Closure
Retain all offline parity and regression predicates in PROOF, including exact full installer argv parity across five roles × two profiles, normalized only moved values paths. Before edits verify local full tracked operational census and worktree ownership; no unlisted nonmechanical caller or collision. The tested source is already joined to `implementation/observability-developer`. The defended D01 main exception is not exercised. Pending joint certification does not block that source join. No main merge, live claim, archive or Done before joint certification.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#artifact-ownership; record eight normalized maintained paths, shared ordered argv; selected behavior unchanged | infra/README.md, infra/platform/observability/vendor/README.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/artifacts.mjs, install.mjs and eight moves; exact source-map consumers; negative: parsed render or any unnormalized installer token differs | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: infra/README.md, infra/platform/observability/vendor/README.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## First dispatch — owner-released

Prerequisite: none. OBS-D01 is already merged into `implementation/observability-developer`. Do not start it again from the retired integration ref. Design-level A1–A12/V01–V12 acceptance remains pending. Do not join main. Do not start another Change.
