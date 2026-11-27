# Admin authority and governance

**Owns:** what a staff member may do, to which subject, for which reason, under which constraints, and which extra approval is required.

**Does not own:** the technical grant schema ([topology and authorization](../../technical/admin/topology-and-authorization.md)).

**Status:** proposed operating policy, 2026-11-14, pending owner review of the package catalog.

**Selected intent.** A staff permission is one coherent grant, never a sum of independent actions and scopes. Request, approve and execute are separate, and every player-access mode is explicit and attributed.

**Current realization.** Landed Admin access and audit slices do not accept this catalog as production grants. Production `support-investigator` grant issuance for live workers remains **absent**. OBS06/07 Situation UI is synthetic or disposable-grant proof only.

## A grant is one coherent permission

An effective permission combines staff identity and source of authority, permitted actions and resource family, allowed resource set and environment, contextual limits (purpose, assigned case, quantity, expiry, sensitivity), and any further authorization required.

Composition is the union of intact applicable grants, subject to global prohibitions and current policy. It is not the independent union of every action from one package with every scope from another.

Illustration: package A lets Support grant small compensation only to accounts tied to their assigned cases. Package B lets Analytics view aggregate billing across the company. Holding both must not yield "grant compensation to every account." "Can see a record" plus "can edit a different class of record" never becomes "can edit this record."

Global restrictions, privacy boundaries, separation of duty, explicit account restrictions and resource ownership do not disappear because an employee has a second role. If case assignment is a condition for compensation or sensitive investigation, staff cannot self-assign an arbitrary protected case to manufacture that condition.

Production authority is not inherited from a laboratory permission. Metadata and private narrative are not equivalent. View, request, approve, execute, repair and export are different verbs. Exceptional access does not silently become permanent.

## Illustrative packages, not a ratified catalog

These names are candidates, not API permission strings and not immutable job titles. The exact catalog remains an owner decision.

| Package | Routine access does not include |
| --- | --- |
| Support Intake | Private narratives, refunds, account repair |
| Support Resolution | Unlimited credits or payment edits |
| Engineering Diagnostics | Unrestricted personal content or gameplay repair |
| Sensitive Evidence Reviewer | Bulk download or persistent universal raw access |
| LiveOps Operator | Arbitrary production code or prompt mutation |
| Commercial Operations | Full staff governance or unbounded refunds |
| Growth Analyst | Individual private story content |
| Trust Investigator | General customer marketing access |
| Staff Administrator | Granting one's own privilege increase, or reading all narratives |
| Security Approver | Automatically performing every business operation that was approved |

Invite only access the inviter may delegate. Escalation requests a narrow, time-limited capability for one subject and purpose. Do not grant a reusable blanket to solve one case. Revocation terminates privilege and delegated sessions. A pending request by a departed operator must not later execute as if they were still authorized. Staff must not use an administrative role on their own player account through ordinary service flows.

Request, approve and execute are separate. An approval is about a specific proposed effect. Changing the target, amount, content exposure or blast radius invalidates it. The approver does not silently inherit permission to perform the action. A one-person company still needs a recorded emergency path with later review, not a silent bypass.

The access inspector distinguishes not allowed, approval possible, waiting, approved but not executed, and verified completed. A denial must not reveal protected names or even existence to an unauthorized caller.

## Three delegated player-access modes

**View as player** is a labeled preview. It does not send gameplay commands, purchases, destructive account operations, notification acknowledgements or read receipts. It does not counterfeit a preview with disabled buttons over a live session. Protected narrative stays redacted unless a separate purpose-authorized grant exists.

**Assist as player** requires explicit bounded authority for a named account, reason, duration and allowed action subset. The operator remains the attributed actor. Permanent identity, credentials, payment instruments and account deletion cannot be changed merely because the player could change them. A revoked session stops working. Unknown outcome is investigated, not blindly repeated.

**Investigate in sandbox** is an isolated copy or reconstruction. It does not touch live gameplay, commercial allowance, notification, presence, billing or durable world state. Copying a private story does not bypass private-content authorization. Experimental provider spend belongs to internal operations. A sandbox result is evidence for a possible fix, not a preapproved production repair.

## Adversarial results required of any later implementation

- Case-limited grant plus organization-wide analytics read does not create a global grant.
- An employee who can invite staff but cannot grant privileged packages cannot bypass that limit.
- Requesting and approving one's own elevation through two accounts is forbidden.
- Engineering can see task duration without seeing private prompts.
- Support preview of a shared campaign shows only legitimately visible material.
- Revocation during an assisted session refuses the next action.
- Bulk export is denied or separately authorized even if the person may read one customer.
- A material edit after approval requires reapproval.
- Test privilege does not perform a production action.
- Approval success with failed or unknown execution does not claim the customer state changed.

**Negative:** do not treat this proposed catalog as the default staff privilege because it is written here. Do not describe synthetic Support grants as production-ready.
