# DISTURN | One genuine distributed Storyteller turn on Kubernetes

**Status:** gap inventory and integration-program design, 2026-11-19; **not** an authorized implementation Change, a revised game rule, or proof that a complete runtime is deployed. This initiative answers *what still must be designed and joined* before a real, stateful Storyteller turn can run on the new platform. Cursor implements only explicitly selected bounded Changes from [the queue](../../../changes/README.md). [Gap register and decision gates](GAPS.md) is the working checklist. As each gap is solved, update the **canonical** product/technical owner rather than treating this page as a second architecture bible.

## One acceptance target

From a browser and an authenticated account, create/start a **solo** campaign using a pinned, deliberately small authored world/rules/start package; read its first published scene; choose one supported D&D-style intention; observe **one persisted mechanical/command consequence** and **one task-driven Storyteller continuation** on independently deployed Kubernetes workloads; publish the validated new scene and canonical-document changes; receive a live hint, read the exact authorized result, inspect an earlier scene and **fork from that historical scene** without inheriting later mechanical or descriptive state. Refresh/restart/reconcile the same state. No full D&D edition or universal economy required.

For a useful first real POC, the authored start may replace expensive freeform opening generation. The *continuation* must pass through the genuine Storyteller task/validation/publication contract. Build a repeatable **fake-provider lane** first, then run the *same* contract with a real LLM only under separate explicit user authorization, spending ceiling and provider-custody checks. Passing fake generation is not evidence of live model quality. Full historical arbitrary-scene forking remains the selected target; first integrated demonstration must prove at least one non-current checkpoint and use a mechanism not hardcoded to a passage number.

**Required runtime split:** browser → Gateway → independent Next.js and NestJS Pods → an independently deployed **Game Authority** boundary and **Storyteller execution** boundary (the precise RPC/Temporal topology is still open). At least one real business event crosses RabbitMQ; Temporal owns at least one meaningful durable continuation, rather than both being decorative. PostgreSQL owns committed authority; S3-compatible storage holds immutable canonical objects; Redis is optional cache, never the record. The scene-publish path must join durable game-state checkpoint and canonical root, not ask two services for best-effort latest state. No Economy service.

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
  -> SQL transaction: receipt/typed effects/outbox; no LLM under lock
  -> RabbitMQ durable dispatch/consumer [exact topic + handoff TBD]
  -> Temporal workflow + separately deployed Storyteller worker [choreography TBD]
  -> capture branch-scoped state/root + role/task/version + bounded tools
  -> fake provider, then gated real model: proposal (passage/options/canon patches)
  -> validate proposal and mechanical/visibility/document revision fences
  -> stage immutable source + canonical objects in S3-compatible store
  -> Game Authority atomic publish: source refs, state checkpoint/root,
     next offer, stable receipt and viewVersion + outbox
  -> SSE invalidation hint -> authenticated Nest GET
  -> React/TanStack Query renders new Living Book scene
  -> historical GET and fork use scene-1 state/root, not scene-2 latest
```

**Causal chain is a design target, not proof of a specific RabbitMQ→Temporal bridge**. In particular, avoid blindly dispatching one command through two unrelated retry owners or pretending RabbitMQ delivery is a SQL commit. ARCH02 must ratify command/event/workflow identity and who performs the unique authoritative write. Task capture may be after mechanical settlement; the application must preserve a visible pending/uncertain state rather than inventing an already-completed scene.

## Grounded current-source inventory

The checked-in user archive `offscreen-rpg-lean-a00a5beb6b49-20261119T123009119Z.zip` is a **dated source baseline**, not today's full GitHub HEAD. The more recent GitHub queue at 2026-11-19 records **ARCH01, K8S01, K8S02 and K8S04 Done**; K8S03 and K8S09 were the authorized parallel Cursor batch, and ARCH02's branch was not yet merged. The hardware/cluster may have been torn down after each operator proof. Recheck active branch/HEAD, deployed runtime and real test receipts before any implementation or new status statement.

Evidence of *existing reusable code* in the archive:
- `apps/web`: Next.js SSR, React/TanStack Query, Story read/action/recovery and EventSource→GET; `apps/api`: Nest, auth, routes, stream hub and PostgreSQL LISTEN/NOTIFY.
- `packages/application/src/stories`: creation/initialization/fork, continuation, receipts and publication seams; `packages/game`: pure mechanics; `packages/db`: story, campaign, item, outbox, generation and Storyteller records.
- `packages/documents`: LocalDocumentStore **and S3DocumentStore** with typed immutable documents/manifests; `apps/api` and `apps/worker` both resolve `OFFSCREEN_DOCUMENT_STORE` configuration.
- `packages/application/src/storyteller` and `packages/storyteller`: capture, context, materialization, bounded memory exploration, task recipe, fake/OpenRouter provider and validation. Existing capability does not demonstrate correct months-long model recall.
- `apps/worker` and `packages/workflows`: existing SQL-outbox→Temporal dispatch, workflow activities; **not** a RabbitMQ integration.
- `story.documentRootHash` is latest; `story_document_commit` records roots per document operation; `story_passage` records passage content/source, but current general passage history does not own the **complete historic game-state + canon-root pair**. The current fork implementation explicitly rejects most past revisions.

**Existing code is not a license to copy shared database writes into every microservice.** The migration strategy must preserve one admitted mechanical/state authority and one committed publication boundary while changing process and network topology.

## Gaps: what must be decided before the first runnable turn

[**GAPS.md**](GAPS.md) is the authoritative inventory of *unresolved integration work*. Each row has an ID, current evidence, the missing contract or executable stitch, suggested owner, dependency and falsifiable proof. Presence of an existing high-level Change does not mean its implementation instructions are sufficiently specific.

A key threshold: **a bundle is ready for Cursor only when its Change names actual files/contracts/owners, wire state transitions, retry/rollback behavior, normal and negative tests, documentation updates, and its parallelizable peers.** Naming a container, queue, or 'canonical file' is not that threshold.

## Planned design sequence across upcoming ChatGPT turns

| Pass | Design outcome to ratify | Prerequisite | May be researched alongside |
| --- | --- | --- | --- |
| D1 · Runtime & authority | Service/process ownership, exact call/event/workflow choreography, command identity, transaction & publication owner, high-level sequence chart | ARCH02 source reconciliation; existing outbox/Temporal code | Kubernetes K8S03/05/06/09, read-only docs/storage study |
| D2 · Campaign and scene ledger | One supported campaign/start route; scene checkpoint v1; exact game state/canon root/offer identities, fork-at-N and as-of reads | D1's single transaction owner | Frontend route and package pin review |
| D3 · Canonical object lifecycle | S3 manifests, branch inheritance, write staging, atomic root pointer, crash recovery, GC and old-version visibility | D2 state/root tuple; ARCH03 | Docker image/release engineering |
| D4 · Storyteller operation | Role/task input and evidence packs, scoped read interface, fake/live adapter, proposal schema, admission and publication handshake | D1–D3 source contracts; ARCH05 | Offline fixture and prompt cost research |
| D5 · Kubernetes application release | Immutable app images, secrets, migration runner, namespace access, Gateway/SSR/SSE, independent service deployment and scaling | K8S infrastructure and D1–D4 APIs | Implementation in disjoint branches with coordinator |
| D6 · Integrated proof | scripted scene+choice+DM+canonical publish+SSE+historic fork, cross-service tracing, restart and duplicate negative probes | D1–D5 working in same cluster | Independent tests and runbooks |

These are **design passes**, not newly approved implementation Changes or assertions that the listed existing ARCH/K8S Changes are finished. Promote each pass into bounded documentation/implementation packets only after its contract is detailed; don't create 20 vague executables now. Each pass updates the permanent docs, test fixtures, operational runbooks and status as applicable.

## POC hard constraints

- A turn is not a scene, a browser page, a model round or a Temporal run. Fix their identities before wire protocols.
- An accepted HTTP `202` and an SSE event are **not** committed story truth. Authoritative GET is read-only.
- One branch's scene N must resolve its exact mechanical and canon roots; neither parent-future nor sibling updates are eligible.
- State and canonical documents cannot have two independently writable sources of truth. If a model proposes a fact, deterministic admission selects whether it becomes canon or a typed effect.
- Storage/object writes before database commit may be staged; uncommitted objects remain unreachable, and a crash cannot publish only half a scene.
- RabbitMQ and Temporal both need an explicit non-overlapping role. No event is assumed exactly-once; duplicate deliveries cannot repeat dice, document publication or provider charges.
- A model task may not directly mutate SQL or S3. Bounded read tools and validated proposals are the initial harness; Cognee/semantic graphs and Code Mode are not dependencies.
- The local lab is memory-constrained and disposable. Cold-cluster restoration, secrets, migrations and object durability must be tested; successful individual K8S component smoke tests are not a running integrated game.
- Existing selected product promises and realistic current statuses remain binding. No new NPC simulation, global economy, compulsory images or unapproved automated spending.

## Evidence needed to call the POC integrated

A recorded run must name cluster/tool versions, commit SHAs, container digests, database migration, storage roots and scripts. Capture a causal operation trace from authenticated input through gateway/API→authority→broker→workflow→Storyteller→S3 staged objects→SQL publication→SSE/GET, with unique IDs and no secrets. Verify two published scenes, one meaningful typed consequence, one source-backed canonical edit or deliberately unchanged record, and one **historical (non-current) fork** showing no later changes. Repeat after at least worker/API restart, missed SSE, redelivery and index loss; no paid model retries. The fake-provider proof is required; the live-provider proof is separately explicitly budgeted and labelled if/when performed.

This is not a 30/90-scene quality benchmark, high availability claim, production cost model or load test. Those are later goals.

## First executable planning bundle | DIST01–DIST06 (2026-11-19)

The first concrete dependency-aware packet series is in [Change queue](../../../changes/README.md#disturn--first-service-extraction-bundle-planned-2026-11-19). It is deliberately narrower than the full POC: ratify [D1 execution contract](D1-EXECUTION-CONTRACT.md) and ARCH02, create versioned broker/Temporal adapters, prove one private Game Authority boundary, wire a selected durable Rabbit delivery, extract a Storyteller execution-only worker, and run a provider-free distributed continuation. Only **then** create the detailed per-scene historical snapshot/fork, canonical object lifecycle, and role-context implementation packets needed for *complete* DISTURN acceptance. The existing active K8S batch remains selected; these new packets are not automatically executable. In particular, DIST06 does not claim historical arbitrary-scene fork success.


## Second design bundle | Scene checkpoints and fork-safe documents

[D2 candidate scene-state contract](D2-SCENE-DATA-CONTRACT.md) and [DATA01–06 queue](../../../changes/README.md#disturn--scene-state-and-canonical-knowledge-bundle-planned-2026-11-19) define the next real implementation gap set. The POC does not switch mechanical authority from SQL to Markdown. A committed scene points to exact immutable state representation **and** correct canonical manifest root; forks reuse eligible historical roots with explicit campaign identity semantics. Current source already includes immutable document manifests and S3 adapters, but no scene-complete historical checkpoint. DATA03 deliberately records the tension between post-effect SQL transaction state and pre-staged S3 objects. No author may claim atomic scene checkpoint completion without resolving that tension and testing crash boundaries.

**Further source-level design pass:** campaign/start bootstrap and exact package permissions, plus GA-to-Storyteller attempt/reference transport and a complete end-to-end post-fork proof. Keep image generation, commercial Stripe billing and full chaos/HA deferred in [GAPS](GAPS.md#defer-deliberately-but-do-not-lose-the-work).

## Third design bundle | Campaign creation and source package admission

[D3 campaign bootstrap architecture](D3-CAMPAIGN-BOOTSTRAP.md) and [BOOT01–04](../../../changes/README.md#disturn--campaign-bootstrap-bundle-planned-2026-11-19) cover authenticated draft/candidate, pinned world/rule/start documents, controlled cluster import, Game Authority's first-scene SQL transaction, source/scene-1 checkpoint and initial browser render. **Important observed source requirement:** the start package is not itself the opening candidate; use the existing successful candidate route (scripted/offline for POC). Preserve both existing creation routes in product and code. BOOT02 and BOOT03 are parallelizable only after shared BOOT01 ownership decisions, and BOOT03 must integrate with DATA03's scene-1 checkpoint writer.

**Next separate design:** Storyteller task capture, fake/live provider adapter custody, bounded role-context read and validated proposal→Game Authority publication. Then one full integrated post-fork acceptance with precise failure/unknown status. No automatic execution of the BOOT packets.

## Fourth design bundle | Storyteller task custody and publication

[D4 remote Storyteller handoff](D4-STORYTELLER-HANDOFF.md) and [STORY01–04](../../../changes/README.md#disturn--storyteller-execution-and-publication-bundle-planned-2026-11-19) specify how an independently deployed Storyteller executor receives a frozen authorized task, retains one attempt/provider result and returns a proposal for GA validation and scene publication. The existing `completeStoryteller` Temporal Activity **currently performs execution and publication together**; the new plan introduces distinct versioned phases rather than pretending that is already split. Existing billing/usage ledgers are reused, not recreated. STORY03 must reconcile with DIST05's overlapping worker extraction, and STORY04 with DIST06's distributed-turn fixture. No automatic model spend or execution is authorized.

**Next design:** one full POC release and proof gate combining BOOT04 first-scene, DATA04 historical fork, STORY04 continuation, K8S networking/storage and a real-model opt-in gate; compact all source checks into a single reproducible evidence harness. Defer later product capabilities in the gap register.
