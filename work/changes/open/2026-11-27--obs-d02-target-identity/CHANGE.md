# OBS-D02 | Frozen target identity

**State:** IMPLEMENTED — ACCEPTANCE PENDING (offline source receipt on `change/obs-d02-target-identity`; independent readiness verdict not yet PASS; no live claim). **Kind:** CONTRACT (source implementation). **Inspected source:** integration/observability-developer `176237508c6a` (OBS-D01 joined). **Integration:** `integration/observability-developer`; branch `change/obs-d02-target-identity`, dedicated linked worktree `/home/dskul/projects/offscreen-rpg-obs-d02`. Human integration custodian; ChatGPT planner.

## Outcome
Every admitted observability operation binds to the verified local Kind target and actual created namespace UID; mismatch or uncertain read cannot authorize the next write.

Authority: [accepted R5 contract](././././docs/technical/platform/observability-native-infrastructure.md), [design](./././designs/open/observability-developer/README.md), [programme acceptance](./././designs/open/observability-developer/ACCEPTANCE.md). [Pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) defended D01 only; all other staged boundaries remain unratified. Dependencies: D01 exact descriptor/path receipt; D03 consumes frozen tuple. Existing public callers must remain safe until D04 migration. Existing joint certification binds until affected revised boundary is defended and accepted. Owner's explicit release authorizes offline implementation only; no live operation, deployment, spend or main merge.

## Scope and exclusions
Own P/identity.mjs, scoped read defaults in P/artifacts.mjs and P/install.mjs, corresponding identity/install/readiness/diagnostic-worker fixtures and V/tests/proof.test.mjs identity fields. Common target guard read-only; no global command redesign, new policy, release mutation or upgrade.

## Source release and remaining proof

Exact frozen identity shape/UID and bounded read tests; stop on incompatible caller or inability to bind actual UID.

Owner directed immediate release of this frozen candidate for reversible offline implementation despite outstanding independent review. This is not a READY verdict or canonical ratification. Prior G0 rejection and unreviewed G1–G7 remain visible; no architecture choice delegated. Parent checks predecessor receipt, local ownership and named anchors, runs focused positive/negative tests, and reports actual blockers with exact source evidence. No broad review or repeated approval before dispatch. Candidate-only source joins; no live activation, main merge, archive or Done. All original A/V gates remain.

[TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). Parent owns exact diff, tests and commit; custodian serializes candidate joins. ChatGPT/owner own substantial acceptance. Each parent stops at its own receipt.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#identity-and-lock; record frozen target/actual created UID realization; do not certify live identity | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/identity.mjs, artifacts.mjs, install.mjs and mapped tests; negative: changed CA/UID/endpoint or uncertain create authorizes next write | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## First dispatch — owner-released

Prerequisite: OBS-D01 tested source receipt joined to integration/observability-developer; confirm all packet-specific predecessor API postconditions. Use `change/obs-d02-target-identity` in dedicated linked worktree from verified `integration/observability-developer`. Run `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D02 --target integration/observability-developer`. Dispatch T01 and continue own serial tasks; no new owner approval required. Only offline renders, local process tests and injected fixtures. No actual cluster commands, Docker experiments, paid calls or deployment. Commit exact source receipt; custodian joins only after required cheap tests pass. No auto-next by individual parent; the named bundle schedule unlocks successors. A concrete material contradiction stops affected work; no ceremonial re-review.
