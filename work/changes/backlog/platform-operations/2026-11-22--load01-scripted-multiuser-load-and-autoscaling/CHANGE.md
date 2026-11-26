# LOAD01 | 100-user scripted load and metric-driven autoscaling

**State: PROPOSED; not Cursor-ready.** A capacity and load-shaping experiment rather than K8S10 one-fault/9-command trial, SCALE01 fixed-replica correctness or SIM01 provider simulation.

## Owner outcome
Create up to 100 independent simulated players on actual authenticated player APIs and story/scene fixtures, making legitimate actions against their own isolated campaigns. Configurable seeded traffic profiles should include gradual arrivals, bursts/spikes, realistic pauses and think time, long quiet/night windows, resumption and different starting scenes. Every model request is served only by SIM01's no-paid adapter. A common story script is fine; shared story state/operation identities are not.

## Load progression
Start 1 then 5, 20, 50 and at most 100 enrolled users, bounded by the real laptop's memory/CPU/cluster capacity and with separate caps for active commands/second, in-flight requests and total enrolled users. The test generator must use real receipts, hold/202/409/status handling rather than directly altering DB game state. Unknown responses must not be silently counted as successes.

## Measurement and scaling
Record observed throughput, p50/p95/p99 latency, failure and hold classes, operation/scene idempotency, per-user completion, SQL connection pool/locks, outbox lag, Temporal queue delay/activity retry, CAS errors, CPU/RAM per Pod and aggregate resource footprint. Compare fixed 1-replica and multi-replica baselines on the same seed. Configure HPA or KEDA only when the required Metrics Server/custom queue metrics are actually present; explicit minimum/maximum replicas, cooldown and scale-down protections. Show empirical replica counts and work redistribution during ramp and idle. Do not treat DB or Temporal StatefulSets as ordinary HPA-scaled stateless Workers.

## Proof boundaries
One-node kind results are a local capacity/functional signal, not hosted SLO/HA evidence. Do not infer linear scalability from more Pods or silently discard timeouts and 409s. Deterministic scenarios may reuse CH01 but the benchmark owns traffic execution and truthful reports, not creative evaluation. Depends on TURN03, K8S10, SIM01 and SCALE01; SCALE02 multi-node HA is a separate later gate. No paid inference, uncontrolled cluster load, shared-environment benchmarks or paid infrastructure authorized.

**Dependency reconciliation (2026-11-27):** TURN03 is cancelled. Historical requirements to pass its legacy scripted scenario are retired. Re-evaluate this work against the redesigned monorepo before owner selection; derive appropriate normal-path acceptance and resource/authority prerequisites from that architecture. This neither authorizes dispatch nor grants acceptance credit. Existing independent security and data-integrity requirements remain. [Historical TURN03](../../../archive/2026-11/distributed/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md).
