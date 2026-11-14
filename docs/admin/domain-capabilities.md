# Admin domain capabilities | commercial, gameplay, AI, LiveOps, growth and trust

**Status:** Proposed product requirements, 2026-11-14. **Owns:** domain-level administrative experience and product boundaries. This is not a technical plan, billing-provider choice or claim that current metrics exist. Related investigation context: [Player 360](player-360-and-entities.md); intervention model: [workflows](operations-and-workflows.md).

## 1. Commercial and customer economics

Do not reduce the commercial state to a single "free/premium" field. Staff must distinguish:

| Concept | What it answers |
| --- | --- |
| **Offering / plan** | What does the company sell and promise? |
| **Subscription** | What is the customer's commercial billing relationship and lifecycle? |
| **Entitlement** | Which product capability is effectively available and why? |
| **Allowance / quota** | What may be consumed, in which period or under which limits? |
| **Usage** | What was actually consumed and attributed to whom/what? |
| **Adjustment / grant** | What one-off, temporary or permanent exception was deliberately issued? |
| **Provider cost** | What did the company spend to provide service, including retries and diagnostics? |

The Commercial workspace should manage offering policies and versions, view subscription states, explain effective entitlements, handle permitted refunds/compensation, inspect allowance use and identify unusual economics.

**Illustrative customer remedy:** a paid player suffered multiple failed generations. Support may, with the correct capability and limit, issue an additional 20-turn grant expiring in 30 days. The grant has reason, source case, authority, expiry and independent history. It does not mutate the historical usage ledger, silently replace the subscription or invent a new paid tier.

A player's **fictional money/time/inventory** is not a commercial subscription allowance. Neither may be silently exchanged for provider charges.

### Unit-economics experience

A mature dashboard should help answer:
- cost per active free account and paid account over a defined window;
- cost per successful gameplay turn/session, separated from retries and failed work;
- gross margin by offering/cohort and exposure to unusual usage;
- cost drivers: model, task class, context length, unnecessary inference, sandbox vs live;
- whether quality/reliability changes coincide with retention, conversion or churn.

Definitions, time windows, attribution coverage, data freshness and uncertainty must be visible. An estimated provider cost is not an actual payment; an observed cohort correlation is not automatically causal.

## 2. Gameplay & Worlds: game-state forensics

The operator must be able to inspect the **authoritative game**, not just a transcript.

Five complementary perspectives:
1. **Campaign overview:** lifecycle, participants, active rules/storyteller configuration, health, progression.
2. **Current world state:** committed characters, places, relationships, inventory, resources, fictional time and facts, only where relevant to that campaign.
3. **Narrative/published chronology:** what the player actually saw or committed, and associated choices or developments.
4. **State evolution:** why and when a durable state value changed, and the causal command/event/execution.
5. **Execution diagnostics:** relevant evidence and context provided to the Storyteller, task outcome, bounded proposals, validation, persistence/publication outcome and spend.

The purpose is to distinguish **narrative contradiction, retrieval omission, invalid proposal, settlement failure, pending asynchronous work and display mismatch**.

The engine remains authoritative over D&D-like rules, time, permissions and committed consequence. Admin repair should use well-defined product interventions, not free-form "rewrite the world" powers. If a new fact was never committed, the UI must not portray it as established truth merely because model prose mentioned it.

### Diagnostic laboratory

A future Admin may offer an isolated snapshot of a problematic campaign for:
- investigating recorded state and relevant version;
- inspecting or replaying the actual recorded inputs/outcomes where available;
- testing a candidate fix with a **fresh, explicitly labeled simulation**;
- comparing alternate model/storyteller versions and their quality/cost;
- preserving a report to attach to an incident or case.

This overlaps conceptually with the existing developer-only [Chamber laboratory](../technical/chamber-lab-protocol.md) and [design target](../engineering/targets/chamber-laboratory.md). **Do not create a competing second sandbox by assumption.** Product design should eventually specify which Chamber capabilities graduate into governed Admin workflows, and which remain developer-only. Reuse or architectural integration is for technical design.

## 3. AI & Engineering operations

Expected experience:
- inspect an execution's **meaningful lifecycle** and provenance, not only HTTP logs;
- see model/task routing, configuration/release identity, latency, usage/cost, errors, retries, recovery and publication state, as available;
- correlate failures with player campaigns, sessions, incidents, grants and affected cohort;
- understand context lineage and why specific evidence was available or unavailable to the model;
- make it possible to compare outcomes safely and explain player-facing impact;
- expose scoped technical controls for mitigations without becoming unrestricted infrastructure management.

### AI quality is partly qualitative

Track a mix of reliable mechanical signals (invalid world effects, failed operations, stuck actions, state contradictions where detectable), player feedback, sampled evaluation, and human review of narrative quality (continuity, agency, repetition, coherence, quality relative to the selected storyteller).

**Never claim one automatic "story quality score" is objective truth.** Some stories deliberately choose quiet, unusual or repetitive rhythms; quality must be interpreted relative to their declared setting and style. Respect [product game vision](../vision.md) and [Storyteller product-quality constitution](../storyteller-architecture/vision-and-quality-constitution.md).

## 4. Live Operations and controlled releases

A mature LiveOps workspace should show:
- available and active storyteller/rules configurations and which populations use them;
- draft versus approved versus active versus rolled-back state;
- staged release / cohort eligibility / experiment assignments where supported;
- expected affected players and existing-campaign implications;
- signals of regressions: errors, cost changes, measured quality, player complaints;
- approved rollback, emergency disable or safe pause, with authoritative result.

### Persistent-campaign policy is an open product decision

For each meaningful type of update, define whether existing stories remain pinned to a version, adopt compatible changes or migrate via an explicit controlled process. This cannot be inferred from what seems easiest to deploy.

Rollback must not falsely claim it undid already committed historical consequences. A configuration rollback and a state repair are different interventions.

Admin should not become a production editor for arbitrary TypeScript, SQL, or unreviewed model prompts. It may control rollout of reviewed configurations; exact authoring/approval boundary remains for the later product decision.

## 5. Product analytics, Growth and experimentation

Questions to answer:
- **Acquisition:** from where did legitimate new players arrive?
- **Activation:** did they move from preview/signup to a first real meaningful story commitment?
- **Engagement:** are they returning to accepted activities and narrative decisions?
- **Retention:** which cohorts keep playing over defined periods?
- **Conversion:** who moves from free to paid and why?
- **Dropout/churn:** where do players abandon or cancel, and what complaints or service failures accompany it?
- **Experimentation:** did a release, onboarding change or offer plausibly improve outcomes, with relevant confounders and sample coverage?

Growth may manage permitted cohorts and promotional offers. Marketing should not receive unrestricted private narratives or raw cross-account exports by default. Aggregate counts, eligibility logic and consent/communication status should be explicit.

## 6. Trust & Safety and privacy

Support controlled abuse investigation, content reports, enforcement history, appeals, account restrictions, access/correction/deletion requests and coordination across relevant processors/systems.

**Private player narratives deserve explicit protection.** Administrative work should use masked metadata or summaries where sufficient. Raw story text, unredacted AI context, confidential case material, payment data and mass export must have distinct authority and purpose.

Privacy workflows must record verification, scope, outstanding dependencies, legal/retention restrictions and truthful completion. A delete button is not a substitute for a defined deletion policy, including shared campaign participants and external-provider copies.

Trust decisions must be fair, attributable and reviewable. Unusual story content alone does not automatically establish abuse.

## 7. Business reporting and Command Center

The leadership view connects three dimensions:
- **Players:** activation, engagement, retention, feedback;
- **Business:** subscriptions, net revenue, conversions, churn, provider cost/gross margin;
- **Operations:** reliability, incidents, failed/expensive generations, gameplay integrity.

Every report should reveal the measured population, definition, observation interval, data freshness and important missing coverage. Real-time operations and delayed commercial aggregation are not interchangeable.

An operator with several responsibilities can compose permitted work queues without seeing unauthorised data.

## 8. Native versus integrated responsibilities

Prefer a **native, cohesive operator workflow** for accounts, game diagnostics, authority, interventions, grants, cases' connection to product facts, and audit. Integrate with specialized payment processing, communications/helpdesk, infrastructure observability and analytics where sensible.

The Admin must expose source, freshness and failed/out-of-sync integration state. Avoid creating parallel writable sources of truth merely because one team wants a convenient screen.

No specific billing, identity, helpdesk, analytics, telemetry or campaign vendor is selected by this product doc.

## Exceptional and negative cases

- A purchased plan does not immediately imply an effective entitlement after a failed provider synchronization.
- A failed model attempt may cost money without producing a billable or accepted player turn.
- An AI quality regression may be serious even if HTTP error rates remain healthy.
- A game-state repair cannot claim to rewind fictional elapsed time or previously witnessed events without an explicit supported policy.
- A promotional grant cannot silently override abuse restrictions or contractual limitations.
- An employee with analytics access cannot infer or export private story content through a conveniently detailed dashboard.
- A partial data deletion cannot be represented as complete while relevant records/processors remain unresolved.
- A rollback cannot erase already committed game consequences.
