# OBS-D11 | Isolated partial-install verification

**State:** OWNER-RELEASED — OFFLINE SOURCE ONLY (dependency-gated); independent readiness verdict not yet PASS. **Kind:** CONTRACT (source implementation). **Inspected source:** main `e7a6eed5789401737701d2bff38a1b54ec3085d4` (prior inspected source and intervening docs-only observability edits; recheck affected anchors). **Integration:** `implementation/observability-developer`. Branch `change/obs-d11-partial-install-proof` from current `implementation/observability-developer` in a dedicated linked worktree, then merge it back into `implementation/observability-developer`. Human integration custodian; ChatGPT planner.

## Outcome
Actual public installer fails at Loki after successful Prometheus, retains exact state and durable fence; repeat refuses without mutation.

Authority: [R5 canonical contract](././././docs/technical/platform/observability-native-infrastructure.md), [design](./././designs/open/observability-developer/README.md), [acceptance](./././designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02–D04 safety/classifier, D07 session; D10 independent, shared write owners serialized. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. Offline source commission only; no live operation, spend or main merge.

## Scope
V/partial-install.mjs, proof-host/proof, P/custody.mjs read-only inspect, infra/verification/diagnostic-engine.mjs optional bounded process runner and tests. Owner-only fault fixture; no production bypass or runtime policy creation/deletion.

## Source release and remaining proof

Candidate A9 admission rejection is specified; offline predicate/process tests only. Actual pinned isolated feasibility and ratification required before live use or main merge; accepted quota remains canonical until ratified. Stop on contradiction, no fixture deployment.

Owner directed immediate release of this frozen candidate for reversible offline implementation despite outstanding independent review. This is not a READY verdict or canonical ratification. Prior G0 rejection and unreviewed G1–G7 remain visible; no architecture choice delegated. Parent checks predecessor receipt, local ownership and named anchors, runs focused positive/negative tests, and reports actual blockers with exact source evidence. No broad review or repeated approval before dispatch. Candidate-only source joins; no live activation, main merge, archive or Done. All original A/V gates remain.

[TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, tests and commit; custodian serializes candidate joins. ChatGPT/owner own substantial acceptance. Each parent stops at its own receipt.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#certification-continuity; record independently accepted A9 mechanism and retained failure/refusal only | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/verification/smoke/observability/partial-install.mjs, proof-host.mjs, proof.mjs, infra/platform/observability/custody.mjs, infra/verification/diagnostic-engine.mjs and mapped tests; negative: later release, wrong target, changed pending or repeat write earns acceptance | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## First dispatch — owner-released

Prerequisite: OBS-D10 tested source receipt merged into implementation/observability-developer; confirm all packet-specific predecessor API postconditions. Branch `change/obs-d11-partial-install-proof` from current `implementation/observability-developer` in a dedicated linked worktree. Run `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D11 --target implementation/observability-developer`. Dispatch T01 and continue own serial tasks; no new owner approval required. Only offline renders, local process tests and injected fixtures. No actual cluster commands, Docker experiments, paid calls or deployment. Commit the exact source receipt, then merge that Change branch back into `implementation/observability-developer` only after the required cheap tests pass. No auto-next by individual parent; the named bundle schedule unlocks successors. A concrete material contradiction stops affected work; no ceremonial re-review.
