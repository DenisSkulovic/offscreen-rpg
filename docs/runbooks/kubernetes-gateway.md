# Kubernetes gateway

Disposable Gateway API edge for the [educational laboratory](../technical/platform/topology.md#distributed-learning-target). This is not the game, not Compose, and not [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment). The cluster procedure remains [Kubernetes lab](kubernetes-lab.md).

## What this procedure is

Install one maintained Gateway API controller on the existing `offscreen-lab` cluster, then route two synthetic HTTP backends through one Gateway. Traefik Proxy is the controller. `/` and `/events` go to a synthetic web process. `/api` goes to a synthetic API process. `/api/absent` goes to a Service that has no pods. These routes stand in for the selected Next page and Nest API, including a long-lived `/api` event stream. They are not that deployment. The synthetic events are a timing probe, not the story SSE hint.

The shared kind configuration does not publish a workload port. This procedure does not change that file. The host reaches the Gateway only by `kubectl port-forward` bound to `127.0.0.1`.

Platform install manifests live in `infra/platform/gateway/`. Verification scripts live in `infra/verification/smoke/gateway/`. Run them from the repository root, after `infra/clusters/kind/release/up.sh`, and before `infra/clusters/kind/release/down.sh`.

## Plain loopback exception

This lab does not terminate TLS. The Gateway listener is `HTTP` on container port 8000. The Traefik Service is `ClusterIP`. No certificate is mounted, and the websecure Service port is not published. An HTTPS handshake to the loopback port is supposed to fail.

That is a deliberate plain-HTTP exception for a disposable loopback lab. It is not a hosted edge, not a browser origin, and not a claim that production traffic may skip TLS. [Kubernetes as a deliberate extension](../technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension) still owns the hosted-release boundary. This page does not change it.

## A Gateway is not authorization

The Gateway chooses a backend from the path. It does not decide who the player is, and it does not verify a webhook signature.

The synthetic API returns `decision: unauthorized` and `trusted-role: none` even when the request carries `X-Forwarded-User: admin` or a fake `Stripe-Signature`. Traefik is configured with `forwardedHeaders.insecure: false` and an empty trusted-IP list, so a client-supplied `X-Forwarded-For` is not the sole client identity. The application still must not treat any forwarded header as a session. Game SSE hints stay on [GET truth and SSE hints](../technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints). The `/events` stream here is a synthetic timing probe, not that contract.

`POST /api/hooks/example` accepts an unsigned body and records `signature-checked: false`. No payment provider is called.

## What it must not do

- Do not install the retired community ingress-nginx controller. The Traefik value `providers.kubernetesIngressNGINX.enabled` stays false.
- Do not publish a workload on `0.0.0.0` or `[::]`. Do not create a NodePort or LoadBalancer Service. `lib.sh` rejects both.
- Do not route to PostgreSQL, Redis, RabbitMQ, Temporal, or a game Deployment. The only backends are `synthetic-web`, `synthetic-api`, and the empty `absent-backend`.
- Do not put a secret, a certificate, or a provider token in Git.
- Do not treat this cluster as the running game. Delete it with `down.sh` when the probe is finished.

## Pins

Pinned for the 2026-11-19 lab:

| Piece | Pin |
| --- | --- |
| Gateway API CRDs | `v1.6.3` standard channel, sha256 `356c2b8e286a964dc20995435659ad1095386329974793af10bbfe3eff977fe5` |
| Controller | Traefik Proxy `v3.7.19`, image digest `sha256:a6c0194dda77bcb804824580f36fa7edc56e315b1acfe933366c8b52844a78a4` |
| Helm chart | `traefik/traefik` `42.4.1`, installed with `--skip-crds` so Traefik Hub CRDs are not added |
| GatewayClass | `lab-traefik`, controller `traefik.io/gateway-controller` |
| Synthetic image | `python:3.12-alpine`, digest `sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89` |
| HTTP timeouts | responding read 10s, write 10s, idle 30s |

Chart CRDs are skipped because this lab does not use IngressRoute or Traefik Hub. The Gateway API standard bundle is applied by itself.

## Routes

| Request | Backend | Expected result |
| --- | --- | --- |
| `GET /` | synthetic web | `200` and `web-ok` |
| `GET /events` | synthetic web | three SSE events, spaced, not one buffered burst |
| `GET /api` and `GET /api/events` | synthetic API | `200`, API body or API SSE |
| `POST /api/hooks/example` | synthetic API | `200`, signature not checked |
| `GET /api/absent` | Service with no pods | `503` |
| `GET /no-such` | no HTTPRoute match | `404` from the Gateway |
| `GET /api/no-such` | synthetic API | `404` and `api-not-found` |

Readiness is the Traefik and synthetic Deployments Available, the Gateway condition `Programmed=True`, and the HTTPRoute parent condition `Accepted=True`.

## Create, probe, and delete

Hold the shared cluster lock for the whole sequence. If `up.sh` says the cluster already exists, stop. Do not delete a cluster this shell did not create.

```bash
exec 9>/tmp/offscreen-k8s-cluster.lock
flock 9
infra/clusters/kind/release/up.sh
infra/platform/gateway/install.sh
infra/verification/smoke/gateway/smoke.sh
infra/clusters/kind/release/down.sh
```

`install.sh` and `smoke.sh` take no arguments. They use `kubectl --context kind-offscreen-lab`. `smoke.sh` opens `127.0.0.1:18080` only for the probe and closes that port-forward when it exits. `down.sh` deletes the kind cluster. It does not delete Compose volumes.

## Debugging

- `kubectl --context kind-offscreen-lab -n lab-edge describe gateway lab-edge` shows `Accepted` and `Programmed`. A false `Programmed` condition usually means Traefik cannot see the GatewayClass or the listener port does not match entrypoint `web` port 8000.
- `kubectl --context kind-offscreen-lab -n lab-edge describe httproute lab-edge-routes` shows whether each backend Service resolved. `absent-backend` is supposed to exist as a Service and have no endpoints.
- `kubectl --context kind-offscreen-lab -n gateway-system logs deployment/lab-gateway-traefik --tail=120` is the controller log. The dashboard is off.
- `kubectl --context kind-offscreen-lab get svc -A` must show no `NodePort` or `LoadBalancer`. The published host port is the port-forward, and `ss` should show `127.0.0.1:18080` while the smoke is running.
- A `503` on `/` or `/api` means the synthetic Deployment is not ready. A `503` on `/api/absent` is the missing-backend proof.
- A stream that arrives as one burst failed the buffering check. The responding timeouts above are long enough for the three-event probe and short enough to show that the lab is not an unbounded player connection.

## Observed local run

On 2026-11-19 the locked sequence created `offscreen-lab`, installed this gateway, passed the smoke, and deleted the cluster. Host tools were Docker 29.9.3, kind v0.33.0, kubectl client v1.37.2, and Helm v3.22.1. MemTotal was 12249872 kB. MemAvailable was 9816316 kB before create, 8940520 kB during the smoke, and 9620064 kB after delete. While the cluster was up, `docker stats` showed the worker near 236 MiB and the control plane near 669 MiB.

`install.sh` checked the image digests, applied Gateway API v1.6.3 (`sha256sum` matched), and installed chart 42.4.1. Traefik and both synthetic Deployments became Available. Gateway `lab-edge` reported `Programmed=True`. HTTPRoute `lab-edge-routes` reported `Accepted=True`. `absent-backend` had no endpoints. Every Service in the probe was `ClusterIP`.

`smoke.sh` port-forwarded `127.0.0.1:18080`. `ss` showed `127.0.0.1:18080` and did not show `0.0.0.0:18080`. The kind containers published `127.0.0.1:6443` only. Results:

- `GET /` returned 200 and `web-ok`.
- `GET /api` returned 200 and `api-ok`.
- `GET /api` with `X-Forwarded-For: 203.0.113.9` and `X-Forwarded-User: admin` stayed `decision: unauthorized` and `trusted-role: none`. The backend saw `X-Forwarded-For` as `127.0.0.1`, not the supplied address.
- `POST /api/hooks/example` with a fake `Stripe-Signature` returned `hook-accepted-unsigned` and `signature-checked: false`. No payment provider was called.
- `GET /api/absent` returned 503 and `no available server`.
- `GET /no-such` returned 404. `GET /api/no-such` returned 404 and `api-not-found`.
- `/events` and `/api/events` each delivered three events over 0.901 seconds.
- An HTTPS handshake to `127.0.0.1:18080` was rejected.

The hostname lookup used by the extra connect probe had no non-loopback address, so that probe did not dial the WSL `eth0` address. The published socket was still bound to `127.0.0.1` only.

`down.sh` removed `offscreen-lab`. `kind get clusters` then listed none. `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were present before and after. An earlier attempt in the same session failed while `kind load` imported the multi-platform images, and that attempt also deleted the cluster before this successful run. The install script no longer uses `kind load`; the nodes pull the pinned digests.
