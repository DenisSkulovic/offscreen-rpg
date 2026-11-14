# Administrative authority, staff governance and delegated player access

**Status:** Proposed product model, 2026-11-14; **not** an implemented IAM system or technical authorization policy. **Owns:** meaning of internal authority, role composition, approval, sensitive operation classes, staff lifecycle and player-access modes. The owner must confirm open choices before technical design. Worked product-level examples and staff journeys: [authority operating policy](authority-operating-policy.md).

## Core proposition: five dimensions of authority

An administrative action can be evaluated conceptually against:
1. **Identity:** who is operating, under which authenticated staff identity?
2. **Capability:** what class of operation may this person perform (read, manage, approve, export, etc.)?
3. **Scope:** on which accounts, campaigns, environments, regions or teams may the operation apply?
4. **Conditions:** what purpose, case assignment, value threshold, time window or other requirement must hold?
5. **Approval:** is an additional person or privileged process required for **this exact operation**?

An employee is not defined by a single mutually exclusive role. **Capability packages** are composable and may carry scoped limits or expiry. Operational personas in [personas](personas-and-workspaces.md) are not authorization rules.

The experience must be able to answer: **"Can this person do X to Y right now, and if not, why?"** without exposing security-sensitive internals or inventing a simplistic single-role model.

## Illustrative capability families

| Family | Examples of independent capabilities |
| --- | --- |
| Player records | View summary; view protected identity fields; manage account status; begin recovery |
| Gameplay | View campaign metadata; inspect committed state; read private narrative; inspect execution evidence; request repair; execute bounded repair |
| Commercial | View plan/entitlement; inspect billing; grant allowance; manage offering; issue/refuse refund; export financial data |
| Support | View/assign cases; edit case notes; communicate with player; close case; escalate |
| AI / engineering | View aggregate health; inspect scoped execution; inspect sensitive model context; trigger allowed diagnostics; request operational mitigation |
| LiveOps | View releases; prepare configuration; approve deployment; activate/rollback within allowed scope |
| Growth | View aggregate analytics; manage permissible cohort; prepare promotion; activate approved campaign; export permissible marketing data |
| Trust / privacy | Review report; inspect approved evidence; apply restriction; review appeal; process verified privacy request |
| Staff governance | Invite staff; assign basic package; grant privileged package; suspend staff; inspect effective access; review audit |
| Delegated access | View as player; assist in player session; create/use isolated diagnostic copy |

Do not adopt these names as literal API permission strings yet. The important decisions are **separations**: view vs mutate, summary vs raw private content, single record vs bulk export, grant vs refund, request vs approve vs execute, self-service vs staff intervention.

### Packages and overlap

A "Senior Support Engineer" could combine:
- Support case management;
- Engineering diagnostics for assigned cases and relevant incidents;
- limited compensation grants with explicit ceilings;
- no raw payment instruments, no universal narrative export, no staff privilege administration.

A founding employee might temporarily hold several packages, but this should not normalize permanent unreviewed superuser access. Cross-package composition must have predictable results and explainable limits. Exact deny/allow precedence and conflict handling are **technical design choices pending policy approval**, not settled here.

## Staff account lifecycle

An authorized internal administrator must be able to:
- invite an employee with a narrowly defined initial capability package and scope;
- inspect invitation state and prevent expired or accidental access;
- review effective authority, including package source and relevant limits;
- assign, change, expire and revoke approved access;
- suspend or deprovision a staff identity promptly;
- see important sign-in, privileged access, permission change and intervention history;
- request or approve high-risk access separately from day-to-day onboarding.

**Invite staff** is not the same power as **grant every capability**. Neither is necessarily the same as **approve one's own access increase**. Sensitive separation-of-duties policies must not be bypassed by creating a second staff account.

The target favors stronger authentication and short-lived privilege for sensitive work. The concrete identity provider, MFA, session and revocation mechanisms are reserved for technical design.

### Risk classification is a product affordance

| Class | Illustrative activity | User-facing control |
| --- | --- | --- |
| Ordinary observation | View permitted account summary or system aggregate | Authorized session, understandable scope |
| Sensitive observation | Read private stories, view protected identity, inspect raw model payload, bulk export | Named capability, legitimate purpose, traceability; extra verification if appropriate |
| Controlled write | Grant modest allowance, time-limited restriction, bounded repair | Reason, impact preview, explicit confirmation, recorded outcome |
| High-impact write | Material refund, bulk action, global rollout, substantial state correction | Extra checks, defined limits, approval where policy requires |
| Critical governance | Elevate staff privileges, disable key controls, emergency access | Tiny audience, explicit authorization and extraordinary auditing |

Exact thresholds (amounts, number of accounts, environments, incident severity) remain open. We should not invent dollar limits before business policy exists.

## Approvals and action lifecycle

For an action requiring approval, staff should see:
- targeted resource(s), proposed delta, amount/scale, affected users and expected side effects;
- requester's identity, reason, relevant case/incident, supporting evidence;
- eligible approver, approval status, conditions/expiry;
- actual execution state, failure/partial-success detail, and remediation/reversal options.

**Approval is for a specific bounded action, not a magic reusable permission.** An approval should not remain valid after a material change to target, scope, amount or risk. The product should ordinarily prevent self-approval in high-risk cases. Exceptional emergency access requires a separate, visible process and retrospective review.

Do not equate a successful click or provider acknowledgment with authoritative completion.

## Three distinct player-access modes

### A. View as Player (preferred default)

Show the target player's **effective** navigation, features, plan, allowed actions and visible state without making gameplay, payment, account or notification changes. It must be a **genuine non-mutating preview**, not a live session with buttons visually disabled while commands still fire.

Private content remains permissioned; a support preview can be redacted or scoped. An employee cannot use preview to inspect secrets beyond their authority.

### B. Assist as Player (exceptional, controlled)

An explicitly authorized, time-limited session in which the staff member may perform a **defined subset** of player-side actions on the player's behalf. Show persistent operator/target identification, a conspicuous assist-mode banner, purpose/case, active permissions, time limit and a clear exit.

Every change is attributable to the staff actor *and* target player. Staff-initiated AI generation or other provider spend must not silently consume or bill the player's allowance; the charging/permission policy must be explicit. Sensitive credential, payment, deletion and subscription actions do not become allowed merely because ordinary players can perform them.

Player consent/notification requirements differ by action and jurisdiction; decide policy before enabling each mode.

### C. Investigate in Sandbox (isolated copy)

An authorized operator opens a clearly labeled **nonproduction copy** of relevant game/account state to replay recorded evidence or run new experiments. Effects cannot escape into the source campaign or customer ledger. Diagnostic cost belongs to internal operations according to explicit rules.

**Recorded historical replay is not the same as new stochastic model generation.** The UI must label reproducible reconstruction versus fresh simulation and provenance of outputs.

## Security promises expressed as product behavior

- No permanent "act as anybody" shortcut.
- No scope escalation through role overlap, copied deep links, preview, export, API affordances or delegated sessions.
- Administrators do not inherit player passwords or authentication secrets.
- Privileged access can be ended promptly; state should become visibly revoked.
- Actions, approvals and sensitive-access events are attributable, reviewable and protected from ordinary staff editing.
- Requests failing authorization should not leak protected metadata.
- Emergency recovery exists as a controlled exception, not as habitual global-root access.
- Design assumes humans can make mistakes; preview, limits, review and reconciliation are normal controls, not penalties.

## Negative cases

1. Support with grant capability requests a refund: denied or routed to approval, never silently allowed through "manage customer."
2. Engineer can inspect execution timings but not raw story content: link to raw prompt cannot bypass policy.
3. Inviter can create a staff account but cannot assign a privileged package outside their authority.
4. Acting as a player cannot delete the account if the staff member lacks separately granted account-deletion power.
5. Approval is revoked or expires between request and action: execution must not proceed with stale authority.
6. An employee leaves during a delegated session: the session can be revoked without waiting for expiry.
7. Two scopes overlap with different conditions: Access Inspector must convey the effective result rather than display a misleading flat permissions checklist.

## Decisions not yet approved

Exact capability taxonomy; scope vocabulary; packaged defaults; collision/deny semantics; consent vs support-authorized access; approval/self-approval policy; sensitive-read auditing granularity; emergency break-glass requirements; retention and employee compliance processes. See [decisions and readiness](decisions-and-readiness.md).
