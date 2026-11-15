# Authority experience and operating policy | product-level deep dive

**Status:** Proposed product target, 2026-11-14; pending owner review. **Owns:** what effective administrative authority, role composition, privilege requests, staff lifecycle, approvals, and delegated player access should mean to an operator. This is **not** a policy-engine choice, schema, endpoint design, or code authorization. See [core authority](authority-and-delegation.md) for principles and [the decision register](decisions-and-readiness.md) for unresolved owner choices.

## 1. The product promise

A legitimate employee can understand **what they may do, to which subject, for which reason, under which constraints, and with which additional approvals**. A second employee or auditor can reconstruct why the decision was made.

The product does not grant power merely because someone has a job title, knows a deep link, has several packages, or can preview the customer application. It also should not turn routine Support work into a maze of security ceremonies.

**Recommended default:** access is task-appropriate, scoped, preferably time-limited for exceptional work, and explainable at the affected record. Unnecessary universal access is a design defect.

## 2. A permission is a bounded grant, not five independent shopping carts

At the conceptual level, an effective permission is a coherent grant combining:
- a staff identity and source of authority (assigned package, temporary grant, approved exception);
- permitted actions and resource family;
- allowed resource set and environment;
- contextual limits (purpose, assigned case, quantity/value, expiry, sensitivity);
- required additional authorization, if any.

**Composition means the union of intact, applicable grants, subject to global prohibitions and current policy.** It does not independently union every action from one package with every scope from another.

Illustration:
- Package A lets Support **grant small compensation** only to accounts tied to their assigned cases.
- Package B lets Analytics **view aggregate billing status** across the company.
- Holding A and B must **not** yield "grant compensation to every account."

Likewise, "can see a record" + "can edit a different class of record" never becomes "can edit this record." A package may contain narrower conditions than the user's employment or team membership suggests.

**Non-negotiable product behavior:** global restrictions, legal/privacy boundaries, separation-of-duty controls, explicit account restrictions, and resource ownership must not disappear simply because an employee has a second role. Exact evaluation and deny precedence are technical design, but these safety outcomes are product requirements.

**Case-assignment privilege laundering must be excluded.** If case assignment is a condition for compensation, account access or sensitive investigation, staff cannot self-assign an arbitrary protected case to manufacture that condition. Case creation, assignment and reassignment have their own bounded governance, provenance and review requirements; a named sensitive-data exception may still be needed beyond general case assignment. This is a product rule prompted by [adversarial review PR-01](product-adversarial-review.md#pr-01-case-ownership-becomes-privilege-escalation), not a technical role-engine prescription.

### The scope vocabulary operators should understand

| Scope dimension | Operator-facing meaning | Why it matters |
| --- | --- | --- |
| Environment | Production, test or other authorized operating context | Production authority is not inherited from a laboratory permission |
| Subject | Named player, campaign, case, incident, cohort or bounded set | One affected account is not "all players" |
| Relationship | Assigned case, owning support team, responding incident, approved investigation | Access should follow a legitimate operational assignment |
| Data sensitivity | Summary, protected identity, private narrative, raw model context, financial evidence, bulk export | Metadata and private content are not equivalent |
| Action breadth | View, request, approve, execute, repair, export, manage other staff | Different verbs have different harm potential |
| Resource / monetary exposure | Number of accounts, credit amount, refund value, spend or blast radius | Routine customer service need not authorize global intervention |
| Duration / circumstances | Valid window, active case, incident severity, customer consent where applicable | Exceptional access should not silently become permanent |

A meaningful product interface should show the **effective scope**, including the reason some records are excluded.

## 3. Reusable capability packages: illustrative catalog

These are candidate **packages**, not immutable personnel categories or API permission strings. One person can hold several; actual package definitions remain owner decisions.

| Package | Useful routine access | Not implied |
| --- | --- | --- |
| Support Intake | Search permitted accounts, read basic access state, open/triage cases | Private narratives, refund, account repair |
| Support Resolution | Support Intake plus bounded case-linked remedies and customer communications | Unlimited credits or payment edits |
| Customer Success | Permitted account journey, relationship and outreach context | Raw story text or unrestricted marketing export |
| Engineering Diagnostics | Scoped execution/state metadata, system incidents, technical history | Unrestricted personal content or gameplay repair |
| Sensitive Evidence Reviewer | Purpose-limited examination of protected evidence for approved investigations | Bulk download, persistent universal raw access |
| LiveOps Operator | Review active versions, prepare scoped rollout, request/execute safe mitigations | Arbitrary production code or prompt mutation |
| Commercial Operations | Subscription and allowance reconciliation, selected adjustment actions | Full staff governance or unbounded refunds |
| Growth Analyst | Aggregate metrics, cohorts and promotion proposals | Individual private story content |
| Trust Investigator | Reports, restricted evidence, proportionate restrictions and appeals | General customer marketing access |
| Staff Administrator | Invite, limit, suspend staff; inspect access provenance | Grant own privilege increase or inspect all narratives |
| Security Approver | Inspect sensitive access requests and independently authorize specific exceptions | Automatically perform every business operation approved |

Small teams can start with several packages on a few people. That should not require inventing a new compound role for each combination or a permanently all-powerful daily login.

### Staff lifecycle product journey

**Invite:** pick minimal access, verify the intended staff identity, show who may accept, expiry, and what will become active. The inviter can only assign access they are allowed to delegate.

**Operate:** show current packages, scopes, exceptions, provenance and expiry. Staff see which workspace is available, which record is permitted and which action needs approval, without implying that a hidden screen would magically authorize a forbidden operation.

**Escalate:** request a narrowly scoped, time-limited capability by providing subject, purpose and relevant case/incident. An eligible approver reviews the proposed delta, scope, sensitive-data exposure and expiry. Do not grant a reusable blanket capability to solve one case.

**Review:** authorized security staff can see unused or expiring privilege, active delegated sessions, unusual sensitive access and significant failed/denied attempts. These are review signals, not automatic proof of wrongdoing.

**Revoke/leave:** terminate privilege and delegated sessions, remove operational queue ownership and reassign pending cases. A pending request by a departed operator must not later execute as though they were still authorized.

**Conflict of interest:** staff must not use an administrative role to operate on their personal player account under ordinary service flows. Exceptional founder/emergency cases require explicit governance, not a second user account as a loophole.

## 4. Action risk and proportionate friction

| Tier | Examples | Intended experience |
| --- | --- | --- |
| Ordinary read | Account summary, operational metrics | Fast read with permission-aware redaction |
| Sensitive read | Private narrative, protected identity, raw AI context, large export | Named purpose; scoped access; reviewable sensitive-read history |
| Bounded service action | Small case-linked grant, reversible restriction | Reason and clear delta; limits; verified outcome |
| High-impact business action | Large refund, multi-account promotion, world-state restoration | Impact preview, independent authorization where required, stale-action recheck |
| Exceptional control | Broad production pause, critical staff privilege, emergency recovery | Tiny authorized audience, incident-specific route, strong retrospective review |

**An approval is about a specific proposed effect**, not a vague "approved to do whatever is necessary." Changing the target, amount, content exposure, or blast radius invalidates the existing approval.

The approving staff member must not silently inherit permission to perform the action. Request, approve, and execute are separate capabilities.

**Practical small-team recommendation:** define preauthorized, low-risk playbooks with narrow caps so ordinary issues are resolvable quickly. For genuinely critical operations requiring a second person, provide a visible emergency procedure with recorded reason and mandatory later review. Do not pretend a one-person company can always summon a second on-call approver.

## 5. Staff access explanation: Access Inspector

An authorized reviewer should be able to answer:
1. Which named person is this, and what is their current staff status?
2. Which packages and exceptions contribute to access, and when do they expire?
3. Can they perform this named action on this particular resource **now**?
4. If not, is it a hard denial, missing scope, unmet condition, restricted content class, or an approval requirement?
5. If yes, which guardrails still apply (case association, spend cap, purpose, expiry)?
6. Which actor could request, approve or execute the remedy without granting permanent excess access?

The interface must distinguish **not allowed**, **approval possible**, **waiting for approval**, **approved but not yet executed**, and **verified completed**. A denial explanation must not reveal protected entity names, existence, player identity or sensitive policy internals to an unauthorized caller.

The Inspector is useful to an authorized manager and, in reduced form, to a staff member wondering why a particular control is unavailable. It is not an unrestricted permission-probing oracle.

## 6. Three delegated player-access contracts

### View as Player: observational

- Clearly labeled **preview**, not a new player login; operator and target visible.
- Show effective player navigation and feature availability as faithfully as permitted.
- Do not send gameplay commands, purchases, destructive account operations, notification acknowledgements, "seen" cursors, read receipts or other mutations simply by viewing.
- Redact protected narrative, participant-private and payment content unless the operator separately has purpose-authorized access.
- Provide a way back to the exact originating case and account.
- If genuinely faithful non-mutating preview is unavailable, say so; do not counterfeit it with disabled buttons over a live session.

### Assist as Player: deliberately privileged

- Requires explicit, bounded authority for a named player/account, reason, duration and allowed action subset.
- Operator remains the attributed actor; target remains the customer, never the source of staff authority.
- Permanent identity, credential, payment and account deletion settings cannot be changed just because the player normally could.
- Show consequences, possible other participant impact, whether customer consent/notice is required, and how provider costs will be allocated.
- Grant authority is rechecked at meaningful actions; a revoked or expired session stops working.
- Unexpected side effects or unknown outcome require investigation, not blind repetition.

### Investigate in Sandbox: isolated

- Clearly distinguish copied source snapshot, reconstructed history, and **new** stochastic AI simulation.
- No live player gameplay, commercial allowance, notification, presence, billing or durable world mutation.
- Copying a private story for diagnosis does not bypass private-content authorization.
- Any experimental provider spend belongs to internal operations under its own policy.
- A sandbox result is evidence for a possible fix, not a preapproved production repair.

## 7. Adversarial product acceptance cases

| Situation | Required result |
| --- | --- |
| Support case-limited grant + organization-wide analytics read | No global grant capability is created through package overlap |
| Employee can invite staff but cannot grant privileged packages | New person receives only authorized access; no privilege bypass |
| Employee requests and approves own sensitive elevation using two accounts | Forbidden by real actor/separation-of-duty policy |
| Engineering can view task duration but not private prompts | Linked execution remains useful; raw context stays hidden |
| Support previews a campaign with other participants' private material | Only legitimately visible material appears |
| Staff access is revoked during an assisted session | Subsequent action is refused; operator sees revocation |
| Bulk export requested by someone allowed to read one customer | Export is independently denied or sent for authorization |
| Pending high-value action is materially edited after approval | Reapproval is required |
| Staff attempts an intervention in production with only test privilege | Production action is refused |
| Privileged operator accesses their own player account | Ordinary service path blocks or escalates the conflict |
| No second approver is available during a serious incident | Defined emergency path exists, limited and reviewable, not silent bypass |
| Approval succeeds but execution fails or remains unknown | No claim that customer state was changed; separate verified outcome |

## 8. Still requiring product-owner direction

- AD-P03: exact package catalog, prohibitions and which packages may be delegated.
- AD-P04: supported scopes, approval categories and operational caps.
- AD-P05/06: private-content access, player consent/notification and allowed assisted actions.
- AD-P14/15: sensitive-read review, emergency controls and acceptable small-team exception policy.
- Whether community moderators ever use a separate restricted product rather than this employee console (AD-P01).

These choices must be addressed before technical design. Do not turn the examples into implementation-ready permission strings or pretend they were approved merely because they were written down.
