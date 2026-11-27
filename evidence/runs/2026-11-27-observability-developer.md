# Developer observability qualification | 2026-11-27

**Disposition:** source assembly and first entrypoint repair integrated on `implementation/observability-developer`; second repair in progress at collection. No new install, upgrade, connection or live functional qualification executed in this session. Main `a99aebb31b27f3bf7008714c83f7f1b1d7d47ed2`; initial candidate [`7a4ede6da9d2716ecede7beb98cba3eae62fd199`](https://github.com/DenisSkulovic/offscreen-rpg/commit/7a4ede6da9d2716ecede7beb98cba3eae62fd199); latest published candidate [`5134b9aa28a43e1cb93687bc897f2dc8a5b7be8c`](https://github.com/DenisSkulovic/offscreen-rpg/commit/5134b9aa28a43e1cb93687bc897f2dc8a5b7be8c). Existing acceptance authority is [ACCEPTANCE.md at the candidate](https://github.com/DenisSkulovic/offscreen-rpg/blob/5134b9aa28a43e1cb93687bc897f2dc8a5b7be8c/work/designs/open/observability-developer/ACCEPTANCE.md), including the offline-only exception and deferred safety gates. This record does not change it.

## Owner-operated baseline (read-only observations)

Owner pasted terminal output from the WSL observability implementation worktree at `7a4ede6d` and subsequent history/custody checks during the repair. Node prompt v24.19.0; `git status --short` initially empty. `kind get clusters` listed `offscreen-dev`, `offscreen-release`, and an additional `obs-e03-oexbycbn` cluster not investigated or touched. Kubeconfig listed both named contexts; current context was `kind-offscreen-dev`. `free -h` reported 19 GiB total, 8.6 GiB used, about 10 GiB available and 4 GiB swap. That measurement exceeded the 4096 MiB admission floor but was not a capacity proof or later admission guarantee.

Commands used (explicit target contexts; no raw Secret data):

```bash
kind get clusters
kubectl config get-contexts
free -h
kubectl --context kind-offscreen-dev get nodes
kubectl --context kind-offscreen-dev -n offscreen-dev-observability get pods,deployments,statefulsets,services,pvc
helm --kube-context kind-offscreen-dev -n offscreen-dev-observability list --all
kubectl --context kind-offscreen-release get nodes
kubectl --context kind-offscreen-release -n offscreen-observability get pods,deployments,statefulsets,services,pvc
helm --kube-context kind-offscreen-release -n offscreen-observability list --all
kubectl --context kind-offscreen-release get namespace offscreen-observability
helm --kube-context kind-offscreen-dev -n offscreen-dev-observability history obs-collector
kubectl --context kind-offscreen-dev -n offscreen-dev-observability get secret sh.helm.release.v1.obs-collector.v1 -o 'custom-columns=NAME:.metadata.name,UID:.metadata.uid,STATUS:.metadata.labels.status'
```

| Observation | Dev | Release |
| --- | --- | --- |
| Kubernetes nodes | 2/2 Ready, v1.37.0 | 2/2 Ready, v1.37.0 |
| Observability namespace | `offscreen-dev-observability` present | `offscreen-observability` explicitly NotFound |
| Workloads | 5/5 Pods Running 1/1, 3 Deployments and 2 StatefulSets ready | No observed workloads or Helm releases |
| Helm revisions | All five deployed revision 1 | None |
| Persistent claims | Three Bound, 5 GiB each, `standard` | None observed |
| Collector Service ports | 8888, 4317, 4318 | None |

Dev Helm chart/app versions reported: Prometheus `31.0.0`/`v3.16.0`, Loki `21.6.0`/`3.7.10`, Tempo `3.2.1`/`3.1.1`, Collector `0.183.2`/`0.165.0`, Grafana `14.6.1`/`13.3.2`. Generated Deployment Pod names included `obs-grafana-d8bc4bcf8-gzkrv`, `obs-prometheus-7f789c485f-bsmlh`, and `obs-collector-bb98b58b8-j6sxm`; StatefulSet Pods were `obs-loki-0` and `obs-tempo-0`.

Existing dev PVC/PV bindings observed (volume names, not separately read PV UIDs):

| PVC | Bound volume |
| --- | --- |
| `obs-prometheus` | `pvc-c448c300-6e8a-4e42-a95a-7dcfee76cd1f` |
| `storage-obs-loki-0` | `pvc-34a3751e-cf51-4098-acf1-7c5d3341fa4e` |
| `storage-obs-tempo-0` | `pvc-8ec1040d-3e45-4911-b7e4-b830f7eb5476` |

Collector history: revision 1 deployed (Install complete); Secret `sh.helm.release.v1.obs-collector.v1` UID `e324db28-eb70-4a8c-8fc9-632a69543e47`, status `deployed`. Preserve this identity when checking the proposed upgrade; the live operation must recapture its full baseline under the accepted identity/custody mechanism. This informal inventory is not an exact classifier/manifest match, datasource health proof or authorization.

## Custody and version exclusion preflight

Owner ran the following read-only commands during the session:

```bash
STATE="$HOME/.local/state/offscreen-rpg/platform-locks"
find "$STATE" -maxdepth 1 -name '*observability*' -printf '%f | inode=%i | type=%y\n'
lslocks --output PID,COMMAND,TYPE,MODE,PATH | grep observability || true
ps -eo pid,ppid,etime,args | grep -E '[o]bservability/|[o]bs:upgrade|[o]bs:connect|[h]elm.*obs-|[k]ubectl.*port-forward.*obs-'
```

- Existing `kind-offscreen-dev-observability.lock`, regular file, inode `1827701`; three historical recovered/reconciled JSON receipts present and left untouched. No matching `.pending` file appeared in the listing.
- No matching active lock or process output. This is point-in-time evidence, not proof that every old-version entrypoint is excluded for future operations. Do not delete/recreate the lock, clear unknown pending state or kill unrelated processes. Recheck actual custody and owner-controlled old-version exclusion at live admission.

## Reported offline checks and repair status

The first repair at `5134b9aa` reported 109 passing, 0 failing tests in `infra/platform/observability/tests/{upgrade,forward,readiness,custody,install,receipt}.test.mjs` using `node --test`. The commit was independently observed on GitHub, not the raw test output; no real cluster, Docker, upgrade or install ran in that repair. Review found remaining inventory, deadline and connection-cleanup defects; see [source inspection](../inspections/2026-11-27-observability-review.md). Second repair has no verified completion receipt yet.

## Remaining acceptance

Fresh installation on release and preservation upgrade on occupied dev are the intended operator paths, not authorization to run either on this candidate. Release live mutation needs separately scoped owner permission and reconciliation with the existing A11 read-only release proof boundary. The current observed dev state does not substitute for mandatory fresh-dev A6. The design's deferred amended-authority review, safety/negative proof, pinned feasibility, version exclusion and target-specific authorization remain binding. Recheck final candidate, environment and operation-specific admission; then verify actual release/dev health, idempotent ensure and guarded connectivity. All native functional signal, privacy, resource, persistence, outage and isolated partial-install proofs remain NOT RUN in this session. Follow the existing A1–A12/V01–V12 acceptance matrix; do not delete namespaces or rebuild either shared cluster to avoid a failing guard.

Record actual operations, exact revision, failures, sanitized receipts and remaining limitations in this campaign's evidence. Promote verified guarantees and operator commands to [native observability contract](../../docs/technical/platform/observability-native-infrastructure.md) and [runbook](../../docs/runbooks/kubernetes-observability.md) at acceptance; no live certification or main integration claimed here.
