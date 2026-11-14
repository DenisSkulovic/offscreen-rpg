# Support & Customer Success | product workspace specification

**Status:** Proposed long-term operator product, 2026-11-14. Owner review required; no implementation authority. **Owns:** support intake, case handling, customer communication, specialist collaboration, customer-success engagements, outcomes and service quality. **Does not own:** payment settlement, gameplay truth, Trust findings, staff authorization, or a selected ticketing/CRM vendor. See [operations](operations-and-workflows.md), [Player 360](player-360-service-blueprint.md), [administrative authority](authority-operating-policy.md), [Commercial](commercial-operations-product.md), and [Trust & Privacy](trust-and-privacy-product.md).

## 1. Product purpose

**Support** answers: What went wrong for this player, who is helping, what evidence exists, and what is a safe, verified remedy?

**Customer Success** answers: Are customers realizing the product's intended value, what obstacles threaten their continuation, and how can we legitimately help without intrusive surveillance or inventing promises?

They overlap in personnel and player context, but differ in operating style. Support is primarily reactive issue resolution. Customer Success is proactive assistance with onboarding, adoption and retention when appropriate. Both need a common account picture; neither receives another team's authority merely because the same employee wears several hats.

The console must make normal customer problems solvable without requiring a developer, while escalating genuine game-engine or AI incidents without throwing screenshots over a wall.

## 2. Distinct work objects

| Object | Intended meaning | Important separation |
| --- | --- | --- |
| Contact/conversation | Customer or staff communication, channel and audience | A message is not evidence that an administrative action succeeded |
| Support case | Accountable problem, investigation, ownership and resolution | May cite Trust/Engineering matters without revealing restricted evidence |
| Success engagement | Legitimate outreach/onboarding/retention effort, reason and outcome | Not an open Support defect or permission to inspect private narratives |
| Customer relationship | Account/beneficiary, context and allowed communication preferences | May be different from payer or campaign owner |
| Escalation | A specialist question with impacted entity, evidence and expected next step | Doesn't give the receiving colleague broad access by copying data |
| Known issue/incident | Reusable explanation of an ongoing defect/outage and affected scope | Linked cases should not each create a competing incident truth |
| Service remedy | Proposed and verified action, grant, repair or communication | Support case closure cannot imply the remedy was applied |
| Knowledge article/playbook | Reviewable guidance on legitimate diagnostics and allowed resolutions | Not a hardcoded bypass of authority or product policy |
| Service promise | Applicable SLA, service commitment or customer notification expectation | Must be expressly defined, not inferred from pricing labels |

A Trust case has its own restricted audience and evidence. Customer Success cannot see confidential allegations because a Support case is linked to a restricted account. A Support case may display a safe customer-facing restriction explanation without the underlying report.

## 3. Workspace information architecture

| Surface | Primary work | Product affordances |
| --- | --- | --- |
| Inbox / Intake | Understand new contact and prevent duplicate work | Identity verification state, safe contact summary, routing, related cases and incidents |
| My Queue / Team Queue | Prioritize service work | Assignment, due/overdue state based on real promises, urgency, impact and next owner |
| Case Detail | Maintain one coherent investigation | Player/campaign/billing links, evidence with sensitivity labels, hypotheses, notes, communication, actions and outcome |
| Customer Context | Understand permitted Player 360 state in one click | Effective access, game health, prior remedies, recent incidents, customer impact |
| Guided Diagnostics | Troubleshoot without unrestricted data | Structured account/usage/error explanations, known issue matching, specialist handoff |
| Remedy Desk | Propose an allowed action next to the issue | Bound target, delta, actor, impact, approval and verified result |
| Knowledge & Playbooks | Apply consistent product decisions | Versioned policies, eligible scenarios, exclusion/when-to-escalate notes |
| Success Portfolio | Coordinate permitted proactive customer work | Onboarding obstacles, legitimate relationship context, opted-in communications, engagements |
| Quality & Reporting | Learn whether service solves problems | Resolution categories, reopen rate, time-to-verified-remedy, escalation friction and customer feedback |

Queues can be logical views over a dedicated external helpdesk. **A single coherent operator experience does not require building an email/ticketing engine from scratch.**

## 4. Case lifecycle and evidence discipline

Proposed progression: **received → triaged → investigating → awaiting customer / specialist / approval / external dependency → remedy pending → verifying → resolved → reopened**, with explicit cancellation, spam and duplicate-link outcomes.

- There is always a **current accountable owner** even when specialists collaborate.
- Triage differentiates severity/customer impact from employee annoyance or payment tier. Important paid customers may warrant service commitments, but serious free-player data loss is not ignorable.
- Cases are linked to exact account, participation, campaign, action/operation receipt, grant, incident and release references where relevant.
- Evidence is classified: customer-visible communication; internal general notes; restricted identity/payment material; private story content; Trust/security evidence.
- An employee seeing the case should see **only authorized evidence**, with the next safe step made clear rather than a blank unrestricted log.
- Escalation carries a concise question, observed impact, source-linked facts, attempted diagnostics and next responsibility. It does not copy raw prompts or another participant's secrets into general comments.
- A case can be resolved only with a recorded resolution explanation; if the desired action has unknown outcome, keep the relevant dependency visible.

Case state is not the same as a payment, gameplay or provider operation state. The UI must not infer a repaired story because an engineer marked the incident mitigated.

### Contact and customer verification

Before exposing protected identity fields, changing access, or assisting live play, the operator must have an appropriate basis for believing the requester is authorized for that account or campaign. Email sender address alone may be insufficient, and a user who knows a campaign ID is not automatically an owner.

A player might contact Support for a shared campaign while another participant pays for its subscription. The workflow should identify what the caller is entitled to learn and request without leaking the payer's personal payment information.

## 5. Guided diagnoses and remedy policy

| Complaint | Safe first view | Specialist path | Not permitted by default |
| --- | --- | --- | --- |
| Paid but cannot generate | Effective entitlement, allowance, service stop and freshness | Commercial reconciliation or Engineering incident | Inventing successful payment or refunding without permission |
| "My journey ended instantly" | Accepted action duration, settled result and current story attention | Gameplay/Engineering receipt investigation | Rerolling accepted mechanics |
| Lost/stuck narration | Latest published passage, pending task, relevant error status | AI execution trace and recovery | Blindly redispatching paid generation |
| Missing item | Authorized committed holder/receipt evidence | Bounded gameplay correction proposal | Free-form inventory edit |
| Inaccessible shared campaign | Membership and permitted shared status | Ownership/participation policy review | Reading another member's private account |
| Suspected abuse | Safe restriction/appeal summary | Trust & Privacy with restricted case | Revealing reporter identity or confidential evidence |
| Login trouble | Identity/account status and supported recovery path | Identity specialist | Operator retrieving password or secret |
| Incorrect allowance consumption | Reservation/settlement and observed customer effect | Commercial + AI cost correlation | Erasing usage history |

Compensation is a **new, bounded, attributable grant** whose business policy is owned by Commercial. Support can have narrow authority to issue it without holding refund, billing or catalog powers. An attempted write needs preflight and outcome verification, even if it was initiated from a case.

## 6. Customer Success without surveillance

A CS operator can follow legitimate onboarding and lifecycle signals: signed up but has not made a first real committed story, frequently encountering provider holds, recurring unresolved support obstacles, and account-level product engagement. **Autonomous in-world activity, model calls and page refreshes are not interchangeable with player engagement**.

A success engagement should have: why contact is appropriate; user preferences/permission to communicate; account/campaign context within allowed scope; intended assistance; responsible employee; actual contact/result and opt-out outcome.

Do not treat a player authoring a sad fictional narrative as an invitation for personal outreach. Do not mine private dialogue for upsell targets. Do not assume all dormant accounts want human follow-up.

Possible proactive jobs: helping a newly invited participant understand campaign access, coordinating a high-impact incident follow-up, or offering approved onboarding guidance to a consenting customer. An engagement does not imply authority to edit subscription or game rules.

## 7. Native experience versus integrated support system

**Minimum native product capability:** links between cases and exact game/commercial/AI subjects, contextual diagnostic summaries, action requests/outcomes and attributable handoffs. The Admin can display or create a case anchor even if inbound communications are provided by an external service.

**Reasonable integration candidates:** email/chat collection, ticket routing, canned responses, customer messaging, contact history and SLA notifications. Do not create competing editable cases in two systems without a clear authority and reconciliation experience.

The operator must see when a message is drafted, queued, sent, delivered or failed, where supported. Sending a message is not a substitute for verifying that the customer's problem was fixed.

## 8. End-to-end journeys

### S-01: first-tier diagnosis and resolution
Player reports that paid gameplay is blocked. Intake finds the account, verifies caller, reviews effective access and a known incident. Support can either explain the temporary service stop or request a bounded credit if policy allows. It verifies that access changed and records a customer-facing answer.

**Negative:** payment provider is unavailable. The case remains awaiting external verification; it is not marked fixed from the last cached Premium badge.

### S-02: gameplay continuity escalation
Player reports a contradictory gate event. Support links the published passage and source account without opening every private chapter (the game has no chapters). Engineering traces the relevant state/AI execution; Gameplay determines whether the discrepancy is actual corruption or character belief. A safe corrective action, if one exists, is separately authorized and verified.

**Negative:** shared campaign with other participants. The remedy cannot ignore their prior seen events or expose their restricted content to the original Support agent.

### S-03: customer recovery after incident
A major provider outage delayed required narration for several players. The incident owner publishes a safe explanation. Support identifies affected customers from evidence-backed impact, links cases, and applies appropriate remedies separately. Customer Success may coordinate an opted-in follow-up.

**Negative:** broad compensation must not be granted to every account simply because a partial incident cohort was inferred.

### S-04: legitimate proactive assistance
A newly invited player has not completed their first story. A CS specialist sees allowed onboarding state and supported contact preference, offers help, and records outcome.

**Negative:** operator cannot inspect private in-game conversations to infer the player's emotional state or upsell opportunity.

### S-05: restricted player contacts Support
Support sees only a permitted customer-facing restriction status and appeal route. The protected Trust case retains evidence and reviewer identity separately. Support routes the appeal without disclosing the complainant or undermining the restriction.

**Negative:** opening a linked Trust URL does not unlock the confidential report.

## 9. Quality measures (with denominators and caveats)

Possible measures: time from contact to first meaningful response, to accurate diagnosis and to verified outcome; reopen rate; first-contact resolution on *eligible* cases; unresolved external dependencies; escalation bounce rate; recurring defect categories; actual satisfaction when measured. Segment by complexity and source coverage, not only employee ranking.

For Customer Success: successful invited-player onboarding, verified obstacle removal, legitimate reach/response and retention effects, with opt-outs and comparison caveats. Do not present outbound contact as causal retention improvement without an evaluation design.

Every report states definition, time window, data coverage, queue inclusion/exclusion and freshness. No invented SLA or response deadline is selected by this document.

## 10. Acceptance and adverse cases

- A staff member handles both Support and Customer Success without gaining broader story access.
- Support resolves ordinary allowance confusion without a developer and without rewriting usage history.
- Two simultaneous cases referencing one incident do not create contradictory "root causes."
- Internal notes, customer-visible messages and protected evidence never become the same audience.
- A coworker receives an escalation with sufficient **allowed** evidence, not a leaked raw narrative.
- One remedy is pending external verification; the case does not claim success.
- A payer and campaign member differ; customer verification and disclosure scope remain correct.
- Contact channel fails; the operator sees unsent/failed state rather than "customer notified."
- A routine Support employee cannot perform a bulk world repair or sensitive refund.
- An external helpdesk becomes unavailable; Admin honestly shows the dependency, not an invented case history.

## 11. Open decisions

AD-P05/08/13/17/20: access to story content, case lifecycle/source-of-truth and helpdesk ownership, notice/consent, support commitments. **AD-P27:** legitimate account recovery/identity verification and case disclosure policy. **AD-P28:** Customer Success proactive-contact eligibility and opt-out contract. These require owner review and, where applicable, legal/operations input before technical design.
