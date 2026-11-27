# OBS-D05 | Foreground WSL connection

**State:** OWNER-RELEASED — OFFLINE SOURCE ONLY (dependency-gated); independent readiness verdict not yet PASS. **Kind:** CONTRACT (source implementation). **Inspected source:** main `e7a6eed5789401737701d2bff38a1b54ec3085d4` (prior inspected source and intervening docs-only observability edits; recheck affected anchors). **Integration:** `implementation/observability-developer`. Branch `change/obs-d05-foreground-connection` from current `implementation/observability-developer` in a dedicated linked worktree, then merge it back into `implementation/observability-developer`. Human integration custodian; ChatGPT planner.

## Outcome
Fixed dev-only loopback access to developer OTLP and Grafana with optional query endpoints; cleanup only owned children.

Authority: [R5 canonical contract](././././docs/technical/platform/observability-native-infrastructure.md), [design](./././designs/open/observability-developer/README.md), [acceptance](./././designs/open/observability-developer/ACCEPTANCE.md), [independent pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md). Dependencies: D02 identity, D03 custody/process, D04 classifier; actual pinned Grafana render. D01-only staged exception defended pending owner acceptance; other boundaries remain subject to joint gate and OD-05–07. Offline source commission only; no live operation, spend or main merge.

## Scope
P/forward.mjs forwarding orchestration, new connect.mjs, package.json obs:connect, tests/forward.test.mjs. No daemon, arbitrary targets, public ingress or SDK.

## Source release and remaining proof

Verify pinned Grafana service/target mapping offline before forwarding implementation; stop on mismatch or unowned process/port behavior.

Owner directed immediate release of this frozen candidate for reversible offline implementation despite outstanding independent review. This is not a READY verdict or canonical ratification. Prior G0 rejection and unreviewed G1–G7 remain visible; no architecture choice delegated. Parent checks predecessor receipt, local ownership and named anchors, runs focused positive/negative tests, and reports actual blockers with exact source evidence. No broad review or repeated approval before dispatch. Candidate-only source joins; no live activation, main merge, archive or Done. All original A/V gates remain.

[TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, tests and commit; custodian serializes candidate joins. ChatGPT/owner own substantial acceptance. Each parent stops at its own receipt.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#foreground-access; record fixed WSL forwarding only; no signal-acceptance claim | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/forward.mjs, connect.mjs, package.json and mapped tests; negative: foreign port killed or unconfirmed child declared clean | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## First dispatch — owner-released

Prerequisite: OBS-D04 tested source receipt merged into implementation/observability-developer; confirm all packet-specific predecessor API postconditions. Branch `change/obs-d05-foreground-connection` from current `implementation/observability-developer` in a dedicated linked worktree. Run `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D05 --target implementation/observability-developer`. Dispatch T01 and continue own serial tasks; no new owner approval required. Only offline renders, local process tests and injected fixtures. No actual cluster commands, Docker experiments, paid calls or deployment. Commit the exact source receipt, then merge that Change branch back into `implementation/observability-developer` only after the required cheap tests pass. No auto-next by individual parent; the named bundle schedule unlocks successors. A concrete material contradiction stops affected work; no ceremonial re-review.
