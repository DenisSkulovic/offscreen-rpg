# ARCH02 | Distributed service ownership and message delivery contract

**State:** Proposed (2026-11-19)  
**Kind:** documentation  
**Execution selection:** None. Do not auto-run.  
**Program:** [Distributed architecture lab queue](../../README.md)

## Outcome

Ratify proposed service ownership for web/API, engine, storyteller, optional media generation, SaaS billing/entitlements if warranted, notifications, including the separation between authoritative commands, business events, and Temporal workflows.

## Authority and prerequisites

- **Prerequisites:** ARCH01; precedes K8S08.
- **Current implementation:** modular monolith and Compose remain source-observed as of 2026-11-19. ARCH01 must reconcile the target without pretending migration is done.
- **Authoritative owners:** `docs/technical/platform/topology.md#runtime-shape`, `docs/technical/platform/execution-and-delivery.md`, `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/http-api-and-client-contracts.md`, `docs/technical/README.md`.
- **Source reinspection required:** inspect latest GitHub HEAD and current Change owners before implementing. No presumption that the lab or prior Changes have actually completed.
- **Risk permission:** no provider spend, destructive persistent-volume actions, public traffic, credential disclosure or application-code extraction without explicit owner decision.

## Planned implementation or specification delta

**First reconcile proposed services against the actual game vision**: [vision](../../../../docs/product/foundations/vision.md#the-d-d-foundation), [D&D rules](../../../../docs/product/gameplay/rules.md#world-independent-foundation) and [engine capabilities](../../../../docs/technical/engine/mechanics-and-capabilities.md). The LLM Storyteller fills the Dungeon Master role (scene interpretation, narration and proposals), while the deterministic engine validates rules, rolls dice, advances admitted fictional time and commits consequential typed world/character facts. This is a text-first, world-neutral D&D-like game, not an economy simulator. No mandatory gold, object census, inventory, shops, farming or employment systems; when a narrative item or equipment matters, record only the relevant supported possession/effect under game authority. An optional list of gear is legitimate D&D bookkeeping, not a separate Economy microservice. Respect pinned revised-fifth-edition SRD 5.2.1 subset; do not claim full edition coverage.

**Propose, do not assume, the actual process split:** web and API/identity; deterministic game authority; Storyteller/DM orchestration and model activity workers; optional illustration/media processing; notifications/delivery; real-world SaaS billing/entitlements only if deployment isolation justifies it. The last two are platform concerns, not fictional world systems. Other boundaries may be consolidated or split with justified scale, failure isolation or ownership evidence. No service per NPC, item, faction, inventory or fictional economy. For each chosen process, document responsibility, authoritative write ownership, ingress and egress commands/events, synchronous calls, Temporal workflow participation and dependency failure semantics. Document durable outbox/inbox, deduplication, event IDs, aggregate/version keys, schema evolution, consistency and provider-spend authority. Explicitly distinguish selected target from current modular monolith. No code or invented gameplay features.

**Out of scope:** full product rollout, shared production cluster, paid LLM or image calls, real Stripe calls, full game-service extraction. Reuse existing source owners and don't create duplicate planning authority.

## Acceptance: positive and negative

- **Positive:** A justified service-boundary table (including rejected Economy and optional media/billing), authoritative write and world-fact ownership, commands/events, dependents and failure policy; negative scenarios for duplicate dice/effects, fictional-money assumptions in a microbe story, out-of-order events and schema changes. Validate links and canonical docs.
- **Negative:** A replay cannot duplicate an admitted D&D roll, item transfer or other committed effect; an imaginary market/economy cannot be introduced as a service. One PostgreSQL cluster does not grant arbitrary cross-service writes.
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
