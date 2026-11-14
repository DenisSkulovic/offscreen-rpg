# Offscreen Control | Admin platform product design

**Status:** **Product direction accepted and core technical design documented, 2026-11-14.** See [product acceptance](product-acceptance-and-scope.md), [selected technical architecture](technical/README.md), and [proposed AD01–AD08 Change program](implementation-program.md). Sensitive/commercial capabilities remain conditional. No Admin application code has been authorized or implemented by these design documents.

**Owns:** the internal administration and operations product for Offscreen RPG. **Does not own:** player gameplay UX, in-game Storyteller decisions, existing engine implementation, technical auth/storage designs or the implementation queue. The [platform ecosystem](../experience/platform-ecosystem.md) already separates the operator console from player/public experiences. The [product vision](../vision.md) and [game domain](../concepts.md) remain owners of gameplay intent.

## Choose the product question

| Question | Product document |
| --- | --- |
| Which product direction did the owner accept, and what remains conditional? | [Product acceptance and scope](product-acceptance-and-scope.md) |
| How will the Admin actually be secured and built? | [Technical architecture and contract map](technical/README.md) |
| Which bounded code changes are proposed for Cursor, in what order? | [Implementation program AD01–AD08](implementation-program.md) |
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
| How do offerings, entitlements, grants, usage, refunds and cost economics behave? | [Commercial Operations workspace](commercial-operations-product.md) |
| How do staff investigate persistent worlds, published history and safe repairs? | [Gameplay & Worlds workspace](gameplay-worlds-product.md) |
| How are AI tasks, model rounds, outcomes, privacy and real cost investigated? | [AI & Engineering Operations workspace](ai-engineering-operations-product.md) |
| How are game versions, rollouts, experiments and emergency mitigations governed? | [Live Operations workspace](live-operations-product.md) |
| Do all four domains agree on causal truth and operator responsibility? | [Cross-workspace coherence review](cross-workspace-product-review.md) |
| How do customer-facing cases, escalations and proactive success work? | [Support & Customer Success workspace](support-and-customer-success-product.md) |
| How are activation, retention, cohorts and experiments defined honestly? | [Growth & Insights workspace](growth-and-insights-product.md) |
| How do restricted investigations, appeals and privacy requests work? | [Trust & Privacy workspace](trust-and-privacy-product.md) |
| What should a multi-role employee see when opening Admin? | [Command Center workspace](command-center-product.md) |
| How are staff, authority requests, privileged sessions and audits governed? | [Access & Governance workspace](access-and-governance-product.md) |
| Where could the product model fail under abuse or ambiguous outcomes? | [Adversarial product review](product-adversarial-review.md) |
| How can the owner settle key policies without answering forty scattered questions? | [Product policy decision brief](product-policy-decision-brief.md) |

Read one owner for the question; do not preload the entire suite for a narrow decision.

## Product thesis

**One internal operations product, several overlapping professional workspaces, shared entities, composable authority, attributable interventions.** The Admin is neither a superior player account nor a generic CRUD dashboard. Its work is to make the player experience **operable, explainable, supportable, financially sustainable and governable** at thousands-of-users scale.

The intended users include Support, Customer Success, Engineering, Game Design/LiveOps, Product, Finance, Marketing/Growth, Trust & Safety, Security/Administration and Leadership. These are **personas**, not mutually exclusive role definitions.

## Strict design sequence and authority

1. **Product direction: accepted (2026-11-14):** end-state outcomes and default safeguards selected; conditional commercial, legal, sensitive-access and multiplayer specifics remain explicitly gated under [acceptance](product-acceptance-and-scope.md).
2. **Technical design: selected and desk-reviewed for the bounded core.** The [technical index](technical/README.md) maps actors, policy, audit, data, UI, operations and verification. Current code was inspected but the POC does not constrain the target. Advanced/unsafe capabilities remain separately gated.
3. **Implementation program: eight Proposed Change dossiers, NOT Ready.** See [AD01–AD08](implementation-program.md). Each requires latest-source revalidation, exact dependency evidence and owner authorization before Cursor edits code. `Current change: none` remains valid.

**No Admin Change folder or technical contract should be inferred from these Markdown proposals.** Keep the current Change queue unchanged while Cursor is working on unrelated authorized tasks.

## Current product review focus

The first pass defined the charter and domain map. The second refined [authority](authority-operating-policy.md) and [Player 360](player-360-service-blueprint.md). The third specified [Commercial](commercial-operations-product.md), [Gameplay](gameplay-worlds-product.md), [AI Operations](ai-engineering-operations-product.md) and [LiveOps](live-operations-product.md). The fourth specified [Support & Customer Success](support-and-customer-success-product.md), [Growth](growth-and-insights-product.md), [Trust & Privacy](trust-and-privacy-product.md), [Command Center](command-center-product.md) and [Access & Governance](access-and-governance-product.md).

**All ten proposed logical workspaces now have a product-level owner document**, counting the Player 360/account experience. This is broad *design coverage*, not owner approval. The [adversarial review](product-adversarial-review.md) identified critical unresolved policies; the [decision brief](product-policy-decision-brief.md) groups the owner choices into manageable packages. The [decision register](decisions-and-readiness.md) remains the status owner.

**Next:** technical target design is now authorized for the accepted bounded scope; review unresolved business-policy hazards as explicit future capability gates. **Do not create or authorize Cursor Changes until the technical architecture and source-dependent verification plan are coherent.**

## Status language

- **Target / recommended:** authored proposed end state, pending owner approval.
- **Conditional:** plausible future capability depending on business need, legal obligations or mature infrastructure.
- **Open:** explicitly requires a decision; do not silently select a default.
- **Not implemented:** this doc does not claim source evidence, tests, production capability or provider integration.

No tests, provider calls or deployment are authorized by these files.
