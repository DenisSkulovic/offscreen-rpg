# Changes | active catalog

## Production-minded database and data lifecycle (3 more, 2026-11-22)

The owner's [same-day session minutes](../sessions/2026-11-22.md#13-owner-requests-production-minded-database-and-complete-data-lifecycle-operations) add three **PROPOSED / NOT CURSOR-READY** Changes, extending the brainstorm coverage from 28 to **31 named outcomes**. These distinguish *schema evolution*, *routine performance/maintenance*, *HA failover* and *whole-system disaster recovery*. A migration Job and a single-primary Pod-restart test do not prove any of the latter three.

| Change | Independent objective | Nearest existing owner / gate |
| --- | --- | --- |
| [DBOPS01 safe schema changes](open/2026-11-22--dbops01-safe-schema-migrations-and-release-compatibility/CHANGE.md) | Drizzle SQL review, expand/backfill/contract, one runner, mixed-version app/Temporal and interruption proof | Existing migration runner, Kubernetes game-migrate Job; read actual release orchestration first |
| [DBOPS02 PostgreSQL health](open/2026-11-22--dbops02-postgres-operational-health-and-performance/CHANGE.md) | Connection pools, slow queries, locks, indexes, VACUUM/WAL/lag/disk, safe maintenance observability | [SQL01 domain transaction audit](open/2026-11-22--sql01-transaction-and-lease-source-audit/CHANGE.md) and future [LOAD01](open/2026-11-22--load01-scripted-multiuser-load-and-autoscaling/CHANGE.md) |
| [DATAOPS01 cross-store restoration](open/2026-11-22--dataops01-cross-store-backup-restore-and-retention/CHANGE.md) | Backup and reconstruct coherent SQL/Temporal/CAS/configuration state, RPO/RTO, restore rehearsal, retention | [SCALE02 stateful failover](open/2026-11-22--scale02-stateful-data-and-workflow-ha/CHANGE.md), AI02 private-evidence retention and existing release/restore checklist |

**Operational correction:** PostgreSQL physical standby replicas normally follow primary schema/WAL changes; schema migration is **not** defined as taking an arbitrary standby offline and independently altering it. Schema rollout should accommodate concurrently deployed old/new binaries, and recovery from an incomplete migration is not necessarily a down migration. Multiple replicas do not provide point-in-time backup and one restored database may not recreate Temporal history or immutable Library objects. Documentation is not permission for any protected DB read, migration, restore, paid infrastructure or cluster mutation.


## Future horizontal scaling and zero-funded load rehearsal (4 more, 2026-11-22)

Following the owner's [session-minutes entry](../sessions/2026-11-22.md#12-owner-asks-for-future-minimal-horizontal-scalability-and-100-user-zero-llm-load-rehearsal), four **PROPOSED / NOT CURSOR-READY** work units extend the brainstorm coverage from 24 to **28 distinct named Change outcomes**. They are not today's work selector or a claim that the system is already highly available.

| Change | Independent scope | Prerequisite / important non-claim |
| --- | --- | --- |
| [SCALE01 application replicas](open/2026-11-22--scale01-replicated-application-runtime/CHANGE.md) | Concurrent Web/API/GA and appropriate Worker replicas with one logical effect per operation | TURN03 single-instance proof + K8S10; not blanket 3 replicas or HA ingress |
| [SCALE02 stateful HA](open/2026-11-22--scale02-stateful-data-and-workflow-ha/CHANGE.md) | PostgreSQL primary/standbys/failover/PITR, Temporal server persistence, private document store | Real operator/failure-domain design; single-primary Pod restart is not three-node HA |
| [SIM01 simulated provider](open/2026-11-22--sim01-realistic-zero-cost-provider-simulator/CHANGE.md) | Model-transport-compatible scripted response with seeded delays/failures, no real OpenRouter route | Actual WR10/WR11 request/result protocol; no real model calls or paid traffic |
| [LOAD01 100-user load/autoscale](open/2026-11-22--load01-scripted-multiuser-load-and-autoscaling/CHANGE.md) | Seedable independent-user traffic bursts/idle, telemetry, fixed-vs-autoscaled Pods | TURN03/K8S10 + SIM01 + SCALE01; explicit HPA/KEDA metrics and safe host capacity |

K8S10 already owns **one targeted fault and at most nine scripted commands**, so LOAD01 must not relabel that as 100-user proof. A Kubernetes Service may have one public ingress address while its actual ingress controller Pod remains a failure point. Kubernetes does not automatically scale based on CPU/queues until configured and observable. A kind cluster with one node cannot demonstrate survival of a physical-node failure. Costs: **$0 authorized paid model spend**, and no paid cloud or mutating load experiment commissioned.


## Extended Admin historical inspection and safe-resume proposals (4 more, 2026-11-22)

The owner extended the 20-Change brainstorming record with a **scene-by-scene historical Admin workspace** and an independent future re-admission safety contract. These four additions bring **this conversation's named brainstorm Change coverage to 24**. They are deliberately lightweight **PROPOSED / NOT DISPATCHABLE** records. [Source intent and role/privacy caveats](../sessions/2026-11-22.md#11-admin-must-be-an-inspectable-historical-story-workspace-not-just-a-dashboard).

| Change | Independent outcome | Prerequisite / ownership |
| --- | --- | --- |
| [ADI01 scene/game-state explorer](open/2026-11-22--adi01-scene-history-game-state-explorer/CHANGE.md) | Read-only story→scene chronology, before/after state, choices, checkpoints and fork lineage | Existing /control + HR01; preserve explicit per-scene content/metadata access |
| [ADI02 historical Library explorer](open/2026-11-22--adi02-historical-library-explorer/CHANGE.md) | Browse pinned Markdown/document versions, logical paths, diffs at different scene roots | ADI01 navigation and source-grounded Library reader; not an automatic nested filesystem redesign |
| [ADI03 effective-policy history](open/2026-11-22--adi03-effective-policy-history-explorer/CHANGE.md) | Per-scene/attempt actual recipe, entitlement, model, price and cap decisions versus current policy | CFG01 snapshot, WR11 execution; separate from AI03 raw prompt read and CFG02 policy editor |
| [CFG03 safe re-admission](open/2026-11-22--cfg03-resume-policy-eligibility-and-portability/CHANGE.md) | Six-month resumption, model retirement/tier changes, immutable old attempts and no inherited rights in hypothetical transfer | CFG01 + actual Writer admission; transfer is a *stress test*, not a selected feature |

**Role/access boundary:** one Admin control plane with Support, Engineering, Product/Business and Finance views, but grants differ. Raw story/Library/prompt contents are not implicitly available to general Support. View exactly captured historical policy when present; avoid misrepresenting current subscription or available Library files as what the old model actually saw. **No Admin writes, general raw-data grants, model payment or automatic Cursor implementation are commissioned.**

## Complete 2026-11-22 brainstorm-to-Change coverage map (20 bounded outcomes)

**Scope:** every substantial engineering direction raised in the owner's [2026-11-22 session minutes](../sessions/2026-11-22.md) has a named Change. Existing Change packets remain the owner where one exists; new shallow packets contain **high-level outcomes, boundaries, evidence and dependencies**, without pretending to be cheap Cursor implementations. This map is **not** a new `Current work:` selector, execution instruction, completion claim or monetary authorization.

| Track | Changes and independent outcomes | Next dependency / status |
| --- | --- | --- |
| **Current vertical (3)** | [WR10](open/2026-11-22--wr10-private-writer-round-protocol/CHANGE.md) GA/executor private Writer round; [MA12](open/2026-11-22--ma12-production-api-lab-isolation/CHANGE.md) clean production API/Lab package; [TURN03](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) real cold-kind signed-in turn/fork proof | Already prepared/existing; independently verify branch receipts, environment and permission gates before calling Done |
| **Player and real Writer (4)** | [CL01](open/2026-11-22--cl01-terminal-player-client/CHANGE.md) full terminal user play; [WR11](open/2026-11-22--wr11-authorized-provider-continuation/CHANGE.md) provider-authored continuation; [WR12](open/2026-11-22--wr12-provider-authored-opening/CHANGE.md) provider-authored initial Launch; [K8S10](open/2026-11-19--k8s10-distributed-fault-and-load-harness/K8S10-CURRENT-EXECUTION.md) Pod recovery/mini-load | CL01 after MA12; WR11 after WR10; WR12 after WR11; K8S10 after actual TURN03 PASS and exact cluster authorization |
| **Human code ownership (3)** | [HR01](open/2026-11-22--hr01-api-route-ownership-readability/CHANGE.md) Nest endpoint organization; [HR02](open/2026-11-22--hr02-web-player-feature-readability/CHANGE.md) Next source navigation; [HR03](open/2026-11-22--hr03-db-schema-and-sql-navigation/CHANGE.md) stable Drizzle schema split + SQL map | HR01 after MA12/CL01; HR02 source no-collision; HR03 schema fingerprint and CL01 migration reconciliation |
| **Agent internals (4)** | [AI01](open/2026-11-22--ai01-agent-runtime-and-temporal-navigation/CHANGE.md) readable loop and Temporal map; [AI02](open/2026-11-22--ai02-durable-agent-execution-provenance/CHANGE.md) exact request/tool archive; [AI03](open/2026-11-22--ai03-staff-agent-context-inspector/CHANGE.md) private Admin scene/thread inspector; [CTX01](open/2026-11-22--ctx01-context-composition-and-retrieval-policy/CHANGE.md) explicit model-visible context selection and section packing | AI01 after Writer source stabilizes; AI02 after AI01/HR03 and privacy/retention; AI03 after AI02/HR01; CTX01 aligns with CFG01 and does not overlap Writer compiler edits |
| **Config, economics and experimentation (4)** | [CFG01](open/2026-11-22--cfg01-versioned-writer-execution-policy/CHANGE.md) versioned typed effective policy; [EV01](open/2026-11-22--ev01-centwise-agent-evaluation/CHANGE.md) re-score old outputs at $0 and separately approve single runs; [CH01](open/2026-11-22--ch01-chamber-experiment-workbench/CHANGE.md) Scenario × Recipe × Experiment; [CFG02](open/2026-11-22--cfg02-admin-policy-management/CHANGE.md) Admin draft/activate/audit | CFG01 after Writer admission+funding source; EV01 after trace/source proof; CH01 after Lab split and reusable recipe/eval shapes; CFG02 after CFG01, **deferred** |
| **Engineering verification (2)** | [DX13](open/2026-11-22--dx13-measured-monorepo-build-cache/CHANGE.md) measured cold/warm affected Turbo checks (DX12 only built planner); [SQL01](open/2026-11-22--sql01-transaction-and-lease-source-audit/CHANGE.md) human SQL locks/leases/recovery source audit | DX13 after package manifest changes join; SQL01 after HR03/Writer stabilization; findings become separate implementation Changes only if justified |

**Discipline:** The four new high-level [WR12](open/2026-11-22--wr12-provider-authored-opening/CHANGE.md), [CTX01](open/2026-11-22--ctx01-context-composition-and-retrieval-policy/CHANGE.md), [DX13](open/2026-11-22--dx13-measured-monorepo-build-cache/CHANGE.md), [SQL01](open/2026-11-22--sql01-transaction-and-lease-source-audit/CHANGE.md) are explicitly **PROPOSED**, not dispatchable. CFG01/EV01/CH01/CFG02 remain shallow as requested; do not add fake T-IDs. This covers today's brainstorm, **not a declaration that all remaining project work is known**. When an implementation predecessor lands, reread current source/rules and promote one small bounded Change at a time. For real provider experiments, **authorized default spend = $0**; every charged call requires its own explicit approval, preflight, cap and durable receipt.


## 2026-11-22 brainstorming proposals (NOT executable)

The owner requested a **durable capture**, not more prematurely Cursor-ready tasks. The full reconstructed chronology and reasoning is in [2026-11-22 session minutes](../sessions/2026-11-22.md), following [daily-minutes rule](../../.agents/rules/session-minutes.md). Four *lightweight* packets capture new, unsettled work and have no approval to edit runtime or spend money:

| Packet | Future outcome | Status / prerequisite |
| --- | --- | --- |
| [CFG01 versioned Writer policy](open/2026-11-22--cfg01-versioned-writer-execution-policy/CHANGE.md) | Dynamic strongly typed recipe resolution and frozen effective budgets instead of 4/8000/2000/$0.25 hard-coded continuation | **PROPOSED**, inspect existing entitlement resolver and WR10/WR11 |
| [EV01 centwise evals](open/2026-11-22--ev01-centwise-agent-evaluation/CHANGE.md) | Reuse saved outcomes and deterministic evals for $0; separately approve single traced call after preflight | **PROPOSED**, reuse Lab Support and AI02 traces |
| [CH01 Chamber experiments](open/2026-11-22--ch01-chamber-experiment-workbench/CHANGE.md) | Isolated scene-N Scenario × Recipe × Experiment and transparent run/compare | **PROPOSED**, after MA12/CFG01/EV01 interfaces |
| [CFG02 Admin governance](open/2026-11-22--cfg02-admin-policy-management/CHANGE.md) | Draft/validate/activate/roll back operator-managed policies with permissions/audit | **DEFERRED**, after CFG01 accepted |

No Change has an authorized T-ID; do not dispatch these shallow packets to Composer. Paid evals default to **zero authorized spend**, even if a prior proposal mentioned a possible $0.75 cap. Real run requires separate explicit user authorization and measured worst-case cost. No automatic model judge, CI eval, retry or paid background run.


## Agent internals, reproducibility and inspectability (planned 2026-11-22)

**Human-owner objective:** understand the actual Writer context, loop, Library/tool use, and Temporal Workflow→Activity topology by reading the code and later inspecting a real mission scene-by-scene. This is a **dependency chain, not three parallel commissions**:

| Stage | Change | User-visible outcome | Readiness |
| --- | --- | --- | --- |
| **AI01** | [Agent runtime + Temporal readable topology](open/2026-11-22--ai01-agent-runtime-and-temporal-navigation/CHANGE.md) | Coherent Story Engine capture/round modules, real source tour and Workflow/activity/queue map | **PLANNER-GATED after WR10/WR11 source rebase** |
| **AI02** | [Durable exact request and tool provenance](open/2026-11-22--ai02-durable-agent-execution-provenance/CHANGE.md) | New rounds archive exact outgoing wire, input tool calls and logical transcript with evidence classifications | **PLANNER-GATED after AI01, WR10/WR11, HR03 migration and retention design** |
| **AI03** | [Case-bound Admin Agent Inspector](open/2026-11-22--ai03-staff-agent-context-inspector/CHANGE.md) | Scene/mission timeline, prompt composition, tool/result history, diff and permitted source/Temporal links | **PLANNER-GATED after AI02 and HR01 + explicit new sensitive read capability** |

**Crucial source truth:** current `compileWriterRoundCapturedRequest` initially sends short system instruction and *pins/summaries* JSON, **not all Library contents**. The Library remains accessible through permitted tools. Current `storyteller_writer_step.request_cas_hash` stores a SHA digest, **not** an immutable request-object pointer. WR09A strict responses and tool result summaries have private pointers, but a complete archived request+tool-argument thread for every historic mission has not been proven. AI02 must distinguish exact archived, recompiled hash match, current-compiler preview, unavailable and redacted. Temporal Workflow History records orchestration, not hidden model reasoning. Old unavailable data must not be invented.

**Coordination:** AI01 changes Writer/capture source touched by WR10/WR11; AI02 changes private step schema/Writer source and must wait for HR03 and CL01 migration source; AI03 touches Admin API/Web owned by HR01 and depends on AI02. None is authorized to run as an extra Cursor batch tonight or to incur paid model/DB/cluster effects. No completion-credit increase; owner can approve the design, then ChatGPT source-rebases first executable stage. Planned eventual single custodian, not an unbounded swarm.

## Human-owner readability wave, planned 2026-11-22

**A separate structural refactor wave, not a replacement for CL01/WR11/K8S10.** The [canonical code-quality rule](../../.agents/rules/code-quality.md#human-ownership-refactors-controlled-mechanical-freedom) now explicitly supports **planner-fixed package layouts + Composer mechanical discretion**. No new feature, scheme, SQL transaction, external provider or migration.

| Change | Package ownership and purpose | Gate |
| --- | --- | --- |
| [HR01 Nest API route ownership](open/2026-11-22--hr01-api-route-ownership-readability/CHANGE.md) | `apps/api` Stories/Admin controllers, readable route families and explicit composition | **PLANNER-GATED until MA12 + CL01 code integrates**, then post-CL01 controller/DI rebase |
| [HR02 Next player features](open/2026-11-22--hr02-web-player-feature-readability/CHANGE.md) | `apps/web/src/features/stories/**` coherent library/drafts/opening/launch; selective Play readability | **READY WITH LIMITS**, no simultaneous Web source edit in same paths |
| [HR03 DB schema + SQL reading atlas](open/2026-11-22--hr03-db-schema-and-sql-navigation/CHANGE.md) | `packages/db/src/schema/storyteller.ts` 20 tables → 5 nested modules + stable barrel; accurate `story-engine/SQL-OWNERSHIP.md` | **READY WITH STRICT ZERO-SCHEMA-DELTA**; no CL01 migration/journal collision |

**Integration/parallel:** After prior feature branches, the three target disjoint source owners `apps/api`, `apps/web`, and `packages/db/src/schema/storyteller*` + Story Engine documentation only. HR01 must not overlap MA12 or CL01; HR02 must not overlap another same-feature Web editor; HR03 only moves definitions with a read-only Drizzle fingerprint, never a migration. Use one nominated custodian when the user commissions the wave: **HR03 parent**, source joins **HR03 → HR02 → HR01**, shared catalog/README updates and final tests. Until then, these are **planned**, not actively running, and source validation is not execution evidence. Existing behavioral tests are preserved, but no one-test-per-moved-helper campaign.

## Subsequent wave prepared while WR10 / MA12 / TURN03 are still open (2026-11-22)

**PLANNED, not yet dispatched or integrated.** This wave begins after the current three resolve their real acceptance gates. It is deliberately mixed: human/agent player ergonomics, the actual Writer vertical, and operational proof.

| Lane | Change | Source ownership | Dispatch readiness |
| --- | --- | --- | --- |
| A | [CL01 first-class terminal player](open/2026-11-22--cl01-terminal-player-client/CHANGE.md) | New tools/terminal, story-only Nest auth, browser consent, terminal token DB migration | **CONDITIONAL READY after MA12 source rebase** |
| B | [WR11 authorized provider continuation](open/2026-11-22--wr11-authorized-provider-continuation/CHANGE.md) | Story Engine writer-continuation, GA private control, Worker/Temporal provider workflow, fake player integration | **PLANNER-GATED until WR10 actual interfaces** |
| C | [K8S10 real-game chaos and mini-load](open/2026-11-19--k8s10-distributed-fault-and-load-harness/K8S10-CURRENT-EXECUTION.md) | Existing chaos controller/driver/oracle, one eligible Pod fault and 9-command scripted load | **Harness conditional on TURN03; real Pod mutation requires separate specific authorization** |

**No fourth duplicate K8S10 Change.** CLI consumes the same public APIs as Web, never a second game engine. WR11 keeps historic scripted mission topic/workflow immutable and adds provider-specific wake only under trusted policy; paid model cap is **proposed USD $0.75/three attempts with maximum USD $0.25 per mission**, but **not authorized now**. K8S10 does zero paid/model work and requires a real TURN03 authenticated cold-kind PASS. All three remain separate write sets; one custodian owns lockfile, common catalogs and actual cluster operators.

**Future custodian:** CL01 parent after owner commissions this wave, receives verified WR11 and K8S10 harness branches, joins source serially **WR11 → CL01 → K8S10 harness**, runs combined build/permission/financial negatives, writes one lockfile and publishes current undertaking. K8S10 live fault run occurs only against joined release and one owner-approved disposable Pod/cluster. Keep Change OPEN if live gate NOT RUN/BLOCKED. No self-merging sibling branches or automatic paid request.


## Three parallel implementation commissions designed 2026-11-22

**Source baseline:** `d3ba291763de` (recheck latest undertaking HEAD before worktree); **no implementation or verification has happened from these planning commits**. These are three substantial, independently owned Changes, not three slices of a running Change. One custodian coordinates source joins and resource-gated cold-kind verification.

| Lane | Change | Implemented outcome to prove | Readiness |
| --- | --- | --- | --- |
| **A** | [WR10 private Writer round protocol](open/2026-11-22--wr10-private-writer-round-protocol/CHANGE.md) | GA-only Writer SQL/CAS/spend, execution-only provider transport over versioned private HTTP, no repeat sends | **READY with critical financial safety stops**, fake provider only |
| **B** | [TURN03 real cold-kind turn and fork](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) | Existing golden fixture + scorecard made into a real authenticated Next/Nest/GA/outbox/Temporal/scene/fork runner | **Harness READY; live cluster/auth prerequisites gated** |
| **C** | [MA12 production API Lab isolation](open/2026-11-22--ma12-production-api-lab-isolation/CHANGE.md) | One-way @offscreen/api-lab outer tooling package; production API no Lab imports/dependency | **READY**, affected API/Chamber/test callers mapped |

**Source ownership:** WR10 = Story Engine Writer custody + private GA/Worker HTTP + Contracts and uniquely named WR10 tests; TURN03 = `infra/kubernetes/lab/app-release/turn03/**` plus uniquely named evidence-only tests; MA12 = `apps/api` and `tools/api-lab`, Chamber/API Integration developer app helpers. **No common implementation paths.** Affects shared package lockfile only at custodial join. TURN03 has exactly one cluster operator and executes cold-kind **after** A/C source joins; no Cursor runs a stale image or changes another lane's app sources to make POC pass.

**Integration custodian:** **Cursor C (MA12 parent)** checks all three tested branch receipts and current integration HEAD; safely serializes **WR10 → MA12 → TURN03 harness**, regenerates one lockfile and runs joined code proofs, archives the two completed code Changes and pushes the undertaking. TURN03 parent then runs cold-kind on integrated sources with authorized disposable context; archive TURN03 **only after all mandatory cross-Pod gates pass**. Otherwise preserve its open status and exact BLOCKED/NOT-RUN receipt. No parent self-merges during sibling work, no force/reset, no main merge and no paid provider request.


## Next three source-disjoint Changes, after MA10 / WR09A / MA11 integrated (2026-11-21)

**MA10, WR09A and MA11 are archived Done.** OPS12, WR09B, and DX12 are also archived Done on this branch. No package explosion or paid provider call.

| Next lane | Change | Dependency / state | Exclusive implementation owner |
| --- | --- | --- | --- |
| A | [WR09B durable multi-round Writer replay](archive/2026-11/other/2026-11-21--wr09b-durable-writer-round-replay/CHANGE.md) | **Done on the undertaking branch** (offline replay and policy fence; no paid call) | Story Engine writer-loop + narrow writer-mission-custody policy fence + new WR09B integration test |
| B | [OPS12 distributed Worker lifecycle](archive/2026-11/other/2026-11-21--ops12-distributed-worker-lifecycle/CHANGE.md) | **Done on the undertaking branch** (injected lifecycle 16/16; no process-kill trial) | Worker runtime control/execution/live-stack lifecycle and focused Worker tests |
| C | [DX12 affected builds and checks](archive/2026-11/other/2026-11-21--dx12-correct-affected-build-checks/CHANGE.md) | **Done on the undertaking branch** (affected-check unit tests 15/15; `--run` not executed) | Root affected-check tooling/script and local engineering notes |

**Joined on `undertaking/storyteller-workshop`.** WR09B was already squashed. This custodian then squashed OPS12, then DX12. These are *not* MA09, WR09C production provider wiring, a new npm package, or a claim that end-to-end gameplay survived deployment/kill tests.

## Selected three-lane source-disjoint post-MA08 wave (2026-11-21)

**Joined on `undertaking/storyteller-workshop`.** The custodian squash-merged MA10, then WR09A, then MA11. [Exact source contracts](../undertakings/storyteller-workshop/PROGRAM.md#post-ma08-three-lane-execution-contract-2026-11-21).

| Cursor lane | Change packet | Owned implementation area | Readiness |
| --- | --- | --- | --- |
| A | [MA10](archive/2026-11/other/2026-11-21--ma10-module-boundary-enforcement/CHANGE.md) | Application package removed; 112 tests live in API Integration | **Done (2026-11-21).** Pure tests 215/215 |
| B | [WR09A](archive/2026-11/other/2026-11-21--wr09a-durable-writer-provider-response/CHANGE.md) | Crash-safe writer response and charge settlement | **Done (2026-11-21).** Disposable custody 9/9. No paid call |
| C | [MA11](archive/2026-11/other/2026-11-21--ma11-story-engine-boundary-ratchet/CHANGE.md) | Story Engine domain ratchet and two host runtime dependencies | **Done (2026-11-21).** Module-graph tests 26/26 |

**Remaining:** [WR09](open/2026-11-21--wr09-provider-ready-writer-runtime/CHANGE.md) real worker/provider vertical, [MA09](open/2026-11-21--ma09-authority-writer-dependency-inversion/CHANGE.md) authority→Writer transaction seam after Writer interfaces stable, followed by internal SCC/public export closure and final undertaking acceptance. These are **not** simultaneous commissions of this wave.

## Structural completion packets (2026-11-21)

| Change | Readiness / commission |
| --- | --- |
| [MA08: Application owner extraction](archive/2026-11/other/2026-11-21--ma08-application-owner-extraction/CHANGE.md) | **Done (2026-11-21).** Lab, drafts, outbox relay, and runtime logging have real owners. Host and tool manifests no longer depend on Application. 112 legacy tests remain until MA10. |
| [MA09: Authority/Writer dependency inversion](open/2026-11-21--ma09-authority-writer-dependency-inversion/CHANGE.md) | **PLANNER-BLOCKED until WR09 and MA08 integration**; exact typed collaborator, existing transaction boundaries and failure paths planned; fresh source re-audit required before Cursor commission. |
| [MA10: Application compatibility retirement](archive/2026-11/other/2026-11-21--ma10-module-boundary-enforcement/CHANGE.md) | **Done (2026-11-21).** Application is removed. 112 tests run from API Integration. Graph instrumentation is the archived MA11. |

**Selected near-term DAG:** MA07 + MA08 + MA10 + WR09A + MA11 Done on the undertaking → WR09B Worker provider runtime → MA09 authority/Writer inversion and final graph-export closure → full product/architecture release gate. No automatic self-selected successor work or real paid provider send.

## Code craftsmanship implementation packets

The **unresolved architectural questions** live in the [Code Architecture Design](../designs/open/code-architecture-health/README.md); code implementation is owned by the individual packets here, not an extra dated program roadmap.

| Change | Scope / dependency |
| --- | --- |
| [CQ01](archive/2026-11/other/2026-11-21--cq01-admin-session-freshness/CHANGE.md) | Session timestamp rejection; Done on the undertaking branch |
| [CQ02](archive/2026-11/other/2026-11-21--cq02-admin-http-ownership/CHANGE.md) | Admin HTTP ownership; Done on the undertaking branch |
| [CQ03](archive/2026-11/other/2026-11-21--cq03-play-surface-readability/CHANGE.md) | Play readability; Done on the undertaking branch |
| [CQ04](archive/2026-11/other/2026-11-21--cq04-document-store-capability-guards/CHANGE.md) | Runtime capability guards; Done on the undertaking branch |
| [CQ05](archive/2026-11/other/2026-11-21--cq05-recurring-source-health/CHANGE.md) | Read-only structural source health checker; Done on the undertaking branch |

## Modular Monolith architecture program

[Domain ownership Design](../designs/open/code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md) · [Program schedule](../undertakings/modular-monolith/UNDERTAKING.md). A separate `undertaking/modular-monolith` branch would be the cleaner long-term home. Owner decision 2026-11-21: MA01–MA06 integrate on the active `undertaking/storyteller-workshop` branch, each from its own linked Change worktree. They stay off `main`. Listing a packet here does not commission it.

| Change | Architectural result | Readiness |
| --- | --- | --- |
| [MA01](archive/2026-11/other/2026-11-21--ma01-workspace-import-graph/CHANGE.md) | Manifest + source AST graph, runtime/type-only cycles and import rules | Done on `undertaking/storyteller-workshop` |
| [MA02](archive/2026-11/other/2026-11-21--ma02-cache-port-inversion/CHANGE.md) | Invert Redis adapter → application type dependency | Done on `undertaking/storyteller-workshop` |
| [MA03](archive/2026-11/other/2026-11-21--ma03-admin-package-extraction/CHANGE.md) | New Admin workspace with extracted campaign-holds schema, compatibility | Done (2026-11-21). `@offscreen/admin` owns the staff modules; application re-exports them. Disposable admin SQL 10/10. Target `undertaking/storyteller-workshop` |
| [MA04](archive/2026-11/other/2026-11-21--ma04-chamber-domain-decoupling/CHANGE.md) | Remove ordinary story authority's developer-fixture import | Done (2026-11-21). Stories no longer imports Chamber fixtures. Disposable story HTTP 4/4 and core 10/10. Target `undertaking/storyteller-workshop` |
| [MA05A](archive/2026-11/other/2026-11-21--ma05a-neutral-storyteller-kinds/CHANGE.md) | Remove two reverse imports by moving frozen generation-kind constants into Contracts | Done (2026-11-21). Kinds live in `@offscreen/contracts/storyteller-kinds`. Focused tests 1/1, 1/1, and ENG03 9/9. Target `undertaking/storyteller-workshop` |
| [MA05B](archive/2026-11/other/2026-11-21--ma05b-sql-outbox-port/CHANGE.md) | Move transaction/notice/enqueue SQL primitive into DB with exact Application compatibility | Done (2026-11-21). `@offscreen/db/outbox` owns enqueue. Identity 1/1. Disposable SQL 7/7. Target `undertaking/storyteller-workshop` |
| [MA05C](archive/2026-11/other/2026-11-21--ma05c-direct-db-outbox-imports/CHANGE.md) | 46 exact source imports move to DB-owned outbox port in one guarded utility edit, followed by joined proof | Done (2026-11-21). 46 files import `@offscreen/db/outbox`. Package builds passed. Old relative import search found nothing. SQL fixture not rerun. Target `undertaking/storyteller-workshop` |
| [MA05D](archive/2026-11/other/2026-11-21--ma05d-frozen-wake-sql-seam/CHANGE.md) | Replace two Campaign → Storyteller runtime reverse imports with stable read-only SQL facts | Done (2026-11-21). Topics live in `@offscreen/contracts/storyteller-notices`. Campaign `storyteller-wake.ts` owns the SQL readers. Disposable SQL 12/12. Target `undertaking/storyteller-workshop` |
| [MA05E](archive/2026-11/other/2026-11-21--ma05e-continuity-note-authority/CHANGE.md) | Relocate SQL continuity writer into Story Authority with strict legacy re-export identity | Done (2026-11-21). `stories/continuity-notes.ts` owns the SQL writer. Identity 1/1. Disposable scene publication 5/5. Target `undertaking/storyteller-workshop` |
| [MA05F](archive/2026-11/other/2026-11-21--ma05f-authority-start-retry-cohort/CHANGE.md) | Move start/retry SQL authority and retry decision policy in one coherent Change while retaining old runtime-path identity | Done (2026-11-21). Story Authority owns start, retry admission, and the retry gate. Identity 1/1. Publication context 5/5. Playable start 5/5. Target `undertaking/storyteller-workshop` |
| [MA05G](archive/2026-11/other/2026-11-21--ma05g-resolution-admission-authority/CHANGE.md) | Move resolution replay, locked commit, and task-record SQL into Story Authority while keeping off-lock preparation and the public factory | Done (2026-11-21). Identity 7/7. Notice-topic freeze 8/8. ENG03 lock measurement 2/2. Module graph has the existing intra-application cycle and no new package cycle. Target `undertaking/storyteller-workshop` |
| [MA06A](archive/2026-11/other/2026-11-21--ma06a-story-engine-package-cohort/CHANGE.md) | One coherent bulk extraction of stories, campaign, storyteller runtime and generations into `@offscreen/story-engine`, keeping compatibility | Done (2026-11-21). 134 modules, 134 forwarders, compatibility 4/4, notice freeze 8/8, ENG03 2/2. Module graph clear. Target `undertaking/storyteller-workshop` |
| [MA07](archive/2026-11/other/2026-11-21--ma07-direct-domain-consumers/CHANGE.md) | Production hosts import stories, generations, and storyteller from Story Engine | Done (2026-11-21). Twenty host files migrated. Forwarders kept. Host import guard 3/3. API and Game Authority typecheck passed. Target `undertaking/storyteller-workshop` |
| [MA05](archive/2026-11/other/2026-11-21--ma05-authority-runtime-port-inversion/CHANGE.md) | Remaining tx-bound Story Authority → Storyteller-runtime inversion | Superseded (2026-11-21) by MA06A. MA05A–G are Done. Intra-engine capture edges remain. Not a completed dependency inversion |
| [MA06](open/2026-11-21--ma06-domain-package-migration/CHANGE.md) | Extract story-authority and Storyteller-runtime packages, retire application catch-all | **PLANNER-BLOCKED:** reserved A–D extraction stages; requires post-MA05 graph and exact file/export/consumer migration maps |

## Next Storyteller Workshop and modular-monolith wave (2026-11-21)

| Change | Status / dispatch |
| --- | --- |
| [WR09](open/2026-11-21--wr09-provider-ready-writer-runtime/CHANGE.md) | **PLANNER-BLOCKED**: real-provider Writer recovery/custody design; not commissioned for Cursor; final response persistence and Worker policy must be decided by ChatGPT |

## Open packets

### Distributed gameplay, Kubernetes and developer experience

| Change | Current work item |
| --- | --- |
| [OBS04](open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | Finite-action evidence |
| [DIST03](open/2026-11-19--dist03-game-authority-private-boundary/CHANGE.md) | Private Game Authority boundary |
| [K8S10](open/2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md) | Distributed fault/load harness |
| [K8S11](open/2026-11-19--k8s11-next-nest-live-edge-integration/CHANGE.md) | Next/Nest live edge |
| [TURN03](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) | Full distributed forkable turn |
| [TURN04](open/2026-11-19--turn04-opt-in-real-provider-confirmation/CHANGE.md) | Opt-in live provider confirmation |
| [DXK08](open/2026-11-20--dxk08-fast-kubernetes-inner-dev-loop/CHANGE.md) | Fast Kubernetes developer loop |
| [DXK09](open/2026-11-20--dxk09-parallel-worktree-dev-stacks/CHANGE.md) | Parallel worktree dev stacks |

[DXK07](archive/2026-11/infrastructure/2026-11-20--dxk07-clean-clone-acceptance/CHANGE.md) is **Done for implementation**; full fresh-clone/Headlamp operator proof remains [DXK-FINAL](../tasks/open/2026-11-20--dxk-final-wsl-clean-room-acceptance/TASK.md). · [Implementation roadmap](../IMPLEMENTATION-ROADMAP.md) · [Current distributed source review](../designs/open/distributed-turn-poc/README.md) · [First-campaign readiness study](../designs/open/first-campaign-readiness-2026-11-20/README.md) · [current selection](../QUEUE.md). These source maps are dated; they do not supersede HEAD code or current Change states.

### Writer refoundation | WR02 and WR03 archived; WR04–WR08 require planner repair

| Change | Work item |
| --- | --- |
| [WR01](archive/2026-11/other/2026-11-21--wr01-accept-storyteller-and-fork-contract/CHANGE.md) | Product wiki (Done) |
| [WRD02](archive/2026-11/other/2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) | Storyteller/Library technical wiki (Done) |
| [WRD03](archive/2026-11/other/2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md) | Engine/fork technical wiki (Done) |
| [WRD04](archive/2026-11/other/2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md) | Wiki reconciliation (Done) |
| [WR02](archive/2026-11/storyteller/2026-11-21--wr02-persistent-library-and-source-identity/CHANGE.md) | Persistent Library / source identity (Done) |
| [WR03](archive/2026-11/storyteller/2026-11-21--wr03-agentic-writers-workdesk/CHANGE.md) | Writer's Workdesk (Done) |
| [WR05S](archive/2026-11/other/2026-11-21--wr05s-scene-v2-storage-contract/CHANGE.md) | Scene-checkpoint v2 storage grammar and SQL versions 1–2 (Done). Publication still writes v1 |
| [WR04](archive/2026-11/storyteller/2026-11-21--wr04-delegated-writer-research/CHANGE.md) | **Done:** read-only Writer research children, shared cap, verified join. Not a live provider proof. Not on main |
| [WR05P1](archive/2026-11/storyteller/2026-11-21--wr05p1-scene-after-state-kernel/CHANGE.md) | Semantic after-state capture and pure continuity-note projection in Story Engine (Done). Publication still writes v1 |
| [WR05P2](archive/2026-11/storyteller/2026-11-21--wr05p2-v2-scene-publication/CHANGE.md) | Representable openings, continuations, and consequence publication commit a v2 checkpoint; historical read uses that snapshot (Done). v2 fork remains WR06 |
| [WR07N](archive/2026-11/storyteller/2026-11-21--wr07n-writer-opening-scene-proposal/CHANGE.md) | Versioned Writer opening-scene proposal (Done). v1 request hash unchanged. Does not publish |
| [WR07L](archive/2026-11/storyteller/2026-11-21--wr07l-durable-launch-ledger/CHANGE.md) | Owner-scoped Launch admission ledger (Done). No story row and no endpoint |
| [WR05](open/2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | **PLANNER-BLOCKED:** v2 after-world-state schema, transaction projection and migration not fully settled |
| [WR06](archive/2026-11/storyteller/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | v2 historical fork into a playable child story (Done). Not on main |
| [WR07C](archive/2026-11/storyteller/2026-11-21--wr07c-launch-wire-contract/CHANGE.md) | Launch request and status parsers in `@offscreen/contracts/story-launch` (Done). This does not unblock WR07 |
| [WR08A](archive/2026-11/storyteller/2026-11-21--wr08a-play-launch-surface/CHANGE.md) | Gated one-prompt Launch form and status (Done). Default off until the Launch backend exists. Web only. Not on main |
| [WR07M](archive/2026-11/storyteller/2026-11-21--wr07m-opening-writer-mission-scope/CHANGE.md) | Opening writer scope without a fabricated prior scene (Done). v1 replay hash unchanged. Does not admit a story |
| [WR07](archive/2026-11/storyteller/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | Scripted authenticated first scene (Done). Choice buttons stay unpublished. Web flag stays off. Not on main |
| [WR08](archive/2026-11/storyteller/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) | **Done:** gated Play, scripted first `observe` offer, `writer.scene.v1` wake. Not on main |

[Writer Undertaking program](../undertakings/storyteller-workshop/PROGRAM.md). **WR01 and WRD02–WRD04 are Done** and archived here; their canonical wiki rewrite is included. **WR02, WR03, WR05S, WR05P1, WR05P2, WR06, WR07, WR07C, WR07L, WR07M, WR07N, and WR08A are Done and archived on the undertaking branch. WR07 publishes one scripted readable scene and does not enable clickable choices or the web flag. WR05S stores a v2 checkpoint and allows SQL versions 1 and 2; it does not publish scenes. WR05P1 captures a semantic after-state and projects continuity notes; it does not publish v2. WR05P2 publishes representable v2 checkpoints and reads them historically. WR06 forks one v2 checkpoint into a child story and does not add a Launch endpoint. WR07C publishes Launch request and status schemas and does not add an endpoint. [WR07L](archive/2026-11/storyteller/2026-11-21--wr07l-durable-launch-ledger/CHANGE.md) stores an owner-scoped `story_launch` row and does not add that endpoint or a story row. WR07M adds a writer-mission v2 opening scope and does not admit a story or call a provider. WR07N requires a version-2 opening final to carry passage content and rejects a crossed proposal version; it does not publish that scene. WR08A is a flag-gated web form and does not add that endpoint. WR06, WR07, WR08, and WR04 are Done. WR05 remains planner-blocked on its own packet.** Their existing T-IDs are non-dispatchable until ChatGPT freezes missing designs and verifies successor source contracts. See the [program's corrected collision/dependency map](../undertakings/storyteller-workshop/PROGRAM.md). No Cursor investigation swarm or provider calls are authorized by a proposed Change. WR03 does not publish scenes and does not select WR04. No permission to dispatch paid models or mutate deployment follows from these statuses.

## Layout

- `open/YYYY-MM-DD--slug/CHANGE.md`: only unresolved or in-flight work. A Change marked Done/Cancelled is reconciled and moved out promptly.
- `archive/YYYY-MM/<program>/YYYY-MM-DD--slug/`: short-lived review staging for verified terminal packets, **not permanent storage**. After a normal seven-day review buffer, prune only with a full-SHA ledger pointer, owner/unique-evidence audit and repaired inbound links. See [archive policy](archive/README.md).
- `ledger/YYYY-MM.md`: concise durable dispositions; Git history stores the original full packet.
- A **Design** is not a Change. Unresolved research belongs in [work/designs/open](../designs/README.md), then is retired into the [design ledger](../designs/ledger/2026-11.md) and Git.

Review archive candidates with `pnpm repo:retirement` (read-only). No automated `git rm`; time alone is never a deletion grant.


**Old dated audit menus and handoffs are not active queues.** The original full contents are recoverable through Git at `4ee459b9acdc73c7f63674b697baeb9c7e685da4`; use current Change packets and Undertaking owners instead.
