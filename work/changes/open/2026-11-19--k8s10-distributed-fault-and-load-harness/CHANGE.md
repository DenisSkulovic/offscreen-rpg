# K8S10 | Reproducible distributed failure and load experiments

**State:** Proposed (2026-11-19)  
**Kind:** implementation  
**Execution selection:** None. Do not auto-run.  
**Program:** [Distributed architecture lab queue](../../README.md)

## Outcome

Provide a safe, repeatable architecture experiment suite that proves or disproves our specific resilience hypotheses without provider spend or destructive data access.

## Authority and prerequisites

- **Prerequisites:** K8S02-K8S09 relevant components plus K8S08 skeletons; K8S07 observability.
- **Current implementation:** modular monolith and Compose remain source-observed as of 2026-11-19. ARCH01 must reconcile the target without pretending migration is done.
- **Authoritative owners:** `docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture`, `docs/technical/platform/topology.md`, `docs/technical/observability/README.md`, `docs/runbooks/README.md`.
- **Source reinspection required:** inspect latest GitHub HEAD and current Change owners before implementing. No presumption that the lab or prior Changes have actually completed.
- **Risk permission:** no provider spend, destructive persistent-volume actions, public traffic, credential disclosure or application-code extraction without explicit owner decision.

## Planned implementation or specification delta

Create bounded scenario runner, fixtures and metrics/trace capture for Pod kill, broker outage/recovery, delivery duplication/reordering, DB failover after replicas exist, slow provider via a fake, traffic burst and resource pressure. Every scenario has preconditions, workload, quantitative expected behavior, abort rules, cleanup and evidence report. Start with minimal green path and expand only as components land.

**Out of scope:** full product rollout, shared production cluster, paid LLM or image calls, real Stripe calls, full game-service extraction. Reuse existing source owners and don't create duplicate planning authority.

## Acceptance: positive and negative

- **Positive:** Fresh cluster run reproduces at least one worker-loss and broker-redelivery test with traceable IDs; a deliberately broken case fails expected assertion; recovery, graphs, hardware usage and cleanup are saved as dated evidence.
- **Negative:** No stress test runs against shared or paid infrastructure; a pass does not imply machine-level HA; resource caps protect a 12GB WSL lab; evidence differentiates unavailable from data lost, replayed from duplicated side effect.
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
