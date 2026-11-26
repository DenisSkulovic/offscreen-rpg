> Deferred by owner 2026-11-26. Historical design/evidence only; no current dispatch or live permission. Refresh against current source after TURN03 passes and owner selects this work.

# K8S10 | controlled random Pod kills against a zero-provider campaign

**Profile:** RELEASE/PROOF. **Planning only**, inspected source 584b594. **Current status:** K8S10's first Rabbit-consumer-loss case passed; the following app-chaos phases are **proposed/unselected** and require real TURN02/TURN03 application release. This is not a command to execute a destructive experiment. [Architecture narrative and diagrams](../../../../../docs/architecture/09-chaos-and-zero-token-play.md) and [source map](SOURCE-MAP.md).

## Design decision: a bot plus a reliable oracle, not just a killer script

Run one **real, isolated campaign** through approved public APIs using the already-present scripted Storyteller fixture and supported opening/candidate route. The chaos runner is a separate **host-side local CLI**, not a Kubernetes operator and not a feature exposed to ordinary player sessions. It chooses a Pod from a strict allowed set, injects one fault, watches health and durable state, reconciles outcomes, and only then schedules another. The game driver and fault scheduler have independent event logs but share runId, source SHA and event IDs.

### Package layout (proposed, no files exist yet)

```text
infra/kubernetes/lab/chaos/
  README.md            # exact safety and command grammar
  preflight.*           # context/UID/label/release/policy guard and capacity
  selector.*            # pure seeded candidate chooser; side-effect-free
  controller.*          # bounded fault loop; dry-run by default
  fault-adapters.*      # graceful app Pod delete first; abrupt crash later
  observe.*             # Pod/operation health and durations
  oracle.*              # cross-view SQL/S3/http invariants; read-only database
  report.*              # machine evidence, sanitized, immutable run id
  test/*                # fake kubectl/HTTP/PG adapters; NO cluster required
```

Prefer small Node scripts (Node 24 pinned by repo), using only preinstalled dependencies and a mockable subprocess boundary. Existing Bash `lab/lib.sh` guards should be **used or mirrored with explicit tests**, not copy-pasted as a second large shell framework. No dependency on Chaos Mesh/Litmus operators until native basic kill proves inadequate.

### Modes and permission fence

| Mode | Default? | Effects | Requires |
| --- | --- | --- | --- |
| `plan` (dry-run) | **yes** | Read-only preflight, prints and records target/plan, no Pod writes | Named lab context, selected approved manifest and seed |
| `one` | no | One **graceful app-Pod deletion**, then recovery and oracle | `--execute`, explicit runId confirmation, cluster lock, healthy baseline, target allowlist |
| `seeded` | no | 2–N safe **serial** faults with per-round health/cooldown and max duration | same, plus max events/duration/cooldown budget, prior `one` PASS |
| `saturation` | no | High-rate 3–5-second faults, intentionally overlapping unavailability **only after separate explicit owner approval** | multi-replica app and verified capacity; not a normal CI default |
| `targeted-cut` | no | Inject named semantic fault at a known after-save/before-publish or ack-loss seam | existing test-only Chamber fault controls, separate selected test fixture, bounded stage |

**Fail closed preflight:** exact current kubectl context `kind-offscreen-lab` and kind cluster `offscreen-lab` (do not auto-switch contexts); snapshot target namespace + owning Deployment name/UID and Pod UID, verify `offscreen.rpg/chaos-eligible=true` **on actual TURN02 app deployment** (label proposal), verify not placeholder/synthetic or StatefulSet, and compare before action. Refuse any non-owned namespace, unlabeled Pod, unknown controller, API/Pod label drift, unhealthy baseline, no runId, active user live-provider trial, missing console lock, low available memory or target left Terminating. One process owns `/tmp/offscreen-k8s-cluster.lock` for **the whole run**; no parallel release/migration/cleanup.

**One must not hide behind a cluster-name check.** Validate cluster UID and image digest matches selected release receipt; a wrong local kind with same name is not implicitly safe. The runner never calls `kind delete cluster`, `kubectl delete namespace`, `kubectl scale`, `kubectl delete pvc`, `kubectl delete sts`, `docker volume rm`, `docker prune` or any command on other contexts. For early runs, only ordinary `kubectl --context kind-offscreen-lab -n <selected-app-namespace> delete pod <name> --wait=false` with normal grace period is authorized. Distinguish “graceful termination” in report. A later SIGKILL must be implemented/tested separately; force removal can leave a process running and should not be used as a generic crash mechanism.

**Current release label proof, 2026-11-20:** TURN02's actual Deployment **Pod templates already carry** `offscreen.rpg/chaos-eligible=true`. Source fix `14e2bf33` resolves Pod→ReplicaSet→Deployment controller UIDs, validates **both** live Pod/template opt-in, the exact Deployment image tag, and the Pod's runtime digest. The local release ref alone does not authorize mutation. T04a must run the read-only plan on actual kind and capture an owner-reviewed release ref; T04b later needs a proven scripted game baseline plus explicit authorization and UID recheck before *one* graceful Pod deletion. Do not treat a local 43/43 fixture run as real cluster acceptance.

### Zero-model-call execution mode

Use the existing `task.execution.mode=scripted` and `scriptedStorytellerResult` at the **real executor task seam**. The scripted result is versioned and validated by `validateStorytellerResult`, not random filler. Do not add a second "fake app" with its own SQL publication path.

1. At worker **composition and creation** force offline policy: `STORYTELLER_LIVE_ENABLED` absent/false, no `STORYTELLER_EXECUTION_JSON` live policy, no `OPENROUTER_API_KEY` or equivalent model Secret mounted. Explicitly assert task.execution.mode === scripted before dispatch. Do not infer fake mode merely because credentials are missing.
2. Inject a `forbiddenProvider` test adapter that increments a `modelDispatchAttempts` counter and **throws immediately** if any model transport is invoked. The runner observes the count and makes any invocation a FAIL. Keep this hook only in disposable test composition, never a production control endpoint.
3. Use real story task/claim/save, Temporal retry, GA publication and real S3 checkpoints. For model stage timing experiments, delay the **fixture adapter** by a bounded, seeded delay, preserving frozen task/result/hash and never holding a SQL transaction across sleep. Do not delay arbitrary kubectl or global Date.now to emulate model latency.
4. Include source-consistent authored fixture variants and state-sensitive consequences: low/medium output sizes, normal/held/invalid hash, selective choices, quiescent historical fork, exact source references. Validate each against existing schema and game rules. If a fixture becomes invalid after product changes, **fail**; do not reclassify it as a successful recovered turn.
5. Read persisted attempt/accounting stage and any test transport spy to prove **zero real dispatch** and zero charge. Absence of keys helps, but alone does not prove provider calls were not attempted. NetworkPolicy egress blocking is a second defense only when the tested cluster CNI enforces it.
6. Keep `TURN04` actual provider trial physically/sequentially separated: chaos with any provider-enabled task **must refuse to start**. Do not execute any nonzero provider request, even as an accidental test.

### One campaign driver and its oracle

- Driver creates an explicitly disposable owner/test session with existing auth/test harness identity **only through a permitted development/test route**, never by forging a Better Auth cookie against normal API. It follows existing `storyteller-imported-start` fixture: pinned imported S3 rule/world/start manifest, succeeded Storyteller-kind scripted opening candidate, GA start, one committed passage.
- Each round picks a legal **currently visible** option deterministically by seeded index, freezes a new stable `operationId` and request body once, admits via public route, polls durable receipt and GET. On timeout, first reconcile operationId and story revision; it must not create a new ID or click a second option to “make progress.” Option exhaustion or an intentional held state has a defined idle/observe action instead of illegal input spam.
- Observability uses only bounded test-owned data and read-only SQL, GET projections and S3 exact-root reads. Read related SQL rows in a consistent snapshot or verify version monotonicity before joining asynchronous reads. **Never** accept a moving mixed-state snapshot as an invented atomic cross-service view.
- Invariants after each operation: one resolution/effect per operation ID; zero duplicated passage, no stale root replace; committed `sceneCheckpoint.hash` exists and matches exact S3 object, story root revision monotonic; actor B denied; branch child excludes parent future; saved fake result hash stable across replay; failure state observable; zero provider sends/usage.
- If a transient service is down, don't query forever and declare PASS from an eventually green Pod: record unavailability, bounded recovery duration, pending work age and durable final state. End with a no-fault **drain/recovery window** and a final source-truth audit. If max recovery deadline exceeded or invariant violated, stop injecting and report FAIL/TIMEOUT.
- Worker-only scenario: select target Activity Pod, hold after its saved result (using existing test-only cutpoint), delete/stop it, resume, and assert no new external dispatch and one authoritative GA publication. This is the **most discriminating** first game-level chaos case.

### Chaos scheduler and meaningful randomness

Use seeded PRNG for *selection*, with per-run recorded candidate set/eligibility at that time. Choose a single allowed Pod at each iteration; take a fresh metadata/UID snapshot before injection. Do not repeatedly select a Pod that is already Terminating or a service with no baseline readiness when the profile requires recovery. Hold to maxEventCount (e.g., 1/5/20 selected by caller), maxDurationSeconds (bounded), maxInFlightFaults=1 for initial profiles, minRecoverySeconds and randomized cooldown only **after** steady-state health returns. Initially target **one event every recovered round**, not once per 3s regardless of chaos already outstanding. Fast random cycles require their own selected saturation profile and stated expected availability degradation.

Run reproducibility includes `seed`, selected target order, exact Pod UID, UID owner, timestamp, cluster version, source SHA, image digest, model/fixture/task hash, command ID, fault name/intensity and elapsed health windows. A seed doesn't reproduce distributed scheduling exactly; named fault hook + logs is needed for race diagnosis.

### Run status and machine report

One record per injection: `{runId,round,seed,sourceSha,clusterUID,k8sContext,namespace,workload,workloadUID,podUID,mode,fault,graceSeconds,startedAt,endedAt,recoveredAt,baseline,postFault,acceptedOperations,committedPassages,checkpointHashes,rootHashes,duplicateEffects,providerDispatchAttempts,workerRestartCount,resources,status,reason}`. Keep run-level evidence `source_sha`, package/manifest hashes, relevant Temporal workflow and Activity IDs, environment versions, actual tests, failure/cleanup result and `NOT-RUN` fields. Default export is **sanitized**: no raw account credentials, private narrative, prompts or provider packets. Cap log size/retention to avoid filling disk during soak.

Use statuses `PASS`, `FAIL`, `DEGRADED-RECOVERED`, `ABORTED`, `TIMEOUT`, `NOT-RUN`. A one-replica API Pod deletion is allowed to cause temporary 503; PASS means **recovery within that profile's measured deadline and no data damage**, not zero user errors. First establish pre-fault baseline latency and convergence, then choose explicit time budgets; do not invent universal “3 seconds to healthy” SLOs.

### Phased adoption

**Now:** source map, diagrams, exact contract, unit-testable pure selector/preflight and fake-provider tripwire recipes. **After TURN03 fake POC:** one named worker-loss case and signed-in scene continuity; then allowlisted graceful app Pod deletion; then seeded chaos with cooldown; finally load/network/db scenarios with resource-specific expected degradation and separate approval.

No generic Chaos Mesh/Litmus controller is necessary for phase one. If future network/IO faults require one, investigate CNI compatibility and operator resource limits before selecting it; avoid installing a heavyweight suite just to delete one Pod.

## Out-of-scope by design

No public DDoS or third-party load tests, production/shared cluster injection, arbitrary Pod kill by wildcard, deleting StatefulSet primary/PVC, broad node failure, unbounded loops, real provider spend, manual data repair hidden by a retry, custom fake scene store, new game content authority or full HA deployment. Real-model quality is a different test axis.

## Completion gate for this next slice

A **source-verified real app** is running in disposable kind; one worker-related fault is injected while a scripted campaign turn is in flight; the signed-in client recovers to exactly one committed next scene, with exact SQL/S3 root, no duplicate effect, zero LLM API calls, and a sanitized machine report. Random Pod-kill loop is an **additional** gate, not a replacement for deterministic failure cuts. K8S10 packet remains open if these gates have not been run, regardless of a green dry-run or toy broker case.
