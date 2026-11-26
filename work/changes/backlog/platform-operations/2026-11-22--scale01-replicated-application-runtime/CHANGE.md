# SCALE01 | Multi-replica application runtime

**State: PROPOSED; not Cursor-ready.** This is application-level concurrency and replica correctness, not database HA or throughput measurement.

## Owner outcome
After real single-instance TURN03 proof and K8S10 bounded recovery, demonstrate real stories correctly progressing with independently replicated Next Web, Nest API, Game Authority and SQL relay/control/execution Temporal Worker roles. A starting target may be 2–3 Web/API/GA Pods and 2–4 appropriate Worker Pods, but actual per-role replicas are chosen using memory, CPU, connection and queue measurements, not blanket triplication.

## Selected scope and invariants
Inspect real Deployments, Services, readiness/liveness, queues and data ownership on the joined branch. Multiple API/Web replicas share durable identity and owner-scoped read/command routing, including SSE invalidation. Multiple GA/relay/executor replicas must still admit one logical story operation and publish one scene, despite at-least-once delivery and competing workers. Each replica has bounded DB pools, no accidental process-local authoritative state, and least-privilege credentials. Preserve existing SQL locks, leases, operationId and Temporal workflow identities. Fixed replica correctness is this Change; metric-driven autoscaling belongs to LOAD01.

Do not assume one Nginx/Traefik ingress Pod implies HA. The current architecture can expose one ingress endpoint while its actual Pod/node remains a single failure point. Choose ingress redundancy only after target deployment/failure-domain review.

## Expected proof
Run actual authenticated multi-owner scripted games on distinct application Pods. Observe per-Pod request/activity handling and one committed effect/receipt under duplicate dispatch, rolling updates and one controlled replica loss. Verify safe retries, source roots, pending/held states and no paid provider requests. Record errors, queue lag, per-replica CPU/memory and DB connection behavior. Distinguish application replication on single-node kind from multi-node availability.

## Dependencies and exclusions
Requires TURN03 joined cold-kind PASS, K8S10 one-fault baseline and WR10/WR11 integrated fake-provider path. Coordinate with SCALE02 stateful HA, SIM01 provider simulator and LOAD01 stress/autoscale. No new provider calls, cluster mutation, commercial infrastructure, full production HA claim or code implementation authorized by this packet.

**Dependency reconciliation (2026-11-27):** TURN03 is cancelled. Historical requirements to pass its legacy scripted scenario are retired. Re-evaluate this work against the redesigned monorepo before owner selection; derive appropriate normal-path acceptance and resource/authority prerequisites from that architecture. This neither authorizes dispatch nor grants acceptance credit. Existing independent security and data-integrity requirements remain. [Historical TURN03](../../../archive/2026-11/distributed/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md).
