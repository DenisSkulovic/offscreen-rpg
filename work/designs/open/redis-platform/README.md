# Redis platform renewal | workshop 08

2026-11-26. Integration baseline main b6d128061fd0eb4d30296589d9393a277b09477a. Status: proposed, investigation active; no defense, acceptance or implementation authorization. Next review: next owner workshop checkpoint (2026-11-26), after read-only inventory and lifecycle comparison. Posture: independent target with evolutionary reconciliation; retain working native resources where warranted. Scope: local Kind Redis infrastructure, lifecycle, configuration, physical pool boundaries and verification. Exclude application cache implementation, hosted topology, business correctness and paid execution.

## Current decision

[R2 lifecycle ownership](LIFECYCLE.md) supersedes the R1 open Helm-versus-create choice: native Helm for fresh pools, conditional on version-matched proof; legacy baseline is not adopted. R1 below remains the requirements and historical evidence register. [Live observations](OBSERVATIONS.md) now establish both legacy runtime identities, idle memory and successful Helm list on both contexts; version-matched Helm source investigated in LIFECYCLE.md. [Memory-pressure experiment](experiments/memory-results.md) observed successful bounded eviction; retain 32MiB maxmemory/128MiB limit as provisional baseline, investigate scheduling request and connection limits. [Native lifecycle proof](experiments/lifecycle/results.md) passed in release; native Helm selected for fresh local pools as candidate architecture. [Integration and cutover](INTEGRATION.md): owner census supports quiesced replacement at same DNS, conditional on authorization. [R6 baseline target](TARGET.md) specifies native render, lifecycle and observer; exact compatibility fixtures and migration proof remain open.

## Target hypothesis R1

A Redis pool is a bounded, reconstructible cache, not a database of record. One process and one stable ClusterIP endpoint per physical pool. Use explicit memory/CPU budgets, eviction and disabled persistence; no PVC, host publication, replication or operator unless requirements justify them. Domain key prefixes are naming boundaries, not authentication or resource isolation. Separate physical pools only for incompatible resource, latency, eviction or failure constraints. Optional cache failure cannot alter permissions, financial decisions, workflow or publication semantics. No automatic application wiring.

Prefer native declarative workload and lifecycle. Local chart with ordinary YAML is a plausible target because Redis singleton requires few resources and no upstream operator; compare native Helm install against guarded create-only kubectl. A third-party chart must demonstrably reduce maintenance rather than import unused replication/auth/storage machinery. Do not select a chart vendor or change Redis version yet.

### Lifecycle contract (provisional)
- Render: inspect ordinary manifests, no cluster write.
- Plan/status: explicit context, namespace, pool identity; classify absent, compatible, foreign, partial, drifted, unreadable; readiness is separate from inventory.
- Ensure: fresh install only when all reserved identities absent; compatible ready state no-op; otherwise refuse. No implicit upgrade, ownership takeover, delete, rollback, scale, flush or repair. A failed/unknown install leaves evidence and stops.
- Explicit maintenance is a separate path, not ordinary ensure. Cutover requires owner authorization, observed ownership and quiescence; preserve Service identity or explicitly prove endpoint transition. Never delete shared lab-a namespace.
- Guard against cooperating writers with shared lock; no claim of safety against arbitrary kubectl writers. Helm ownership metadata is not authorization. Native Helm must be evaluated for races and partial release records; no --take-ownership, --force or automatic uninstall.
- Observe effective image, config, singleton endpoint membership, Pod readiness and actual Redis protocol PING; inspect effective persistence/eviction and memory config independently of chart labels.

## Concrete configuration specimen (illustrative, not deployable)

Current budgets are an experimental control, not validated capacity. Keep Redis 8.2.1 Alpine for comparison. Record registry index and actual architecture image digest before pinning. Existing identities: dev offscreen-dev-redis / redis, release lab-a / redis. New named pools need unique Service, selectors and config identities; avoid selecting every pod labelled app=redis. Namespace strategy remains open.

```yaml
replicas: 1
strategy: Recreate
service: ClusterIP
resources:
  requests: {cpu: 20m, memory: 32Mi}
  limits: {cpu: 500m, memory: 128Mi}
redis:
  maxmemory: 32mb
  maxmemory-policy: allkeys-lru
  save: ""
  appendonly: "no"
```

Native ConfigMap + Deployment + Service; stable pool-specific selectors, non-root, no service-account token, capability drop, read-only config, configuration hash triggers replacement. A disposable writable directory may be needed by image runtime; validate before removing emptyDir. Never interpret maxmemory as cgroup limit. Keep baseline budget until measured; investigate maxclients and maxmemory-clients, bounded payload and concurrency demand, RSS and cgroup peak, eviction and cold-origin load. LRU vs LFU depends on workload; no tuning by aesthetic.

Security: current no-auth protected-mode disabled is only an explicitly trusted disposable local fixture. ClusterIP is not a trust boundary. Do not connect shared application or untrusted workloads until credentials/ACL, actual network enforcement, command denial and isolation are designed/proven. Hosted TLS, rotation, secrets delivery and client discovery separately gated. Do not publish a port for convenience. No plaintext secrets in Git or receipts.

## Evidence and decision register

| Question | Evidence / finding | Implication / discriminator |
| --- | --- | --- |
| Redis exact-version config | https://raw.githubusercontent.com/redis/redis/8.2.1/redis.conf (tag 8.2.1; read 2026-11-26): mb binary units, protected-mode yes in upstream example, passwordless remote clients restricted | Current no-auth override is deliberate fixture exception; measure effective configuration |
| Memory | https://redis.io/docs/latest/reference/eviction/ and https://redis.io/docs/latest/commands/info/ (read 2026-11-26): eviction accounting differs from RSS; INFO exposes memory and eviction metrics | Sample peak RSS/cgroup memory under bounded writes and clients; no universal ratio |
| Client pressure | https://redis.io/docs/latest/develop/reference/clients/ (read 2026-11-26): client memory can cause eviction or OOM | Determine maxclients/client-memory limits from consumer budgets, not arbitrary numbers |
| Helm ownership | https://docs.helm.sh/docs/v3/helm/helm_install/ and https://docs.helm.sh/docs/v3/topics/advanced/ (read 2026-11-26): takeover ignores ownership check, atomic failure may delete install | Neither flag in default ensure; inspect actual installed Helm version and test conflict/partial failures |
| Network isolation | https://kubernetes.io/docs/concepts/services-networking/network-policies/ and https://redis.io/docs/latest/management/security/ (read 2026-11-26): policy enforcement requires compatible CNI; Redis recommends trusted clients and ACL | Test denied access; do not infer isolation from manifest or namespace |
| Consumer boundary | docs/technical/platform/persistence-and-caching.md; packages/cache/src/redis/redis-config.ts and redis-connection.ts: one optional URL, standard createClient, offline queue disabled | Singleton compatible in principle; Sentinel/Cluster discovery not established |
| Native ownership | infra/platform/redis/chart and reconcile.mjs at baseline: render-only chart, individual creates/CAS patches; dev/release wrappers | Native release not currently owner. Compare native Helm with guarded create-only path; migration is not implicit. |

## Preliminary integration inventory

- infra/environments/platform-plan.mjs routes dev plan/ensure to dev-install.mjs and release to install.sh; preserve public infra:plan/up/status/render semantics, inspect exact output/exit contracts and readiness callers before selecting replacement.
- infra/platform/redis/chart profiles use same 32mb / 128Mi budgets; config uses disabled snapshot/AOF, protected-mode no, allkeys-lru. Existing labels/selectors and identities require preservation/cutover review.
- Current custom reconciler includes UID/resourceVersion fencing and refuses auth-bearing render. These are evidence of intended safety, not automatically reusable algorithms.
- docs/runbooks/kubernetes-redis.md historical 8.2.1 digest observation and destructive smoke: not current runtime proof; smoke refuses occupied identities. Never run against shared default.
- INF60 remains previously commissioned source-only; no execution in this workshop. Recommend owner pause dispatch pending lifecycle choice, do not silently revoke existing commission or rewrite packet. VER07/08 application cache proof remains separate.
- Undertaking overview last recorded ~45% overall, 75% architecture, 40% storyteller, 30% operations (uncertainty +/-20pp or more); no new outcome credit. Queue none; design not execution selection.

## Verification architecture and next experiment

First collect read-only host facts in one batch: helm version --short; kubectl config get-contexts; for each explicit expected context, helm list -A, kubectl get namespace for expected namespace, then get deployment redis, service redis, configmap redis-config, pods and endpointslices in that namespace (metadata/spec only, no secret contents). Record actual UIDs, owner annotations, images, selectors, endpoint membership, state and tool versions; report failures independently. No context switching, no mutation. If missing cluster report NOT RUN. Do not dump full Secret or environment. Follow with read-only protocol INFO memory/stats and CONFIG GET maxmemory maxmemory-policy save appendonly only after verifying target and access; no client data.

Next design a unique disposable pool proof (requires separate owner live permission, resource admission, UID-fenced cleanup and explicit namespace identity): compare native Helm fresh install / repeat / collision / failed install with guarded native creation. No shared mutation. Test bounded TTL, eviction, RSS/cgroup pressure, Pod replacement and client recovery with fixture-only synthetic keys. Bound load and duration; stop on resource pressure or identity mismatch. Cleanup only exact owned resources; do not use Helm uninstall until ownership and blast radius proven.

| Essential claim | Positive | Negative | Tier |
| --- | --- | --- | --- |
| Target and custody | expected context and absent inventory | wrong context, existing foreign object, partial/release conflict => zero writes | source fixtures + disposable Kind |
| Singleton and endpoint | one ready Pod, PING via Service | extra matching Pod/wrong selector/foreign endpoint => not ready | render + disposable Kind |
| Config and restart | effective values, expiry and cache loss after replacement | drift or nonmatching image => refusal | disposable Kind |
| Memory | bounded eviction under selected synthetic load | stress/slow clients must not silently yield OOM/false ready | disposable Kind, sizing gated by demand |
| Optional cache semantics | app origin fallback and recovery | cache loss cannot authorize or change durable outcome | existing VER07/08, not claimed here |
| Security | allowed trusted client | unauthorized client/command denied for any shared authenticated profile | runtime proof before shared adoption |

No commands executed against owner's clusters. No local Helm render or tests run. Exact version Helm, live inventory, immutable digest verification, named pool lifecycle and consumer command census remain open. Formal defense blocked until architecture choice, concrete cutover and essential proof route are settled. Next: inventory and compare ownership mechanisms; then produce normative specimen and adversarial defense. 
