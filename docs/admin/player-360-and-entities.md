# Player 360 and the connected operational entity model

**Status:** Proposed product design, 2026-11-14. **Owns:** how authorized staff understand the player and navigate related business/game records. This defines product concepts and investigation experience, **not** storage schemas, APIs or the actual current code. Permissions: [authority and delegation](authority-and-delegation.md). Detailed solo/shared-campaign, payer/beneficiary and operator experience: [Player 360 service blueprint](player-360-service-blueprint.md).

## Center of gravity: the player relationship

The **Player 360** profile is the central investigation surface: an authorized operator can understand who the account belongs to (as permitted), its effective product access, active games, recent activities, support history and relevant administrative interventions without stitching together disconnected dashboards.

A Player 360 is not a dump of every fact the organization possesses. It is a **purposeful, permission-aware view** with expandable detail, timestamps, source of truth and useful next actions.

### Suggested experience areas

| Area | What the operator should learn | Sensitive boundaries |
| --- | --- | --- |
| **Summary** | Stable internal account reference, account state, plan/access summary, current games, recent relevant incidents and cases | Summary must not expose protected details implicitly |
| **Account and identity** | Registration, authentication/provider state, status, authorized contact channels, account recovery context | Contact/identity information separately permissioned; no secrets |
| **Commercial** | Plan, subscription/billing state, effective entitlements, allowance balances and periods, consumption, compensatory grants | Sensitive finance, refund and payment operations separately controlled |
| **Campaigns and worlds** | Game list, lifecycle, active configuration, health and current authoritatively known state | Private narrative and detailed game records separately gated |
| **Activity and operations** | Important session/turn events, failed or pending executions, relevant cost/latency | Raw diagnostics may include sensitive player or model context |
| **Support** | Open/closed cases, communication context, support notes, escalation and remedy history | Private case notes and confidential Trust data not universally visible |
| **Administrative history** | Explicit grants, restrictions, delegated sessions, repairs and other consequential staff actions | Audit detail itself is permissioned and protected from editing |

The profile should emphasize **effective reality** rather than raw settings. Example: "Access to premium storyteller: available through active subscription until the verified period boundary; additional grant expires earlier." The operator should be able to inspect the reasons for this conclusion.

### Contextual actions

Depending on authority and situation: view-as-player preview, open or link a support case, inspect a campaign, investigate an execution, request or apply a limited allowance, review a restriction, request an account repair, and begin a controlled delegated session.

The interface must distinguish:
- **View permitted** from **action permitted**;
- **Action request allowed** from **execution already approved**;
- **Scheduled/attempted** from **verified complete**;
- **Potential remedy** from **guaranteed safe and reversible remedy**.

Do not tempt operators into using impersonation as a universal diagnostic shortcut.

## Shared entity catalog (conceptual)

| Entity | Distinct product meaning | Useful relationships |
| --- | --- | --- |
| **Staff identity** | The human or authorized internal principal operating Admin | Capability packages, access history, requests, actions |
| **Player account** | A customer/user's authenticated product identity and status | Campaigns, subscription, grants, sessions, cases |
| **Campaign / story** | Persistent playable life and its declared configuration | Player/participants, current game state, events, executions |
| **Game state / revision** | Authoritatively committed world/character resources, relationships, time and other continuity-relevant facts | Campaign, revision lineage, causal event/operation |
| **Game event / passage** | Published record of a decision, state change or narrative occurrence | Campaign, originating action/execution, affected state |
| **Player command or game operation** | A requested or accepted gameplay activity and its authoritative lifecycle | Player, campaign, admission, settlement, status |
| **Storyteller / AI execution** | One model-assisted task or execution attempt and its admissible evidence/results | Game operation, configuration version, diagnostics, costs |
| **Plan / product offering** | What is sold and what the offering promises | Feature catalog, subscriptions |
| **Subscription / billing relationship** | The commercial lifecycle, renewal, cancellation and payments | Player, plan, invoices/charges and entitlement effects |
| **Entitlement** | Actual feature or capability access and why it applies | Plan/subscription, grants, restrictions |
| **Allowance / grant** | Bounded permitted consumption, window, expiry or exception | Player, usage events, compensation/promotion |
| **Usage / cost event** | What was consumed or billed internally, with provenance | Player/campaign/execution, grant/window, provider spend |
| **Support case** | A tracked request or problem, ownership, findings and resolution | Player, related campaigns, incidents and actions |
| **Administrative action** | A deliberate staff intervention with target, reason, authority, outcome | Operator, target entity, approval, audit |
| **Approval request** | Explicit permission to execute a particular sensitive operation | Requester, approver, bounded action and expiry |
| **Incident** | Significant operational problem with impact and mitigation history | Executions, configurations, cases, actions |
| **Live configuration / release** | Versioned game/provider behavior deployed to an eligible population | Campaigns/cohorts, experiments, incidents |
| **Promotion / cohort** | Defined targeting, eligibility or experimental grouping | Offer/grant, aggregate results, player inclusion as authorized |
| **Trust case / privacy request** | Report, enforcement/appeal or verified data-subject request | Player, evidence, decisions and authorized processing |

This is a **product vocabulary**, not a decision to create one database table per noun. It does not redefine existing game-domain names in [concepts](../concepts.md).

## One evidence trail, several professional interpretations

Consider a player complaint: "My gates were destroyed yesterday; now the Storyteller insists they were never destroyed."

An authorized investigation follows:

**Player -> Campaign -> Published event -> State revision -> Storyteller execution -> Evidence/context available to that execution -> Case -> Corrective decision.**

Support should see comprehensible player impact, recurrence, known incident links and allowed remedies. Engineering should see the exact task/execution evidence and technical failure path. LiveOps should see the affected version/cohort and whether the behavior is broader. The underlying event identifier and chronology stay consistent.

**Not all employees are entitled to the same evidence.** A trace link does not confer access to raw story text, payment details or prompts.

## Every important record needs its own address

A campaign, execution, support case, grant, refund, incident, change approval and administrative action should be individually findable and linkable with a stable internal reference. The UI should show:
- what happened, whom it affected, when, and in which environment;
- originating actor: player, staff, automated process or external provider;
- current status, important transitions and source/freshness;
- related subjects and permission-aware links;
- available next investigations and authorized actions.

A single chronological view may combine heterogeneous events, but should preserve type and provenance. Do not flatten "player chose travel," "model generated prose," "grant issued," and "staff inspected story" into indistinguishable timeline entries.

## Privacy and data minimization are experience rules

- Default support summaries reveal **enough to solve ordinary problems**, not every private conversation.
- Reading unredacted narratives, protected identity attributes, sensitive financial detail, raw AI inputs and exporting many records are **distinct capabilities**.
- Show masked, summarized or structured diagnostics where they answer the operational question.
- Explain what a record can no longer show due to authorized deletion/retention or evidence unavailability; never silently fabricate missing history.
- Customer-facing data and internal-only allegations/notes must remain distinct.
- Cross-account searching, bulk actions and saved views must not unintentionally disclose unauthorized records via counts, autocomplete or shared links.

## Negative journeys to validate

1. An operator with Player Summary access but no narrative access opens a private campaign: safe summary remains usable; protected details do not leak through titles, previews, search results or related records.
2. Subscription payment succeeds but entitlement update is delayed: the UI shows sources, mismatch and uncertainty instead of a false green "Premium active" claim.
3. The player and staff access the same campaign concurrently: an investigation preview does not commit or consume resources, and a later corrective action rechecks relevance.
4. A failed execution has no retrievable prompt due to retention policy: explain the missing evidence, do not invent context.
5. An employee shares a deep link with a coworker lacking access: the recipient receives an appropriate access outcome without revealing the target record.
6. An operator sees a historical grant that has expired or been reversed: effective access and audit history remain distinguishable.

## Open product choices

Precisely which account details belong on the default summary; how much narrative context can be shown by default in a case; whether customer consent is required for different support-access circumstances; and which state repairs are user-facing recoveries versus specialist interventions. See [decision log](decisions-and-readiness.md).
