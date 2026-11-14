# Trust & Privacy | sensitive investigations, enforcement and data rights

**Status:** Proposed long-term product workspace, 2026-11-14; owner review and legal/compliance review required before operational use. **Owns:** operator UX for abuse/safety reports, privileged evidence handling, account restrictions, reviews and appeals, privacy/data-rights requests and necessary processor coordination. **Not:** new content-policy law, a moderation engine, unbounded story access, automated punishment, or approved legal retention times. Related: [authority](authority-operating-policy.md), [Player 360](player-360-service-blueprint.md), [Support](support-and-customer-success-product.md), [Gameplay](gameplay-worlds-product.md), [Commercial](commercial-operations-product.md).

## 1. Product purpose and two distinct mandates

**Trust & Safety:** investigate evidence-backed harm, policy abuse or security-relevant behavior; protect legitimate users and product resources through proportionate restrictions and review.

**Privacy / Data Rights:** handle properly verified requests concerning personal data, access, correction, portability, deletion and processing objections where applicable, with true completion and auditable coordination.

These mandates may use some of the same internal people, yet require **separate evidence audiences, purposes and authority**. A routine Support agent should not inherit the ability to inspect abuse reports; an employee assigned a privacy request should not automatically gain moderator enforcement rights.

Offscreen players write private and sometimes deeply personal fiction. The content of a tragic, violent, romantic or unusual story is not by itself evidence of user misconduct. Distinguish **fictional content** from **actual harmful conduct**, unauthorized disclosure, harassment of other participants, fraud or abuse of company-funded AI.

## 2. Protect distinct classes of information

| Class | Examples | Intended product boundary |
| --- | --- | --- |
| Ordinary operational metadata | Account status, valid case link, service restriction summary | Permitted need-to-know, not full disclosure |
| Protected account information | Contact/identity and recovery evidence | Separate sensitive read scope and purpose |
| Private gameplay narrative | Personal passages, DMs, participant-private details, creative notes | Private by default; case-scoped justification for inspection |
| Raw AI context | Prompt/source text, hidden direction, model responses | Access separately from basic trace metadata |
| Trust evidence | Reports, complainant/witness details, confidential allegations, enforcement review | Restricted specialist audience; controlled disclosure |
| Commercial evidence | Payments, disputes, payer data and entitlement reasoning | Commercial/privacy authority, no general moderator entitlement |
| Staff and audit records | Sensitive access by employees, approval trail, investigations into misuse | Authorized governance review, no self-cleanup |
| Data-rights request package | Identity verification, requested scope, processor/deletion outcomes | Restricted privacy operations; purpose-bound exports |

Not every story passage is equally sensitive, and the platform should minimize routine exposure. But **default private** is safer than designing a universal raw-message browser simply because we can.

A case summary may say "account restricted; appeal available" without displaying which private reports led to the decision. A raw prompt may contain multiple users' protected content; viewing one player's execution is not a blank check to read it all.

## 3. Trust and privacy operator surfaces

| Surface | Staff job |
| --- | --- |
| Trust Intake | Review a new report with safe metadata, alleged behavior and urgency |
| Restricted Case Detail | Collect permitted evidence, allegations, findings, affected subjects and review history |
| Evidence Review | Purpose-bound access to relevant passages, source provenance and disclosure log |
| Enforcement Desk | Propose narrowly scoped restriction or warning with impact preview |
| Appeals & Reconsideration | Review challenges independently of original decision where possible |
| Abuse & Spend Anomalies | Investigate supported fraud/spend patterns without inferring guilt from activity alone |
| Privacy Request Queue | Track verified rights requests, due dates under actual policy/law, dependencies and blockers |
| Data Scope & Processor View | Explain which systems hold relevant records, what can be exported/deleted and outstanding processors |
| Sensitive Access Review | Show who examined restricted data, why, for how long and under which authority |
| Policy & Review Guidance | Versioned operational criteria, documented exceptions, customer communication rules |

An ordinary Player 360 can link to an authorized safe restriction notice without embedding the entire Trust record. The recipient of a sensitive deep link still needs their own authorization.

## 4. Evidence is not automatically guilt

A credible investigation needs to distinguish:
- user report/allegation;
- original user-authored content or action;
- AI-generated narrative that was not manually written by the player;
- confirmed platform event, account/participation authority and relevant technical evidence;
- context, intent and credible alternative explanations;
- finding and proportional enforcement action, with review/appeal status.

**A model producing inappropriate prose is not proof that the player intentionally authored it.** A high-spend free player may simply be engaged; unusual AI spending alone is not proof of fraud. Conversely, repeated unauthorized attempts, fabricated identities or actual harassment may demand swift protection.

Human judgment, documented reason and evidence scope should be normal for meaningful enforcement. Automated risk signals may triage or restrict new risky activity under carefully defined policy, but must not silently turn into final irreversible sanctions.

## 5. Intervention taxonomy

| Action class | Intended product result | Guardrail |
| --- | --- | --- |
| Advisory warning | Customer receives a clear permitted warning | Accurate basis, communication record |
| Content-specific restriction | Limit legitimate access to a named unsafe artifact/surface | Scope, other participants, appeal |
| Campaign-level pause | Hold dangerous new actions in an affected shared world | Preserve already committed events; impact disclosure |
| Account-level restriction | Limit a named player's eligibility within policy | No arbitrary deletion of their history or payments |
| Sponsored-cost protection | Temporarily limit new funded dispatch under validated exposure risk | Not a pretext for permanent punitive ban |
| Emergency protective intervention | Immediate narrowly authorized action to limit ongoing harm | Event/audit record and prompt retrospective review |
| Release restriction | Pause a problematic feature for safety | LiveOps authority, not a hidden moderator configuration change |
| Reversal / appeal outcome | Lift, modify or uphold an action with reasons | New attributable decision; previous record preserved |

An account may be under an active safety restriction while holding a valid paid subscription. The product should show both realities without implying that payment makes the restriction invalid or the restriction automatically erases financial obligations.

## 6. Trust investigation lifecycle

Recommended states: **received → triaged → investigating → waiting for evidence / specialist review → decision proposed → decision authorized when required → action pending → verified outcome → resolved**, with separately tracked appeal, restoration or expungement outcomes.

Required distinctions:
- who reported, who is accused or affected, who may view evidence;
- allegations versus verified facts, with provenance and date;
- immediate protection versus final enforcement decision;
- severity, reversible impact, affected campaigns and other members;
- policy basis, reviewer identity, any conflicts of interest and independent appeal where feasible;
- communication that reveals enough for procedural fairness without exposing protected reporters or secrets.

Trust staff should not be able to use an investigation to browse an unrelated player's life. Each sensitive read has a purpose and bounded scope. Observations and exports remain separately controlled.

## 7. Data-rights requests are workflows, not a Delete User button

The privacy experience should:
1. Receive the request and verify authority to act for the relevant player or payer.
2. Identify requested right, relevant account(s), data categories and affected shared campaigns.
3. Establish applicable requirements and timing with legal/compliance input; avoid hardcoded invented universal deadlines.
4. Identify relevant data sources and processors, including payment-provider and model/observability records where relevant.
5. Distinguish user-owned personal records from shared game facts and another participant's data.
6. Provide a controlled export/correction/erasure plan where lawful and feasible, with justified exceptions and independent authority for high-impact work.
7. Track execution, provider acknowledgment, pending work, partial completion, verification, communication and appeal/escalation.
8. Maintain an appropriate minimal record that a request was processed, consistent with applicable retention and legal obligations.

**A removed login is not proof of erased data.** A model output copy may exist in an authorized processor or a retained audit record; the Admin must show known remaining dependencies or permitted exceptions. A deletion request must not silently erase another person's legitimate shared-campaign history or falsify a financial ledger.

The exact legal grounds, local jurisdiction, retention windows and response deadlines are **not** set by this design. Those require qualified review when product scope and markets are established.

### Shared-world deletion example

Alice requests erasure after leaving a campaign with Bob. Some data belong solely to Alice's account, some are authored private content, and some are shared canonical events Bob has experienced. The privacy operator must explain the available outcome under approved policy, including whether anonymization, redaction, attribution changes, restricted access or lawful retention applies. They cannot simply drop the entire campaign or promise that every copy vanished.

## 8. Cross-team boundaries

- **Support:** explains allowed customer-facing result and routes an appeal; does not inspect complainant details by default.
- **Engineering:** can investigate technical exposure through minimized evidence and authorized exceptional access; does not decide final Trust sanctions.
- **Commercial:** handles refunds, disputes and entitlements under separate authority, even during restriction.
- **LiveOps:** controls rollout/feature availability; Trust may request protective actions without universal release powers.
- **Governance:** reviews staff misuse and sensitive access; security investigations and employee discipline use restricted audience.
- **Growth:** may use legitimate aggregate/suppressed counts, not private stories or Trust allegations as targeting data.

The platform should allow evidence references and safe collaboration, **not unrestricted copying** of confidential material into broad cases or metrics.

## 9. Worked journeys

### T-01: actual harassment in a shared story
A participant reports repeated unwanted interactions by another user. Trust verifies the legitimate participant relationship, examines only permitted evidence, offers immediate appropriate protection where policy allows, and evaluates restrictions/appeal. Shared-world state and witnesses are respected; an ordinary Support employee sees only the safe status and communication.

**Negative:** a fictional villain's dialogue generated by AI is not automatically attributed as actual harassment by the player.

### T-02: abusive sponsored usage suspicion
Commercial alerts to unusual expense. Trust sees source-linked operational patterns and legitimate alternatives (high engagement, retries, system bug). It may recommend a bounded sponsorship stop, while Engineering examines expensive failure loops.

**Negative:** financial anomaly alone is not accepted as a proven fraud finding.

### T-03: private narrative accidentally exposed
A privacy/security incident is opened. The affected content audience and observed exposure are established, incident responders act under special permissions, Support communicates only authorized facts, and the case tracks corrective actions plus remaining uncertainty.

**Negative:** the operator does not proclaim "no data affected" merely because analytics failed to record a read.

### T-04: deletion request with shared story and payment records
The request is verified, scope mapped to account/campaign/payer, lawful exceptions and processors reviewed, then actions executed and verified separately. The player receives an accurate response.

**Negative:** deleting account access but leaving untracked processor copies is not marked fully complete.

### T-05: unjustified restriction and appeal
A player disputes enforcement. An eligible reviewer inspects the original evidence and reasoning, considers new facts, and lifts/modifies/upholds the action. Customer communication reflects actual changed access. Previous actions remain auditable.

**Negative:** the original reviewer cannot erase inconvenient evidence or silently mark their own conclusion infallible.

## 10. Negative acceptance and safeguards

- Support staff can see a safe restriction explanation but cannot identify a confidential complainant.
- The person under investigation cannot gain access to private Trust evidence through player impersonation.
- Staff investigating one participant do not automatically access another member's private narrative or payer details.
- AI-generated fiction is not misrepresented as human-authored misconduct.
- A temporary spending restriction does not imply forfeiture of valid financial rights.
- A verified rights request remains partially complete while a known external processor has not confirmed its portion.
- A subject access export does not accidentally include another participant's protected private content.
- A restricted employee's attempted sensitive reads are subject to security review; logs cannot be rewritten by that employee.
- Account restriction, content restriction, campaign pause and commercial hold remain separate operators with separate impacts.
- A report with insufficient evidence has an honest disposition, not a fabricated finding to satisfy closure metrics.

## 11. Open product/legal choices

AD-P05/13/14/17/23: sensitive access and notices, audit, workflow deadlines and shared-content policy. **AD-P32:** actual Trust enforcement taxonomy and appeals fairness model. **AD-P33:** rights-request scope/retention/processor and shared-game deletion policy. **AD-P34:** generated-versus-player content provenance and legitimate evidence handling. All are proposals requiring specific policy and legal assessment before operational deployment.
