# K8S09 | Kubernetes Gateway API and local-only HTTP edge

**State:** Proposed (2026-11-19)  
**Kind:** implementation  
**Execution selection:** None. Do not auto-run.  
**Program:** [Distributed architecture lab queue](../../README.md)

## Outcome

Give our web and API an explicit Kubernetes traffic boundary: controller, Gateway/HTTPRoute, routing and observability without exposing databases or broker.

## Authority and prerequisites

- **Prerequisites:** K8S01, ARCH01; before K8S08 externally reachable skeletons.
- **Current implementation:** modular monolith and Compose remain source-observed as of 2026-11-19. ARCH01 must reconcile the target without pretending migration is done.
- **Authoritative owners:** `docs/technical/platform/topology.md`, `docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment`, `docs/technical/platform/http-api-and-client-contracts.md`, `docs/runbooks/README.md`, `docs/technical/README.md`.
- **Source reinspection required:** inspect latest GitHub HEAD and current Change owners before implementing. No presumption that the lab or prior Changes have actually completed.
- **Risk permission:** no provider spend, destructive persistent-volume actions, public traffic, credential disclosure or application-code extraction without explicit owner decision.

## Planned implementation or specification delta

Evaluate current supported Gateway API controller (Traefik/Envoy Gateway/NGINX Gateway Fabric) for kind/WSL budget and choose one. Install pinned versions, route `/` to web and `/api` to API synthetic targets, support SSE streaming/timeouts and Webhook entry assumptions, terminate TLS in a safe lab-only way or document a deliberate plain-loopback dev exception. Include probes, 404/503 behavior and forwarded client identity. Restrict kind port maps to loopback. Do not install retired community ingress-nginx.

**Out of scope:** full product rollout, shared production cluster, paid LLM or image calls, real Stripe calls, full game-service extraction. Reuse existing source owners and don't create duplicate planning authority.

## Acceptance: positive and negative

- **Positive:** Smoke-test host/path routes, missing backend, TLS/dev exception, readiness, SSE stream continuity and local firewall/port boundary; runbook includes exact gateway debugging and no production security claims.
- **Negative:** No service should become directly LAN-accessible; no insecure proxy headers trusted from unauthenticated clients; SSE must not be buffered or prematurely cut; a Gateway is not an application authorization service.
- **Documentation is mandatory:** update precisely the source-owner headings above, relevant wiki index and runbooks, factual status/evidence only after actual verification. Do not treat this packet itself as documentation completion.
- **Evidence:** exact commands/results, versioned dependencies, resource costs, links to test fixtures, observed failures, date and environment. Run repository change/markdown/wiki guards as applicable.

## Planned-impact.v1, four planes

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | No change to selected player behavior or unratified product mechanics | Inspect `docs/product/README.md` and relevant invariants |
| Technical | Reconcile specified authoritative topology, delivery and networking/event owner headings | Semantic diff including source/current/proposed/proven labels |
| Code | Bounded infrastructure manifests, scripts, synthetic services/tests; no production/game-code migration | Disposable lab smoke and discriminating negative test |
| Related | Runbooks, indexes, Change queue and factual STATUS if realized | Link/impact-guard and change receipt |

## Closure and lifecycle

- Execute only on explicit owner selection, with predecessor receipts verified.
- Before Done fill owner-by-owner reconciliation (heading, source SHA, expected delta, actual diff, evidence, negative test, link updates).
- Archive using standard lifecycle. Do not automatically select the next Change.
