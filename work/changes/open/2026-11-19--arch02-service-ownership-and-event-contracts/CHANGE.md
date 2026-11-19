# ARCH02 | Distributed service ownership and message delivery contract

**State:** Proposed (2026-11-19)  
**Kind:** documentation  
**Execution selection:** None. Do not auto-run.  
**Program:** [Distributed architecture lab queue](../../README.md)

## Outcome

Ratify proposed service ownership for web/API, engine, storyteller, illustrations, economy, payments, notifications, including the separation between authoritative commands, business events, and Temporal workflows.

## Authority and prerequisites

- **Prerequisites:** ARCH01; precedes K8S08.
- **Current implementation:** modular monolith and Compose remain source-observed as of 2026-11-19. ARCH01 must reconcile the target without pretending migration is done.
- **Authoritative owners:** `docs/technical/platform/topology.md#runtime-shape`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/http-api-and-client-contracts.md`, `docs/technical/README.md`.
- **Source reinspection required:** inspect latest GitHub HEAD and current Change owners before implementing. No presumption that the lab or prior Changes have actually completed.
- **Risk permission:** no provider spend, destructive persistent-volume actions, public traffic, credential disclosure or application-code extraction without explicit owner decision.

## Planned implementation or specification delta

Document which service owns each entity and write, durable outbox/inbox and dedup obligations, event IDs, aggregate/version keys, schema evolution, cross-service consistency and provider spending; classify direct HTTP calls vs async broker events vs Temporal orchestration. Explicitly distinguish current runtime from target. No code or made-up game features.

**Out of scope:** full product rollout, shared production cluster, paid LLM or image calls, real Stripe calls, full game-service extraction. Reuse existing source owners and don't create duplicate planning authority.

## Acceptance: positive and negative

- **Positive:** A table for every proposed service showing authoritative data, incoming commands, produced events, dependents and failure policy; negative scenario for duplication/out-of-order and rolling schema changes. Technical indexes and maps validated.
- **Negative:** A consumer replay cannot authorize duplicate currency or inventory mutation; a shared logical PostgreSQL cluster does not grant shared schema writes.
- **Documentation is mandatory:** update precisely the source-owner headings above, relevant wiki index and runbooks, factual status/evidence only after actual verification. Do not treat this packet itself as documentation completion.
- **Evidence:** exact commands/results, versioned dependencies, resource costs, links to test fixtures, observed failures, date and environment. Run repository change/markdown/wiki guards as applicable.

## Planned-impact.v1, four planes

| Plane | Intended result | Proof |
| --- | --- | --- |
| Product | No change to selected player behavior or unratified product mechanics | Inspect `docs/product/README.md` and relevant invariants |
| Technical | Reconcile specified authoritative topology, delivery and networking/event owner headings | Semantic diff including source/current/proposed/proven labels |
| Code | No runtime or app code changes; documentation-only packet | Documentation and link checks |
| Related | Runbooks, indexes, Change queue and factual STATUS if realized | Link/impact-guard and change receipt |

## Closure and lifecycle

- Execute only on explicit owner selection, with predecessor receipts verified.
- Before Done fill owner-by-owner reconciliation (heading, source SHA, expected delta, actual diff, evidence, negative test, link updates).
- Archive using standard lifecycle. Do not automatically select the next Change.
