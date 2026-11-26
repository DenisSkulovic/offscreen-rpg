# Live observations | 2026-11-26

Owner-operated read-only inventory, workshop R2 d3f1ea8c271377c2a263161d8f8efe1d5eabb058. Main b6d128061fd0eb4d30296589d9393a277b09477a. No mutation. This is observed inventory, not full readiness or lifecycle proof.

Helm v3.22.1+gd6c1a0e. Kind clusters offscreen-dev and offscreen-release both exist.

| Evidence | Development | Release |
| --- | --- | --- |
| Context | kind-offscreen-dev | kind-offscreen-release |
| Namespace | offscreen-dev-redis | lab-a |
| Owner label | offscreen.dev/owner=offscreen-dev | offscreen.rpg/lab=disposable |
| Deployment UID | 97f2c6ce-1ee2-4c19-92bc-9a53b8fd478b | d47fe7b9-b3fe-4299-97d6-d13d21cd5ca3 |
| Service UID | 7a07ca85-967e-4863-9bde-a977b37d4f4d | 8a3d6a7a-8e68-4471-bc73-5b0aa6dc22f0 |
| ConfigMap UID | 6beb372a-35ae-48ef-bc67-b5024fd3d9cb | 7873f501-fd41-4cc3-9a92-c0471d1b05f9 |
| Helm release annotation | absent on all three | absent on all three |
| Helm list | Kubernetes cluster unreachable: unknown | succeeds, no release listed in lab-a |
| Deployment image | redis:8.2.1-alpine | redis:8.2.1-alpine |
| Selector | app=redis | app=redis |
| Pod | redis-58754f8785-79xtn | redis-b78fc5f9d-xfn7h |
| Endpoint target UID | 2e5372b8-1c91-492c-a276-5cfd8728af27 | ebc5ffeb-e7de-4fd9-b844-a60d02b092d2 |
| Pod state | Running 1/1, 2 restarts | Running 1/1, 2 restarts |
| Endpoint | 10.244.1.4 ready | 10.244.1.15 ready |

Interpretation: legacy manifests present; no implicit adoption. Dev Helm release inventory is unreadable, not empty. Both selectors currently resolve one ready endpoint; endpoint UID not independently compared against Pod UID in this batch. Both restarts reported approximately 10h ago; correlated infrastructure event is plausible, cause unknown. Image tag is not an observed digest/version. No evidence of current runtime memory or effective server config.

Next read-only batch: repeat dev Helm list with explicit context and debug, compare kubectl /version, check Helm/Kubernetes executable paths and environment variable names only (no credential contents). Probe exact Redis deployment in both namespaces using redis-cli INFO server/memory/stats/clients/persistence and CONFIG GET maxmemory maxmemory-policy save appendonly maxclients maxmemory-clients; no key names, secrets or writes. Observe actual imageID and Pod UID. Bound kubectl request time and exec duration. If Helm remains unreachable, gate native dev install and diagnose actual error before selection. No credential changes or blind retries. Memory sizing remains unselected; idle measurements do not establish worst-case capacity.

## Runtime and connectivity follow-up

Owner-operated second read-only batch, 2026-11-26. Helm list dev --all --debug succeeds and is empty; Kubernetes server v1.37.0 linux/amd64; Helm and kubectl /usr/local/bin, no HELM_/KUBE-prefixed env names printed. Prior dev Helm failure transient, cause unknown; no reproducible connectivity blocker at present. Do not treat this as installation proof. Pod UIDs now directly match both earlier EndpointSlice target UIDs.

| Observation | Development | Release |
| --- | ---: | ---: |
| Redis version | 8.2.1 | 8.2.1 |
| Uptime seconds | 24 | 27 |
| used_memory bytes | 739208 | 739208 |
| used_memory_rss bytes | 12394496 | 12562432 |
| used_memory_overhead bytes | 715976 | 715976 |
| used_memory_dataset bytes | 23232 | 23232 |
| mem_fragmentation_ratio | 17.18 | 17.42 |
| Connected clients | 1 | 1 |
| Blocked clients | 0 | 0 |
| maxmemory bytes | 33554432 | 33554432 |
| maxmemory-policy | allkeys-lru | allkeys-lru |
| maxclients | 10000 | 10000 |
| maxmemory-clients | 0 | 0 |
| appendonly | no | no |
| save | empty | empty |
| Expired / evicted keys | 0 / 0 | 0 / 0 |
| Hits / misses | 0 / 0 | 0 / 0 |
| Keyspace | empty | empty |

Both status.containerStatuses imageID = docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232, matching historical index digest in runbook. This establishes observed runtime identity string and version, not registry-platform manifest resolution; verify availability of immutable digest and platform matching for distribution before changing production pin. Pod UIDs unchanged from endpoint observation, process uptimes nevertheless recently reset; exact cause of restarts not established.

Interpretation: idle allocation ~0.705 MiB, RSS ~12 MiB. Fragmentation ratio is dominated by small denominator, not evidence alone of allocator fragmentation. Compare allocator_frag_bytes/ratio and RSS overhead under load. Request 32Mi/limit 128Mi remain provisional control; process RSS is not container memory.current. 10000 clients and disabled client eviction are native defaults, not demonstrated safe client budget. No capacity selection from idle data. No workload, key mutation or proof of recovery. Next: optional bounded, isolated Docker specimen under same memory/CPU limits; no existing cluster or cache access. Follow with Helm fresh/partial/conflict experiment after separately authorized unique namespace and cleanup design.
