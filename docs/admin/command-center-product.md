# Command Center | personalized work, signals and reliable context

**Status:** Proposed operator-facing product target, 2026-11-14; owner review required. No implementation authority. **Owns:** the cross-workspace home experience, personal work queues, alert/metric presentation, global permitted search and next-action navigation. **Does not own:** raw domain data, independent permission grants, case/incident source of truth, metric computation or administrative mutation. See [personas](personas-and-workspaces.md), [authority](authority-operating-policy.md), [Support](support-and-customer-success-product.md), [AI Operations](ai-engineering-operations-product.md), [Growth](growth-and-insights-product.md) and [Governance](access-and-governance-product.md).

## 1. Thesis: a shift-start surface, not a panopticon

An operator opens Admin and asks: **What requires my attention, what changed, what can I legitimately do, and where do I go?**

The Command Center is a **permission-aware composition** of work already owned by Support, AI/Engineering, LiveOps, Commercial, Trust, Growth and Governance. It does not create a new global administrator role or become a parallel database of copied metrics.

An employee with Support and Engineering packages may see both assigned cases and incident actions, but **their permissions remain intact and separately scoped**. A CEO may want company metrics without permanent access to every player's private narrative. Personalizing a dashboard must not expand access.

## 2. Key operator surfaces

| Surface | Purpose | Essential promise |
| --- | --- | --- |
| My Work | Unfinished tasks, assigned cases, approvals and required responses | Every item has a real owner and next action |
| Operational Signals | Relevant incidents, provider degradation, unusual cost or rollout health | Currentness, severity, confidence and source shown |
| Saved Context | Recent permitted entities, pinned cases, saved searches or workspaces | Opening again rechecks present authority |
| Metrics at a Glance | Small curated dashboard sections for operator's jobs | Definition, time range and freshness, not metric theater |
| Global Finder | Find permitted account, campaign, operation, case or incident by reference | No search-result metadata leaks or bypasses |
| Pending Decisions | Exact approval/exception requests and required review | Request/approve/execute roles never collapsed |
| Cross-team Handoffs | Received escalations and needed response | Evidence is referenced with permissions, not copied indiscriminately |
| Broadcast / Known Issues | Authoritative service notices, release/incident advisories | Operator knows audience and validity period |

A board can be customized within entitlement and role scope. It is not a custom SQL query editor. A useful default exists for new staff without requiring an hour of widget configuration.

## 3. Personalized role examples

| Operator | Priority work | Suggested context |
| --- | --- | --- |
| Support Intake | New/assigned cases, known customer outages, awaiting reply | Player access diagnostics and safe policy notices |
| Support Resolution + Engineering | Assigned cases, technical escalations, failed operation investigations | Shared reference from case to execution with separately gated evidence |
| Customer Success | Onboarding interventions, opted-in follow-ups, unresolved adoption obstacles | Product journey, not private story transcript |
| Revenue Operations | Payment/entitlement mismatches, pending refunds and usage anomalies | Source/freshness and allowed financial actions |
| LiveOps / on-call | Active incident, rollout pause, cost-stop guardrails | Actual exposure and affected campaigns |
| Growth/Product | Activation/return/experiment trends, action-needed reviews | Valid population definitions and business caveats |
| Trust & Privacy | Restricted case queue, eligible appeals and time-bound rights requests | Protected access, not broadcast case titles |
| Staff Administrator | Pending invitations, expiring grants, access reviews and privileged requests | Reviewable authorization provenance |
| Leadership | Coherent business health and exceptional operational risk | Aggregate views; no blanket narrative access |

A multi-role staff member should control whether sections are collapsed or grouped by job. A permission change updates the *effective view* and invalidates old shortcuts; cached personalization is never permission authority.

## 4. Work-item anatomy and prioritization

Every item should answer:
- **What:** case, incident, approval, reconciliation, review, rollout or staff request?
- **Who owns it:** current team/person and escalation recipient.
- **Why now:** risk, deadline, dependency, changed verified state or assigned follow-up.
- **Which subject:** safe account/campaign/action reference within permitted metadata.
- **What evidence:** link to owning record, timestamp, status, freshness and confidence.
- **What next:** open, acknowledge, request review, investigate or execute *only through owning workflow*.
- **What happens if ignored:** user impact, financial exposure, compliance window or operational risk, only if verifiably known.

**Priority is not simply payment tier.** A free user's serious private-data disclosure can outrank a minor premium UI complaint. A mere row count is not severity.

No auto-resolve button on a dashboard should bypass underlying subject preflight or approval. An approval item must show the bounded proposed effect before decision; clicking a card is not authorization to execute.

## 5. Information freshness, unknown and competing signals

Operational views often mix:
1. **Near-live state** such as active incident/stop conditions.
2. **Eventually refreshed operational state** such as task/case or provider status.
3. **Periodic analytical aggregates** such as retention, finance and conversion.

The interface distinguishes verified current, recent observation, delayed aggregate, stale, unavailable, partial coverage and estimated values. It must not show yesterday's green budget number as live safe-to-spend authority.

An alert may be deduplicated by underlying incident, but one alert covering 100 affected accounts is **not** 100 independent incidents. Conversely, acknowledging an alert is not evidence that the service recovered.

If two domain indicators disagree, preserve their source and route the operator to the reconciliation view; do not silently average contradictory facts.

## 6. Search and navigation: one subject, several workspaces

The Finder can locate permitted stable identifiers for player, campaign, participant, Storyteller task, model round, commercial adjustment, support case, trust case (authorized only), incident, configuration/release or staff record (governance only).

Search result affordances must respect:
- permission at result-list and detail level, including autocomplete, suggestions, counts and saved filters;
- direct deep-link authorization without revealing restricted existence through errors or titles;
- clear subject type, environment, associated view and safe amount of summary;
- contextual return path to originating work item;
- stable reference regardless of employee workspace or custom dashboard.

Do not treat knowing an account email or execution ID as proof of authorization. For many protected entities, even existence can be sensitive.

## 7. Alert, notification and escalation discipline

The product should make action-worthy signals visible without noisy continuous alarm:
- only notify a responsible operator/team for an actionable class of issue;
- separate FYI announcements from work requiring acknowledgment;
- tie notices to existing records and prevent duplicate independent work;
- allow follow/acknowledge/snooze within policy, but preserve urgent critical obligations and reassignment;
- show durable history of key changes, not one ephemeral toast;
- make it clear whether a task is currently blocked on someone else.

Escalation must transfer **ownership and permissible evidence**, not merely ping another person. A staff member's departure or access revocation reassigns work; an expired approval is not an indefinitely actionable task.

## 8. Representative journeys

### CC-01: morning after a provider incident
Engineer/Support hybrid opens My Work. A high-priority incident says model calls are failing; linked cases show affected players. They see permitted errors, but cannot inspect raw private prompts without a separate grant. They route a LiveOps mitigation proposal and prioritize customer communication.

**Negative:** a stale "cost: 0" widget does not suppress a verified spend-alert incident.

### CC-02: leadership checks whether the company is healthy
The homepage shows active paid customers, broad player retention, service reliability and AI spending with definitions, dates and missing coverage. A disappointing trend links to the specialized analysis.

**Negative:** leadership authority to view aggregate economics is not blanket authority to impersonate any player.

### CC-03: employee holds Support and Commercial permissions
Both the Support queue and a billing mismatch appear. The same Player 360 entity links them; the employee can only grant within their assigned Support caps and separately issued Commercial grants, never an accidental union into global compensation authority.

### CC-04: personal access is revoked mid-investigation
A saved deep link to a campaign remains in history but opens only if current authority permits. Sensitive preview closes when the grant expires; My Work reassigns unresolved cases appropriately.

**Negative:** a pinned card's cached title cannot keep leaking protected text after revocation.

### CC-05: status disagreement
LiveOps lists a release as active for new campaigns, while an older campaign has pinned task behavior. The Command Center routes to the effective-exposure inspection rather than declaring all players are on the new version.

## 9. Quality criteria

Useful: operator gets to the right current subject quickly; high-risk work is visible but not impulsively executed; handoffs retain permitted evidence; duplicate alerts reduce; dashboard definitions are trusted; stale/unknown signals are obvious; no leak across staff permissions.

Potential measures: time-to-open correct issue from alert, unowned work, stale escalation count, acknowledgment-to-actual-mitigation lag, mistaken-action avoidance, search precision within permitted data. These are aspirations, not baselines or SLAs.

## 10. Negative acceptance

- An employee gains a second role; their work sections broaden but individual grants never recombine into a more powerful action.
- A restricted Trust case appears only as a permissible safe item, never a publicly visible complainant/title.
- Saved searches, recent items and pinned links re-evaluate access after revocation.
- A reported aggregate with delayed data is labeled delayed, not "live."
- A card's action cannot bypass approval or impact review simply because it is prominent.
- Unknown metric is not replaced with zero; no fabricated status from absent upstream data.
- One incident with many affected users remains one incident and appropriately linked customer work.
- Unassigned urgent work has a visible responsible queue instead of silently disappearing.
- A coworker's link to protected record does not disclose its existence through search suggestion.
- A genuine calm period produces an uncluttered home, not mandatory decorative graphs.

## 11. Open decisions

AD-P11/19: priority metrics and navigation shape. **AD-P35:** what is the minimal common work item, ownership and alert taxonomy? **AD-P36:** permission-safe search/saved-view disclosure policy. **AD-P37:** how much dashboard customization is worth the complexity versus opinionated defaults. No dashboard backend architecture, realtime transport, search index or widget framework is selected here.
