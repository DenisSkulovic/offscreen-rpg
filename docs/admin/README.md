# Offscreen Control | Admin platform product design

**Status:** Proposed product vision, 2026-11-14. Owner review required. **Product design only:** no technical architecture selected, no implementation Changes drafted, no code authorized. This is a long-term target, not a claim about the existing app.

**Owns:** the internal administration and operations product for Offscreen RPG. **Does not own:** player gameplay UX, in-game Storyteller decisions, existing engine implementation, technical auth/storage designs or the implementation queue. The [platform ecosystem](../experience/platform-ecosystem.md) already separates the operator console from player/public experiences. The [product vision](../vision.md) and [game domain](../concepts.md) remain owners of gameplay intent.

## Choose the product question

| Question | Product document |
| --- | --- |
| Why does Admin exist; what are the enduring rules and boundaries? | [Product charter](product-charter.md) |
| Who uses it, how do responsibilities overlap, what workspaces exist? | [Personas and workspaces](personas-and-workspaces.md) |
| How are accounts, campaigns, executions, cases and subscriptions investigated together? | [Player 360 and entity model](player-360-and-entities.md) |
| What does staff authority mean; how do approvals and impersonation differ? | [Authority and delegated access](authority-and-delegation.md) |
| How do support, incidents and interventions work from report to resolution? | [Operations and workflows](operations-and-workflows.md) |
| What are commercial, game, AI, LiveOps, analytics and trust responsibilities? | [Domain capabilities](domain-capabilities.md) |
| What remains uncertain, and what is required before technical design? | [Decisions and readiness gates](decisions-and-readiness.md) |
| How does overlapping authority behave in real staff journeys? | [Authority operating policy](authority-operating-policy.md) |
| How does Player 360 handle shared stories, payer/beneficiary separation and evidence? | [Player 360 service blueprint](player-360-service-blueprint.md) |
| What should an operator actually experience during critical workflows? | [Operator journeys and interaction contracts](operator-journeys-and-interaction-contracts.md) |

Read one owner for the question; do not preload the entire suite for a narrow decision.

## Product thesis

**One internal operations product, several overlapping professional workspaces, shared entities, composable authority, attributable interventions.** The Admin is neither a superior player account nor a generic CRUD dashboard. Its work is to make the player experience **operable, explainable, supportable, financially sustainable and governable** at thousands-of-users scale.

The intended users include Support, Customer Success, Engineering, Game Design/LiveOps, Product, Finance, Marketing/Growth, Trust & Safety, Security/Administration and Leadership. These are **personas**, not mutually exclusive role definitions.

## Strict design sequence and authority

1. **Product design (current):** specify end-state outcomes, journeys, information architecture, authority expectations, sensitive-data boundaries, negative cases and open choices. Obtain owner review; reject incoherent or unsafe interactions. Documentation changes are not implementation Changes.
2. **Technical design (future, after product gate):** translate selected product guarantees into architecture, identity/session model, access evaluation, audit/action contracts, data sources, reliability, observability, API/UI boundaries, retention and integration plans. Inspect the source then, but do **not** let present code dictate desired product.
3. **Implementation program and Change dossiers (future, after technical gate):** define small, code-bearing, independently verifiable Changes under [docs/changes](../changes/README.md), each with a normal and negative case, dependencies and a Cursor handoff. Proposed is not Ready. Only the owner selects/authorizes coding.

**No Admin Change folder or technical contract should be inferred from these Markdown proposals.** Keep the current Change queue unchanged while Cursor is working on unrelated authorized tasks.

## First review focus

Start with [authority and delegation](authority-and-delegation.md), its [operating-policy deep dive](authority-operating-policy.md), and [Player 360](player-360-and-entities.md) with the [shared-campaign service blueprint](player-360-service-blueprint.md). Test their behavior against [operator journeys](operator-journeys-and-interaction-contracts.md) and [cross-team workflows](operations-and-workflows.md). Resolve the explicit decision log before calling the product specification settled.

## Status language

- **Target / recommended:** authored proposed end state, pending owner approval.
- **Conditional:** plausible future capability depending on business need, legal obligations or mature infrastructure.
- **Open:** explicitly requires a decision; do not silently select a default.
- **Not implemented:** this doc does not claim source evidence, tests, production capability or provider integration.

No tests, provider calls or deployment are authorized by these files.
