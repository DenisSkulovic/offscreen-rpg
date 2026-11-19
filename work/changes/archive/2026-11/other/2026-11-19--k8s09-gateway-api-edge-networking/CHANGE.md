# K8S09 | Kubernetes Gateway API and local-only HTTP edge

**State:** Done (2026-11-19)  
**Kind:** implementation  
**Execution selection:** Owner authorized this Change in worktree `offscreen-rpg-k8s09` on branch `change/k8s09-gateway`. Do not start another Change.  
**Program:** [Distributed architecture lab queue](../../../../README.md)

## Outcome

Give the disposable kind lab an explicit HTTP edge: one pinned Gateway API controller, a Gateway, and HTTPRoutes. `/` reaches a synthetic web backend. `/api` reaches a synthetic API backend. Databases, brokers, and game processes stay off that edge. This is the synthetic route substrate for the selected Next and Nest edge. It does not deploy those applications. [ARCH04](../../../open/2026-11-19--arch04-web-edge-and-live-interaction-contract/CHANGE.md) owns the live-interaction contract, and [K8S11](../../../open/2026-11-19--k8s11-next-nest-live-edge-integration/CHANGE.md) owns the later real traffic proof. The synthetic `/events` streams are timing probes, not the story SSE hint.

## Authority and prerequisites

- **Prerequisites:** K8S01 kind lab is on baseline `b7b7479d`. ARCH01 is the distributed-target wording already on that baseline.
- **Current implementation:** modular monolith and Compose remain the application. This Change does not deploy them.
- **Authoritative owners left in place:** `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/platform/http-api-and-client-contracts.md`, `docs/technical/README.md`, `docs/runbooks/README.md`. Other Changes in this batch own those pages. This Change must not edit them.
- **Lab contract owner for this Change:** `docs/runbooks/kubernetes-gateway.md`.
- **Code owner:** `infra/kubernetes/lab/gateway/`.
- **Risk permission:** no provider spend, no Docker volume deletion, no LAN publish, no secrets in Git.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | unchanged: player-facing rules stay on `docs/product/README.md` and this lab adds no player promise | Inspect the product index and do not edit it |
| Technical | unchanged: selected topology, hosted deployment, and HTTP client headings stay written as they are. The lab edge contract is not copied onto those pages | `docs/technical/platform/topology.md#distributed-learning-target` remains the laboratory limit |
| Code | changed: `infra/kubernetes/lab/gateway/install.sh` installs pinned Traefik and synthetic routes. Negative: a missing backend returns 503, a spoofed forwarded user stays unauthorized, and the host port is loopback-only | Disposable kind smoke |
| Related | changed: `docs/runbooks/kubernetes-gateway.md#plain-loopback-exception` records the plain HTTP loopback exception and states that a Gateway is not application authorization | Runbook plus smoke |

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Conservation |
| --- | --- | --- | --- |
| CREATE | `docs/runbooks/kubernetes-gateway.md` | new runbook, no heading moved | The lab gateway procedure, the plain HTTP loopback exception, and the refusal to treat a Gateway as authorization live on this new page. Selected topology pages stay as written. |

## Implementation notes

Controller choice: Traefik Proxy `v3.7.19` (Helm chart `42.4.1`) with Gateway API standard `v1.6.3`. Envoy Gateway and NGINX Gateway Fabric were the other maintained options. Traefik is one process, supports a ClusterIP Service, and fits the kind memory budget. The shared `infra/kubernetes/lab/kind.yaml` publishes no workload port, and this Change does not edit it. Host access is `kubectl port-forward --address 127.0.0.1`.

Files:

- `infra/kubernetes/lab/gateway/values.yaml`
- `infra/kubernetes/lab/gateway/install.sh`
- `infra/kubernetes/lab/gateway/smoke.sh`
- `infra/kubernetes/lab/gateway/backends.yaml`
- `infra/kubernetes/lab/gateway/routes.yaml`
- `infra/kubernetes/lab/gateway/backend.py`
- `docs/runbooks/kubernetes-gateway.md`

Out of scope: game manifests, database or broker exposure, TLS certificates, community ingress-nginx, edits to the shared kind scripts, and edits to the technical index, runbook index, STATUS, ROADMAP, or the Change ledger.

## Acceptance

- **Positive:** host/path routes, missing backend `503`, unmatched route `404`, Deployment and Gateway readiness, SSE events that stay spaced, and a loopback-only published port.
- **Negative:** no NodePort or LoadBalancer, no non-loopback accept on the published port, spoofed `X-Forwarded-User` stays unauthorized, an unsigned webhook is not treated as verified, and HTTPS to the plain listener fails.
- **Evidence:** commands and results recorded after the smoke. No paid provider call.

## Evidence

Commands that ran on 2026-11-19, in order:

- `node scripts/repo-tools/wiki-change-guard.mjs --mode plan --change work/changes/open/2026-11-19--k8s09-gateway-api-edge-networking` returned `plan ok` with no findings.
- One locked shell ran `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/gateway/install.sh`, `infra/kubernetes/lab/gateway/smoke.sh`, and `infra/kubernetes/lab/down.sh`. The first `kind load` attempt failed and `down.sh` deleted that cluster. The successful attempt did not use `kind load`. Smoke passed. `down.sh` deleted the cluster again.
- No paid provider call was made.

Versions and results are in `docs/runbooks/kubernetes-gateway.md`. Compose volumes `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were present after the final delete.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Player-facing rules on docs/product/README.md | product | unchanged: this lab adds no player promise and does not select a new experience | docs/product/README.md at b7b7479d | source-observed | A Gateway path is not a play session, and the product index was not edited | No product link was added |
| Laboratory limit at docs/technical/platform/topology.md#distributed-learning-target | technical | unchanged: that heading still says the kind lab is not the running game | docs/technical/platform/topology.md at b7b7479d | source-observed | The cluster was deleted after the smoke and is not a deployed game | The new runbook links to the heading. The technical index was not edited |
| Hosted boundary at docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | technical | unchanged: the hosted release and the educational cluster stay separate on that page | docs/technical/platform/deployment-and-compatibility.md at b7b7479d | source-observed | Plain HTTP on loopback is a lab exception and was not written into the hosted section | The new runbook links to the heading. That page was not edited |
| Story SSE at docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints | technical | unchanged: the synthetic event stream is not the committed-view hint | docs/technical/platform/http-api-and-client-contracts.md at b7b7479d | source-observed | The lab events were web-event and api-event markers, not a story snapshot | The new runbook points at the heading. That page was not edited |
| Command delivery at docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | technical | unchanged: the gateway does not admit commands or replace the outbox | docs/technical/platform/execution-and-delivery.md at b7b7479d | source-observed | No game process was deployed, so no command crossed this edge | Page not edited |
| Durable record at docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | technical | unchanged: PostgreSQL remains the record and was not given a route | docs/technical/platform/data-and-persistence.md at b7b7479d | source-observed | No postgres Service existed, and the Compose volume was still present after delete | Page not edited |
| Cache rule at docs/technical/platform/persistence-and-caching.md#redis-boundary | technical | unchanged: Redis is not authority and this edge does not publish it | docs/technical/platform/persistence-and-caching.md at b7b7479d | source-observed | No redis Service existed during the smoke | Page not edited |
| Lab gateway contract at docs/runbooks/kubernetes-gateway.md#plain-loopback-exception | technical | changed: the procedure, the plain HTTP loopback exception, and the authorization refusal are recorded on this new page | docs/runbooks/kubernetes-gateway.md inspected in the worktree on baseline b7b7479d | fixture-tested | HTTPS to 127.0.0.1:18080 was rejected, and a spoofed forwarded user stayed unauthorized | docs/runbooks/README.md was not edited. Another Change owns that index |
| Synthetic routes in infra/kubernetes/lab/gateway/routes.yaml | code | changed: slash reaches synthetic web and the api prefix reaches synthetic API, with an empty backend for the absent path | infra/kubernetes/lab/gateway/routes.yaml inspected in the worktree on baseline b7b7479d | fixture-tested | GET /api/absent returned 503 and GET /no-such returned 404 | No application README was added |

## Handoff and next action

- The smoke passed and the cluster was deleted. Do not select the next Change.
- `work/changes/README.md` and `work/changes/ledger/2026-11.md` were not edited. Other Changes own them. The queue index still points at the open packet path until the owner of that index updates it.
- Baseline inspected: `b7b7479d` on `change/k8s09-gateway`.
