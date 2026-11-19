# ARCH02 | Distributed service ownership and message delivery contract

**State:** Done (2026-11-19)
**Kind:** documentation
**Approval and owner:** Owner authorized this documentation Change on 2026-11-19. Cursor executes only ARCH02. ARCH01 is Done. No other Change is in scope.
**Parent:** [Distributed architecture lab queue](../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Topology](../../../../docs/technical/platform/topology.md), inspected at `4962e373`. Compose still runs PostgreSQL, Temporal dev, Redis, and an S3 mock. Apps are web, API, and worker.
>
> **Primary governing heading:** [Distributed learning target](../../../../docs/technical/platform/topology.md#distributed-learning-target) stays the laboratory contract. [Proposed service ownership](../../../../docs/technical/platform/topology.md#proposed-service-ownership) is the new proposed target. [Runtime shape](../../../../docs/technical/platform/topology.md#runtime-shape) stays the modular monolith.
>
> **Known trap:** A reader must not treat the seven named services as deployed or proven. A consumer replay cannot authorize a duplicate currency or inventory mutation. A shared logical PostgreSQL cluster does not grant shared schema writes.
>
> **Scope/permission:** Documentation only. No application extraction, no cluster commands, no provider call.

## Outcome and motivation

Ratify proposed service ownership for web/API, engine, storyteller, illustrations, economy, payments, and notifications. Separate authoritative commands, business events, and Temporal workflows. Say, for each proposed service, the authoritative data, incoming commands, produced events, dependents, and failure policy. Record outbox and inbox dedup, event ids, aggregate and version keys, schema evolution, and cross-service consistency. Classify direct HTTP, async broker events, and Temporal orchestration. Label each claim current runtime, proposed target, or proven.

The reader inference to fix: service names in the laboratory target are ownership rules for a later extraction, not a description of the running game and not new player features. The modular monolith on Compose remains the current runtime. No separate service is proven.

## Authority and baseline

- **Product:** [Vision](../../../../docs/product/foundations/vision.md) is unchanged. No new player mechanic, currency, inventory feature, or payment offer.
- **Technical:** [Runtime shape](../../../../docs/technical/platform/topology.md#runtime-shape), [Proposed service ownership](../../../../docs/technical/platform/topology.md#proposed-service-ownership), [Commands, business events, and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows), [Proposed service schemas and delivery records](../../../../docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records), [Service calls are not player routes](../../../../docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes), and [Technical contracts](../../../../docs/technical/README.md#technical-contracts).
- **Evidence / source:** Baseline `4962e373`. `compose.yaml` services are postgres, temporal (`server start-dev`), redis, and s3mock. `packages/db/src/schema/outbox.ts` is the notice table. `packages/application/src/stories/continuation.ts` returns before `applyStoryItemEffects` when the same transition id already matches. No source behavior changed.
- **Proposals / unknowns:** Processor vendor, real currency rules, image-provider choice, and production cluster sizing stay unratified. This packet does not select Stripe or a broker product as deployed.

## Exact scope and exclusions

- **Canonical document edits:** the five owners named above. New headings are proposed targets. Existing implemented chamber sections stay in place.
- **Executable source/tests/config:** unchanged. There is no intended code diff.
- **Related/inbound owners:** [Technical contracts](../../../../docs/technical/README.md#technical-contracts) gains question routes. `docs/runbooks/`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, `work/changes/ledger/`, and `docs/technical/platform/deployment-and-compatibility.md` are outside this packet's write set. The orchestrator updates the queue and ledger.
- **Preserve:** the modular monolith, the outbox-to-Temporal bridge, one mutable authority per scarce fact, Storyteller proposes and does not commit, and event-sourced microservices remain rejected.
- **Exclude:** Kubernetes manifests, kind, kubectl, helm, docker against a cluster, paid model calls, real payment calls, and application-code extraction.
- **Left alone:** `docs/technical/platform/data-and-persistence.md#implemented-item-transfer` still says item creation is outside that component. `applyStoryItemEffects` also accepts `item.create.v1`. This Change does not rewrite that realization record. `docs/technical/platform/deployment-and-compatibility.md`, runbooks, `STATUS.md`, `ROADMAP.md`, and the change queue were not edited.

## Acceptance and discriminating negative proof

- **Normal:** Every proposed service has authoritative data, incoming commands, produced events, dependents, and a failure policy. Message classes and transports are labeled current runtime, proposed target, or proven. No service row is proven as a separate process.
- **Negative:** A consumer replay cannot authorize a duplicate currency or inventory mutation. A shared logical PostgreSQL cluster does not grant shared schema writes.
- **Verification:** `pnpm wiki:change-guard --mode plan` and `--mode close`, plus `python3 scripts/check_docs.py` for Markdown links. Semantic review of the negative sentences. No game test was re-run.
- **Human decision gate:** none inside this write set. A later extraction still needs its own Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player-facing promise in docs/product/foundations/vision.md changes. A service name is not a new currency, inventory feature, or payment offer. | docs/product/README.md | Negative reading: a service name is not a mechanic |
| Technical | changed: docs/technical/platform/topology.md#proposed-service-ownership and docs/technical/platform/topology.md#runtime-shape, docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows, docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records, and docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes, with each claim labeled current runtime, proposed target, or proven. No separate service is proven. | docs/technical/platform/security-and-trust-boundaries.md#boundary-map | Source inspection at 4962e373, no code diff |
| Code | unchanged because no executable modification is authorized. The refusal of a duplicate currency or inventory mutation is written in the technical owners rather than implemented here. | compose.yaml and packages/db/src/schema/outbox.ts | Inspected diff has no executable files |
| Related | changed: docs/technical/README.md#technical-contracts gains question routes for ownership, message class, schema writes, replay, and player HTTP. Runbooks, STATUS.md, ROADMAP.md, work/changes/README.md, and docs/technical/platform/deployment-and-compatibility.md stay outside this write set. | Inbound queue links stay for the orchestrator | Link check on the owners this packet may edit |

## Handoff and next action

- Execute only this Change. Do not start another packet.
- After proof, fill the ledger, set Done, archive under `work/changes/archive/2026-11/other/`, and commit on this branch. Do not push. Do not edit the queue README or ledger.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/topology.md#runtime-shape | technical | changed: the diagram stays the current monolith and now points at proposed ownership without becoming that ownership | no source behavior changed; compose.yaml at 4962e373 | reviewed | Hosting the same processes on Kubernetes would still be one modular application | Heading stayed. The new section is the proposed target |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | changed: seven proposed services each name data, commands, events, dependents, and failure policy. None is proven as a separate process | no source behavior changed; compose.yaml and apps at 4962e373 | reviewed | A consumer replay cannot authorize a duplicate currency or inventory mutation. A shared logical PostgreSQL cluster does not grant shared schema writes | docs/technical/README.md#technical-contracts links here |
| docs/technical/platform/topology.md#distributed-learning-target | technical | changed: the laboratory paragraph now points at the ownership section and still says those processes are not extracted | no source behavior changed; compose.yaml at 4962e373 | reviewed | A diagram or a disposable cluster does not make the seven services the deployed game | Same page |
| docs/technical/platform/topology.md#what-handles-events-and-background-work | technical | changed: one sentence points at the message-class section. The mechanism table still has no application broker | no source behavior changed; compose.yaml at 4962e373 | reviewed | A laboratory broker message is still not a committed story fact | Points at docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | technical | unchanged: the outbox relay steps and the chamber bridge stay as written | no source behavior changed; packages/db/src/schema/outbox.ts at 4962e373 | reviewed | A duplicate start still does not create a second committed result | The new section says it does not replace this heading |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | changed: commands, business events, and Temporal workflows are separate, with HTTP, broker, and Temporal transports labeled | no source behavior changed; packages/application/src/stories/continuation.ts at 4962e373 | source-observed | A second delivery of the same command id returns the stored result. A replay cannot apply a second currency or inventory mutation | docs/technical/README.md#technical-contracts |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | technical | changed: one sentence points at the proposed schema section. PostgreSQL and Temporal ownership in the paragraph stay | no source behavior changed; compose.yaml at 4962e373 | reviewed | The pointer does not add the proposed tables to the current database | Same page |
| docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records | technical | changed: outbox, inbox, event id, aggregate key, version, schema versions, and cross-service consistency are specified as proposed except the current single database | no source behavior changed; packages/db/src/schema/outbox.ts at 4962e373 | source-observed | A shared logical PostgreSQL cluster does not grant shared schema writes. An inbox conflict does not run the mutation again | Linked from topology and the technical index |
| docs/technical/platform/data-and-persistence.md#quantities-and-ownership | technical | changed: one sentence keeps fictional balances and real-money processor state on different proposed owners. The one-authority rule stays | no source behavior changed; packages/application/src/stories/continuation.ts at 4962e373 | reviewed | Inventory currency stays distinct from the inference budget. Neither proposed schema exists now | Points at the ownership section |
| docs/technical/platform/data-and-persistence.md#selected-document-store | technical | unchanged: content-addressed bytes and the S3 adapter record stay as written, so illustrations do not become this store | no source behavior changed; compose.yaml at 4962e373 | reviewed | Object storage is not the story transaction | security-and-trust-boundaries.md still cites this heading |
| docs/technical/platform/http-api-and-client-contracts.md#authenticated-actor-scope | technical | unchanged: owner-scoped 401 and 404 stay the inspected player rule | no source behavior changed; no handler edit at 4962e373 | reviewed | HTTP 404 is still not another user's row | security boundary map still cites this heading |
| docs/technical/platform/http-api-and-client-contracts.md#accepted-response-versus-committed-world | technical | unchanged: HTTP 202 remains an accepted snapshot, not a committed world | no source behavior changed; no handler edit at 4962e373 | reviewed | A 202 body is still not the settled world | security boundary map still cites this heading |
| docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints | technical | unchanged: GET stays the scene and an SSE hint stays an invalidation | no source behavior changed; no handler edit at 4962e373 | reviewed | A hint payload is still not a passage | security boundary map still cites this heading |
| docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | technical | changed: a later service command is direct HTTP to that owner and is not a new player route | no source behavior changed; no route added at 4962e373 | reviewed | A fresh player operation id is not an economy causation id and cannot apply a second inventory or currency write | docs/technical/README.md#technical-contracts |
| docs/technical/README.md#technical-contracts | technical | changed: question routes now land on the ownership, delivery, schema, replay, and player-HTTP headings | no source behavior changed; compose.yaml at 4962e373 | reviewed | The routes say the seven services are not proven and the monolith remains current | New rows beside the laboratory question |
| docs/technical/platform/security-and-trust-boundaries.md#boundary-map | technical | unchanged: this dependent still takes 401, 202, GET, and the document store from the headings that were not rewritten | no source behavior changed; no edit to this page at 4962e373 | reviewed | The map still cannot call a 202 a committed world or an SSE hint a scene | No edit. Contract rows still resolve |
| docs/technical/platform/notifications.md#delivery-flow | technical | unchanged: the selected delivery design stays on this page. Notifications in the new table point here and do not replace it | no source behavior changed; no edit to this page at 4962e373 | reviewed | A notification is still not command authority | Topology links this heading |
| docs/technical/platform/spending-and-entitlements.md#distinct-authorities | technical | unchanged: inference spending stays here. Payments in the new table do not choose a processor or a price | no source behavior changed; no edit to this page at 4962e373 | reviewed | More funds still do not grant inventory or a model | Topology links this heading |
| docs/technical/engine/selected-architecture.md#alternatives-that-lose-for-now | technical | unchanged: event-sourced microservices stay rejected. The new events are facts after a commit, not a replayed ledger | no source behavior changed; no edit to this page at 4962e373 | reviewed | Campaign state stays a PostgreSQL projection | No edit |
| docs/decisions/D-0001--modular-engine.md#continuity-on-2026-11-19 | technical | unchanged: the laboratory note still does not replace the modular engine | no source behavior changed; compose.yaml at 4962e373 | reviewed | The note does not deploy the seven services | No edit |
| docs/technical/platform/deployment-and-compatibility.md#kubernetes-as-a-deliberate-extension | technical | unchanged: the hosted-release page stays a different contract. This packet is not allowed to edit it | no source behavior changed; compose.yaml at 4962e373 | reviewed | A laboratory cluster is still not the hosted release | No edit |
| docs/technical/platform/persistence-and-caching.md#redis-boundary | technical | unchanged: Redis remains optional acceleration and not application authority | no source behavior changed; compose.yaml at 4962e373 | reviewed | A cache loss cannot become story authority | No edit |
| docs/product/foundations/vision.md | product | unchanged: no player-facing promise was added, and this page was not edited | no source behavior changed | reviewed | A service name is not a new mechanic | No product edit |
| compose.yaml and packages/application | code | unchanged: no executable behavior is authorized, so application and Compose files were not edited | no source behavior changed; inspected at 4962e373 | source-observed | The continuation return before item effects is existing code, not a new mutation | No code edit |
| STATUS.md | related | unchanged: demonstrated coverage was not rewritten. Proposed ownership is not an observed deployment | no source behavior changed | reviewed | No separate game service is claimed as observed | No edit. The orchestrator owns status if a later fact lands |
| ROADMAP.md | related | unchanged: this packet must not edit the roadmap. Its open-packet link will be repaired by the orchestrator after archive | no source behavior changed | reviewed | The roadmap target is not evidence that extraction happened | Left in place on purpose |
| work/changes/README.md | related | unchanged: the orchestrator owns the queue. This packet does not clear Current change or move the open-table row | no source behavior changed | reviewed | Archiving this packet is not selection of the next Change | Left in place on purpose |
| docs/runbooks/README.md | related | unchanged: no operating procedure was added. Service ownership is not a runbook | no source behavior changed | reviewed | A missing runbook is not a deployed service | No runbook edit |

## Checks actually run

- `pnpm wiki:change-guard --mode plan --change work/changes/open/2026-11-19--arch02-service-ownership-and-event-contracts` returned `wiki.change-guard.v1 plan ok` and `No findings.`
- `python3 scripts/check_docs.py` returned `Checked 382 Markdown files; 0 problems; 268 ms.`
- `pnpm wiki:health` returned exit 0. Integrity broken paths 0, anchors 0, case 0, authority 0, unreachable 0. Canonical pages 92, all reachable.
- `pnpm wiki:change-guard --mode close --change work/changes/open/2026-11-19--arch02-service-ownership-and-event-contracts --base 4962e373` returned `wiki.change-guard.v1 close ok`. Findings were citation-candidate warnings on pages outside this write set. The typed dependent `docs/technical/platform/security-and-trust-boundaries.md#boundary-map` stays unchanged in the ledger.
- Two earlier runs failed and were fixed before these results. Plan mode rejected a fragment that had absorbed a sentence period. Wiki health rejected four same-page contract targets that omitted the file name.
- No model call. No cluster command. No game test was re-run. No executable file was edited.
- After `git mv` into `work/changes/archive/2026-11/other/`, `python3 scripts/check_docs.py` returned `Checked 381 Markdown files; 2 problems; 271 ms.` The two problems are `ROADMAP.md:15` and `work/changes/README.md:69`, which still point at the open packet. This Change does not edit them.
