# Admin product acceptance | direction, policy and staged scope

**Decision:** **Accepted by product owner, 2026-11-14**, by the explicit direction to trust the design judgment and continue. This accepts the mature Admin **product target and recommended default safeguards** in [the product suite](README.md); it does **not** assert that every future commercial, legal or multiplayer policy is already specified, nor authorize application implementation. **Technical design may now proceed** against the accepted target, subject to the gates below. This record is the owner decision; previous proposed notes remain design history.

## Selected strategic direction

1. **One staff-only internal operating product** with ten logical workspaces, shared subject navigation and role-composable personnel. External community moderators are outside the initial trust boundary and would need distinct limited entry policy.
2. **Separate staff principal and player identity**, even where linked to one human. Player session/preview is never privileged staff authority.
3. **Intact bounded capability grants** composed additively without cross-product escalation of verbs and scopes. Case self-assignment cannot manufacture private account access, compensation or wider authority. Staff invitations, privileged grants, approvals and executing interventions are separate powers.
4. **Metadata-first, purpose-limited observation**. Private narrative, protected identity, raw AI context, Trust records and bulk exports are separate rights with audit and legitimate purpose. Cross-workspace links do not declassify content.
5. **Player 360 distinguishes** account, campaign, participation/character, commercial payer, beneficiary, sponsor, private/shared evidence and their respective histories. Shared-game involvement never gives one participant control over others' personal data.
6. **Three explicitly separate delegated experiences**: non-mutating Player Preview; constrained, attributable, potentially consent-governed Assisted Session; isolated diagnostic Sandbox. Only Preview is a potential early-scope capability, after actual nonmutation is proved.
7. **One accountable action lifecycle**: propose/preflight/approve where required/execute/verify/compensate with real actor, purpose, scope, failure/unknown outcome. Avoid generic editing of production world state, financial history and credentials.
8. **Four interoperable truths**: commercial promises/allowances; deterministic/committed gameplay; AI task/model round/cost; operational configuration/release. Their lifecycles and statuses never collapse into one success flag.
9. **Existing world and commercial promises deserve preservation**: no silent mechanical reroll, retroactive fictional-time grant, hidden story rewrite, bulk private-content copy or destructive release rollback that purports to erase history.
10. **Small-team practical governance**: narrow everyday duties and an auditable, specifically scoped emergency protective stop for new sponsored/model spending; not a standing universal root credential.
11. **Native operational core, selective integrations**: account diagnostics, permission-safe context, action authority/audit, case-to-entity links are our product; external payment, messaging and observability components may remain external systems with honest reconciliation.
12. **Truthful reporting**: correct denominator, provenance, sampling/coverage/freshness, modeled versus actual costs, real human engagement versus fictional time or model calls. Unknown is not zero.

## What is explicitly *not* decided by this acceptance

| Policy area | Selected safe default | Scope requiring later explicit business/legal decision |
| --- | --- | --- |
| Pricing, chargeable units, tier contracts | Keep offering/subscription/entitlement/allowance/grant/usage/provider expense distinct; default no unsolicited charges | Prices, payment terms, billing lifecycle, customer metering and refund policy |
| Shared campaign roles and funding | Distinguish membership, owner, character, payer and beneficiary; no accidental rights inheritance | Multiplayer invitation/control policy, shared payer arrangements, grant allocation |
| Sensitive story evidence | Do not expose raw private narratives or model context by default | Per-action legal basis, consent/notice policies, retention/export thresholds |
| Assisted live player sessions | Disabled until supported consent/attribution and effects contract | Allowed commands, player awareness, cost attribution and participant notices |
| Production game repairs | No arbitrary writes or retroactive rerolls; observation first | Exact supported repair classes, irreversible consequences, multiplayer affected-party process |
| LiveOps incompatible upgrades | Preserve old accepted commitments and version lineage | Migration/opt-in semantics, in-flight task transitions, rollout limits |
| Trust enforcement and privacy requests | Separate confidential cases, protect complainants, trace honest partial outcomes | Applicable laws/regions, actual retention/deletion, appeal thresholds, processors |
| Customer support communications | Support cases and references are native operational concepts | External helpdesk choice, contact-channel consent, service obligations |
| Full commercial operations | Read-only diagnosis may precede write actions | Money movement, contract changes, sponsor policy after real offering decisions |
| Analytics, AI advisor and automation | Human activity and provider work separately measured; advisor has no operational authority | Exact KPIs, segment disclosure limits, model-assisted workflows |

**A deferred capability is unavailable or read-only by default**, not silently authorized with an arbitrary placeholder policy. Every later activation must settle its own operator-facing purpose, authority, privacy, spend, impact and negative cases first.

## Selected initial technical-design boundary

The first technical program may specify **safe foundational infrastructure**: authenticated staff principal, bounded authorization, permission-aware internal navigation, search/summary projections with source/freshness, read-only Player 360 and permitted operations state, baseline audit and access reviews, internal exposure/incident visibility, and case-linked evidence references. The target architecture should anticipate scoped writes, approvals, commercial and LiveOps without making them automatically available.

**No current production code is evidence of Admin capability.** Identity and story owners in today's code are player-centric. The technical target must audit source facts and preserve the existing player lifecycle rather than graft privileged behavior into player routes.

## Product acceptance gate and later gates

- **Product vision and initial bounded scope:** **Accepted** for technical architecture now.
- **Hazardous capability-specific policy:** **Conditional / deferred** as above. No global "all Admin features approved for production."
- **Technical design:** not yet approved or implemented; next phase must specify actors, trust boundaries, consent, data/authorization/command/audit contracts, failure semantics, operational controls and integration proof. It may create a dependency program after its architecture review.
- **Code-bearing Change folders:** only after coherent technical contracts and source-owner/dependency analysis, each with a falsifiable negative case; proposed packets are not automatically Ready or selected for Cursor.
- **Live launch:** subject to the relevant commercial, security, privacy, provider-spend and operational validation, not guaranteed by writing design docs.

## Explicitly resolved P0 decision dispositions

| Item | Disposition |
| --- | --- |
| AD-P01 | **Selected:** internal staff-only console; external moderation deferred |
| AD-P02 | **Selected conceptual boundaries:** account/member/character/payer/beneficiary distinct; exact multiplayer rights deferred |
| AD-P03 | **Selected:** bounded capability packages, separate staff governance; exact initial package catalog technical draft pending review |
| AD-P04 | **Selected:** scope/purpose/expiry/conflict and approvals as dimensions; numeric thresholds deferred until specific writes |
| AD-P05 | **Selected:** metadata-first, private narrative separately purpose-authorized; exact consent/retention policy deferred |
| AD-P06 | **Selected:** preview/assist/sandbox separation; live assistance and sensitive preview behavior conditional |
| AD-P07 | **Selected:** no general arbitrary world-state editor; bounded repair taxonomy deferred |
| AD-P08 | **Selected:** native case linkage/action context; dedicated helpdesk vendor decision deferred |
| AD-P09 | **Selected:** commercial concepts and read-only explainability; actual paid offering policy deferred |
| AD-P10 | **Selected:** protect captured campaign promises and future-only rollback; incompatible migration policies deferred |

The [adversarial review](product-adversarial-review.md) remains a required acceptance basis for each later privileged capability. This document resolves **design direction**, not unanswered financial, legal or engineering facts.
