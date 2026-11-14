# Admin product decisions, unknowns and readiness gates

**Status:** Product target accepted by owner on 2026-11-14, with conditional policies; see [acceptance and staged scope](product-acceptance-and-scope.md). This register preserves open capability-specific choices and distinguishes confirmed direction from future implementation permission. Nothing here authorizes application code. Link new owner decisions to the relevant permanent product document rather than letting a decision log become a duplicate source of truth.

## Accepted product direction and conditionals

The owner explicitly approved proceeding with the recommended Admin product vision on 2026-11-14. The [acceptance record](product-acceptance-and-scope.md) is authoritative for accepted default safeguards, P0 dispositions, safe initial scope and deferred capability policy. Earlier headings below record the pre-acceptance deliberation; they should not be mistaken for a newly required second blanket approval.

**Product gate:** passed for bounded, safe technical architecture; hazardous feature-specific policies remain gated. **Code gate:** closed.

## Confirmed owner direction

| Topic | Direction from owner |
| --- | --- |
| Product maturity target | Design a serious long-term Admin for a live Offscreen RPG business with thousands of free/paying users, not merely the current vibecoded prototype |
| Internal user diversity | Support, Customer Success, Developers, Business and Marketing need overlapping, composable administrative responsibilities |
| Granular authority | Model permissions and access finely, inspired conceptually by AWS IAM rather than one mutually exclusive job title |
| Account/customer management | Administrative management and observation of accounts, user tiers, usage allowances and related operational state are core needs |
| Player entry | Privileged staff may need a player-view or impersonation capability, potentially read-only or controlled write access |
| Staff management | Some staff need authority to create/invite and govern other administrative accounts |
| Delivery order | **First thorough product design, then technical design, then scoped Markdown Change folders for Cursor** |
| Code authorization | None from this design conversation; Cursor will receive implementation work only when the design and Change handoff are ready |

## Proposed product recommendations (not yet approved)

- A distinct operator product/shell, called **Offscreen Control** provisionally, not an expanded player account.
- Ten logical workspaces, cross-linked around persistent entities and a unified Player 360.
- Staff roles implemented conceptually as **reusable capability packages** with identity, action, scope, conditions and optional approvals.
- Separation of View as Player, Assist as Player and isolated Sandbox Investigation.
- Distinct ability to inspect a player, read their private narrative, perform a controlled repair, grant allowances, issue refunds, export data or manage staff.
- Cases and administrative actions as shared cross-workspace operational concepts.
- Gameplay/world-state forensics and AI quality/cost monitoring as first-class operator experiences.
- Version-aware LiveOps for persistent campaigns, with honest rollback limits and explicit privacy/trust operations.
- Native product control workflows with thoughtful integrations for specialized billing/helpdesk/analytics/monitoring services.
- Operational console landing tailored to staff responsibilities, not a universal bloated KPI dashboard.

**Historical note:** these were authored recommendations before the owner's 2026-11-14 acceptance. The acceptance record selects the default target direction, but does not select the remaining legal, numeric or future-capability policies.

## Second-pass product analysis (2026-11-14; proposals, NOT owner decisions)

Three focused product deep dives have been added:
- [Authority operating policy](authority-operating-policy.md): access is a union of **intact bounded grants**, not a cross-product of actions and scopes from unrelated packages; Access Inspector, ordinary playbooks, self-access conflicts, staff lifecycle and constrained emergency paths.
- [Player 360 service blueprint](player-360-service-blueprint.md): the game vision includes **shared campaigns**. Player account, membership, controlled character, paying entity, entitlement beneficiary and funding source cannot all be conflated. Privacy and impact of shared-world actions become first-class.
- [Operator journeys](operator-journeys-and-interaction-contracts.md): concrete actor, evidence, action, approval, verification and negative paths for Support, sensitive narrative investigation, compensation, shared-campaign repair, staff offboarding and an AI cost incident.

**Recommendations that are strong candidates for owner approval, not yet selected:**
1. Staff-only core console; external/community moderation, if ever required, is a separate later restricted experience (AD-P01).
2. Roles are reusable package **bundles of bounded grants**; package overlap cannot create new action/scope combinations (AD-P03/04).
3. Default Support access is metadata/effective-access first; private narrative, raw model context and bulk export require independent authority and purpose (AD-P05).
4. Player preview, assisted player session and diagnostic sandbox are distinct capabilities (AD-P06).
5. Interventions target a **named subject** with impact preview and verified outcome; shared-campaign repairs must address other participants (AD-P02/07).
6. Small-team ergonomics should combine narrowly preauthorized low-risk actions with an explicit emergency exception and retrospective review, rather than routine global superuser access (AD-P04/15).

**New cross-domain decision pressure:** multiplayer billing is not yet selected. A future player may participate in a campaign without being its payer; do not invent a payer/beneficiary policy while drafting the console. Game vision supports shared campaigns, but commercial ownership, consent, notice and repair authority remain unresolved (AD-P02/05/07/09/13).

## Third-pass workspace product review (2026-11-14; proposals, NOT owner decisions)

Dedicated workspace specifications now cover:
- [Commercial](commercial-operations-product.md): catalog promises, billing state versus effective access, payer/beneficiary and grant semantics, reservations/usage, refund versus compensation, sponsorship and honest unit economics.
- [Gameplay & Worlds](gameplay-worlds-product.md): world mechanics versus published prose, source/receipt provenance, earned fictional time, shared-campaign privacy and constrained interventions.
- [AI & Engineering](ai-engineering-operations-product.md): accepted player actions, Storyteller tasks, model rounds, provider expense and published outcomes as separate units; diagnostic evidence tiers and three lenses of quality.
- [LiveOps](live-operations-product.md): change categories, existing-campaign adoption policies, staged deployment, emergency spending stops, experiment guardrails and rollback limitations.
- [Cross-workspace coherence](cross-workspace-product-review.md): shared-truth matrix and adverse scenarios across all four workspaces.

**Strong proposed product guardrails:**
1. Never collapse plan, entitlement, allowance, model spend and in-world resource into one "credits" field.
2. Never collapse command, mechanical receipt, Storyteller task, model call and published passage into one "turn succeeded" field.
3. Never let a configuration rollback promise to undo previously committed world events.
4. Existing persistent games should keep accepted promises; incompatible future behavior requires an explicit adoption/migration policy.
5. Treat internal diagnostics, player allowances and company sponsor spend as independently accountable.
6. Show incomplete or unavailable evidence and actual blast radius rather than fake certainty.

**Not accepted yet:** exact commercial metering/cancellation rules, paid contract treatment, multiplayer funding and participant authority, sensitive evidence access/notification, repair taxonomy, task-version compatibility, and metric/alert policies. The product gate remains **open**. The next domain-depth work should address Support, Growth, Trust/Privacy, Command Center and Staff Governance, followed by cross-functional owner review.

## Fourth-pass workspaces and adversarial review (2026-11-14; proposed, NOT owner decisions)

The remaining five specialist operator experiences have dedicated proposed product documents:
- [Support & Customer Success](support-and-customer-success-product.md): native case context, escalation, credible remedies and nonintrusive customer success.
- [Growth & Insights](growth-and-insights-product.md): human engagement versus world simulation, cohort/experiment provenance, marketing consent and honest metrics.
- [Trust & Privacy](trust-and-privacy-product.md): restricted evidence, generated versus player-authored material, proportional enforcement, appeals and rights-request completion.
- [Command Center](command-center-product.md): personalized cross-role work, search, queues and freshness without privilege or data-ownership expansion.
- [Access & Governance](access-and-governance-product.md): staff lifecycle, bounded package composition, assignment authority, delegated sessions, approvals and audit.

**Design coverage:** all ten proposed logical workspaces have product-owner documents, with [Player 360](player-360-service-blueprint.md) representing Players & Accounts. The [adversarial review](product-adversarial-review.md) identifies **critical policy risks** that still prevent product acceptance; the [policy decision brief](product-policy-decision-brief.md) groups open questions into ten decision packages.

**Critical unresolved categories:** case self-assignment as privilege escalation; raw/private evidence crossing case or vendor boundaries; genuinely non-mutating player preview; shared campaign repair and data rights; uncertain billed AI provider work versus commercial allowances; emergency access and staff conflicts. Recommendations are not approved merely because they are detailed.

**Gate disposition:** the owner accepted the product target and accepted default safeguards; [acceptance](product-acceptance-and-scope.md) explicitly defers feature-specific high-risk policy. Technical design may now proceed for the bounded initial scope. Change dossiers must still await coherent technical design; no product document alone authorizes coding.

## Highest-priority product decisions to resolve

| ID | Decision | Consequence |
| --- | --- | --- |
| AD-P01 | Final internal product boundary: staff only, or eventually third-party/community moderators? | Identity assurance, user experience and authority surface |
| AD-P02 | What is the **first-class player/account model** for solo, invited participants, shared campaigns and paying entities? | Player 360, ownership, privacy and billing navigation |
| AD-P03 | Which capability families and **default staff packages** are meaningful, and which operations should be impossible even for normal senior staff? | Staff onboarding and governance UX |
| AD-P04 | Scope and approval policy: assigned case/account, environment, team, monetary/volume caps, expiry and separation of duties | Authorization explainability and operational speed |
| AD-P05 | Privacy model: what Support/Engineering may inspect by default, how raw narrative access is justified, whether player consent/notice is needed | Support effectiveness versus trust |
| AD-P06 | Define permissible **View as Player** behavior, live **Assist** actions, conditions and off-ramp to sandbox | Player safety and attributable assistance |
| AD-P07 | Which classes of game state are **repairable**, under which constraints, and what should remain engine-only? | Forensics versus corruption risk |
| AD-P08 | What does an actionable support **case** own natively versus an integrated helpdesk? | Workflow cohesion and channel strategy |
| AD-P09 | Which plan/entitlement/allowance rules and commercial exceptions belong in the operator product? | Customer support and company economics |
| AD-P10 | Version adoption policy for existing campaigns and acceptable LiveOps emergency actions | Long-lived world integrity and rollback promises |

Do not answer these by merely copying implementation choices from the current repository.

## Secondary product decisions

| ID | Question |
| --- | --- |
| AD-P11 | Which KPIs are genuinely important for each persona, with definitions and useful freshness? |
| AD-P12 | Promotion targeting and experimentation: what eligibility/consent constraints and customer-visible promises apply? |
| AD-P13 | What are appropriate customer communication/notification requirements for assistance, restrictions, refunds and repairs? |
| AD-P14 | What is the minimal audit and sensitive-read review experience needed for staff and management? |
| AD-P15 | Emergency access and production-wide intervention: when do we use exceptional authorization and retrospective review? |
| AD-P16 | Which Chamber laboratory capabilities should surface in Admin, and which remain developer-only? |
| AD-P17 | What support, trust and privacy request states and deadlines should be part of the product? |
| AD-P18 | Should an internal AI investigator be offered later, and what advisory-only scope is useful? |
| AD-P19 | Final naming and layout of the workspaces; which should be merged/split in a realistic staff navigation? |
| AD-P20 | When does a real operating team justify native case management versus a full external support suite? |
| AD-P21 | Catalog/version adoption: when may commercial plan changes affect existing subscribers, and how are grandfathered promises handled? |
| AD-P22 | Sponsored versus paid versus internal provider expense: exact usage units, reservation/finalization, funding ownership and financial reconciliation policy? |
| AD-P23 | Shared/private narrative, other participants' content and customer notification: which surfaces/actions require access, notice or consent? |
| AD-P24 | Permissible game repair and historical correction classes, including what cannot be reversed or rewound? |
| AD-P25 | AI/gameplay quality: which correctness, fidelity and experiential measures are meaningful, with coverage and human review? |
| AD-P26 | Which LiveOps artifacts can staff author/publish through Admin versus gated external release review, and under what change approvals? |
| AD-P27 | What verifies a legitimate support requester for account recovery and what case information may they see? |
| AD-P28 | Which proactive Customer Success outreach is legitimate and how are contact preferences and opt-outs handled? |
| AD-P29 | What counts as first meaningful activation, human engagement, retention and paid conversion across account/campaign units? |
| AD-P30 | What cohort privacy, minimum-size, export and messaging permission controls are necessary for Growth? |
| AD-P31 | What experiment/exposure/attribution evidence is required, especially for shared campaigns? |
| AD-P32 | Which Trust enforcement actions, evidence standards, independent review and appeals are appropriate? |
| AD-P33 | Which data-rights, lawful retention, shared-story and external-processor policies must the Admin communicate and track? |
| AD-P34 | How should generated versus player-authored content be represented as enforcement and disclosure evidence? |
| AD-P35 | What is the shared work-item/assignment/alert taxonomy across professional homepages? |
| AD-P36 | Which search, autocomplete, dashboard and saved-view metadata may be exposed under varying authority? |
| AD-P37 | What personalization is worth supporting for the Command Center versus simple curated defaults? |
| AD-P38 | How does first-staff bootstrap work, how do packages evolve, and what conflict-of-interest exclusions apply? |
| AD-P39 | What are the governance boundaries and accountable owners for automated/service identities? |
| AD-P40 | What sensitive-read review, staff-audit visibility, recertification and retention policies are appropriate? |

## Product validation: scenario reviews

Before freezing the product model, walk these scenarios with actual screen/record/workflow definitions:

1. **New staff:** one employee has Support + Engineering scopes, receives a temporary narrative-access grant, handles a case, loses access when it expires.
2. **Escalation:** Support investigates a broken campaign without accessing irrelevant narrative content, Engineering finds the causal execution, LiveOps discovers affected cohorts, and an authorized remedy is applied.
3. **Billing disagreement:** paid status conflicts with entitlements and consumed grants; operators explain source-of-truth and resolve without modifying immutable financial history.
4. **Assist without theft:** a staff member opens read-only player preview; separately requests a write-assisted session; cannot exceed staff authority or silently bill the player.
5. **Narrative continuity:** the player reports a retcon, the operator traces committed facts versus model claims, and any diagnostic reproduction is isolated from the original.
6. **Dangerous production change:** a release causes increased AI costs; the team identifies impacted campaigns, seeks/obtains appropriate authorization and rolls back without claiming to undo the past.
7. **Trust/privacy:** a player requests data deletion involving private stories, shared-world participants, billing obligations and external processors; the workflow explains any residual dependency.
8. **Staff governance:** inviter cannot promote themself or an accomplice into unrestricted sensitive access merely by combining packages.
9. **Ambiguous failure:** a compensation action times out; the retry path does not issue a second grant and the operator sees pending versus confirmed outcome.
10. **Restricted coworker:** one authorized staff member shares a record link to another with narrower permissions; no protected title, content or metadata leaks.

A product spec failing a scenario should be revised at its **owning product document**, not patched later as a technical workaround.

## Product-design completion gate

**Outcome (2026-11-14): accepted for the scoped technical program** via [owner acceptance](product-acceptance-and-scope.md). The checklist below remains relevant for *each later hazardous capability*; a deferred capability is not selected for implementation until its specific policy has been decided.

Original review checklist:
- The owner has reviewed the charter and workspace/domain boundaries.
- The Player 360/entity relationships are coherent for single-player and shared gameplay, payments and account status.
- Critical capabilities, scopes, privilege elevation and delegated-player modes have settled business rules.
- Every high-impact workflow has intended actor, authority, state, failure path, observable result and audit expectations.
- Private narrative access and customer-sensitive data handling have deliberate defaults.
- LiveOps/repair limitations do not contradict committed gameplay truth.
- Native-versus-integrated ownership is clear at the product level.
- P0 questions AD-P01–AD-P10 are either resolved or explicitly constrained out of initial scope with a defined later decision.
- An independent product challenge has examined misuse, confused-operator and adverse player scenarios; its **critical findings have an accepted policy or explicitly deferred capability**.
- Owner marks the product direction accepted. **Satisfied for core scope, with deferrals detailed in the acceptance record.**

## Technical-design completion gate (future)

**Only after product acceptance**, create owning technical contracts for:
- Staff identity/session/delegation boundaries and consistent authorization evaluation;
- permission packages, scopes, dynamic conditions, approval workflows and revocation;
- entity reads, search, sensitive-data masking, audit and retention;
- administrative actions, cross-service effects, idempotency and reconciliation;
- game-state repair/sandbox/Chamber integration and cost attribution;
- commercial ledger, external billing/entitlement and provider-integrated states;
- operational observability, release control, incident response and deployments;
- frontend shell, navigation, interaction states, accessibility and verification.

Review each target against source evidence, but do not lower the desired guarantees to match the current POC. The technical owner should specify negative cases and actual integration boundaries.

## Change dossier gate (future)

After technical design, produce **bounded, code-bearing** Changes in [docs/changes](../changes/README.md), with one owner-approved active packet at a time. Each packet must have:
- specific user/operational outcome;
- exact product and technical headings;
- affected source owners and dependencies discovered from current source;
- normal and negative acceptance cases;
- cheap meaningful verification plus integration-risk evidence;
- excluded work and honest provider-spend policy;
- a concise Cursor handoff.

**Do not create a Change merely to continue design, review a document or run an existing test.** Design docs and technical docs are not implementation authorization.

## Illustrative maturity path (not a change queue)

| Horizon | Capability family |
| --- | --- |
| A. Safe foundation | Staff identity/access, auditable account search, Player 360, read-only game/commercial inspection, initial support context |
| B. Operational independence | Scalable casework, bounded grants/restrictions, preview mode, deeper execution/game investigations and incident coordination |
| C. Mature live business | Protected state repair/sandbox, controlled LiveOps release/rollback, AI quality economics, promotions/cohorts, trust/privacy and revenue operations |
| D. Organizational scale | Advanced approvals/access review, broader self-service operations, detailed experiments, mature multi-team reporting and advisory investigation AI |

This sequence is illustrative and depends on demand. **Critical safeguards must ship with the sensitive capability they protect**, not in a distant future stage.

## Next phase

Begin source-grounded **technical architecture** for the accepted core. Maintain design-level gates for raw private data, assisted sessions, commercial writes, arbitrary repairs and advanced LiveOps. The [policy decision brief](product-policy-decision-brief.md) remains useful for future choices; it is not a reason to reopen already approved default safeguards. Only reviewed technical contracts lead to code-bearing Change folders for Cursor.
