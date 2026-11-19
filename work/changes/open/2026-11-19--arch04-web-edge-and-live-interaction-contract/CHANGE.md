# ARCH04 | Web-facing deployments and live interaction contract

**State:** Proposed (2026-11-19)  
**Kind:** documentation  
**Selection:** none; design packet only, not a deployment authorization.  
**Program:** [Distributed architecture laboratory](../../README.md#distributed-architecture-laboratory-new-2026-11-19)

## Purpose and outcome

Make the **existing, largely selected web/client/API design** unambiguous as it moves toward Kubernetes. Define the separate presentation server, game-facing HTTP API, same-origin edge routes, server-side rendering, client interactivity and server-to-browser update channel without duplicating game authority or replacing working behavior. This Change does not select new player mechanics or mandate WebSockets. It closes a deployment-topology gap, not an imagined absence of live updates.

## Source-grounded baseline

Inspected 2026-11-19; re-read latest HEAD before execution:

- [Current topology](../../../../docs/technical/platform/topology.md#runtime-shape) already has Next web, Nest API and same-origin entry, with browser updates via HTTP+SSE.
- [Client architecture](../../../../docs/technical/client/architecture.md#0-final-stack-decisions-these-are-instructions-not-a-library-wishlist) selects Next.js 16 / React 19, request-scoped SSR prefetch and hydration, TanStack Query as browser server-state cache, HTTP commands and SSE invalidation. The client code `apps/web/src/features/play/use-story-live-updates.ts` and `apps/web/src/shared/api/story-update-stream.ts` implements EventSource/scoped Query invalidation.
- [HTTP GET truth and SSE hints](../../../../docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints): Nest already exposes authenticated `GET /api/stories/:id/updates`, a lightweight `committed-view` hint and a 15-second heartbeat via `apps/api/src/modules/stories/story-update-hub.ts`; snapshots and operation receipts remain the source of truth.
- [Next server-only readers](../../../../apps/web/src/server/README.md): Next performs authorized, request-scoped Nest reads for SSR. Nest still checks object ownership. `next.config.ts` currently provides an API proxy rewrite for local operation.
- [Client state/commands and hints](../../../../docs/technical/client/state-and-server-boundary.md#commands-and-hints): no automatic mutation replay on reconnection; 202 is admission, never final effect; SSE does not carry canonical narrative.
- [Gateway Change](../2026-11-19--k8s09-gateway-api-edge-networking/CHANGE.md) proposes local routing; it does not deploy the game or validate production live transport.
- [K8S08](../2026-11-19--k8s08-service-skeleton-and-event-contracts/CHANGE.md) scaffolds only ratified service skeletons; no source gameplay migration.

## Proposed high-level deployment contract

1. **Gateway API is the single public origin.** Route browser `/`, story pages and framework assets to a separately scalable Next.js web Deployment. Route `/api/**`, including the long-lived `/api/stories/:id/updates` stream, to a separately scalable Nest API Deployment. Resolve Next's existing `next.config.ts` local proxy rewrite against this gateway routing; no conflicting production proxy chain. Internal Next server readers call Nest on an internal service address with request-bound authorized credentials, never a browser-exposed internal URL. Cookies, session boundaries, CSRF protections and resource authorization stay at their existing owners. Do not introduce a third BFF duplicating Nest.
2. **Next is a rendering/composition server, not game authority.** Server Components and SSR prefetch deliver meaningful initial scene HTML, and React hydrates interactive islands backed by one TanStack Query cache. On later game changes, client React Query refetches an authorized snapshot and updates the Living Book **without** rerendering every scene through a Next page request.
3. **HTTP commands go browser → Nest**, frozen operation identity/body, with explicit `200` committed versus `202` admitted versus conflict/uncertain outcomes. A reconnect must not automatically submit a new choice, reroll, call a model or create a fork.
4. **SSE is the selected one-way live channel:** browser `EventSource` subscribes via the API gateway; Nest authorizes session/story, emits only committed-view/version invalidation hints and status/connection health, and the client refetches exact authoritative state. SSE is not a narrative event log, world-state store, paid generation transcript, or source of scene/fork truth. Missing a hint is recovered by GET, not presumed replay. Keep one connection per actively viewed story, close on account/story change, backoff/reconcile after reconnect, use bounded visibility-aware polling when unavailable.
5. **Network and scaling boundaries:** protect long-lived HTTP streaming from reverse-proxy buffering, unsuitable idle timeouts and compression; preserve cookie behavior and abort/disconnect cleanup. Existing API Pod hubs use PostgreSQL LISTEN/NOTIFY as ephemeral fan-out signals, not guaranteed durable delivery. Test multi-Pod publishing/connection and failures before claiming topology works in the cluster. RabbitMQ business events, when introduced, may lead to a **committed** view version, but browser subscriptions never directly consume broker messages or bypass the game-state transaction.
6. **SSE versus WebSocket:** do not replace the selected SSE stack for visual dynamism alone. A text-first, choice-driven single-player story needs browser→server HTTP commands and server→browser notifications, which SSE already serves. Reevaluate WebSocket only for a demonstrated bidirectional/high-frequency need (e.g. true multiplayer presence, shared cursor/action collaboration, interactive voice). If selected later, maintain the same authoritative read/command semantics and explicit permission checks.
7. **Interactive experience:** pending narration, published scenes, pause/resume, authorized choices, clock/deadline display, notifications and optional appearance changes can update client-side. A client-side countdown is a **projection** of an admitted server deadline, never a locally advancing authoritative fictional clock. Partial generation/typing effects, if proposed later, are noncanonical previews unless publication commits a source passage. Reading historical scenes and navigating the journal are read-only; they cannot accidentally attach live action controls or fork via a GET.
8. **Safety of the working implementation:** avoid replacing, deleting or “modernizing” the current Next/Query/SSE code just to conform to an imagined new architecture. Keep existing tested behavior until a specific runtime integration gap has a source-backed failure and an authorized implementation Change.

## Required planned documentation delta

- `docs/technical/platform/topology.md#distributed-learning-target`: add a compact *selected lab edge* subsection containing the Next/Gateway/Nest separation and what is not deployed, linking rather than copying source-owning SSE details.
- `docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment`: add an implementation-proof checklist and multi-replica/proxy limitations, not an untested release claim.
- `docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints`: update only if a **real** cross-route hosting/auth contract gap is found. Preserve the existing HTTP truth owner.
- `docs/technical/client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture` and `docs/technical/client/state-and-server-boundary.md#commands-and-hints`: keep as authoritative client transport/behaviour owners, changing only a verified gap; do not fork their guarantees.
- `docs/technical/README.md` / `ROADMAP.md`: add minimal pointer only if it improves navigation; status and runbooks only after live proof.

## Proof and negative checks

- **Positive reading:** An implementer can draw three independently deployable services (gateway, Next, Nest), show initial SSR path, HTTP command, SSE invalidation and authoritative GET as distinct arrows. Both server and browser readers share the authorized projection, while only one API owns command admission.
- **Negative reading:** An SSE disconnect, missed event or API Pod replacement does not create a new gameplay command, change committed state, claim event replay, or permanently leave old content marked current after a successful GET. A stale event cannot reenable a previously consumed choice. Another user's story is not retrievable through SSR, API or SSE. A Next SSR response is not the multiplayer live transport.
- **Operational criteria for later deployment:** two Next replicas and two Nest replicas when RAM permits; authenticated same-origin route checks; stream proxy flush and heartbeat; disconnect cleanup; stream refused on revoked access; backend multi-Pod hint/GET test; 202 pending vs scene update distinction; a lost-SSE recovery path; resource budget and actual test outputs. **Do not assert those were tested now.**

## planned-impact.v1

| Plane | Intended effect | Evidence |
| --- | --- | --- |
| Product | unchanged because existing Living Book / choice honesty / journal behavior is authoritative; no new gameplay feature selected | `docs/product/experience/play-and-decisions.md`, `docs/product/experience/living-book-poc.md` |
| Technical | clarify deployment-specific topology and proven/not-proven gateway/SSR/SSE paths; preserve existing client/API authority owners | exact heading-level semantic diff, local service routes and negative reading |
| Code | unchanged: documentation-only Change; a separate implementation Change must deploy and test real apps on Kubernetes | no executable code/config edit |
| Related | minimal new docs links and queue/handoff; status unchanged unless a runtime probe is performed | wiki link/heading checks and `wiki:change-guard` |

## Parallel execution

- **Parallelizable:** bounded read-only gateway/proxy study and frontend/auth route inventory can proceed alongside K8S02–K8S07 infrastructure work.
- **Serialization:** coordinate writes to `topology.md` with ARCH02/ARCH03 and `deployment-and-compatibility.md` with K8S09; one integrator updates canonical headings.
- **Dependency:** ARCH01 is complete; edge documentation can be reconciled before or during K8S09 planning, but real Kubernetes integration comes **after** a working gateway, persistence and deployment readiness. Proposed does not mean auto-approved.

## Reconciliation ledger (complete before Done)

| Heading / owner | Change or reasoned no-op | Inspected source/diff SHA | Evidence tier | Negative test | Link |
| --- | --- | --- | --- | --- | --- |
| `topology.md#distributed-learning-target` | Pending | Pending | Pending | Next is not the game backend | Pending |
| `deployment-and-compatibility.md#first-hosted-deployment` | Pending | Pending | Pending | No claim of production proof | Pending |
| `http-api-and-client-contracts.md#get-truth-and-sse-hints` | Pending/review | Pending | Pending | SSE hint is not game truth | Pending |
| `client/architecture.md` / `state-and-server-boundary.md` | Pending/review | Pending | Pending | No automatic mutation replay | Pending |
