# DISTURN | superseded distributed turn design

**Terminal owner disposition (2026-11-27): Superseded.** All twelve documents retained as historical research and evidence; legacy topology-specific proposals, scripted fixture, dependency gates and execution schedules retired following TURN03 cancellation and DIST03 supersession. No new PASS, implementation commission or live permission. Future topology, task protocol, state representation and acceptance derive from the redesigned monorepo and Agent Core; do not replay these proposals as requirements. Existing source untouched. Preserve authoritative mutation ownership, actor/tenant authorization, durable atomic state/publication integrity, historical and fork fidelity where supported, idempotency, financial safeguards, private credential custody and truthful recovery. [Verification capabilities](../../../../infra/verification/CAPABILITIES.md) · [Original complete dossier](https://github.com/DenisSkulovic/offscreen-rpg/tree/35f2c8b0d75f5088bb11c01725735505be47ae1f/work/designs/open/distributed-turn-poc). All earlier status and instructions below are historical.

**Implementation disposition (2026-11-20):** DIST02 and [DIST04](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--dist04-rabbitmq-temporal-live-handoff/CHANGE.md) were **Cancelled, not Done**: no independently needed Rabbit postcommit consumer was selected, and RabbitMQ→Temporal was already superseded. The K8S03 Rabbit lab remains educational; playable TURN02/TURN03 uses direct SQL-outbox→Temporal.

**Status:** gap inventory and integration-program design, 2026-11-19; **not** an authorized implementation Change, a revised game rule, or proof that a complete runtime is deployed. This initiative answers *what still must be designed and joined* before a real, stateful Storyteller turn can run on the new platform. Cursor implements only explicitly selected bounded Changes from [the queue](../../../changes/README.md). [Gap register and decision gates](GAPS.md) is the working checklist. As each gap is solved, update the **canonical** product/technical owner rather than treating this page as a second architecture bible.

**Planning reconciliation (baseline `4447114b7c951696576a50efe74aae5ecbdec9f2`):** [Execution reconciliation](EXECUTION-RECONCILIATION-2026-11-19.md) matches merged ARCH02. A workflow wake is the PostgreSQL outbox delivered by a direct Temporal RPC. RabbitMQ is an optional post-commit fact for an independent consumer, not the Storyteller wake and not the SSE stream. Superseded: the early illustrative RabbitMQ→Temporal path. The queue records ARCH02, ARCH03, ARCH04, ARCH05, K8S03, K8S05, K8S06, K8S07, K8S09, and DATA01 as merged. K8S06 proved a disposable Temporal 1.32.2 laboratory and deleted the cluster. That laboratory is not the Compose development server and not the game workflow. At that earlier 4447114 baseline DATA02 was not yet merged. At current-head `584b594`, DATA02/03 schema+publication checkpoint slices are merged and DATA04 historical read/fork code has landed; this is **not** connected kind proof. This page does not declare an active batch. The queue still has two current-tense active-batch sentences; the orchestrator owns that edit.

**Current-head audit (baseline `584b594`, 2026-11-19):** [POC readiness and actual source seams](POC-READINESS-AUDIT-2026-11-19.md) reconciles today's partial Game Authority, custody, checkpoint/fork and Kubernetes lab code. [Cursor next-day handoff](CURSOR-HANDOFF-2026-11-19.md) is the short entrypoint into existing Changes; [packet profiles](../../../../.agents/references/change-packet-profiles.md) prescribe planner-owned deep notes without child-agent preload. **No real multi-Pod campaign was run by this planning pass.** The earlier notes below marked their original source baselines and must not be read as a 584b594 status snapshot.\n\n**Golden fixture decision (2026-11-20):** [Quiescent first historical fork, mechanical checkpoint v2 later](DECISION-2026-11-20--GOLDEN-FORK-SCOPE.md). The TURN03 Harbor-watch start-package helper currently contains an executable obligation despite request `worldObligations: []`, making its scene-1 checkpoint ineligible for v1. Repair TURN03's *golden fixture* to be genuinely quiescent, preserve separate BOOT03 mechanical/obligation tests, and keep active-work any-scene forks as a future v2 design. This is a POC acceptance decision, not an implementation pass or product-promise reduction.

## One acceptance target

From a browser and an authenticated account, create/start a **solo** campaign using a pinned, deliberately small authored world/rules/start package; read its first published scene; choose one supported D&D-style intention; observe **one persisted mechanical/command consequence** and **one task-driven Storyteller continuation** on independently deployed Kubernetes workloads; publish the validated new scene and canonical-document changes; receive a live hint, read the exact authorized result, inspect an earlier scene and **fork from that historical scene** without inheriting later mechanical or descriptive state. Refresh/restart/reconcile the same state. No full D&D edition or universal economy required.

For a useful first real POC, the authored start may replace expensive freeform opening generation. The *continuation* must pass through the genuine Storyteller task/validation/publication contract. Build a repeatable **fake-provider lane** first, then run the *same* contract with a real LLM only under separate explicit user authorization, spending ceiling and provider-custody checks. Passing fake generation is not evidence of live model quality. Full historical arbitrary-scene forking remains the selected target; first integrated demonstration must prove at least one non-current checkpoint and use a mechanism not hardcoded to a passage number.

**Required runtime split:** browser, then Gateway, then independent Next.js and NestJS Pods, then one writer boundary and one Storyteller execution boundary. The wake topology is not open: the PostgreSQL outbox calls Temporal directly. Temporal owns the durable continuation. A RabbitMQ business event is optional and is not required to finish the turn. PostgreSQL owns committed authority. S3-compatible storage holds immutable canonical objects. Redis is an optional cache, never the record. The scene-publish path joins the engine's checkpoint and the canonical root. The Storyteller does not own that checkpoint. The SSE hint is not a broker message. There is no Game Economy service.

## The candidate end-to-end causal chain (not yet a ratified wire protocol)

```text
browser / Next SSR
  -> Nest identity/session + owned campaign read
  -> create draft or select authored start package
  -> package/rule pins + initial canonical object staging
  -> Game Authority: admit and commit campaign/start + scene-1 checkpoint/root
  -> Nest GET -> Living Book (first scene)

browser POST choice (frozen operationId + expected revision)
  -> Nest auth/DTO; Game Authority admits authoritative command
  -> SQL transaction: receipt/typed effects/outbox wake; no LLM under lock
  -> direct Temporal RPC (RabbitMQ is not this hop)
  -> Temporal workflow + Storyteller worker
  -> capture branch-scoped state/root + role/task/version + bounded tools
  -> fake provider, then gated real model: proposal (passage/options/canon patches)
  -> validate proposal and mechanical/visibility/document revision fences
  -> stage immutable source + canonical objects in S3-compatible store
  -> Game Authority atomic publish: source refs, state checkpoint/root,
     next offer, stable receipt and viewVersion + outbox
  -> optional post-commit fact for a separately selected consumer; absence does not block the turn
  -> SSE hint by PostgreSQL LISTEN/NOTIFY, not RabbitMQ -> authenticated Nest GET
  -> React/TanStack Query renders new Living Book scene
  -> historical GET and fork use scene-1 state/root, not scene-2 latest
```

**The causal chain is a design target.** It is not a deployed game, and it is not permission to build a broker wake. Superseded: a RabbitMQ→Temporal bridge on the story command. A broker delivery is not a SQL commit. ARCH02 has already ratified the three delivery classes and the engine as the checkpoint boundary. Task capture may follow mechanical settlement. The application keeps a visible pending or uncertain state instead of inventing a finished scene. A consumer that lags does not block publication or GET.

## Grounded current-source inventory

The checked-in user archive `offscreen-rpg-lean-a00a5beb6b49-20261119T123009119Z.zip` is a **dated source baseline**, not the full repository. Superseded reading of that older zip: K8S03 and K8S09 were the authorized parallel batch, and ARCH02's branch was not yet merged. At baseline `4447114b7c951696576a50efe74aae5ecbdec9f2` those three are merged, and each laboratory cluster was deleted after its proof. A missing archived file inside a later lean zip is an export exclusion, not evidence that the repository lost history. Recheck the queue before any new status sentence. The game is not deployed on Kubernetes.

Evidence of *existing reusable code* in the archive:
- `apps/web`: Next.js SSR, React/TanStack Query, Story read/action/recovery and EventSource→GET; `apps/api`: Nest, auth, routes, stream hub and PostgreSQL LISTEN/NOTIFY.
- `packages/application/src/stories`: creation/initialization/fork, continuation, receipts and publication seams; `packages/game`: pure mechanics; `packages/db`: story, campaign, item, outbox, generation and Storyteller records.
- `packages/documents`: LocalDocumentStore **and S3DocumentStore** with typed immutable documents/manifests; `apps/api` and `apps/worker` both resolve `OFFSCREEN_DOCUMENT_STORE` configuration.
- `packages/application/src/storyteller` and `packages/storyteller`: capture, context, materialization, bounded memory exploration, task recipe, fake/OpenRouter provider and validation. Existing capability does not demonstrate correct months-long model recall.
- `apps/worker` and `packages/workflows`: existing SQL-outbox→Temporal dispatch, workflow activities; **not** a RabbitMQ integration.
- `story.documentRootHash` is latest; `story_document_commit` records roots per document operation; `story_passage` records passage content/source, but current general passage history does not own the **complete historic game-state + canon-root pair**. At the older snapshot fork access was sharply limited. At `584b594`, `createStoryForks.fork` reads a requested historical checkpoint and supports a source-backed **quiescent** historical fork; active-work checkpoint remapping and deployed cross-Pod continuation remain unproven.

**Existing code is not a license to copy shared database writes into every microservice.** The migration strategy must preserve one admitted mechanical/state authority and one committed publication boundary while changing process and network topology.

## Gaps: what must be decided before the first runnable turn

[**GAPS.md**](GAPS.md) is the authoritative inventory of *unresolved integration work*. Each row has an ID, current evidence, the missing contract or executable stitch, suggested owner, dependency and falsifiable proof. Presence of an existing high-level Change does not mean its implementation instructions are sufficiently specific.

A key threshold: **a bundle is ready for Cursor only when its Change names actual files/contracts/owners, wire state transitions, retry/rollback behavior, normal and negative tests, documentation updates, and its parallelizable peers.** Naming a container, queue, or 'canonical file' is not that threshold.

## Planned design sequence across upcoming ChatGPT turns

| Pass | Design outcome to ratify | Prerequisite | May be researched alongside |
| --- | --- | --- | --- |
| D1 · Runtime and authority | Writer ownership, the direct outbox-to-Temporal wake, command identity, and the publication owner. RabbitMQ is not the wake | ARCH02 merged; remaining notes stay in DIST01 | Read-only comparison with the deleted K8S03, K8S06, and K8S09 laboratories |
| D2 · Campaign and scene ledger | One supported campaign/start route; scene checkpoint v1; exact game state/canon root/offer identities, fork-at-N and as-of reads | D1's single transaction owner | Frontend route and package pin review |
| D3 · Canonical object lifecycle | S3 manifests, branch inheritance, write staging, atomic root pointer, crash recovery, GC and old-version visibility | D2 state/root tuple; ARCH03 | Docker image/release engineering |
| D4 · Storyteller operation | Role/task input and evidence packs, scoped read interface, fake/live adapter, proposal schema, admission and publication handshake | D1–D3 source contracts; ARCH05 | Offline fixture and prompt cost research |
| D5 · Kubernetes application release | Immutable app images, secrets, migration runner, namespace access, Gateway/SSR/SSE, independent service deployment and scaling | K8S infrastructure and D1–D4 APIs | Implementation in disjoint branches with coordinator |
| D6 · Integrated proof | scripted scene+choice+DM+canonical publish+SSE+historic fork, cross-service tracing, restart and duplicate negative probes | D1–D5 working in same cluster | Independent tests and runbooks |

These rows are **design passes**, not implementation orders. Merged laboratory proofs are not a deployed game, and they are not a finished checkpoint. Promote a pass into a bounded packet only after its contract is detailed. Each pass updates the permanent owner when a claim actually changes.

## POC hard constraints

- A turn is not a scene, a browser page, a model round or a Temporal run. Fix their identities before wire protocols.
- An accepted HTTP `202` and an SSE event are **not** committed story truth. Authoritative GET is read-only.
- One branch's scene N must resolve its exact mechanical and canon roots; neither parent-future nor sibling updates are eligible.
- State and canonical documents cannot have two independently writable sources of truth. If a model proposes a fact, deterministic admission selects whether it becomes canon or a typed effect.
- Storage/object writes before database commit may be staged; uncommitted objects remain unreachable, and a crash cannot publish only half a scene.
- Temporal wakes from the SQL outbox. RabbitMQ, if a consumer is later selected, carries only a post-commit fact and must tolerate duplicates. A duplicate cannot repeat dice, publication, or a provider charge. The broker is not required for the turn. The SSE stream stays off RabbitMQ.
- A model task may not directly mutate SQL or S3. Bounded read tools and validated proposals are the initial harness; Cognee/semantic graphs and Code Mode are not dependencies.
- The local lab is memory-constrained and disposable. Cold-cluster restoration, secrets, migrations and object durability must be tested; successful individual K8S component smoke tests are not a running integrated game.
- Existing selected product promises and realistic current statuses remain binding. No new NPC simulation, global economy, compulsory images or unapproved automated spending.

## Evidence needed to call the POC integrated

A recorded run must name cluster and tool versions, commit SHAs, container digests, the database migration, storage roots, and scripts. The causal trace runs from authenticated input through the gateway and API, the writer, the SQL outbox, a direct Temporal RPC, the Storyteller, staged objects, SQL publication, and SSE/GET. A broker hop is not part of that trace unless a consumer was separately selected, and then it is a side observation. Verify two published scenes, one meaningful typed consequence, one source-backed canonical edit or a deliberately unchanged record, and one historical fork that shows no later parent changes. Repeat after a worker or API restart, a missed SSE hint, and a duplicate wake. No paid model retries. The fake-provider proof is required. A live-provider proof is a separate budget and is not claimed here.

This is not a 30/90-scene quality benchmark, high availability claim, production cost model or load test. Those are later goals.

## First executable planning bundle | DIST01–DIST06 (2026-11-19)

The first concrete dependency-aware packet series is in the [Change queue](../../../changes/README.md#disturn--first-service-extraction-bundle-planned-2026-11-19). It is narrower than the full POC: keep [D1](D1-EXECUTION-CONTRACT.md) aligned with merged ARCH02, prove one private writer boundary, leave the Temporal wake on the direct RPC, and treat DIST02 (since Cancelled for no consumer) as closed historical context and DIST04 as a Cancelled consumerless projection (future consumer requires a new Change), never a broker wake. A Storyteller execution-only worker and a provider-free continuation remain later packets. They are not automatically executable. DIST06 does not claim a historical arbitrary-scene fork. This paragraph does not declare an active batch.


## Second design bundle | Scene checkpoints and fork-safe documents

[D2 candidate scene-state contract](D2-SCENE-DATA-CONTRACT.md) and [DATA01–06 queue](../../../changes/README.md#disturn--scene-state-and-canonical-knowledge-bundle-planned-2026-11-19) define the next real implementation gap set. The POC does not switch mechanical authority from SQL to Markdown. A committed scene points to exact immutable state representation **and** correct canonical manifest root; forks reuse eligible historical roots with explicit campaign identity semantics. Current source already includes immutable document manifests and S3 adapters, but no scene-complete historical checkpoint. DATA03 deliberately records the tension between post-effect SQL transaction state and pre-staged S3 objects. No author may claim atomic scene checkpoint completion without resolving that tension and testing crash boundaries.

**Further source-level design pass:** campaign/start bootstrap and exact package permissions, plus GA-to-Storyteller attempt/reference transport and a complete end-to-end post-fork proof. Keep image generation, commercial Stripe billing and full chaos/HA deferred in [GAPS](GAPS.md#defer-deliberately-but-do-not-lose-the-work).

## Third design bundle | Campaign creation and source package admission

[D3 campaign bootstrap architecture](D3-CAMPAIGN-BOOTSTRAP.md) and [BOOT01–04](../../../changes/README.md#disturn--campaign-bootstrap-bundle-planned-2026-11-19) cover authenticated draft/candidate, pinned world/rule/start documents, controlled cluster import, Game Authority's first-scene SQL transaction, source/scene-1 checkpoint and initial browser render. **Important observed source requirement:** the start package is not itself the opening candidate; use the existing successful candidate route (scripted/offline for POC). Preserve both existing creation routes in product and code. BOOT02 and BOOT03 are parallelizable only after shared BOOT01 ownership decisions, and BOOT03 must integrate with DATA03's scene-1 checkpoint writer.

**Next separate design:** Storyteller task capture, fake/live provider adapter custody, bounded role-context read and validated proposal→Game Authority publication. Then one full integrated post-fork acceptance with precise failure/unknown status. No automatic execution of the BOOT packets.

## Fourth design bundle | Storyteller task custody and publication

[D4 remote Storyteller handoff](D4-STORYTELLER-HANDOFF.md) and [STORY01–04](../../../changes/README.md#disturn--storyteller-execution-and-publication-bundle-planned-2026-11-19) specify how an independently deployed Storyteller executor receives a frozen authorized task, retains one attempt/provider result and returns a proposal for GA validation and scene publication. The existing `completeStoryteller` Temporal Activity **currently performs execution and publication together**; the new plan introduces distinct versioned phases rather than pretending that is already split. Existing billing/usage ledgers are reused, not recreated. STORY03 must reconcile with DIST05's overlapping worker extraction, and STORY04 with DIST06's distributed-turn fixture. No automatic model spend or execution is authorized.

**Next design:** one full POC release and proof gate combining BOOT04 first-scene, DATA04 historical fork, STORY04 continuation, K8S networking/storage and a real-model opt-in gate; compact all source checks into a single reproducible evidence harness. Defer later product capabilities in the gap register.

## Fifth design bundle | Release, integration and final proof

[D5 release and acceptance](D5-RELEASE-AND-ACCEPTANCE.md) and [TURN01–04 packets](../../../changes/README.md#disturn--final-application-release-and-full-poc-acceptance-planned-2026-11-19) close the **planning coverage** for one fully connected distributed fake Storyteller turn and independent noncurrent fork: a fixture/scorecard, one actual Kubernetes application release, one consolidated end-to-end proof and optional separately funded real-model verification. This completes the *first-pass architecture and packet inventory*, **not the implementation or source-level contract ratification**. Existing DIST06/BOOT04/STORY04 and DATA04 feed TURN03; do not duplicate their tests. TURN04 is opt-in only with distinct owner approval. Deferred future images, Stripe, optional knowledge indexing, real-time collaboration and load/HA remain tracked in [GAPS](GAPS.md).

**Dependency reconciliation (2026-11-27):** TURN03 is cancelled. Historical requirements to pass its legacy scripted scenario are retired. Re-evaluate this work against the redesigned monorepo before owner selection; derive appropriate normal-path acceptance and resource/authority prerequisites from that architecture. This neither authorizes dispatch nor grants acceptance credit. Existing independent security and data-integrity requirements remain. [Historical TURN03](../../../changes/archive/2026-11/distributed/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md).
