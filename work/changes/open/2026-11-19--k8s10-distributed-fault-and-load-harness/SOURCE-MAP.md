# K8S10 | existing fault source and zero-provider campaign opportunity

**Profile:** STATE/PROOF. **Inspected baseline:** Git snapshot 584b594, 2026-11-19, plus the preceding K8S10 receipt; the newer design docs are not a verified runtime run. **Existing K8S10 is Implementing**, with only its *Rabbit consumer loss* slice selected/passed. Game-level monkey is **not selected/implemented** by adding these files.

**2026-11-20 source update:** A current TURN02 release [overlay](../../../../infra/workloads/release/workers.yaml) **does exist**, contrary to this November 19 snapshot's statement. Its Pod template has the eligibility marker, its Pod is owned by a ReplicaSet, and its image is a local `:turn02` tag with the Pod's runtime digest as the actual identity. The earlier K8S10 selector/preflight was unable to prove that hierarchy and erroneously demanded digest-in-Deployment. Source commit `14e2bf33` fixes the read-only guard; all four chaos test suites locally **43/43 PASS** on Node 22, no cluster. **Not** a live kind plan or real fault proof. [Next T04a/T04b](TASKS.md#2026-11-20-source-backed-status-correction-and-next-gates) distinguishes plan-readiness from mutation authorization.

## Do not rebuild what we already have

| Existing code | Exact observed behavior | What it is not |
| --- | --- | --- |
| `infra/clusters/kind/release/lib.sh` | `CLUSTER_NAME=offscreen-lab`, `CONTEXT_NAME=kind-offscreen-lab`, `KUBECTL=(kubectl --context ...)`, memory/loopback/snapshot guards | Does not choose app Pods or protect live tests from a second run |
| `infra/clusters/kind/release/up.sh` / `down.sh` | Creates/deletes the named disposable kind cluster while checking contexts and Docker volumes | Chaos loop must **not** invoke these, delete volumes or own a cluster it didn't create |
| `infra/verification/faults/run.sh` | Proof of durable Rabbit message redelivery after killing the **consumer client Pod**, with forced delete; one broker instance stayed up | Not a real game-worker kill, not exactly-once business effect, not safe as the generic chaos runner |
| `infra/verification/faults/worker_loss.py` | Consumer `hold` logs an application effect and waits; another drains redelivered message | Not a reusable application Storyteller worker |
| `infra/verification/faults/assert_exactly_once.py` | Rejects two `APPLY` log lines, demonstrating unsafe duplicate side effects | No source-of-truth SQL effect test |
| `infra/platform/postgres/cluster.yaml` | `instances: 1`, 1Gi local-path PVC | A killed PG Pod cannot maintain uninterrupted writes; no actual HA failover |
| `infra/verification/fixtures/skeletons/workloads.yaml` | synthetic placeholder Pods | Not eligible real game services for campaign-monkey PASS |
| `infra/kubernetes/lab/gateway/{routes,backends}.yaml` | synthetic web/API routes | No authenticated game yet, and not a safe chaos target |
| `docs/runbooks/kubernetes-fault.md` | Precise past one-worker Rabbit redelivery receipt with cluster/volume guard | Must retain historical scope; do not relabel as distributed game test |

**Actual no-provider engine, already in source:**
- `packages/storyteller/src/fixtures/index.ts:scriptedStorytellerResult` validates its output against the real result schema. The authored rehearsal and scripted mechanical consequence paths are deterministic for the frozen task. No arbitrary lorem text required.
- `packages/application/src/storyteller/execution.ts:createStorytellerExecution.generate` routes tasks with `execution.mode === 'scripted'` to a scripted source and records `provider-skipped:scripted:${attemptId}`; no OpenRouter call is needed. The new remote custody path has a similar scripted outcome but its GA bridge has not yet been implemented.
- `packages/application/src/storyteller/config.ts:readStorytellerExecution` returns offlineExecution unless `STORYTELLER_LIVE_ENABLED === 'true'`; even if true, it requires `STORYTELLER_EXECUTION_JSON` provider policy. `readStorytellerWorkerOptions` only constructs an OpenRouter adapter in provider mode, with `OPENROUTER_API_KEY`. A missing key by itself is **not** a sufficient safety gate; verify frozen task mode and worker composition too.
- `tools/api-integration/test/storyteller-imported-start.integration.ts:checkImportedStart` is a successful local imported pinned start-package route using a **Storyteller-kind opening candidate with scripted execution**. `packages/application/src/stories/start.ts` rejects raw playable-scripted candidate when a startPackage is present.
- `tools/api-integration/test/storyteller-publication-context.integration.ts`, `storyteller-worker-replay.integration.ts`, `apps/worker/test/{relay,eng06-worker-restart.live}.test.ts`, `packages/application/test/historical-fork.test.mjs` provide targeted lower-tier tests and fault oracles. `tools/api-integration/test/storyteller-suite.ts` has scripted opening helpers.
- `docs/technical/lab/experiment-protocol.md#5-fault-cut-points` and `packages/application/src/developer-tools/lab/` provide **named semantic failure hooks** with test-only composition and disarming. They should be reused for precise saved-result/ack-loss races, not exposed on normal player API.

## What the next implementation actually needs

The first real app Pod selector requires **TURN02's** authentic app labels and deployment/owner namespace. None exists at source baseline 584b594. Therefore the **allowlisted eligibility list must be derived from the accepted real app-release manifest** and checked immediately before execution; do not guess names from synthetic workloads or select by `app` alone.

A genuine game-chaos driver requires BOOT03 GA start, STORY02 private custody, STORY03 split publish, K8S11 same-origin web, TURN02 real app release, TURN03 a known-good scripted end-to-end fixture and branch. Until then, it may be built as **preflight-only/dry-run and fixture unit tests**. If it could claim PASS on toy worker or an in-process LocalDocumentStore, it is testing the wrong thing.

### Safe implementation surface after selection

- **New separate files only:** `infra/kubernetes/lab/chaos/{preflight,selector,runner,oracle,report}.*` and named test fixtures. Use existing small scripting conventions, explicit context, single cluster mutex and portable local toolchain; don't modify/replace `fault/run.sh` or default installer scripts.
- **No app product endpoint:** the driving client uses **existing authenticated public routes** and supported Storyteller scripted task creation. No debug `POST /chaos/kill-any-pod` API. The independent oracle reads authenticated snapshots plus read-only diagnostic SQL and S3 hashes from the disposable lab.
- **Fixtures:** real owned opening candidate + pinned packages, one or more legal visible decisions with stable operation IDs, exact checkpoint and manifest hashes, conflicting replay negative; use existing SCRIPTED fixture adapter and result validation.
- **Provider dispatch tripwire:** no live policy, key, secret or provider adapter in those Pods; a test-injected provider stub that **throws on invoke** at a composition seam and an observed count of outbound attempts=0. With kind default CNI, *do not assume NetworkPolicy is enforced*. A reviewed CNI may support a verified deny-everything-but-app-endpoints policy later.
- **Evidence:** `docs/observability/evaluations/` dated run artifacts, current `STATUS`/Change receipt **only on actual execution**. The [observability evidence model](../../../../docs/technical/observability/identities-and-evidence.md) separates durable forensic records from operational telemetry; apply redaction and access constraints to any run receipt.

## Exact risks to avoid

1. `kubectl delete pod` normally requests **graceful termination**. That's valid for rolling restart, but does not prove SIGKILL/crash recovery. The existing `fault/run.sh` uses `--force --grace-period=0` for a **disposable Rabbit client**, not a general safe approach. Do not copy it to PG, Temporal, Rabbit StatefulSets, S3 or app Pods by default.
2. App Pods have not yet landed; no dynamic `kubectl get pods -A` random selection. Start with a literal, source-backed release app workload allowlist and namespace/pod-UID check. One fault at a time.
3. The 12GiB WSL class lab used >4GiB MemAvailable prerequisite. Continuous multi-component chaos can exhaust memory; preflight and per-round resource budget is essential. Initial runs should be small and **not** automatically recreate an unowned cluster.
4. No “DDoS” against public hosts; bounded load generator talks only to 127.0.0.1 forwarded lab services, with rate/concurrency caps.
5. A copied campaign from the user's ordinary database is **not** disposable even when run under kind. Test run creates its own story, sources are immutable imported content, and cleanup only deletes run-owned disposable state under an approved policy.
6. Random selection seed only reproduces intended sequence; for timing-dependent races record actual Pod UID/event time, worker history, SQL revision and fault cutpoint. A random green run is never equal to named crash-window proof.

**Conclusion:** extend the *existing* K8S10 packet. We do not need a second chaos infrastructure platform or framework on day one. We need a safe Pod selection driver, zero-provider campaign work generator, authoritative oracle and persisted evidence.
