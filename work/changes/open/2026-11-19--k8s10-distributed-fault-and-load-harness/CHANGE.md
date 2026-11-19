# K8S10 | Reproducible distributed failure and load experiments

**State:** Implementing (2026-11-19). The first worker-loss runner passed on a disposable cluster. Not Done. The rest of the suite is unbuilt, and this packet is not archived.  
**Kind:** implementation  
**Execution selection:** This bounded runner only. Do not auto-run the remaining scenarios.  
**Program:** [Distributed architecture lab queue](../../README.md)

## Outcome

Provide a safe, repeatable architecture experiment suite that proves or disproves our specific resilience hypotheses without provider spend or destructive data access.

## Authority and prerequisites

- **Prerequisites:** K8S02-K8S09 relevant components plus K8S08 skeletons; K8S07 observability.
- **Current implementation:** modular monolith and Compose remain source-observed as of 2026-11-19. ARCH01 must reconcile the target without pretending migration is done.
- **Authoritative owners:** `docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture`, `docs/technical/platform/topology.md`, `docs/technical/observability/README.md`, `docs/runbooks/README.md`.
- **Source reinspection required:** inspect latest GitHub HEAD and current Change owners before implementing. No presumption that the lab or prior Changes have actually completed.
- **Risk permission:** no provider spend, destructive persistent-volume actions, public traffic, credential disclosure or application-code extraction without explicit owner decision.

## Planned implementation or specification delta

Create bounded scenario runner, fixtures and metrics/trace capture for Pod kill, broker outage/recovery, delivery duplication/reordering, DB failover after replicas exist, a slow local stand-in, traffic burst and resource pressure. Every scenario has preconditions, workload, quantitative expected behavior, abort rules, cleanup and evidence report. Start with minimal green path and expand only as components land.

This slice lands only the first case:

- CREATE `infra/kubernetes/lab/fault/run.sh`
- CREATE `infra/kubernetes/lab/fault/worker_loss.py`
- CREATE `infra/kubernetes/lab/fault/assert_exactly_once.py`
- CREATE `infra/kubernetes/lab/fault/fixtures/one-apply.log`
- CREATE `infra/kubernetes/lab/fault/fixtures/two-applies.log`
- CREATE `docs/runbooks/kubernetes-fault.md`
- EDIT `docs/runbooks/README.md` with one index row
- EDIT `docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture`

`docs/technical/platform/topology.md` stays unedited. The dated proof stays in the runbook and in the architecture-test heading. Editing the laboratory table would pull proposal headings this slice does not select.

Unchanged on purpose: `infra/kubernetes/lab/kind.yaml`, `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/down.sh`, `infra/kubernetes/lab/lib.sh`, RabbitMQ manifests, `packages/`, `apps/`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, and `work/changes/ledger/`. No game service was extracted. No collector trace was attached. No plot image was written.

**Out of scope:** full product rollout, shared production cluster, paid LLM or image calls, real Stripe calls, full game-service extraction. Reuse existing source owners and don't create duplicate planning authority.

## Acceptance: positive and negative

- **Positive:** Fresh cluster run reproduces at least one worker-loss and broker-redelivery test with traceable IDs; a deliberately broken case fails expected assertion; recovery, graphs, hardware usage and cleanup are saved as dated evidence.
- **Negative:** No stress test runs against shared or paid infrastructure; a pass does not imply machine-level HA; resource caps protect a 12GB WSL lab; evidence differentiates unavailable from data lost, replayed from duplicated side effect.
- **Documentation is mandatory:** update precisely the source-owner headings above, relevant wiki index and runbooks, factual status/evidence only after actual verification. Do not treat this packet itself as documentation completion.
- **Evidence:** exact commands/results, versioned dependencies, resource costs, links to test fixtures, observed failures, date and environment. Run repository change/markdown/wiki guards as applicable.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | unchanged because this slice adds no player-facing behavior and `docs/product/` was not edited | No product heading changed |
| Technical | changed: docs/technical/platform/deployment-and-compatibility.md now records the one-replica worker-loss limit, because a harness pass is not the database-commit row. docs/technical/platform/topology.md stays unedited | The live run stays separate from that row, and a pass is not machine-level HA |
| Code | changed: infra/kubernetes/lab/fault/run.sh kills one consumer before acknowledgement and does not migrate game code. Negative: the exactly-once assertion must exit 1 when the same run id is applied twice | Disposable smoke for run fault-ed09a6e1b8b5c5f5, with the exactly-once assertion exiting 1 |
| Related | changed: docs/runbooks/kubernetes-fault.md records the dated evidence and docs/runbooks/README.md indexes it. STATUS.md stays unedited because the remaining scenarios did not run | Link check and change guard |

## Checks actually run

- One shell held `/tmp/offscreen-k8s-cluster.lock`. `offscreen-lab` was absent. MemAvailable was 5672340 KiB at `up.sh` start, above 4 GiB. The shell created the cluster, ran `infra/kubernetes/lab/rabbitmq/install.sh` and `infra/kubernetes/lab/fault/run.sh`, then `infra/kubernetes/lab/down.sh`.
- Run id `fault-ed09a6e1b8b5c5f5`. Hold log: `APPLY fault-ed09a6e1b8b5c5f5 redelivered=0`. After the consumer pod `591c23db-2e89-4a5e-92f1-d9f7309644ae` was deleted, `lab.durable` returned to 1 ready message and 0 unacknowledged. Drain printed `redelivered=1`. Broker pod uid `a96963db-6624-4f0a-ab16-63aa05d5c24e` did not change.
- Negative case: `assert_exactly_once.py` exited 1 with `ASSERTION-FAILED duplicated side effect: expected 1 APPLY, saw 2 for fault-ed09a6e1b8b5c5f5`. The one-apply fixture exited 0. The two-apply fixture exited 1.
- `kind get clusters` then printed `No kind clusters found.` `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were present. No paid provider call was made.
- The full suite in the planned delta, including broker outage, DB failover, a slow local stand-in, traffic burst, and resource pressure, was not run. No model call was made.

## Reconciliation ledger (fill before Done)

The first worker-loss case is recorded here. The packet stays open because the remaining scenarios are unbuilt.

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture | technical | changed: the section records run fault-ed09a6e1b8b5c5f5 as one-replica broker redelivery and keeps the database-commit row unproven | infra/kubernetes/lab/fault/run.sh in this worktree on baseline 4a556223 | fixture-tested | The exactly-once assertion exited 1 after two APPLY lines, and the run is not machine-level HA | docs/runbooks/kubernetes-fault.md |
| docs/technical/platform/topology.md#distributed-learning-target | technical | unchanged because the dated proof stays in the fault runbook and this packet does not edit the laboratory table | no edit; baseline 4a556223 | reviewed | A one-replica replay is not recorded here as machine-level HA | heading not edited |
| docs/runbooks/kubernetes-fault.md#what-this-procedure-is | related | changed: the runbook records the worker-loss procedure, the dated evidence, and the one-replica limit | infra/kubernetes/lab/fault/run.sh in this worktree on baseline 4a556223 | fixture-tested | Unavailable is not lost, and replayed is not an exactly-once effect | docs/runbooks/README.md |

## Closure and lifecycle

- Execute only on explicit owner selection, with predecessor receipts verified.
- Before Done fill owner-by-owner reconciliation (heading, source SHA, expected delta, actual diff, evidence, negative test, link updates).
- This packet stays open. The first case has evidence. The remaining scenarios do not. Do not automatically select the next Change.
