# Storyteller Workshop

**Owner decision 2026-11-24: `main` is the integration trunk.** Storyteller Workshop remains an active outcome/acceptance dossier, not a separate integration branch. New Changes branch from current `main` and join `main` after their own proof, using dedicated Change branches and linked worktrees. The former `undertaking/storyteller-workshop` reference is a historical transition checkpoint; no new joins there. Reconcile in-flight branches against main without resetting or discarding user work. Do not force-push or delete the old branch until local migration is verified. This explicitly overrides older Storyteller Workshop target instructions, not safety, release, live acceptance or Change gates. The dossier closes on accepted outcome, not branch promotion.

**Current checkpoint:** [overview](OVERVIEW.md) and [consolidation](CONSOLIDATION.md) supersede historical dispatch/progress paragraphs below. ~75% architecture, ~40% Storyteller, ~30% distributed, ~45% overall (±20pp). INF44–46 source-only; INF49 composition source Done; INF29 live acceptance open. DXK10 parent cancelled; no paid execution tonight.

**Workstation observability (2026-11-24):** [INF44–47 source implementation wave](WORKSTATION-OBSERVABILITY.md) selected after INF29 capacity abort. Native persistent host metrics, subsecond memory envelopes, nested workload attribution, operation correlation and incident queries. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged; no new live acceptance credit.

**Local developer composition (2026-11-24):** [implementation wave](LOCAL-DEV-PLATFORM.md) commissioned INF43, INF37, INF39, INF38 and INF42 source runner. INF43 source verification 445 pass / 0 fail. INF42 source Done: `pnpm infra:verify --suite source`. Focused tests 13/13. Live cluster NOT RUN. INF37 source Done: `pnpm infra:plan|up|status` select dev core plus Redis or the full release catalog. Focused tests 48/48. INF39 source Done. Live cluster NOT RUN. INF29 live in progress separately. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged; no new live acceptance credit.

**Local developer platform direction (2026-11-24):** INF36 Done at 91bc2af40a94cdf9a95ee7db31a846d60f3abd0c. [Next sequence](LOCAL-DEV-PLATFORM.md) and permanent capability catalog now define practical composition, configuration and repeatable verification. INF29 current-flow live proof separately gated. INF37–42 candidate slices, not executable. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp), unchanged; no new live acceptance credit.

**INF23/INF30–INF36 (2026-11-24):** [Practical medium-grained follow-up](INF-MEDIUM.md) commissioned at 54f9261d699097835e6c97ad55612a02ae49e59c; INF20–28 source Done, INF29 final join blocked. INF23 source Done (registry flock and atomic session write). INF36 source Done (status and lifecycle extracted from the developer CLI). Focus developer usability, preserve data and isolation, defer enterprise hardening. No live acceptance credit.

**INF20–INF29 (2026-11-24):** Owner commissioned [medium-grained infrastructure reconciliation](INF-MEDIUM.md). INF18 and INF20 source Done. Admission, selected tenancy, credentials, release integrity, readiness, chart and retirement. INF23/29 planner-blocked. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged; no live acceptance credit.

**INF16–INF19 (2026-11-24):** Owner commissioned [environment and development normalization](ENVIRONMENT-PARALLEL.md). Remove release Tilt, consolidate dev graph and image loader, normalize freshness supervision, eliminate infra/dev and separate fixture composition. INF16–INF19 source Done. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged; no live acceptance credit.

**INF09–INF15 (2026-11-24):** Owner commissioned [platform normalization program](PLATFORM-PARALLEL.md). INF08 through INF15 are source Done (live NOT-RUN). Shared primitives, five service Changes, and environment assembly landed in source. No live proof/acceptance credit; overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged.

**INF08 (2026-11-24):** Done: [Helm workload normalization](../../changes/archive/2026-11/platform-operations/2026-11-24--inf08-helm-workload-normalization/CHANGE.md), dependency-gated after INF07. One application chart, slot-only dev and stable release, explicit resource/security policy. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged; no live acceptance credit.

**INF07 (2026-11-24):** [Image architecture normalization](../../changes/archive/2026-11/platform-operations/2026-11-24--inf07-image-architecture-normalization/CHANGE.md) is Done source-only after INF06. Shared toolchain, build graph and verified distribution; distinct dev/release artifacts retained. Live Docker/Kind/Tilt NOT-RUN. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged; no new acceptance credit.

**INF06 (2026-11-24):** Cluster foundation source landed. [INF06](../../changes/archive/2026-11/platform-operations/2026-11-24--inf06-cluster-foundation-normalization/CHANGE.md) is Done, source-only, live cluster NOT-RUN, no new acceptance credit. Existing overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp) unchanged.

**Infrastructure ownership cleanup (2026-11-24):** [INF01–INF05](INF-PARALLEL.md) source relocation is Done. The generic `infra/kubernetes/lab` bucket is empty. Release, development, and verification source are split; runtime identities are unchanged. Live cluster proof is NOT-RUN and is not acceptance credit. Overall ~40%, architecture ~70%, Storyteller ~40%, distributed ~25% (±20 pp), unchanged.

**Database architecture (2026-11-24):** [Selected infrastructure and persistence](../../../docs/technical/platform/database-infrastructure.md), [DB01–DB10 DAG](DB-PARALLEL.md). DB01/02/03/04/05/06/07/08/09 source Done. Schema lane complete through DB05; runtime through DB09; DB10 final dependency-gated; main only. Live PostgreSQL remains NOT RUN. No outcome credit, global queue change or live authorization. DBOPS01/02 and SQL01 remain distinct backlog.

**Cache release (2026-11-24):** owner commissioned all eight Changes at f26ce36dcee1bda6e9eee4d305ec6200ef924b44. [Execution DAG and gates](CACHE-PARALLEL.md). CACHE01, CACHE02, CACHE03, and CACHE05 are joined source-only. CACHE02 parent still coordinates wave 2. Future gates are conditional, no further owner release needed; semantic contradictions stop. No global selection or live resource authorization change.

**Final-wave conditional commission (2026-11-24):** Owner commissioned DO06 and DO07 now. DO06 may execute after DO05 integrates (DO03 already integrated); DO04 need not land first. DO07 may execute only after all six extractions integrate and no live residual module remains. Each assigned parent checks predecessor receipts and exact source/export postconditions on latest undertaking HEAD before editing; if they pass, no further ChatGPT release or approval is needed. Genuine semantic contradictions remain stop conditions. Coordinate joins with DO04 wave B custodian while active; otherwise the sole remaining parent owns its join. No global queue change, no new proof or completion credit.

**Wave B release (2026-11-24):** DO01–DO03 integrated; DO04 and DO05 Ready / owner-commissioned concurrently at `372df9646108f0442dcca4f1dcc992fddfe50511`. DO04 parent is integration custodian; join DO04 then DO05, or DO05 first if DO04 is not ready and both parents agree. Separate linked worktrees, local lockfiles, no independent undertaking pushes. Shared files: residual contracts manifest, lockfile, ESLint config, graph rules and shared docs; merge by owned keys/rules, regenerate lockfile and run combined affected proofs. No mapped direct consumer file overlap. DO05 must remove its two remaining Storyteller old imports and manifest dependency before adding the transitional reverse edge from residual evaluation. DO04 owns private protocol guard; DO05 owns narrow residual evaluation exception. DO06 and DO07 are conditionally commissioned; their execution gates are DO05 and all six respectively. No cluster, provider, DB mutation, Documents or CACHE scope.

**2026-11-24 domain ownership release:** owner commissioned DO01–DO03 at `f28085e3e5cbf15bb32f430bd3b0b833f7429c6e` after LIB07, with distinct worktrees and DO01 parent integration custodian. [Selected topology](../../../docs/technical/platform/topology.md#code-organization) · [parallel plan](../../designs/open/code-architecture-health/DO-PARALLEL-EXECUTION.md). No implementation/tests or percentage credit. Remaining DO04–DO07 use actual DAG; global queue unchanged.

**2026-11-24 domain ownership sequence, planning only:** Owner-selected [DO01–DO07](../../designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md) near-term open packets retire the horizontal contracts workspace after the Documents predecessor. Preserve schema/wire/authorization/financial invariants and existing domain dependency inversion. Each Change needs a fresh readiness check and individual commission; queue and completion evidence unchanged. [Open catalog](../../changes/open/README.md).

**State:** Active  
**Branch:** `undertaking/storyteller-workshop`  
**Started:** 2026-11-21  
**Integration base:** `main` at `34e2b4fd8d9d9967e13311da3a938460b1a02244`

**Supervisor / first read:** [**The big picture · accessible progress overview**](OVERVIEW.md). Read it before the ledger below; it tracks visible progress toward *both* Storyteller evolution and modular-monolith shaping, without requiring Change IDs or code knowledge. Mandatory refresh and supervisor presentation cadence: [Undertaking process](../README.md#required-supervisor-overview-first-class). The technical evidence and acceptance definitions remain below.

## Purpose

Re-found the Storyteller from a prompt-shaped component into a disciplined **writing system**: it has durable sources and a persistent Library, a bounded writer's workdesk, explicit research assistance, coherent scene publication, fork-aware active fictional state and a clean creation path from one prompt into an actual playable campaign.

**Storyteller Workshop** is intentionally broader than “Storyteller docs” and more specific than “Storyteller evolution.” The undertaking names the shared transformation that the WR/WRD Changes collectively serve.

## 2026-11-22 | Next three Changes designed, no implementation credit

**Planning baseline:** actual source snapshot `d3ba291763de`, branch `undertaking/storyteller-workshop`. Three source-disjoint executor packets have been prepared: [WR10](../../changes/open/2026-11-22--wr10-private-writer-round-protocol/CHANGE.md) creates the previously missing GA-owned Writer custody ↔ executor-owned provider transport boundary while preserving the executor's no-SQL contract; [MA12](../../changes/open/2026-11-22--ma12-production-api-lab-isolation/CHANGE.md) removes runtime Lab Support from production API by moving four Chamber/QA controllers behind one outer `@offscreen/api-lab` workspace; [TURN03](../../changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) reuses its already accepted golden fixture/report and prepares a genuine cold-kind authenticated turn/fork runner. No fresh tests, provider calls or deployments occurred in planning, and no completion percentage rises. [Source ownership and custodial integration](PROGRAM.md#selected-next-engineering-wave-2026-11-22-source-grounded-not-yet-implemented).

**Critical non-substitutions:** WR10 is a provider-free split private round protocol **not** yet the ordinary Launch/Temporal Writer admission or a paid live model; TURN03's scripted cold cluster result, even if all gates pass, is **not** real-model quality; MA12 production dependency cleanup does not resolve the source-level Authority↔Writer reverse imports (MA09). New model and cluster claims require actual evidence, not created packets.


## 2026-11-22 | Agent internals and context-inspection scope discovered, design only

Read `packages/storyteller/src/tasks/{writer-mission,writer-round-request,opening}.ts`, `packages/story-engine/src/storyteller/{context-capture,capture-materialization,writer-loop,writer-round-replay,writer-mission-custody,writer-provider-response,writer-workdesk}.ts`, `packages/workflows/src/{index,contracts}.ts`, `apps/worker/src/{outbox/dispatch,runtime/control,runtime/execution}.ts`, `packages/admin/src/{registry,policy,diagnostics-reads}.ts` and AdminActorService at undertaking HEAD `f8a45a7e`. Selected [AI01](../../changes/backlog/agent-runtime/2026-11-22--ai01-agent-runtime-and-temporal-navigation/CHANGE.md), [AI02](../../changes/backlog/agent-runtime/2026-11-22--ai02-durable-agent-execution-provenance/CHANGE.md), [AI03](../../changes/backlog/agent-runtime/2026-11-22--ai03-staff-agent-context-inspector/CHANGE.md) in order, all planner-gated, no test run. Distinguish capture/source pins, actual two-message provider wire, available Library tools, persisted tool and response CAS, and Temporal scheduling. Existing request wire hash is **not** necessarily a stored exact request body; exact transcript retention and Admin private context inspector remain future work. Support situation capability is **body-free**, generic ai.operation.read is redacted; AI03 must add trusted-steward case+campaign permission before raw customer content. See [human overview](OVERVIEW.md#agent-internals-and-scene-by-scene-inspection-newly-recognized-gap-2026-11-22).

## 2026-11-22 | Human navigation/refactor wave promoted to near-term, still source-gated

Source-inspected `d3ba2917` shows long Nest Stories/Admin controllers, flat Web Stories feature and 20 Drizzle Storyteller table declarations in a single 1,240-line file. Promoted near-term [HR01](../../changes/archive/2026-11/other/2026-11-22--hr01-api-route-ownership-readability/CHANGE.md), [HR02](../../changes/archive/2026-11/other/2026-11-22--hr02-web-player-feature-readability/CHANGE.md) and [HR03](../../changes/archive/2026-11/other/2026-11-22--hr03-db-schema-and-sql-navigation/CHANGE.md). Stable routes/Auth + Query/hydration/intent + SQL metadata/fk/index identities are acceptance. SQL business operations remain in their transaction owner; HR03 creates a truthful reading atlas, not repositories. Composer routine move/import decisions are permitted within locked package maps; new DB migrations, query rewrites, tests per moved helper and provider calls are not. HR01, HR02, and HR03 are Done on the undertaking branch. [Next-wave launch protocol](NEXT-WAVE.md) defines exact post-predecessor checks, separate write ownership and custodian order. No code implementation/tests run by planner, and no completion credit. See [human OVERVIEW](OVERVIEW.md#human-readable-code-ownership-wave-planned-2026-11-22-not-implemented).

## 2026-11-22 | Next-wave successor packet design, zero outcome credit

Following WR10/MA12/TURN03 source-planning, integrated [CL01 secure first-class terminal campaign client](../../changes/archive/2026-11/experience/2026-11-22--cl01-terminal-player-client/CHANGE.md) and [WR11 real provider-selected Writer continuation](../../changes/archive/2026-11/storyteller/2026-11-22--wr11-authorized-provider-continuation/CHANGE.md). [K8S10](../../changes/open/2026-11-19--k8s10-distributed-fault-and-load-harness/K8S10-CURRENT-EXECUTION.md) harness source is on this branch; live Pod mutation remains gated on TURN03 PASS and explicit owner authorization. CL01 owns terminal/story-scoped browser pairing. WR11 owns GA/Worker/Story Engine/Temporal continuation and has a fake-transport proof, not a paid OpenRouter smoke. Optional real inference hard planning ceiling USD $0.75 / 3 calls, with no mission spending over USD $0.25 only after all zero-cost acceptance, separate owner authorization. Human [OVERVIEW](OVERVIEW.md) estimates remain unchanged.

## Whole-undertaking completion control | living ledger

**Current evidence snapshot: 2026-11-22, inspected undertaking at `d3ba291763de26a0135c1ad84b077bf4f1c153a8`.** This is the **single overall completion ledger** for the combined Storyteller Workshop **and** Modular Monolith program. [Writer implementation program](PROGRAM.md) owns packet-level sequencing; [Modular Monolith dossier](../modular-monolith/UNDERTAKING.md) owns the MA history and structural acceptance. Do not create a second global queue: [work/QUEUE.md](../../QUEUE.md) remains the only default current selection. A user-commissioned independent Change can execute without changing it.

**How to read the statuses:** **Done** means code/evidence is integrated into the undertaking branch for that *bounded stage*, not shipped to `main`. **Active** means owner-commissioned Cursor work, **not accepted evidence**. **Planned** means design/implementation remains; **Gate** is a full-undertaking end condition needing actual verification. A new packet is not progress by itself. These are deliberately **not percentages**: one later vertical integration may reveal more work than five small Changes. Update this table after each coherent Change-join or milestone, with receipt links and newly found gaps. Never turn a partial into Done because a test was planned.

| Full outcome | Current evidence tier | What is implemented / tested | Unfinished acceptance |
| --- | --- | --- | --- |
| **A. Undertaking branch and process** | **Done for ongoing work** | Current integration branch `d3ba2917`, serialized Change joins and archive; queue `none` | Full acceptance, main landing and temporary branch/dossier retirement |
| **B. Monorepo structural ownership** | **Substantial source implementation; full compile/architecture gate open** | MA01–MA11 bounded outcomes integrated; Application removed; 18 package manifests, Lab/Admin/Writer-related owners; 112 migrated tests; module graph and affected planner | MA09 typed Authority→Writer injection; reconcile shared Stories/Campaign authority and 164-file Story Engine; remove/layer API runtime Lab Support if justified; clean source graph, full builds and tests; actual cache-performance proof |
| **C. Persistent Library / Workdesk** | **Implemented; fixtures tested** | Source-root v2, mission/step ledger, private drafts, bounded tools and replay; historical source identity | Actual user Writer using pinned Library in Player path; fork/private visibility and longform quality under real model |
| **D. Scene/canon/checkpoint and forks** | **Implemented and focused tested** | Scene-v2 selector, historical GET/fork, source pins, quiescent and some active-state mechanics in disposable/local tests | Arbitrary active-scene and mixed mechanics across cold-kind and multiple Pods with no future leakage |
| **E. Prompt Launch and Play** | **Scripted local integration only** | Gated Launch, authenticated operation identity, scripted opening/scene2→3, source/permission/idempotence checks | Feature-on real model Writer opening, authored choices, normal Web play/reentry and meaningful quality |
| **F. Strict provider response/cost and Writer round** | **Provider-free focused and SQL tests** | WR09A private CAS + atomic attempt accounting; WR09B fake multi-round decision/tool/next-step replay, T00 policy guard (receipt: 4/4); no paid provider | Worker dispatch of durable round; host-only key/mode/price grant; live bounded provider; failure after possible-send; actual research-child continuation and publication |
| **G. Process and platform recovery** | **Local process + injected Worker proofs; cold-kind gate open** | STORY03 local separate-process causal test; OPS12 16/16 injected startup/shutdown tests; Temporal/outbox scheme | TURN03 complete browser/Pod/fork chain; K8S10 kill/load on actual game, HA/capacity/rollback, secrets and cross-store restore |
| **H. Observability / operational safety** | **Synthetic lab proof only** | Synthetic OTel two-hop and missing-hop; local event and audit receipts; disposable infrastructure probes | Game instrumented correlated traces, alerts, SLO/metrics, cost/queue-age and incident recovery; restore rehearsal |
| **I. Quality, performance and longform** | **Fixtures/harnesses exist; player quality not certified** | P3-C provider-free harness, some scripted/evaluator tests; DX12 plan and selector 15/15 | Reproducible human-reviewed scenes, memory and consistency across many turns, p95/p99/throughput/cost evidence, measured Turbo warm cache |
| **J. Docs and release closure** | **Open quality gate** | Permanent product/technical owners and extensive wiki; planning/Change lifecycle | Snapshot full-checkout docs regression count **7**, wiki-health **66 hard errors**, portable unresolved included links **67** (plus 116 expected lean omissions); repair stale Application links and statuses; run all release gates; land to main |

### 2026-11-22 | Source audit checkpoint at d3ba2917

**Human-first orientation and estimates:** [OVERVIEW](OVERVIEW.md): monorepo **~65%**, real Storyteller **~40%**, distributed operations **~25%**, combined **~40%**, uncertainty at least ±20 pp. This replaces the previous 85/60/70 estimate because the complete product, full Kubernetes recovery, live Writer and maintainability finish line was undercounted. These are **scope/risk judgments**, not a measurement of lines, tests or shipped feature coverage. No test was executed in this audit.

**Reviewed evidence:** Current ZIP `SNAPSHOT.json` identifies committed clean source at `d3ba291763de` and excludes archive/evidence directories; GitHub rechecked archived WR09B, OPS12, DX12 Change status. WR09B 4/4 fake-provider integration; OPS12 16/16 injected lifecycle; DX12 15/15 scope tests. The worker package **full typecheck is still reported blocked** by the `storyteller-generation-evidence` / `GameAuthoritySeam` mismatch. DX12 real `--run`/warm cache not performed. Provider/real-money and cold-kind full browser-story turn not performed. Historic local STORY03 seven connected scenarios plus failure injection are positive partial evidence, not deployment or scale proof.

**Critical source boundary:** `apps/game-authority/src/launch-put.ts` pins `model:'scripted-offline'`; `apps/worker/src/activities/index.ts` mounts scripted Launch, scene and research activity functions; `runDurableWriterMissionModelRound` occurs in `packages/story-engine/src/storyteller/writer-round-replay.ts` and API Integration tests but is not in the current normal Worker activity. The missing production Writer activity/authorized policy wiring is the next vertical, not more custody-test construction. No funded provider call authorized.

**Architecture/risk inventory:** Story Engine ~164 TS files/1.63 MB of source including tests; 5 documented runtime Authority→Writer backedges remain pending [MA09](../../changes/backlog/agent-runtime/2026-11-21--ma09-authority-writer-dependency-inversion/CHANGE.md). Source-relative imports Stories→Campaign ~30 / Campaign→Stories ~34 are evidence of a shared SQL authority, not a reason to invent two separate packages. API source imports `@offscreen/lab-support` for guarded developer routes. Package graph/affected selection are present but clean full build/typecheck, measured cache gains, split domain API and safe packaging/release remain open. 7 full-checkout docs regressions, 66 wiki hard errors and 67 portable included missing links require repair; 116 excluded-profile links are not defects.

**Operational end gates:** [TURN03](../../changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) cold-kind authenticated end-to-end with checkpoint/fork/correlation remains open; [K8S10](../../changes/open/2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md) real game-chaos/load remains open. Separate SQL/Temporal/object restore untested. A synthetic RabbitMQ kill observed double effect; do not mark exactly-once proven from that. See [the clear tier matrix](OVERVIEW.md#the-main-flows-present-versus-still-missing).

**Tomorrow's planner sequence (not execution permission):** (1) source-reconcile the existing [WR09 umbrella](../../changes/open/2026-11-21--wr09-provider-ready-writer-runtime/CHANGE.md) into the remaining Worker provider/Launch/continuation/credential composition, first provider-free; (2) reproduce/resolve Worker full compile blocker; (3) reconcile existing TURN03/K8S11/DIST03/K8S10 cold cluster gates and one acceptance ledger; (4) source-rebase MA09 and evaluate Writer package extraction **only after** runtime backedges are eliminated. Avoid duplicating these Change folders. An owner commission and exact worktree/resource ownership are still separate.

### Historical next-wave handoff (post-P3 readiness repair, 2026-11-21; superseded by 2026-11-22 checkpoint)

**P3-A, P3-B, P3-C, WR08, and WR04 are integrated on the undertaking.** [WR04](../../changes/archive/2026-11/storyteller/2026-11-21--wr04-delegated-writer-research/CHANGE.md) delivers provider-free read-only research children and a verified parent join. [WR08](../../changes/archive/2026-11/storyteller/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) is the gated scripted Play path. Neither is a live-model proof. Not on main. See [human progress](OVERVIEW.md).

### Previous historical handoff (after WR05P2/WR07L; superseded)

| Owner | Change | Concrete code write ownership | Completion impact |
| --- | --- | --- | --- |
| Done this window | [WR07B](../../changes/archive/2026-11/storyteller/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | Scripted Launch publishes one readable scene and rejects clickable openings | Full player choice→next Writer scene remains the Living Writer gate |
| Cursor B | [WR06](../../changes/archive/2026-11/storyteller/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | Historical v2 rehoming, fork lineage and history/fork UI | Done on the undertaking. Not on main |

**Completed this window:** [WR07N](../../changes/archive/2026-11/storyteller/2026-11-21--wr07n-writer-opening-scene-proposal/CHANGE.md), [WR07L](../../changes/archive/2026-11/storyteller/2026-11-21--wr07l-durable-launch-ledger/CHANGE.md), and [WR05P2](../../changes/archive/2026-11/storyteller/2026-11-21--wr05p2-v2-scene-publication/CHANGE.md) are integrated/archived within their bounded scopes. WR05P2 recorded Documents 49 pass/0 fail/2 skipped, v2 unit 5/5 and checkpoint/fork focused 22/22; no paid provider call. **Resource/integration rules:** separate linked worktrees, only one parent/custodian joins the undertaking at once, reconcile README/ledger/STATUS centrally, and never run multiple SQL migration suites against the same disposable DB. If any of the three has already landed at a later HEAD, update **Active → Done with its actual SHA/proof**, not on assertion. A changed CWD/worktree or archived title alone does not certify integration.

### Critical path and parallel work after this wave

```text
MA01–MA06A completed structural foundation
WR02–WR03 + WR05S + WR05P1 + WR07C + WR07M + WR08A completed foundations
             |
        WR05P2 Done ---------> WR06 (active historical forks) ----+
             |                                                      |
             +--> WR07B (real durable Launch) <-- WR07N Done + WR07L Done |
                       |                                            |
                       +--> true Play UI and scripted acceptance ---+
                                                                    |
WR03 + Writer mission custody ------> WR04 (bounded research) ------+
                                                                    |
                      final monorepo/compat/graph closure <---------+
                                                                    |
                 end-to-end accepted --> merge to main --> retire dossier
```

**Near-term next owner for ChatGPT planning:** WR06 and WR07B have landed on the undertaking. Next planning is WR04 isolated research custody and the Living Writer choice route. The original WR04–WR08 packets predate the MA06A move, so their old source/T-ID instructions are **not safe to dispatch**.

### Meaning of “fully done” and genuine finish line

**Fully done is not “all packets archived” and not “green TypeScript.”** It means:

1. The user can create an authenticated story from a one-word prompt or prepared experience and reach an actual **persisted first playable scene**, including safe loss/retry/restart, source-root and provider-cost accountability.
2. Consequences and fictional time remain authoritative, every new scene has a faithful immutable v2 as-of record, and a player can view/fork an old scene **with still-active commitments**, without later parent-state contamination.
3. Writer missions genuinely use version-pinned Library/skills and optional bounded child research, obey private visibility, provider grants, finite spend and uncertain-delivery recovery; scripted tests pass and operational provider behavior is validated only with explicit funding authorization. Unfunded verification is recorded as unrun, not green.
4. The modular monolith reflects the accepted target in **real package/source dependency measurements**, remaining compatibility is purposeful and bounded, domain ownership and tests are comprehensible, and refactor-caused regressions are fixed. Pre-existing failures are triaged with precise acceptance implications, not silently waved through.
5. Documentation and ledgers reflect the tested result, remaining Change/Design artifacts are retired or explicitly disposed, the undertaking branch is reconciled and **merged to `main`** with no lost work, and the Undertaking dossier and extra long-lived branch are retired according to the recorded lifecycle.

**Critical new acceptance gate (source-audited 2026-11-21):** WR07N Writer-v2 opening `choice.v1` is *display-only*. Existing `storyteller/admission.ts` requires a legacy Storyteller generation, so Writer buttons cannot be clicked through the current route. WR07B may certify a durable **readable first scene** only, with no dead clickable offers; the later **Living Writer** macro Change must deliver a **world-neutral actual intent→scene-2→scene-3** path and genuine provider/research. The upcoming packet's playability correction is binding; see the wider design on planning branch `planning/workshop-outcome-waves` in `work/undertakings/storyteller-workshop/PLAYABILITY-SEAM-AUDIT.md`. This is not a reason to fabricate a legacy generation or humanoid character.

**Standing scope rule:** completion of all five is required for a whole-undertaking Done claim. If the owner explicitly chooses to defer a major capability (especially WR04 or funded real-provider validation), record a narrowed acceptance contract and say **“closed with deferred scope”**, not “fully implemented.” Final cleanup is a bounded follow-up after gameplay stabilizes, not a license for another endless package reorganization.

## What belongs here

The current Writer program is the core constituent set:

| Work | Role in the undertaking | Current disposition at undertaking start |
| --- | --- | --- |
| WR01 | Accept Storyteller and fork product contract | Done / archived |
| WRD02 | Persistent Library technical contract | Done / archived |
| WRD03 | Engine fork technical contract | Done / archived |
| WRD04 | Wiki navigation and validation reconciliation | Done / archived |
| WR02 | Persistent Library and source identity implementation | **Done / archived** |
| WR03 | Agentic writer's workdesk | Done / archived |
| WR04 | Delegated bounded writer research | Done, provider-free |
| WR05 | Coherent scene publication | Proposed |
| WR06 | Fork active fictional state | Proposed |
| WR07 | One-prompt launch backend | Done, scripted first scene, not on main |
| WR08 | One-prompt client and scripted first choice | **Done / archived**. Gated Play, scripted opening offer, writer.scene.v1 wake. Not on main. Live model not claimed |

The existing [Writer implementation program](PROGRAM.md) remains the detailed sequencing owner. This undertaking does not replace it.

## Integration provenance

This branch descends from the four-commit squashed integration previously named `storyteller-evolution-consolidated`.

That integration intentionally absorbed two noisy source histories without replaying them into the new branch:

- Storyteller documentation snapshot: `d500f8ceb0eee7c8f82c8ff5f2cc02273da86639` from the former `storyteller-evolution-electric-boogaloo` branch.
- Repository/design retirement snapshot: `f6d860301f098eb6b0dd326ebef99f8cbb1de4b5` from the former `maintenance/retire-work-graveyard-2026-11-21` branch.

The squashed integration commits preserve exact provenance back to those source SHAs. The old branch names are therefore not required for ongoing work once branch cleanup is complete.

## Explicit exclusions

This undertaking is **not** a generic bucket for every open Offscreen RPG packet. In particular, unrelated distributed-runtime/Kubernetes work, broad player-experience refoundation, economy/spatial/lifecourse proposals and repository-agent experiments do not join merely because they touch adjacent files.

If a prerequisite outside this scope is discovered, reference it as a dependency. Do not silently annex its entire program.

## Exit conditions

Move this Undertaking to **Landing** when:

1. the selected WR02–WR08 implementation scope intended for this wave has reached explicit terminal or intentionally deferred dispositions;
2. permanent product/technical docs describe the accepted result without relying on the Undertaking dossier as authority;
3. `work/QUEUE.md`, `STATUS.md`, `ROADMAP.md` and relevant ledgers no longer contain contradictory state;
4. repository health/tests required by the affected Changes are green or failures are explicitly documented;
5. no temporary source branch contains unique unreconciled work.

Close only when actual outcome is accepted or explicitly abandoned. Branch promotion alone does not close the dossier; retain old branch until local migration is verified. Do not leave a permanent “completed undertaking” graveyard in HEAD.

## Branch policy for this undertaking

Target **long-lived** topology after Change integration: **two branches only**:

- `main`
- `undertaking/storyteller-workshop`

**Every commissioned WR Change MUST use one short-lived Change branch** created from the then-current `undertaking/storyteller-workshop` HEAD before implementation. Branch names: `change/wr02-library`, `change/wr03-workdesk`, `change/wr04-research`, `change/wr05-publication`, `change/wr06-fork`, `change/wr07-launch`, `change/wr08-client`. Parent and its children work within that branch without per-T-ID branches. Each commissioned WR Change uses a separate linked Git worktree even if no other chat is active. Preserve the user's primary checkout on its existing branch. When accepted, squash-integrate into `undertaking/storyteller-workshop`, verify, and delete the temporary branch/worktree. `main` is reserved for the later Undertaking landing. These transient Change branches do not contradict the two-long-lived-branches policy.

## 2026-11-24 | Cache platform design

[Selected architecture](../../../docs/technical/platform/persistence-and-caching.md) and [CACHE01–CACHE07](../../changes/README.md#cache-platform-redesign) (including CACHE06A/B). [Parallel DAG and frozen interfaces](CACHE-PARALLEL.md): CACHE01–CACHE03, CACHE05, CACHE06A, and CACHE06B are Done source-only. CACHE04 source is joined and its SQL suite remains NOT-RUN. CACHE07 source harness is implemented; live execution still requires explicit disposable local Docker Redis authorization. No live Redis proof and no queue change. Overview estimates unchanged.

**2026-11-25 Redis exploration:** [INF58–INF60](REDIS-INFRASTRUCTURE.md) owner-commissioned source only; INF58 and INF59 parallel, INF60 gated. No queue change, no live permission or outcome credit. Hosted security and topology decisions held for planner, not delegated.

- 2026-11-25 [Cache craftsmanship wave](CACHE-CRAFT.md): CACHE09 source Done (navigation/test names; 93/93; live NOT-RUN); CACHE10 source Done (memory/single-flight/tier readability; 106/106 after CACHE11 refresh; live NOT-RUN); CACHE11 source Done (redis/ owners, envelope + command executor; 98/98; live NOT-RUN); CQ06 source Done (advisory code-health diagnostics; 39/39; live NOT-RUN); CACHE12 held for caller migration design. VER07/08 independent; no live/outcome credit. Estimates remain ~75/40/30/45 with broad uncertainty.

- 2026-11-25 [DB craftsmanship wave](DB-CRAFT.md): DB11–DB14 source Done (DB14 admission telemetry/probe navigation; 106/106; live NOT-RUN). Post-commit admission-deadline contract remains planner work. DB10 live NOT-RUN; VER04/05 independent; DBOPS01 metadata held. No new outcome credit; estimates ~75/40/30/45 with broad uncertainty.

- 2026-11-25 [DB operations programme](DB-OPERATIONS.md): DBOPS03 source Done (catalog/CLI/loopback target guard; live NOT-RUN); DBOPS04 source Done (enroll/ledger/atomic plan-status-run; 60/60; live NOT-RUN); DBOPS05 source Done (batched runner/resume/CLI bounds; 86/86; live NOT-RUN); DBOPS06 source Done (offline `review:change`; 16/16; live NOT-RUN). No hosted IAM, no live permission. DBOPS01 remains backlog. No outcome credit; estimates ~75/40/30/45 (broad uncertainty).

**2026-11-25 Temporal infrastructure:** [INF61](../changes/archive/2026-11/platform-operations/2026-11-25--inf61-temporal-chart-ownership/CHANGE.md) source Done (render 6/6; live NOT-RUN); [INF62](../changes/archive/2026-11/platform-operations/2026-11-25--inf62-temporal-bootstrap-verification/CHANGE.md) source Done (honest SQL existence gates; 49/49 with schema-policy; live NOT-RUN); [INF63](../changes/archive/2026-11/platform-operations/2026-11-25--inf63-temporal-explicit-ownership/CHANGE.md) source Done (36/36; live NOT-RUN). Preserve embedded PG and existing tenants until reviewed cutover; no queue change or live/outcome credit. INF64–69 planner-held.

2026-11-25: [Temporal corrective wave](TEMPORAL-INFRASTRUCTURE.md) INF70–71 source-only; SQL authentication and executor refusal defects from post-integration audit. No live or completion credit.
