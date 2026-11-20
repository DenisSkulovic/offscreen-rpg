# ARCH04 | Web-facing deployments and live interaction contract

**State:** Done (2026-11-19)  
**Kind:** documentation  
**Selection:** Owner authorized this documentation Change in worktree `offscreen-rpg-arch04` on branch `change/arch04-web-edge`. Baseline `7ce99f6f`. This is not a deployment authorization.  
**Program:** [Distributed architecture laboratory](../../../../README.md#distributed-architecture-laboratory-new-2026-11-19)

## Outcome

The selected lab edge is recorded. The gateway sends `/` and story pages to Next. It sends `/api/**`, including the long-lived story update stream, to Nest. Next renders and prefetches. Nest admits commands and emits SSE invalidation hints. GET remains authoritative. A missed SSE event is recovered by GET and does not create a command, a reroll, or a fork. This is the selected target. Two Next replicas and two Nest replicas were not tested on Kubernetes. No application code changed.

Landed headings:

- [Selected lab edge](../../../../../../docs/technical/platform/topology.md#selected-lab-edge)
- [Web edge checklist](../../../../../../docs/technical/platform/deployment-and-compatibility.md#web-edge-checklist)

The open K8S09 link in the earlier draft pointed at a missing open packet. The archived packet is [K8S09](../2026-11-19--k8s09-gateway-api-edge-networking/CHANGE.md). That Change proved a synthetic Traefik gateway for `/` and `/api` on loopback and then deleted the cluster. It did not deploy Next or Nest.

## Left in place

[GET truth and SSE hints](../../../../../../docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints) already says which response may replace the scene. The hint carries no passage, and a heartbeat does not send a paid command. Which Deployment receives `/api/**` is the lab-edge subsection. That hosting fact is not a second HTTP contract, so this page was not edited.

[End-to-end update transport](../../../../../../docs/technical/client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture) already selects SSE invalidation plus GET, and it already leaves hosting unclaimed. [Commands and hints](../../../../../../docs/technical/client/state-and-server-boundary.md#commands-and-hints) already recovers a missed event from GET and refuses an automatic POST on reconnect. Those guarantees were not copied again.

Left untouched, because another Change owns them or this Change was told to leave them: `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md`, storyteller docs, `ROADMAP.md`, `STATUS.md`, `work/changes/README.md`, `work/changes/ledger/`, and `infra/`.

## Negative case

A missed SSE event, a disconnect, or a replaced API Pod does not create a gameplay command, a reroll, or a fork, and it does not count as event replay. A successful GET is what replaces the scene. A stale hint does not restore a choice the newer snapshot has retired. Another reader's story is not granted by server-rendered HTML or by the stream. Two Next replicas and two Nest replicas were not tested on Kubernetes.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended effect | Evidence |
| --- | --- | --- |
| Product | unchanged because Living Book behavior and choice honesty stay on the experience pages | `docs/product/experience/play-and-decisions.md` |
| Technical | changed: the lab edge names the gateway route, and the hosted checklist names the untested replica limit | `docs/technical/platform/topology.md#selected-lab-edge`; `docs/technical/platform/deployment-and-compatibility.md#web-edge-checklist` |
| Code | unchanged because no executable behavior is authorized | no application edit at `7ce99f6f` |
| Related | unchanged because the queue and the closed-work index stay with the orchestrator | `work/changes/README.md` was not edited |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Selected lab edge at docs/technical/platform/topology.md#selected-lab-edge | technical | changed: the gateway sends pages to Next and `/api/**` including the story update stream to Nest; GET recovery creates no command, reroll, or fork | apps/web/next.config.ts, apps/web/src/server/api-origin.ts, and apps/api/src/modules/stories/controller.ts at 7ce99f6f; no source behavior changed | source-observed | Two Next replicas and two Nest replicas were not tested, and a missed hint does not create a command, a reroll, or a fork | Same-page pointer from Proposed service ownership. docs/technical/README.md was not edited |
| Web edge checklist at docs/technical/platform/deployment-and-compatibility.md#web-edge-checklist | technical | changed: the hosted section lists the four proofs still required and states the replica limit | docs/runbooks/kubernetes-gateway.md at 7ce99f6f; no source behavior changed | source-observed | The checklist is not a hosted release and not a two-replica test | No runbook index edit |
| Proposed service ownership at docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: the Web/API row still stores no story aggregate and is still not a proven separate service; the sentence now points at the lab edge | docs/technical/platform/topology.md#proposed-service-ownership at 7ce99f6f | source-observed | Naming the edge does not extract the engine or publish a broker event | Same-page anchor only |
| Commands, business events, and workflows at docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: delivery classes still follow the proposed owners; the outbox bridge stays the application route and the story SSE hint stays off the broker | docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows at 7ce99f6f | source-observed | A workflow still cannot write another owner's schema, and a missed SSE hint is still not a command | Page not edited |
| GET truth and SSE hints at docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints | technical | unchanged: GET still replaces the scene and an SSE message is still not a settled consequence; Deployment placement stays on the lab edge | docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints and apps/api/src/modules/stories/controller.ts at 7ce99f6f | source-observed | A heartbeat still does not send a paid command, and the hint still has no passage body | Page not edited |
| End-to-end update transport at docs/technical/client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture | technical | unchanged: SSE invalidation plus GET is already selected, and that heading already leaves hosting unclaimed | apps/web/src/shared/api/story-update-stream.ts at 7ce99f6f | source-observed | A reconnect still does not POST a new choice | Page not edited |
| Commands and hints at docs/technical/client/state-and-server-boundary.md#commands-and-hints | technical | unchanged: a missed event already recovers from GET, and a stale hint does not restore a retired choice | docs/technical/client/state-and-server-boundary.md#commands-and-hints at 7ce99f6f | source-observed | Mount and reconnect still do not POST | Page not edited |
| Living Book and choice honesty | product | unchanged: no gameplay feature was selected | docs/product/experience/play-and-decisions.md at 7ce99f6f | source-observed | A missed hint is not a new player action | No product page edited |
| Application code | code | unchanged: documentation-only and no executable behavior is authorized | no source behavior changed at 7ce99f6f | source-observed | No Next or Nest Deployment was added | No application README added |
