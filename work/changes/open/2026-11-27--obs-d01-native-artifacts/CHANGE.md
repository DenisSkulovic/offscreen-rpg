# OBS-D01 | Normalize native observability artifacts

**State:** OWNER-RELEASED — OFFLINE SOURCE ONLY; independent readiness verdict not yet PASS. **Kind:** PATCH, behavior-preserving source migration. **Inspected source:** main `e7a6eed5789401737701d2bff38a1b54ec3085d4` (prior inspected source and intervening docs-only observability edits; recheck affected anchors). **Integration:** `integration/observability-developer`; branch `change/obs-d01-native-artifacts`, dedicated linked worktree. Human integration custodian; ChatGPT planner.

## Outcome

Five native Helm releases use maintained values/, locks/ and root expected-inventory.json; render and install share ordered values argv. Both profiles render exactly the same parsed documents, inventory and image pins as before. No old runtime path or descriptor alias remains.

Authority: [accepted artifact ownership](././././docs/technical/platform/observability-native-infrastructure.md#artifact-ownership), [design](./././designs/open/observability-developer/README.md). Extracts T01 from [archived OBSERVABILITY-DEVELOPER](././archive/2026-11/observability/2026-11-27--observability-developer/CHANGE.md). D04 later owns overlay/predecessor variants. No new values, chart/image updates, network pulls, cluster reads/writes, application instrumentation or unrelated refactor. Preserve original checks, chart order, storage arguments and install-only semantics.

## Execution and proof

[TASKS](TASKS.md): two serial assignments; [SOURCE-MAP](SOURCE-MAP.md): exact move/caller map; [PROOF](PROOF.md): before/after parsed parity, focused normal and negative tests, cleanup. Parent captures baseline before edits, dispatches T01 then T02, runs combined proof and reviews exact diff. Estimated active implementation 8–12 minutes excluding Helm test time, subject to independent review. No new join child.

## Closure
Retain all offline parity and regression predicates in PROOF, including exact full installer argv parity across five roles × two profiles, normalized only moved values paths. Before edits verify local full tracked operational census and worktree ownership; no unlisted nonmechanical caller or collision. Parent commits and custodian joins the tested source only to the offline integration reference. The defended D01 main exception is not exercised. No main merge, live claim, archive or Done before joint certification.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#artifact-ownership; record eight normalized maintained paths, shared ordered argv; selected behavior unchanged | infra/README.md, infra/platform/observability/vendor/README.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/artifacts.mjs, install.mjs and eight moves; exact source-map consumers; negative: parsed render or any unnormalized installer token differs | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: infra/README.md, infra/platform/observability/vendor/README.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## First dispatch — owner-released

Prerequisite: None; first local census and offline baseline. Use `change/obs-d01-native-artifacts` in dedicated linked worktree from verified `integration/observability-developer`. Run `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D01 --target integration/observability-developer`. Dispatch T01 and continue own serial tasks; no new owner approval required. Only offline renders, local process tests and injected fixtures. No actual cluster commands, Docker experiments, paid calls or deployment. Commit exact source receipt; custodian joins only after required cheap tests pass. No auto-next by individual parent; the named bundle schedule unlocks successors. A concrete material contradiction stops affected work; no ceremonial re-review.
