> **Source-rebased readiness, 2026-11-22:** [K8S10-CURRENT-EXECUTION.md](K8S10-CURRENT-EXECUTION.md) selects only real-game graceful executor Pod replacement and bounded <=9 scripted commands, not a broad chaos catalog. The live gate requires a real TURN03 cold-kind PASS, matching release SHA, verified Pod→ReplicaSet→Deployment UID and exact Pod UID/digest/opt-in, user permission for that disposable cluster, zero provider dispatch, authoritative single operation/effect/checkpoint, and redacted evidence. Mocked controller/test/oracle suites are lower-tier; actual kind tests remain NOT RUN until executed. An observed duplicate effect FAILs the Change; do not label it a successful resilience test.

# K8S10 | resilience proof catalog and falsification matrix

**Status:** source/contract and T01–T03 unit oracles implemented; **T02b real-Kubernetes-shape preflight guard 43/43 local Node22 test PASS** at `14e2bf33` (2026-11-20), but **real kind plan, Pod deletion and app-game recovery NOT-RUN**. Historical Rabbit consumer redelivery in [CHANGE](CHANGE.md) and [runbook](../../../../docs/runbooks/kubernetes-fault.md) is independent. Source baseline 584b594 is historical. [Execution](EXECUTION.md) is the proposed implementation contract. No row here is an authorization to inject faults.

## What constitutes a trustworthy experiment

Each run must record **hypothesis before injection**, baseline observable, actual fault and Pod UID, allowed blast radius, expected degraded behavior, abort bound, recovery condition, integrity oracle and negative control. The key outcome is **correct game-state recovery**, not merely Kubernetes replacing a Pod. A failed assertion becomes a minimal reproducible regression test, not just a chart of red CPU.

### Matrix 1: campaign under bounded Pod faults

| Case | Selected precise fault (only in disposable lab) | Hypothesis / expected degradation | Mandatory oracle and failure mode | Gate |
| --- | --- | --- | --- | --- |
| C00 | Healthy SCRIPTED 5-turn campaign, no injection | Campaign starts and advances, checkpoint and root valid, model dispatch zero | Exact actor/story/generation IDs and hash, no double effects; any provider invocation FAIL | Before anything |
| C01 | Gracefully delete one real **Next** Deployment Pod after SSR scene | Existing TCP/browser request may fail briefly; after replacement same session reads canonical scene | GET root and viewVersion unchanged, session/wrong-user checks | After TURN02/K8S11 |
| C02 | Delete one **Nest** Pod just after accepted command and before HTTP response | Client sees ambiguous result; GET/receipt reconciles **same** operation ID | Exactly one resolution + effect and one next scene; no new ID automatically | After TURN03 |
| C03 | Stop Storyteller executor **before saved result** (fake only) | Workflow waits/retries allowed, no external charge | Same generation/attempt accounting, single effect; recorded attempts; no provider call | After STORY03 |
| C04 | Stop executor **after saved result, before GA publish** | On restart control reads saved hash and GA publishes once | Same attempt+result hash; exactly one publication/pass/root/checkpoint | **First targeted app chaos test** |
| C05 | Stop GA **after SQL scene commit but before Temporal ack** | Replay returns already-published outcome | SQL constraints, source root, no second passage or spending | After STORY03 |
| C06 | Stop SQL outbox relay **after DB notice persisted** | Notice remains pending and eventually starts stable workflow | Same generation/workflow ID, no lost notice | After TURN03 |
| C07 | Disable optional Rabbit projection consumer | Core scene and SSE/GET remain functional | No Rabbit dependency on model wake or canon; lag only in derived consumer | Only if DIST04 consumer exists |
| C08 | One allowlisted app Pod chosen via deterministic seed, after steady baseline | Temporary component outage followed by recovery; canonical integrity preserved | Same as relevant C01–06 oracle; event selected with recorded UID | After C01–06 |
| C09 | Repeat 5–20 **serial** seeded app failures, cooldown after each | No cumulative pending/duplicate effects; convergence under measured resource envelope | All operation IDs and SQL/S3 refs, lag/restart/pressure report | After C08 |
| C10 | Saturation, 3–5-second randomized faults | Intentional availability loss may be expected; **data safety** and eventual recovery after fault stop required | No corruption, final drain complete within selected window; record outages; no HA promise | **Separate owner selection** |

### Matrix 2: stateful and non-Pod failure catalog

| Case | Fault | Expectation / limitation | Prerequisite |
| --- | --- | --- | --- |
| S01 | S3 stage fails before SQL selector | No selector to missing object; old scene remains truth | Named stage fault already supported; separate kind integration |
| S02 | SQL transaction abort after staging object | Unreferenced object tolerated, exactly no committed new scene selector | Dedicated DB/S3 test fixture |
| S03 | Exact historical blob corrupt/missing | Fail closed, never serve current branch state as historical | DATA04, real S3 |
| S04 | Root advanced while fake model delayed | GA marks saved proposal stale/held; no rewriting future | STORY03, branch-root fence |
| S05 | PostgreSQL sole primary restart | New admission unavailable while down; after recovery committed state unchanged | **No HA claim**; CNPG instances=1 |
| S06 | PostgreSQL actual failover with multiple instances | Elected primary and fencing; application converges under measured RTO | **Not possible on current one-primary lab**; new HA/backup design |
| S07 | Temporal server unavailable, persistence intact | Existing workflow eventually resumes; no duplicate effects | Separate Temporal/DB owner and bounded duration |
| S08 | Temporal history erased/corrupt | Quarantine/reconcile; **no automatic replay miracle** | Destructive, isolated backup/restore profile, not random suite |
| S09 | Redis cache unavailable | No canon loss; define which actual game paths depend on Redis before expectations | Real dependency mapping first |
| S10 | 100–500 ms network lag between selected internal services | Timeouts/backoff and idempotence; no late stale commit | Verified CNI/tool isolation, no host-wide network mutation |
| S11 | DNS outage/partition limited to app namespace | Request failure bounded, work preserved, recover | Verified CNI, safe network owner |
| S12 | Startup order randomized after full app restart | Services fail readiness when dependencies unavailable; converge after restored | Real app release and readiness signals |
| S13 | Bounded synthetic request burst and 10/100/1000 scripted waiting stories | Throughput, queue lag, p95/p99, max RSS and safe overload/429/503 | Dedicated load owner and memory budget; loopback only |
| S14 | Disk saturation / PVC failure | Defined fail-closed behavior, explicit restore; no volume deletion in regular suite | Isolated destructive recovery sandbox only |

Do not call S13 a public DDoS test. Test only the loopback-port-forwarded disposable system with strict request and concurrency limits and a stop on resource depletion. Do not share a real app session with human testing by default.

## Required oracle: no hidden success or accidental model spend

Run-frozen IDs: `runId, storyId, ownerId, sourceRoot, generationId, workflowId, attemptId, resultHash, operationId, passageId, checkpointHash, canonRootHash, branchId`. Collect before/after at consistent points, not an impossible cross-S3/PG atomic snapshot.

For each accepted operation:
1. Exactly **one durable operation identity and expected mechanical effect**; retries/duplicate wake do not create a second passage or re-run a choice.
2. Every referenced checkpoint, manifest and document root can be fetched **by exact hash** and passes schema/identity/revision checks. Missing object = FAIL or explicitly expected hold, never silent latest fallback.
3. A delayed task's root must match the branch. Parent scene2 must not appear in child scene1 memory after fork.
4. At end of no-fault drain: all supported pending scripted actions reach either committed or an explicit terminal/held state with reason. There is no hidden forever-pending unacknowledged work labeled PASS.
5. Authenticated owner A reads own story; wrong actor B gets correct refusal. After browser/API Pod recovery, cookie/query cache cannot reveal another owner's scene.
6. **ProviderDispatchAttempts=0** at the injected adapter and no `provider`/paid execution stage or usage debit in DB. Record `task.execution.mode=scripted`. If a model call is attempted or an API key is present in the worker Pod, abort/FAIL before any further game drive.

### Negative controls for the tester itself

- Fake Kubernetes client returns `current-context=prod` or `kind-other`: preflight **denies** with zero delete calls.
- Pod has same name but changed UID, or owner isn't allowlisted Deployment, or label is placeholder/synthetic: **deny**, not random substitute.
- No healthy baseline, only sole data Pod eligible, low memory, no cluster lock, or another run active: **deny**.
- Test fake provider spy is intentionally invoked: test must **fail immediately** with zero outbound transport (throw before network).
- Deliberately create two conflicting passage side effects for same operation in fake oracle: suite must fail, not report that the Pod recovered.
- Inject command timeout after DB commit: the driver uses same operationId and does not create a second irreversible action.
- Health never recovers by deadline: controller stops scheduling, preserves evidence and returns nonzero status.
- Missing checkpoint object: full-game PASS must fail even if HTTP GET returns cached HTML.
- One fake script 'replays' a known seed but chooses a different Pod UID at execution time: controller aborts unsafe mutation and records drift; no false reproducibility claim.

## Calibration and SLOs

Start by collecting a **healthy baseline** (e.g., 5–20 runs before choosing thresholds). Each scenario declares explicit per-component recovery deadline only after observing actual memory/CPU and controller restart behavior; a one-replica service may legitimately refuse connections while down. Use percentiles only with stated sample count. The primary early pass criterion is **zero invariant violations and eventual convergence within an explicitly bounded window**. Report separate availability percentage and time-to-interactive once a repeatable baseline exists, rather than inventing “5-second guaranteed healing.” Random-kill soak cannot prove low-probability failure absence at arbitrary scale.

## Evidence shape

```json
{
  "schema": "offscreen.chaos-run.v1",
  "status": "NOT-RUN",
  "sourceSha": null,
  "runId": null,
  "seed": null,
  "providerMode": "scripted",
  "providerDispatchAttempts": null,
  "cluster": {"name": "offscreen-lab", "context": "kind-offscreen-lab", "uid": null},
  "fixture": {"storyId": null, "sourceRoot": null, "startRoot": null},
  "events": [],
  "oracle": {"operationDuplicates": null, "missingCheckpointObjects": null, "stalePublications": null, "branchLeaks": null},
  "metrics": {"requests": null, "p50Ms": null, "p95Ms": null, "p99Ms": null, "timeToReadyMs": null, "timeToPlayableMs": null},
  "abortReason": null,
  "cleanup": "NOT-RUN"
}
```

Do not fill `null` fields by guessing. A planning-only file is NOT-RUN. A fake unit-test result is not a cold-kind pass. Aggregate results without overwriting the dated run receipts. Secrets, private prompts, raw story excerpts and access tokens are excluded from default evidence.

**External reasoning basis:** Kubernetes pod deletion allows graceful termination and controller replacement; force deletion does not guarantee the process stopped (https://kubernetes.io/docs/concepts/workloads/pods/pod-termination/). Temporal retrying Activities requires application-level idempotent effects (https://docs.temporal.io/activity-definition). Those facts support this test design but do not establish Offscreen RPG implementation quality.
