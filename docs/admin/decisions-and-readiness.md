# Admin product decisions, unknowns and readiness gates

**Status:** Working decision register, 2026-11-14. It distinguishes **owner direction** from **author recommendations**. Nothing here authorizes implementation. Link new owner decisions to the relevant permanent product document rather than letting a decision log become a duplicate source of truth.

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

The entire product-specification suite remains **Proposed** until the owner reviews/corrects it. A plausible detailed recommendation is not an agreed contract.

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

Do **not** advance to technical design until:
- The owner has reviewed the charter and workspace/domain boundaries.
- The Player 360/entity relationships are coherent for single-player and shared gameplay, payments and account status.
- Critical capabilities, scopes, privilege elevation and delegated-player modes have settled business rules.
- Every high-impact workflow has intended actor, authority, state, failure path, observable result and audit expectations.
- Private narrative access and customer-sensitive data handling have deliberate defaults.
- LiveOps/repair limitations do not contradict committed gameplay truth.
- Native-versus-integrated ownership is clear at the product level.
- P0 questions AD-P01–AD-P10 are either resolved or explicitly constrained out of initial scope with a defined later decision.
- A independent product challenge has examined misuse, confused-operator and adverse player scenarios.
- Owner marks the product direction accepted. Until then, these are **design proposals**.

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

## Next product-design session

Critically refine **[authority](authority-and-delegation.md)** and **[Player 360](player-360-and-entities.md)** first, then use [cross-team workflows](operations-and-workflows.md) as adversarial scenarios. Product acceptance is the next milestone, not immediate coding.
