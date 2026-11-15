# Offscreen Control | Admin platform product design

**Status (reconciled 2026-11-15):** Product direction accepted; **AD01–AD08 Done** (first-wave staff session, grants, Player 360 reads, `/control` shell, diagnostics, usage, access/audit, case anchors). See [implementation program](implementation-program.md), [technical index](technical/README.md), and [post-AD source baseline appendix](technical/source-baseline-2026-11-14.md#post-ad-implementation-baseline--2026-11-15). Sensitive/commercial capabilities remain conditional. **No production Support grant issuer** — OBS06/07 Situation UI works only in synthetic/disposable grant fixtures.

**Owns:** the internal administration and operations product for Offscreen RPG. **Does not own:** player gameplay UX, in-game Storyteller decisions, engine mechanics authority, or the Change selection queue ([docs/changes/README.md](../../changes/README.md)).

**Forensic Support slice (OBS01 + OBS06/07):** OBS01 S1 operation coverage is in Admin diagnostics reads. [OBS06](../observability/evidence/obs06-case-scoped-situation-read-2026-11-15.md) / [OBS07](../observability/evidence/obs07-support-situation-ui-2026-11-15.md) are **Done in synthetic scope** (Nest/Next/Playwright permission + redaction). Trusted production `support-investigator` case/campaign grant issuance is **absent** ([trial review](../observability/evidence/independent-connected-trial-review-2026-11-15.md#5-support-is-real-in-test-but-blocked-by-governance)). Full Turn Capsule workbench and raw-evidence disclosure remain **not** implemented.

## Choose the product question

| Question | Product document |
| --- | --- |
| Which product direction did the owner accept, and what remains conditional? | [Product acceptance and scope](product-acceptance-and-scope.md) |
| How will the Admin actually be secured and built? | [Technical architecture and contract map](technical/README.md) |
| Which AD01–AD08 slices landed, and what remains gated? | [Implementation program AD01–AD08](implementation-program.md) (**Done**; historical first-wave) |
| What exists in source after AD01–AD08 + OBS06/07? | [Source baseline + post-AD appendix](technical/source-baseline-2026-11-14.md) |
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
3. **Implementation program: AD01–AD08 Done** (2026-11-14). See [AD01–AD08](implementation-program.md) and evidence under `docs/programs/admin/evidence/`. Further Admin work is selected only via [docs/changes/README.md](../../changes/README.md) — not by re-reading these design docs as authorization.

**Still open (not Done):** production Support grant stewardship; commercial/refund/repair/LiveOps writes; raw narrative export; broad Trust execution.

## Current product review focus

The first pass defined the charter and domain map. The second refined [authority](authority-operating-policy.md) and [Player 360](player-360-service-blueprint.md). The third specified [Commercial](commercial-operations-product.md), [Gameplay](gameplay-worlds-product.md), [AI Operations](ai-engineering-operations-product.md) and [LiveOps](live-operations-product.md). The fourth specified [Support & Customer Success](support-and-customer-success-product.md), [Growth](growth-and-insights-product.md), [Trust & Privacy](trust-and-privacy-product.md), [Command Center](command-center-product.md) and [Access & Governance](access-and-governance-product.md).

**All ten proposed logical workspaces now have a product-level owner document**, counting the Player 360/account experience. This is broad *design coverage*, not owner approval. The [adversarial review](product-adversarial-review.md) identified critical unresolved policies; the [decision brief](product-policy-decision-brief.md) groups the owner choices into manageable packages. The [decision register](decisions-and-readiness.md) remains the status owner.

**Next:** unresolved business-policy hazards remain future capability gates. New Admin code requires a selected Change packet — design acceptance alone is not authorization.

## Status language

- **Target / recommended:** authored end state; may exceed what is implemented.
- **Implemented (bounded):** AD01–AD08 + OBS06/07 synthetic Support Situation — see evidence and post-AD baseline.
- **Conditional / open:** commercial, legal, sensitive-access, production grant issuer.
- **Not claimed:** production Support operations, paid provider Admin tooling, or full forensic workbench.
