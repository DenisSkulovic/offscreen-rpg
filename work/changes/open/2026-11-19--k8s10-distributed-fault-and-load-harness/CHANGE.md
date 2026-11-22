> **2026-11-22 next-wave current executor contract:** the original K8S10 source contains controller plan/refusal, selector, preflight, scripted fake driver and read-only oracle. Its existing ~43 pure tests are not live-game proof. [K8S10-CURRENT-EXECUTION.md](K8S10-CURRENT-EXECUTION.md) owns current T01–T05. **T01–T04 source is landed** (TURN03 proof adapter, one confirmed Pod-delete controller, live oracle adapter, bounded nine-command report). Live eligibility stays false without a real cold-kind TURN03 PASS. **T05 live mutation still requires that PASS plus explicit owner approval of the exact disposable cluster, release, runId and Pod UID.** No provider call, no auto-install/cluster reset. This is the existing K8S10 Change, not an extra duplicate. The Change stays open.

# K8S10 | Reproducible distributed failure and load experiments

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the one-task-at-a-time Cursor route; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) separates observed source, missing code and optional work. **Default parent/child: Composer 2.5 Standard.** pure chaos selector/preflight tasks now, app-Pod deletion only after real POC. Existing Change state and explicit selection/cluster/spending gates remain in force; task authorship alone is neither implementation nor verification. Grok is not the normal executor.

**State:** **OPEN / Implementing, with read-only preflight corrected in source on 2026-11-20 (`14e2bf33`)**. Historical Rabbit consumer-loss is real but not a game fault. T01–T03 code exists. New T02b realistic Kubernetes ownership/eligibility/digest guard and all chaos unit/oracle suites **43/43 PASS locally (Node 22.16.0; verified source snapshot; no kind cluster)**. Live kind read-only plan **NOT-RUN**; executable Pod deletion and end-to-end game recovery **NOT-RUN / not selected**. [T02b and T04a/T04b](TASKS.md#2026-11-20-source-backed-status-correction-and-next-gates) split the actual remaining work. **Not Done; do not archive**. TURN02 is Done. This packet is not selected.  
**Kind:** implementation  
**Execution selection:** This bounded runner only. Do not auto-run the remaining scenarios.  
**Program:** [Distributed architecture lab queue](../../README.md)

**Next source-inspected planning slice (2026-11-19, source baseline `584b594`):** the selected historical Rabbit consumer-loss case remains implemented and its receipt intact. **T01–T02** landed the pure chaos selector and read-only preflight/plan CLI with **27/27** unit tests @ `ec73a535` (mocked kubectl; live kind `plan` **NOT-RUN**). **T03** landed the zero-provider scripted oracle and driver with **10/10** unit tests @ `ec73a535`; that tier does **not** certify distributed gameplay. The user has requested a future **zero-LLM-token real-game chaos monkey**, but **no Pod-kill game runner or real cluster game acceptance has run** — live game-chaos stays **NOT-RUN / BLOCKED-BY-POC**. [SOURCE-MAP.md](SOURCE-MAP.md) maps actual scripted fixture and lab guards, [EXECUTION.md](EXECUTION.md) specifies safe run modes, [PROOF.md](PROOF.md) is the fault/recovery catalog, and [TASKS.md](TASKS.md) splits future implementation into Composer-sized steps. [Mermaid explanation](../../../../docs/architecture/09-chaos-and-zero-token-play.md) is human-facing. **T04+ requires successful TURN02/TURN03 real app POC.** Use the existing K8S10 Change instead of creating a competing CHAOS01 or installing a heavy operator. Do not select the rest of K8S10 automatically.\n\n## Outcome

Provide a safe, repeatable architecture experiment suite that proves or disproves our specific resilience hypotheses without provider spend or destructive data access.

## Authority and prerequisites

- **Prerequisites:** K8S02-K8S09 relevant components plus K8S08 skeletons; K8S07 observability.
- **Current implementation:** modular monolith and Compose remain source-observed as of 2026-11-19. ARCH01 must reconcile the target without pretending migration is done.
- **Authoritative owners:** `docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture`, `docs/technical/platform/topology.md`, `docs/technical/observability/README.md`, `docs/runbooks/README.md`.
- **Source reinspection required:** inspect latest GitHub HEAD and current Change owners before implementing. No presumption that the lab or prior Changes have actually completed.
- **Risk permission:** no provider spend, destructive persistent-volume actions, public traffic, credential disclosure or application-code extraction without explicit owner decision.

## Planned implementation or specification delta

Create bounded scenario runner, fixtures and metrics/trace capture for Pod kill, broker outage/recovery, delivery duplication/reordering, DB failover after replicas exist, a slow local stand-in, traffic burst and resource pressure. Every scenario has preconditions, workload, quantitative expected behavior, abort rules, cleanup and evidence report. Start with minimal green path and expand only as components land.

This slice lands only the first case:

- CREATE `infra/kubernetes/lab/fault/run.sh`
- CREATE `infra/kubernetes/lab/fault/worker_loss.py`
- CREATE `infra/kubernetes/lab/fault/assert_exactly_once.py`
- CREATE `infra/kubernetes/lab/fault/fixtures/one-apply.txt`
- CREATE `infra/kubernetes/lab/fault/fixtures/two-applies.txt`
- CREATE `docs/runbooks/kubernetes-fault.md`
- EDIT `docs/runbooks/README.md` with one index row
- EDIT `docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture`

`docs/technical/platform/topology.md` stays unedited. The dated proof stays in the runbook and in the architecture-test heading. Editing the laboratory table would pull proposal headings this slice does not select.

Unchanged on purpose: `infra/kubernetes/lab/kind.yaml`, `infra/kubernetes/lab/up.sh`, `infra/kubernetes/lab/down.sh`, `infra/kubernetes/lab/lib.sh`, RabbitMQ manifests, `packages/`, `apps/`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, and `work/changes/ledger/`. No game service was extracted. No collector trace was attached. No plot image was written.

**Out of scope:** full product rollout, shared production cluster, paid LLM or image calls, real Stripe calls, full game-service extraction. Reuse existing source owners and don't create duplicate planning authority.

## Acceptance: positive and negative

- **Positive:** Fresh cluster run reproduces at least one worker-loss and broker-redelivery test with traceable IDs; a deliberately broken case fails expected assertion; recovery, graphs, hardware usage and cleanup are saved as dated evidence.
- **Negative:** No stress test runs against shared or paid infrastructure; a pass does not imply machine-level HA; resource caps protect a 12GB WSL lab; evidence differentiates unavailable from data lost, replayed from duplicated side effect.
- **Documentation is mandatory:** update precisely the source-owner headings above, relevant wiki index and runbooks, factual status/evidence only after actual verification. Do not treat this packet itself as documentation completion.
- **Evidence:** exact commands/results, versioned dependencies, resource costs, links to test fixtures, observed failures, date and environment. Run repository change/markdown/wiki guards as applicable.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | unchanged because this slice adds no player-facing behavior and `docs/product/` was not edited | No product heading changed |
| Technical | changed: docs/technical/platform/deployment-and-compatibility.md now records the one-replica worker-loss limit, because a harness pass is not the database-commit row. docs/technical/platform/topology.md stays unedited | The live run stays separate from that row, and a pass is not machine-level HA |
| Code | changed: infra/kubernetes/lab/fault/run.sh kills one consumer before acknowledgement and does not migrate game code. Negative: the exactly-once assertion must exit 1 when the same run id is applied twice | Disposable smoke for run fault-ed09a6e1b8b5c5f5, with the exactly-once assertion exiting 1 |
| Related | changed: docs/runbooks/kubernetes-fault.md records the dated evidence and docs/runbooks/README.md indexes it. STATUS.md stays unedited because the remaining scenarios did not run | Link check and change guard |

## Checks actually run

- One shell held `/tmp/offscreen-k8s-cluster.lock`. `offscreen-lab` was absent. MemAvailable was 5672340 KiB at `up.sh` start, above 4 GiB. The shell created the cluster, ran `infra/kubernetes/lab/rabbitmq/install.sh` and `infra/kubernetes/lab/fault/run.sh`, then `infra/kubernetes/lab/down.sh`.
- Run id `fault-ed09a6e1b8b5c5f5`. Hold log: `APPLY fault-ed09a6e1b8b5c5f5 redelivered=0`. After the consumer pod `591c23db-2e89-4a5e-92f1-d9f7309644ae` was deleted, `lab.durable` returned to 1 ready message and 0 unacknowledged. Drain printed `redelivered=1`. Broker pod uid `a96963db-6624-4f0a-ab16-63aa05d5c24e` did not change.
- Negative case: `assert_exactly_once.py` exited 1 with `ASSERTION-FAILED duplicated side effect: expected 1 APPLY, saw 2 for fault-ed09a6e1b8b5c5f5`. The one-apply fixture exited 0. The two-apply fixture exited 1.
- `kind get clusters` then printed `No kind clusters found.` `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` were present. No paid provider call was made.
- The full suite in the planned delta, including broker outage, DB failover, a slow local stand-in, traffic burst, and resource pressure, was not run. No model call was made.

## T01–T02 VERIFY receipt (selector + preflight, 2026-11-20 @ `ec73a535`)

**Command (unit only, no cluster):** `node --test infra/kubernetes/lab/chaos/test/selector.test.mjs infra/kubernetes/lab/chaos/test/preflight.test.mjs` → **27/27 PASS**.

**Positive:** pure `selectTarget` deterministic among sorted eligible candidates; preflight `plan` mode validates release/context snapshot and emits sanitized plan JSON via T01 on mocked cluster fixtures.

**Negative (selector refuses):** ineligible Pods, changed owner UID, missing eligibility marker, disallowed data/system namespaces.

**Negative (preflight refuses):** wrong cluster/context, unknown release, conflicting run; fake kubectl spy has **zero mutating invocations**.

**NOT-RUN:** live kind `plan` against a real cluster; `--execute` and any kubectl mutation — tier remains unit/mocked only. T04 **BLOCKED-BY-POC**.

**Done eligibility:** **No.** T04–T07 and canonical wiki reconciliation remain open. This receipt does not promote the Change to Done.

| Layer | Command / surface | Result | Tier |
| --- | --- | --- | --- |
| T01 | `selector.test.mjs` (in combined run) | **PASS** | unit / synthetic Pod JSON |
| T02 | `preflight.test.mjs` (in combined run) | **PASS** | unit / mocked kubectl |
| T01–T02 | Live kind `plan` | **NOT-RUN** | no real cluster in this gate |
| T04 | One allowlisted Pod deletion | **BLOCKED-BY-POC** | unchanged; not selected |

## T03 VERIFY receipt (zero-provider oracle, 2026-11-20 @ `ec73a535`)

**Command (unit only, no cluster):** `node --test infra/kubernetes/lab/chaos/test/oracle.test.mjs infra/kubernetes/lab/chaos/test/scripted-driver.test.mjs` → **10/10 PASS**.

**Positive:** `readOnlyOracle` and scripted driver assert revision/operation/passage alignment, checkpoint/root hashes, view version, `modelDispatchAttempts=0`, and forbidden-provider non-invocation on the approved in-process adapters.

**Negative (oracle FAIL):** `duplicate_passage_for_operation`, `missing_canon_root_object`, `forbidden_provider_invoked`, `branch_leak_parent_future`.

**NOT-RUN:** live game-chaos on kind, Pod deletion, kubectl mutation, authenticated GA start path, or any proof that faults recover across distributed Pods — **BLOCKED-BY-POC** until TURN02/TURN03 real app POC (same gate as [TASKS.md](TASKS.md) T04).

**Done eligibility:** **No.** T04–T07 and canonical wiki reconciliation remain open. This receipt does not promote the Change to Done and does not claim game-chaos PASS.

| Layer | Command / surface | Result | Tier |
| --- | --- | --- | --- |
| T03 | `oracle.test.mjs` + `scripted-driver.test.mjs` | **10/10 PASS** | unit / in-process adapters |
| T03 | Live cluster game-chaos | **NOT-RUN** | BLOCKED-BY-POC |
| T04 | One allowlisted Pod deletion | **BLOCKED-BY-POC** | unchanged; not selected |

## Reconciliation ledger (fill before Done)

The first worker-loss case is recorded here. The packet stays open because the remaining scenarios are unbuilt.

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture | technical | changed: the section records run fault-ed09a6e1b8b5c5f5 as one-replica broker redelivery and keeps the database-commit row unproven | infra/kubernetes/lab/fault/run.sh in this worktree on baseline 4a556223 | fixture-tested | The exactly-once assertion exited 1 after two APPLY lines, and the run is not machine-level HA | docs/runbooks/kubernetes-fault.md |
| docs/technical/platform/topology.md#distributed-learning-target | technical | unchanged because the dated proof stays in the fault runbook and this packet does not edit the laboratory table | no edit; baseline 4a556223 | reviewed | A one-replica replay is not recorded here as machine-level HA | heading not edited |
| docs/runbooks/kubernetes-fault.md#what-this-procedure-is | related | changed: the runbook records the worker-loss procedure, the dated evidence, and the one-replica limit | infra/kubernetes/lab/fault/run.sh in this worktree on baseline 4a556223 | fixture-tested | Unavailable is not lost, and replayed is not an exactly-once effect | docs/runbooks/README.md |
| Change packet receipt (T01–T02) | related | no-op on `docs/product` or `docs/technical` this turn; unit selector/preflight receipt only | `infra/kubernetes/lab/chaos/test/{selector,preflight}.test.mjs` @ `ec73a535` | unit-tested | Live kind `plan` **NOT-RUN**; ineligible Pods and wrong-cluster refusals pass | [TASKS.md](TASKS.md) T01–T02 |
| Change packet receipt (T03) | related | no-op on `docs/product` or `docs/technical` this turn; unit oracle receipt only | `infra/kubernetes/lab/chaos/test/{oracle,scripted-driver}.test.mjs` @ `ec73a535` | unit-tested | Live game-chaos **NOT-RUN**; four named oracle negatives fail as expected | [TASKS.md](TASKS.md) T03 |

## Closure and lifecycle

- Execute only on explicit owner selection, with predecessor receipts verified.
- Before Done fill owner-by-owner reconciliation (heading, source SHA, expected delta, actual diff, evidence, negative test, link updates).
- This packet stays open. The first case has evidence. The remaining scenarios do not. Do not automatically select the next Change.
