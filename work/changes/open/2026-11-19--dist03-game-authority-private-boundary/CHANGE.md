# DIST03 | Introduce independently deployable Game Authority boundary without migrating all gameplay

**State:** Implemented on `change/dist03-game-authority` (2026-11-19). One story seam. Not archived.  
**Kind:** implementation  
**Execution:** Not automatically authorized; owner/coordinator selects after prerequisites are verified.  
**Program:** [Program](../../../designs/open/distributed-turn-poc/README.md) · [Gap register](../../../designs/open/distributed-turn-poc/GAPS.md) · [D1 candidate contract](../../../designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md)

## Goal / independently verifiable outcome

Introduce independently deployable Game Authority boundary without migrating all gameplay. This Change is one bounded implementation outcome in the [distributed-turn POC](../../../designs/open/distributed-turn-poc/README.md), not authorization to implement the entire initiative.

## Current source owners and exact baseline

Source inspected on 2026-11-19 at GitHub `main`: [Work queue](../../README.md), [runtime](../../../../apps/worker/src/runtime/index.ts), [worker Activity adapter](../../../../apps/worker/src/activities/index.ts), [outbox](../../../../apps/worker/src/outbox/dispatch.ts), [application stories](../../../../packages/application/src/stories/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md). Reinspect current HEAD and the user's active Cursor branches. The source currently combines work in `apps/worker`; this plan does **not** claim it is already distributed. Existing local Compose stays a working fallback.

**Prerequisites:** DIST01 selected writer/method ownership. Does not need broker, Temporal or paid LLM for local HTTP tests.

## Implementation / documentation delta

Add an `apps/game-authority` entrypoint or an explicitly separate app composition (do **not** duplicate a monolith under a new label). Initially migrate **one** approved operation seam: owned story snapshot read and one admitted existing scripted story resolution with persisted operation receipt. Reuse `createStoryApplication` / `createStoryResolution` and `lockOwnedStory` logic rather than reproducing policies in controllers. Introduce versioned private endpoint(s) or equivalent narrow transport defined by DIST01, with service authentication and actor provenance, strong internal DTO validation, exact 200/202/409/404 semantics, bounded timeouts and no browser-visible route. Nest remains the browser-facing auth/CSRF authority but must call GA instead of directly mutating the migrated story operation in distributed mode. Old Compose mode remains unchanged. Start/full campaign commands and canonical publication are **not** implicitly migrated by this slice.

**Specific owners/paths to touch:** Likely `apps/game-authority/src/{bootstrap,routes,application}` or other source-conforming layout; `apps/api/src/modules/stories/controller.ts` with injection seam, `packages/contracts/src` for private DTO; `packages/application/src/stories/{index,resolution,reads,resolution-receipt}.ts` only when necessary and no duplicate SQL writer; tests in existing API integration owners; runbook and topology/HTTP contract updates.

**Hard exclusions:** No paid provider dispatch, no Stripe or customer billing, no image generator, no arbitrary new gameplay, no fictional Economy service, no live secrets or destructive data reset. Do not work around a missing architectural contract by claiming the service is 'blocked forever'; report one concrete mismatch with exact sources and revise the narrow contract.

## Acceptance: positive and discriminating negative

**Positive proof:** Provider-free integration with two process entrypoints: browser-facing Nest accepted operation → GA SQL transaction → stable receipt, repeat exact request returns same outcome, different body same operation ID conflicts, owner switch denied, local Compose route still passes baseline tests.

**Negative proof:** Two GA instances accept same operation concurrently → only one admitted receipt; forged service credential/owner or wrong story → 401/403/404 as appropriate; Nest cannot keep legacy writer active for migrated route; no API->GA routing from public gateway.

**Evidence/report:** source and SHA inspected; intended/actual command and event state diagram; file diff; exact commands/tests and result counts; status of each normal/negative test; version/compatibility and resource evidence where relevant. Tests on fakes do not count as deployed Rabbit/Temporal proof. Never mark a contract satisfied merely because a Pod is Ready.

## Documentation is a required implementation plane

Update the **canonical** owning headings as part of the same code diff or ratifying documentation Change: [topology](../../../../docs/technical/platform/topology.md#distributed-learning-target), [execution/outbox](../../../../docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery), [data](../../../../docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Storyteller](../../../../docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do), and the relevant source maps/runbooks/STATUS. Edit **only the owner headings materially changed**; leave reasoned no-ops. Do not copy this packet wholesale into every spec. Historical product promises on D&D, scene forking and canonical files remain intact. Run `pnpm wiki:change-guard --mode plan` and `--mode close`, source-relevant tests and doc link checks where available, report skipped checks honestly.

## Parallel orchestration

After DIST01, separate worktree from DIST02 transport adapter; no change to worker runtime, docs shared headings coordinated in integration. Cluster deploy later with DIST06.

A user-approved Cursor orchestrator may distribute truly disjoint Ready Changes into isolated worktrees. It must integrate dependencies, shared canonical-doc headings and the same cluster itself. **A Proposed packet is not executable merely because another packet was authorized.**

## Planned specification and implementation delta | planned-impact.v1

| Plane | Exact planned difference | Proof |
| --- | --- | --- |
| Product | unchanged because the playable game stays text-first and world-neutral, with no new economy, inventory, or player rule | No product page edit |
| Technical | changed: docs/technical/platform/topology.md#distributed-learning-target now records one local Game Authority process for the owned snapshot read and one scripted resolution. Compose remains the writer. The outbox wake stays a direct Temporal call | Provider-free seam tests. PostgreSQL was not opened |
| Code | changed: apps/game-authority/src/application.ts calls createStoryApplication for that seam, and apps/api/src/modules/stories/controller.ts calls it only when GAME_AUTHORITY_MODE=distributed. Negative: the Nest story writer stays idle for that operation | @offscreen/game-authority 3 passed. API seam tests 2 passed |
| Related | changed: the execution, data, HTTP, runbook, and STATUS headings now name that one process | python3 scripts/check_docs.py and the change guard |

## Reconciliation ledger (affected-claim ledger)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/topology.md#distributed-learning-target | Technical | changed: one local Game Authority process serves the owned snapshot read and one scripted resolution. Compose remains the writer. This is not a cluster service | apps/game-authority/src/application.ts from 4a556223 | provider-free | A forged credential is HTTP 401. /api is HTTP 404 on that process | docs/runbooks/local-development.md#game-authority-seam |
| docs/technical/platform/topology.md#proposed-service-ownership | Technical | changed: the same one process is named, and the other service rows stay unextracted | apps/game-authority/src/server.ts from 4a556223 | provider-free | Start is HTTP 404 on Game Authority. No Game Economy route was added | docs/technical/platform/topology.md#distributed-learning-target |
| docs/technical/platform/topology.md#code-organization | Technical | changed: the layout lists apps/game-authority for this one seam | apps/game-authority/README.md from 4a556223 | reviewed | The process is not a second Nest app | apps/api/README.md |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | Technical | changed: distributed mode adds one direct HTTP command for this seam. The outbox wake stays a direct Temporal call | apps/api/src/modules/stories/game-authority-client.ts from 4a556223 | provider-free | Compose mode records zero calls to Game Authority | docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | Technical | unchanged because the outbox steps, the relay, and the Temporal wake were not rewritten | apps/worker/src/outbox/dispatch.ts was not edited. Baseline 4a556223 | reviewed | A broker message is still not the wake | The new row sits in the following section |
| docs/technical/platform/execution-and-delivery.md#storyteller-workflow-identity | Technical | unchanged because storytellerV1 was not split and no publication route moved | apps/worker/src/activities/index.ts was not edited. Baseline 4a556223 | reviewed | Game Authority does not start Temporal | No new workflow claim |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | Technical | changed: distributed mode serves the snapshot and the scripted resolution receipt through createStoryApplication. The receipt table is still story_resolution | apps/game-authority/src/application.ts from 4a556223 | provider-free | The same operation id does not insert a second receipt. Nest's local admit count stays 0 | docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records |
| docs/technical/platform/data-and-persistence.md#quantities-and-ownership | Technical | unchanged because no scarce quantity, item transfer, or second writer of those facts moved | packages/application/src/stories/resolution.ts was not edited. Baseline 4a556223 | reviewed | A duplicate operation id does not apply a second effect in the reused transaction | No quantity table was added |
| docs/technical/platform/data-and-persistence.md#proposed-service-schemas-and-delivery-records | Technical | unchanged because no new schema, inbox, or cross-service table was added. One process calls the existing transaction | packages/db was not edited. Baseline 4a556223 | reviewed | There is no second receipt table | The who-owns paragraph points at the same receipt row |
| docs/technical/platform/http-api-and-client-contracts.md#service-calls-are-not-player-routes | Technical | changed: the internal snapshot GET and resolution PUT exist. The browser still calls Nest /api | apps/game-authority/src/server.ts from 4a556223 | provider-free | A body ownerId is HTTP 400. A wrong owner is HTTP 404 | apps/game-authority/README.md |
| docs/technical/platform/http-api-and-client-contracts.md#authenticated-actor-scope | Technical | unchanged because the browser session check stays on Nest. The internal actor header is not a player credential | apps/api/src/modules/auth/identity.ts was not edited. Baseline 4a556223 | reviewed | A missing service credential is HTTP 401 on Game Authority and does not become a player session | No player route was added |
| docs/technical/platform/http-api-and-client-contracts.md#accepted-response-versus-committed-world | Technical | unchanged because resolution admission is still HTTP 202 and the snapshot read is still HTTP 200 | apps/api/src/modules/stories/controller.ts from 4a556223 | provider-free | HTTP 202 is still not a settled world. A timeout is HTTP 503 | The status codes are the existing ones |
| docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints | Technical | unchanged because GET remains the snapshot and SSE remains a hint. The hint stream was not moved onto a broker | apps/api/src/modules/stories/story-update-hub.ts was not edited. Baseline 4a556223 | reviewed | The internal server does not mount the SSE route | Nest still emits the hint |
| docs/technical/platform/security-and-trust-boundaries.md#boundary-map | Technical | unchanged because staff grants, provider packets, and document handles were not retied. Nest still checks the browser session before the internal call | docs/technical/platform/security-and-trust-boundaries.md was not edited. Baseline 4a556223 | reviewed | A forged service credential does not read a story | No trust-map edit |
| docs/technical/storyteller/generation-and-publication.md#what-publication-is-allowed-to-do | Technical | unchanged because publication was not migrated and the publication module was not edited | packages/application/src/storyteller/publication.ts was not edited. Baseline 4a556223 | reviewed | Game Authority has no publication route | The heading stayed in place |
| docs/technical/storyteller/generation-and-publication.md#remote-task-custody | Technical | unchanged because the Storyteller worker was not split and this seam does not hold a model task | apps/worker/src/runtime/index.ts was not edited. Baseline 4a556223 | reviewed | No paid provider is called by the new process | The heading stayed in place |
| docs/technical/README.md | Technical | changed: the service-ownership row now says one local Game Authority seam exists and is not the Compose default | docs/technical/README.md from 4a556223 | reviewed | The other proposed rows are not separate processes | docs/technical/platform/topology.md#proposed-service-ownership |
| apps/game-authority/src/application.ts | Code | changed: the process calls createStoryApplication once and imports createStoryResolution and lockOwnedStory without a second insert | apps/game-authority/src/application.ts from 4a556223 | provider-free | Duplicate operation id keeps insert count 1. A different body is HTTP 409 | apps/game-authority/README.md |
| apps/api/src/modules/stories/controller.ts | Code | changed: the snapshot GET and scripted resolution PUT use the seam. Start and campaign commands stay on the local writer | apps/api/src/modules/stories/controller.ts from 4a556223 | provider-free | Distributed mode leaves the local admit count at 0. Compose mode leaves the remote call count at 0 | apps/api/src/modules/stories/README.md |

Declared paths, each present because this seam needs that file:

- STATUS.md because the demonstrated boundary now includes the local process and still says no cluster game service is deployed
- apps/api/README.md because the route inventory names the distributed snapshot and resolution calls
- apps/api/package.json because the API test depends on @offscreen/game-authority
- apps/api/src/app.ts because Compose and distributed mode select the seam there
- apps/api/src/modules/stories/README.md because the route map names the same switch
- apps/api/src/modules/stories/game-authority-client.ts because Nest calls Game Authority only through this client
- apps/api/test/game-authority-seam.test.mjs because the Nest writer must stay idle for the migrated operation
- apps/game-authority/package.json because the process is its own workspace package
- apps/game-authority/tsconfig.json because that package compiles alone
- apps/game-authority/README.md because the source map names the one seam
- apps/game-authority/src/application.ts because it calls createStoryApplication once
- apps/game-authority/src/server.ts because the private routes and credential check live there
- apps/game-authority/src/config.ts because the service token and timeout are bounded
- apps/game-authority/src/bootstrap/main.ts because that file is the process entry
- apps/game-authority/test/story-seam.test.ts because a forged credential, a wrong owner, and a duplicate operation id are tested
- packages/application/package.json because resolution and persistence are imported by subpath and are not edited
- packages/application/src/stories/README.md because the admission flow names the distributed call
- packages/contracts/package.json because the private DTO is exported
- packages/contracts/src/game-authority.ts because that DTO rejects an owner override
- packages/contracts/test/game-authority.test.ts because that rejection is tested
- pnpm-lock.yaml because the new workspace package is linked
- docs/runbooks/README.md because the seam procedure is indexed
- docs/runbooks/local-development.md because the seam stays off Compose unless the flag is set
- work/changes/README.md because the DIST03 row records this seam

**Closure:** Reconcile the ledger, archive Done/Cancelled per established workflow, repair inbound links, stop. No automatic successor selection.
