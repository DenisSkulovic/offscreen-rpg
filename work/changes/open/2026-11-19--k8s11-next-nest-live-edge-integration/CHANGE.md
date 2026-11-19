# K8S11 | Deploy existing Next/Nest edge with real SSE end-to-end in kind

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the one-task-at-a-time Cursor route; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) separates observed source, missing code and optional work. **Default parent/child: Composer 2.5 Standard.** Next production origin/SSR/SSE focused proof then one real Gateway join. Existing Change state and explicit selection/cluster/spending gates remain in force; task authorship alone is neither implementation nor verification. Grok is not the normal executor.

**State:** Proposed (2026-11-19)  
**Kind:** implementation  
**Program:** [Distributed architecture laboratory](../../README.md#distributed-architecture-laboratory-new-2026-11-19)  
**Execution:** Only when explicitly selected; never inferred from batch adjacency. **No live provider spend.**

**Source-level execution note:** [TURN02 SOURCE-MAP](../2026-11-19--turn02-compose-real-kubernetes-application-release/SOURCE-MAP.md) identifies exact Next/Nest image/bootstrap issues at `584b594`: Next `start` binds loopback, API defaults `API_HOST=127.0.0.1`, `API_INTERNAL_ORIGIN` (SSR) differs from `API_PROXY_ORIGIN` (rewrite), and `APP_ORIGIN` allows only HTTPS or HTTP localhost/127. Test actual production Next rewrite against Service DNS; do not treat synthetic gateway success as real auth/SSE. TURN02 owns the one final release integrator.\n\n## Outcome

Prove the **actual existing** Next.js web and NestJS API run as independently deployable workloads on the same-origin Kubernetes Gateway and preserve the existing server-render, authenticated HTTP-command, EventSource hint and authoritative GET contracts. This is a deployment/integration Change, not a game-service extraction or browser-state redesign.

## Preconditions and source authority

- K8S01 reproducible kind base, K8S09 gateway edge, working disposable application Postgres/storage route (K8S02 or an explicitly compatible source-observed application DB), current Next/Nest artifact build, and a safe scripted game fixture; K8S08 skeletons may be reused/replaced only with a reviewed no-conflict plan. ARCH04 design reconciliation must agree on edge route ownership.
- [Web selected stack](../../../../docs/technical/client/architecture.md#0-final-stack-decisions-these-are-instructions-not-a-library-wishlist), [server/browser boundary](../../../../docs/technical/client/state-and-server-boundary.md#topology), [HTTP/SSE truth](../../../../docs/technical/platform/http-api-and-client-contracts.md#get-truth-and-sse-hints), [Next server reader](../../../../apps/web/src/server/README.md), [application topology](../../../../docs/technical/platform/topology.md#runtime-shape) and [Kubernetes lab runbook](../../../../docs/runbooks/kubernetes-lab.md).
- Reinspect latest HEAD, actual source env names, auth origin/cookies, startup scripts, Next API rewrite and Nest database readiness. Never hardcode passwords or trust forwarded headers from unauthorized traffic.

## Bounded intended diff

- Add pinned, separately scalable Next and Nest images/Deployments/Services in `infra/kubernetes/`; use the actual source build artifacts. Keep the existing worker and game authority unchanged in the migration boundary. No new BFF or WebSocket service.
- Wire one same-origin Gateway: `/` → Next, `/api/**` → Nest, including long-lived SSE. Validate internal Next SSR readers call the correct private Nest origin, and avoid duplicate/conflicting rewrites. Minimal least-privilege secrets and no LAN-exposed service endpoints.
- Provide a scripted, no-paid-provider route that renders meaningful initial story text server-side, hydrates one TanStack Query cache, admits a frozen user intent via Nest HTTP, publishes a committed fixture change, sends a view hint on SSE, and GETs the new authoritative state. Preserve 202 vs committed and safe read-only history behavior. No invented economic or item mechanics.
- Test single- then multi-Pod deployment **only within measured machine capacity**. Verify that a reconnect, API Pod churn and PostgreSQL LISTEN reconnect converge on GET; demonstrate auth expiry/revocation, wrong story, proxy timeouts, no buffering, and SSE connection limits. Do not claim durable event replay.
- Record resource footprint, versions, manifests, commands, actual results and operational limits in runbook/STATUS. Reconcile affected canonical docs in the same diff; no new authority from the deployment itself.

## Acceptance, including meaningful negatives

- **Positive:** cold first request returns authenticated rendered passage in HTML; React controls hydrate without duplicate state owners; same-origin direct Nest GET works; an admitted scripted command yields one committed version; SSE hint causes Query GET and new content without page navigation; a lost SSE signal is corrected by an explicit/reconnect/visibility GET.
- **Negative:** SSE payload never includes secret narrative or hidden plans; lost connection does not POST automatically or duplicate dice/mechanical effects; a 202 does not display an uncommitted outcome; older version cannot overwrite newer Query; revoked/wrong-owner access fails in SSR, API and SSE; a gateway HTTP timeout does not masquerade as story settlement.
- **Not a success criterion:** websockets, native mobile push, full Storyteller service extraction, 24/7 hosted deployment, actual high availability or paid models.

## planned-impact.v1

| Plane | Intent | Proof |
| --- | --- | --- |
| Product | unchanged because selected Living Book and player choices remain the same | Existing product journal and play acceptance |
| Technical | changed only for validated Kubernetes networking/deployment detail; Next/Query/SSE existing contract retained | Source/traces, HTTP/proxy/stream checks |
| Code | Kubernetes manifests, images, smoke tools, only necessary glue/config wiring in `apps/web`, `apps/api` | Cold render + SSE hint + GET + negative drills |
| Related | Runbook, `STATUS.md`, evidence, canonical docs, wiki links and Change ledger | Actual run results, no false production assertion |

## Parallel scheduling

The Docker image/build work, read-only proxy/TLS audit and isolated fixture design can be parallel if files/worktrees are disjoint. One owner performs gateway/cluster wiring and shared-infrastructure operations. Final end-to-end verification runs only after prerequisites and integration join. Coordinate shared `topology.md`, `deployment-and-compatibility.md` and client architecture headings with ARCH04/K8S09.

## Reconciliation ledger (fill before closure)

| Affected owner | Expected delta | Source SHA/diff | Evidence | Negative case | Link |
| --- | --- | --- | --- | --- | --- |
| Gateway routes and runbook | Pending | Pending | Pending | no public DB/SSE leak | Pending |
| Client/API contract | Preserve existing, edit only verified gap | Pending | Pending | lost stream does not resubmit | Pending |
| Application runtime / STATUS | Deployment evidence, not production guarantee | Pending | Pending | no false full-game migration | Pending |
