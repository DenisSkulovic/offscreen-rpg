# K8S07 | Cluster observability with one demonstrable end-to-end trace and failure signal

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Execution selection:** Owner authorized this Change in worktree `offscreen-rpg-k8s07` on branch `change/k8s07-observability`. Do not start another Change.  
**Program:** [Distributed architecture lab queue](../../../../README.md)

## Outcome

Install one pinned OpenTelemetry Collector on the disposable kind cluster and prove two synthetic signals. One trace crosses `hop-a` and `hop-b`. One failure signal is emitted when `hop-b` is gone. The game is not instrumented. A ready collector does not mean every request is traced.

## Authority and prerequisites

- **Prerequisites:** K8S01 kind lab is on baseline `66f82cac`. The educational laboratory wording is already on that baseline.
- **Current implementation:** the modular monolith and Compose remain the application. This Change does not deploy them.
- **Authoritative owners left in place:** `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/README.md`, `docs/runbooks/README.md`, `STATUS.md`, and `ROADMAP.md`. Other work in this batch owns those pages. This Change must not edit them.
- **Lab contract owner for this Change:** `docs/runbooks/kubernetes-observability.md`.
- **Code owner:** `infra/kubernetes/lab/observability/`.
- **Risk permission:** no provider spend, no Docker volume deletion, no LAN publish, no secrets in Git.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | unchanged: player-facing rules stay on `docs/product/foundations/vision.md` and this lab adds no player promise | Inspect the vision page and do not edit it |
| Technical | unchanged: selected topology, deployment, data, and execution headings stay written as they are. The lab collector is not copied onto those pages | `docs/technical/platform/topology.md#recommendation` still lists OpenTelemetry as proposed |
| Code | changed: `infra/kubernetes/lab/observability/install.sh` installs the pinned collector and two synthetic hops. Negative: a missing second hop emits `second_hop_missing`, and a ready collector does not trace the game | Disposable kind smoke |
| Related | changed: `docs/runbooks/kubernetes-observability.md#two-hop-trace` records the synthetic trace and the missing-hop failure | Runbook plus smoke |

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Conservation |
| --- | --- | --- | --- |
| CREATE | `docs/runbooks/kubernetes-observability.md` | new runbook, no heading moved | The synthetic collector procedure, the two-hop trace, and the missing-hop failure live on this new page. Selected topology pages stay as written. |

## Implementation notes

Collector choice: core `otel/opentelemetry-collector` `0.165.0` (`sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73`) with the debug exporter. Prometheus, Grafana, and a log store were not added. The memory limit is 192Mi for the collector and 64Mi for each hop. The shared `infra/kubernetes/lab/kind.yaml` was not edited.

Files:

- `infra/kubernetes/lab/observability/collector-config.yaml`
- `infra/kubernetes/lab/observability/collector.yaml`
- `infra/kubernetes/lab/observability/hops.yaml`
- `infra/kubernetes/lab/observability/hop.py`
- `infra/kubernetes/lab/observability/install.sh`
- `infra/kubernetes/lab/observability/smoke.sh`
- `infra/kubernetes/lab/observability/assert_signals.py`
- `docs/runbooks/kubernetes-observability.md`

Out of scope: game manifests, player identifiers in telemetry, story text in telemetry, edits to the shared kind scripts, and edits to the technical index, runbook index, STATUS, ROADMAP, or the Change ledger.

## Acceptance

- **Positive:** one trace whose hop-b span parents to the hop-a span, and one `second_hop_missing` signal in the span, the log, and the counter after hop-b is gone.
- **Negative:** the success export has no failure signal, the failure trace has no hop-b span, the counter does not carry `operation.id`, and a ready collector is not game coverage.
- **Evidence:** commands and results recorded after the smoke. No paid provider call.

## Evidence

Commands that ran on 2026-11-19, in order:

- A local read-only container of `otel/opentelemetry-collector:0.165.0` accepted one two-hop export and one missing-hop export on `127.0.0.1`. That container was removed. It is not the kind proof.
- The first locked shell ran `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/observability/install.sh`, and `infra/kubernetes/lab/observability/smoke.sh`. The two-hop trace was collected. The missing-hop call still reached a terminating hop-b pod, the smoke exited 1, and `infra/kubernetes/lab/down.sh` deleted that cluster.
- The smoke was changed to wait until the hop-b pod is gone. The second locked shell ran `up.sh`, `install.sh`, `smoke.sh`, and `down.sh`. The smoke passed. `down.sh` deleted the cluster.
- No paid provider call was made.

Versions and results are in [Kubernetes observability](../../../../../../docs/runbooks/kubernetes-observability.md). Compose volumes `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were present after the final delete.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Player-facing rules on docs/product/foundations/vision.md#what-this-page-selects | product | unchanged: this lab adds no player promise and does not select a new experience | docs/product/foundations/vision.md at 66f82cac | source-observed | A collector name is not a play session, and the vision page was not edited | No product link was added |
| Observer proposal at docs/technical/platform/topology.md#recommendation | technical | unchanged: OpenTelemetry on that heading stays proposed for the game and this slice does not revise it | docs/technical/platform/topology.md at 66f82cac | source-observed | The cluster was deleted after the smoke and is not a deployed game observer | The new runbook links to the heading. The topology page was not edited |
| Observer section at docs/technical/platform/deployment-and-compatibility.md#observability | technical | unchanged: that section still has no proof that an observer of the game is deployed | docs/technical/platform/deployment-and-compatibility.md at 66f82cac | source-observed | The synthetic hops are not the API or a worker, so the section was left as written | The new runbook links to the heading. That page was not edited |
| Durable record at docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | technical | unchanged: PostgreSQL remains the record and this collector does not store it | docs/technical/platform/data-and-persistence.md at 66f82cac | source-observed | No game database was installed, and the Compose volume was still present after delete | Page not edited |
| Command delivery at docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | technical | unchanged: the hops do not admit commands or replace the outbox | docs/technical/platform/execution-and-delivery.md at 66f82cac | source-observed | No game process was deployed, so no command crossed this collector | Page not edited |
| Lab collector procedure at docs/runbooks/kubernetes-observability.md#two-hop-trace | technical | changed: the procedure records one two-hop trace and the missing-hop failure, and says a ready collector is not game coverage | docs/runbooks/kubernetes-observability.md inspected in the worktree on baseline 66f82cac | fixture-tested | The success log had no failure signal, and the failure trace had no hop-b span | docs/runbooks/README.md was not edited. Another Change owns that index |
| Synthetic hops in infra/kubernetes/lab/observability/smoke.sh | code | changed: the smoke requires the parent span and the missing-hop counter, and rejects a terminating pod that still answers | infra/kubernetes/lab/observability/smoke.sh and infra/kubernetes/lab/observability/assert_signals.py inspected in the worktree on baseline 66f82cac | fixture-tested | The first smoke failed while hop-b was still terminating, and the second smoke passed only after the pod was gone | No application README was added |

## Handoff and next action

- The second smoke passed and the cluster was deleted. Do not select the next Change.
- `work/changes/README.md` and `work/changes/ledger/2026-11.md` were not edited. Other Changes own them. The queue index still points at the open packet path until the owner of that index updates it.
- Baseline inspected: `66f82cac` on `change/k8s07-observability`.
