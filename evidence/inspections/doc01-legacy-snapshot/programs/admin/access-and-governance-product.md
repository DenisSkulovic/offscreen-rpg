# Access & Governance | staff lifecycle, approvals and audit

**Status:** Proposed long-term Admin workspace, 2026-11-14; owner review required; not a technical IAM or identity-provider design. **Owns:** operator UX for inviting/managing staff, assigning bounded capability packages, privilege requests/approvals, access reviews, sensitive-read oversight and emergency accountability. **Does not own:** authentication mechanism, staff HR system, application authorization code, privileged player-session implementation or approved legal retention. Read [authority](authority-and-delegation.md), [authority operating policy](authority-operating-policy.md), [Player 360](player-360-service-blueprint.md) and [operator journeys](operator-journeys-and-interaction-contracts.md).

## 1. Purpose and product thesis

An authorized security/operations employee must be able to answer: **Who can do exactly what, to which entities, for how long, from which authority, and what have they actually done?** They also need a safe way to extend, inspect, suspend and end that authority.

**Job personas are not exclusive roles.** A legitimate employee can work in Support, Engineering and Growth during one day while holding a set of intact bounded grants. The product should make overlap normal but prevent a package for global analytics reads from accidentally expanding a case-limited compensation write.

Governance should be operationally usable for a tiny startup and credible with a larger professional staff. It should not force everyday founders into a habitual universal root account.

## 2. Separate identities and kinds of authority

| Subject | Meaning | Must not be collapsed with |
| --- | --- | --- |
| Staff identity | Named internal human with verified membership/status | Their player account or fictional character |
| Staff invitation | Pending offer to join internal operations | Already-active privileged access |
| Capability package | Reusable set of complete, scoped, conditioned grants | Organizational job title or a global toggle |
| Assignment/exception | Particular staff member receives scoped privilege and expiry | Permanent capability catalog definition |
| Staff team / assignment | Organizational or workflow association | Automatic authorization to all subjects that team can view |
| Privilege request | Proposed extra power for a particular purpose | Approved or executed grant |
| Approval | Independent authorization of a precise requested effect | Permission to execute any operation |
| Delegated player session | Operator temporarily views/assists an account | Player authentication secrets or support case assignment |
| Administrative action | Attempted/verified intervention with target and effect | Audit event, case closure or UI button click |
| Audit/sensitive-access event | Reviewable evidence of access, denial, change or emergency use | Free-form editable staff note |
| Emergency access episode | Extraordinary bounded authority with cause and later review | Normal all-powerful daily account |

Service-to-service integrations and automation actors may need distinct identities and accountable ownership later, but must not be portrayed as a named human clicking a button. Their product governance belongs to an explicit future policy.

## 3. Governance surfaces

| Surface | Operator task |
| --- | --- |
| Staff Directory | Find staff members, onboarding status, teams and active/expired authority |
| Invitation Flow | Invite appropriate staff with minimal starting access and clear expiry |
| Capability Package Catalog | Discover approved reusable packages, version history and delegated limits |
| Staff Access Profile | See assigned grants, provenance, scope, expiry, outstanding requests and active delegated sessions |
| Access Inspector | Explain an effective allow/deny/approval outcome for an exact action and subject |
| Access Request Queue | Request time-bound additional privileges with purpose/subject and evidence |
| Approval Desk | Review, narrow, reject or authorize exact bounded privileged operations |
| Access Reviews | Periodic or event-triggered recertification, stale permissions and offboarding checks |
| Privileged Sessions | Inspect and revoke active preview/assistance/sensitive evidence sessions |
| Administrative Audit | Review attributable significant operations, sensitive reads and denied access |
| Security/Emergency Console | Controlled incident-time exceptional authority and retrospective review |

Do not turn the staff directory into a public organization chart of sensitive permissions or access logs. Staff ability to see effective access details and other employees' security history is itself separately scoped.

## 4. Staff lifecycle

### Invite and activate
Authorized inviter chooses a real identity, initial access **within their delegation authority**, legitimate team, environment and expiry. Invite state is visible (prepared, sent, accepted, expired, revoked, failed), with identity confirmation and no implied access before acceptance.

An inviter who can add employees cannot automatically assign powerful packages or change approval rules. If a staff member also uses the game personally, the identities remain distinct even if related for conflict-of-interest checks.

### Change authority
An authorized administrator can assign, restrict, replace, temporarily extend or revoke packages and exceptions with a clear **before/after effective access** view. Changes to package definitions do not silently expand every existing assignment without a deliberate version/impact policy.

### Privilege elevation
Employee requests only the needed capability, named subject(s), purpose, case/incident, duration and evidence sensitivity. An eligible approver reviews the impact and whether an existing narrower workflow could solve the problem. Approval and actual activation are shown separately.

### Suspend and offboard
Ending staff membership promptly removes current authority, closes delegated player sessions and sensitive evidence views, prevents pending privileged actions from proceeding without a valid actor, and reassigns customer/incident work. Staff departure must not silently orphan urgent cases.

### Recertify
Authorized reviewers inspect excessive/unused/expiring grants, staff with exceptional cross-workspace powers, service integration ownership and stale pending approvals. A review may revoke, renew or request justification. Exact frequency and retention are policy decisions.

## 5. Grants compose as intact grants

Example:
- Package Support Resolution: issue a small grant to customers on **assigned cases**.
- Package Growth Insights: view a **company-wide aggregate** of marketing conversion.
- Effective outcome: company-wide analytics read plus case-limited compensation only.

The package cannot be decomposed into "write from Support" and "all accounts from Growth" to form an unintended superpower. A deny, purpose condition, environment distinction, financial cap, expiry or conflict-of-interest restriction remains applicable.

A security reviewer must be able to run a **what-can-this-employee-do-here-now?** inspection without granting that access to themselves. Denial explanations shown to ordinary employees must not become a side channel for discovering protected subjects.

## 6. Approvals and conflict-of-interest control

Approval decisions need the proposed operation, exact target/subject class, bounded delta, context, requester, approver, eligibility, expiry and change-sensitive validity.

**Separate concerns:** permission to *request*, to *approve* and to *execute* are distinct. A person who controls package assignment should not casually approve their own new power. Material change after approval requires renewed review.

Potential conflicts to detect:
- approving one's own privilege increase;
- using a second identity to grant the first one powers;
- issuing oneself a refund, allowance or account repair through routine employee tools;
- authorizing an action affecting an employer-related account or a known conflict;
- reviewing one's own sensitive-read misconduct record as its sole investigator;
- being both the sole requestor and sole approver of an extraordinary broad production action without a defined emergency exception.

The *actual human actor* and chain of responsibility must remain intelligible. More employee roles should not undermine independence requirements.

## 7. The one-person company paradox and emergency powers

A startup may lack a second staff approver at 03:00 while sponsored model costs spike. The product must not require an imaginary available colleague, and it must not solve this by silently granting permanent unlimited power.

**Recommended product approach:**
- authorize very narrow routine self-service service playbooks with hard exposure limits;
- provide a clearly labeled emergency path for truly urgent protective action (such as stopping **new** paid model dispatch) where single-operator access is justified;
- require an incident reason, scoped target, clear expected effects, stronger verification and prominent emergency-mode indication;
- preserve extraordinary audit and a mandatory retrospective review by an eligible independent person once available;
- keep account-deleting, payment-moving, broad raw-narrative-exporting or permanent privilege-elevating powers outside ordinary emergency shortcuts.

A stop on *new* work cannot be misrepresented as undoing provider charges already incurred or reworking committed fictional time.

Exactly which emergency powers may be single-operator versus require second approval is an explicit policy to settle, not an invented implementation setting.

## 8. Administrative audit and review experience

An authorized reviewer should be able to reconstruct:
- actor, staff status, scope and authority **at the moment** of access or action;
- purpose, affected subject(s), case/incident and relevant approval;
- requested effect, preflight conditions, execution attempts and verified outcome;
- sensitive read/access to raw narrative, protected identity, private AI context or bulk export;
- denied/expired privilege attempts where proportionate and appropriate;
- emergency invocation, subsequent justification and independent review;
- external service/automation actions with their own accountable ownership, not falsely attributed to a human.

**The audit log is not a staff-editable activity feed.** Operator-facing case notes can be corrected with history, but evidence of earlier actions and legitimate security reviews must not be silently deleted or rewritten by the actor being investigated.

Audit visibility does not automatically authorize reading the private content originally accessed. A reviewer may see that a sensitive narrative read occurred, who performed it and under which case without being able to open the passages.

## 9. Delegated player sessions and session safety

Governance should show issued, active, expired and revoked preview/assist sessions, the operator, player target, allowed action set, reason, environment and any permitted customer consent/notice. The underlying three-mode contract belongs to [authority and delegation](authority-and-delegation.md).

**A session is not authority in perpetuity.** Changing staff permissions or revoking the session must make its subsequent actions ineffective. Assisting a player cannot bypass the separate administrative controls around refunds, account deletion, raw private story inspection or other people's shared-campaign rights.

Diagnostic sandbox operations and model spend require independent internal authority and attribution.

## 10. Example journeys

### AG-01: new employee joins Support plus Engineering
An authorized manager invites a new staff identity into Support Intake and a narrow Engineering Diagnostics package. An access preview confirms that technical traces are visible but raw story prompts are not. The employee handles an assigned case without company-wide account mutation.

**Negative:** their global metrics scope cannot be joined with the case-only grant power.

### AG-02: temporary evidence access
A developer cannot diagnose a continuity defect without a specific restricted passage. They request permission for a named campaign, case and short duration; an eligible reviewer authorizes a narrow scope. The sensitive view visibly expires and is audited.

**Negative:** copying the deep link to another engineer does not grant them access.

### AG-03: urgent production spend stop
An on-call staffer sees verified runaway spend. A preauthorized bounded emergency path can suspend **new** sponsored dispatch and records exact scope, actor, reason and eventual result. Later independent review evaluates legitimacy.

**Negative:** the operator cannot use emergency spend-stop to export every player's private story or silently change billing amounts.

### AG-04: employee exits during live assistance
The staff identity is suspended. Delegated sessions cease, pending approvals/operations are reconciled rather than assumed completed, open cases are reassigned, and the access review shows the outcome.

**Negative:** previously pinned dashboard cards or cached assisted-mode tabs do not preserve access.

### AG-05: privileged staff attempts self-compensation
A staff member with Support and Commercial packages opens their own player account and requests a large grant. Routine action is rejected or routed through an exceptional independent conflict review.

**Negative:** changing the account email or using two role packages does not disguise the underlying conflict.

## 11. Adverse acceptance

- Inviting a staff user cannot create unrestricted authority.
- Modifying a reusable package exposes its current-assignee blast radius before activation.
- Combining scopes does not create new action/resource privileges by cross-product.
- A self-approval conflict remains disallowed across the same human's multiple identities.
- A revoked employee cannot keep an assisted session open for live writes.
- Audit review authority does not automatically unlock private narrative payloads.
- An approval for a specific amount/target cannot authorize a larger mutated action.
- A security incident emergency path is attributable, scoped and cannot erase earlier events.
- A service/automated actor is identified as such, not disguised as the creator of a random staff login.
- A departing employee's customer cases and pending grants have a clear successor, not an orphaned queue.
- "No audit results" from a disconnected system is distinguished from "no activity occurred."
- Denials and sensitive access events are reviewable without turning policy explanations into account-discovery tools.

## 12. Open decisions

AD-P03/04/14/15: package catalog, scope and delegability, review/approval policy, audit and emergency rules. **AD-P38:** staff bootstrap/first administrator, package-version adoption and conflict-of-interest policy. **AD-P39:** internal machine/service identity ownership and privileged automation boundaries. **AD-P40:** administrative audit sensitivity, reviewer access, review cadence and retention policy. These require explicit product and operational approval, not mere IAM technology selection.
