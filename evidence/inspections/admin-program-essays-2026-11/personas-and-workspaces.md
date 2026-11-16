# Personas, workspaces and daily operating experience

**Status:** Proposed product taxonomy, 2026-11-14. **Owns:** who uses Admin, the intended workspace boundaries, cross-workspace navigation and personalized work experience. Access decisions belong to [authority and delegation](authority-and-delegation.md); this taxonomy does not grant permissions.

## Personas are responsibility patterns, not security roles

| Persona | Everyday job | Typical read needs | Typical requested actions |
| --- | --- | --- | --- |
| Customer Support | Resolve account, access and gameplay complaints | Player profile, current entitlement, failures, support history | Case response, low-risk compensatory grant, escalation |
| Customer Success | Improve onboarding, retention, valuable-account service | Account journey, engagement, legitimate relationship history | Outreach coordination, approved service remedies |
| Engineering | Diagnose system and AI pipeline failures | Execution traces, state transitions, incidents, release changes | Attach findings, request controlled mitigation |
| Game Design / LiveOps | Protect game quality and evolve live behavior | Campaign configuration, regressions, experiments, cohorts | Prepare/approve controlled game changes |
| Product | Understand adoption and journeys | Funnels, activation, dropout, experience evidence | Propose product experiment, follow results |
| Finance / Revenue Operations | Ensure accurate billing and sustainable economics | Subscriptions, payments, grants, margin, exceptions | Refund/adjustment within authority, financial exception review |
| Marketing / Growth | Acquire and activate customers | Aggregate and permitted cohort data, promotion performance | Campaign proposal, eligibility/offer definition |
| Trust & Safety | Triage abuse and reports fairly | Relevant reports, scoped evidence, enforcement history | Restrictions, appeal review, safety escalation |
| Security / Staff Administration | Govern employees and privileged operations | Effective access, staff identity, access/audit records | Invite, suspend, grant/revoke scoped capability packages |
| Leadership | See business and operational direction | Reliable KPIs, exceptional incidents, exposure | Review decisions, request actions within own capabilities |

An employee may act in several personas during one day. Example: a founding engineer can have technical diagnostics, a limited support toolkit and aggregate business metrics without being allowed to export all private narratives, approve their own major refund or grant arbitrary employee powers.

Do not predefine an endless list of compound roles. The persona expresses a **job**; a reusable capability package expresses **authority**.

## Proposed top-level workspaces

| Workspace | Primary question answered | Owns in the operator experience | Must not become |
| --- | --- | --- | --- |
| **Command Center** | What needs *my* attention now? | Work queue, assigned cases, alerts and relevant metrics | Every department's 40-chart dashboard |
| **Players & Accounts** | Who is this player and what is their effective state? | Search, Player 360, identity/account status | Billing or storytelling data owner |
| **Support & Cases** | What is wrong, who owns the response, is it resolved? | Case lifecycle, notes, escalation, customer-visible outcomes | Unstructured staff notes without evidence |
| **Gameplay & Worlds** | What happened in this story, and why? | Campaign state/history, continuity forensics, diagnostic inspection | Unbounded production game-state editor |
| **AI & Engineering** | What did a system/model operation do, and where did it fail? | Execution investigation, reliability, model costs, incidents | Raw infrastructure root console |
| **Live Operations** | Which game behavior is active, for whom, and what can be changed safely? | Configuration visibility, releases, cohorts, experiments, mitigation | Unreviewed production prompt/code editor |
| **Commercial** | What is owed, granted, consumed, charged and economically viable? | Plans, billing relationships, entitlements, allowances, adjustments, revenue | A homemade payment processor |
| **Growth & Insights** | How do players arrive, activate, convert and stay? | Coherent metrics, segments, campaign outcomes | General access to private story content |
| **Trust & Privacy** | Is a report or data request handled lawfully and fairly? | Abuse reports, restrictions, appeals, privacy-request workflow | Universal secret access for moderators |
| **Access & Governance** | Who can do what, why, and who did it? | Staff lifecycle, capability assignments, approvals, audit | An always-on superadmin free-for-all |

This is a **logical information architecture**. Workspaces can have different navigation density or subviews later, but they must share subjects, identities, links and a consistent meaning of status.

**Specialist workspace product specs:** [Support & Customer Success](support-and-customer-success-product.md), [Gameplay](gameplay-worlds-product.md), [AI & Engineering](ai-engineering-operations-product.md), [LiveOps](live-operations-product.md), [Commercial](commercial-operations-product.md), [Growth & Insights](growth-and-insights-product.md), [Trust & Privacy](trust-and-privacy-product.md), [Command Center](command-center-product.md) and [Access & Governance](access-and-governance-product.md). [Player 360](player-360-service-blueprint.md) details Players & Accounts. Their boundaries are challenged by [cross-workspace coherence](cross-workspace-product-review.md) and [adversarial review](product-adversarial-review.md). Links are not grants of authority or proof of implemented routes.

## Cross-workspace design rules

1. **Global search:** allow direct lookup by permitted player, campaign, operation, support case, subscription or incident identifiers. Results, metadata, suggestions and counts must not leak unauthorized records.
2. **Object context:** any workspace can open the same Player 360, campaign or execution record, filtered to the operator's permitted fields and actions.
3. **Deep links and handoffs:** authorized coworkers can follow a link from case -> campaign -> execution -> incident and back. The link never grants permissions by itself.
4. **Contextual actions:** present relevant operations beside the subject, explaining missing permissions or approval requirements. Avoid silently dropping an expected action when the user needs to request access.
5. **Consistent status vocabulary:** pending, blocked, failed, completed, reversed and partially completed must not be conflated.
6. **Work queues:** assignments, approvals, time-sensitive incidents and unresolved cases have actionable owners; notification overload is not a product goal.

## Command Center: personalized, not omniscient

- Support: assigned cases, escalations, overdue responses, known service incidents affecting customers.
- Engineering: live incidents, relevant execution failures, regressions and recent releases.
- LiveOps: active configurations/experiments, quality signals and scheduled interventions.
- Finance: billing exceptions, unusual grants/refunds, revenue and cost anomalies.
- Growth: conversion/activation/cohort movement and campaign outcomes.
- Leadership: business health, service reliability, retention, spend and significant risk.

A person with overlapping responsibilities can compose sections without consuming unauthorized data. Users should be able to save permitted views and investigations.

## Workspace boundary examples

- Support and Engineering investigate the **same failed turn**. Support sees player impact and service remedy; Engineering sees operation evidence, timing, errors and relevant configuration. Private story text remains separately gated.
- Growth and Finance evaluate the **same promotion**. Growth sees cohort eligibility and conversion; Finance sees grants and economic exposure. Neither requires unrestricted access to personal narratives.
- Trust and Support investigate the **same restricted player**. Trust handles enforcement decision; Support explains the permitted customer-facing result, not confidential investigation material.

## Design questions still open

- Will external community moderators ever enter this console, or require a separate limited product?
- Should internal cases be fully native, or an experience over an external helpdesk? The player-context and intervention workflow remain native regardless.
- Which surfaces deserve a global operator search versus specialized domain searches?
- What operational metrics are genuinely live and what are daily aggregates?

These are product questions for owner review, not excuses to invent technical architecture before the product is settled.
