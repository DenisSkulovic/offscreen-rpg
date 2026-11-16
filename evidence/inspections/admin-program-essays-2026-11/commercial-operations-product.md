# Commercial Operations | product workspace specification

**Status:** Proposed long-term product target, 2026-11-14; pending owner review. **Scope:** operator experiences for offerings, paid/sponsored relationships, entitlements, commercial allowances, usage, adjustments, refunds, budgets and economics. **Not:** price decisions, billing architecture, a payment-provider selection, live implementation claim or Cursor task. Companion owners: [Player 360](player-360-service-blueprint.md), [authority policy](authority-operating-policy.md), [workflows](operations-and-workflows.md) and [domain map](domain-capabilities.md).

## 1. Purpose and professional jobs

Commercial Operations lets authorized Support, Revenue Operations, Finance, Growth, Product and Leadership understand **who is promised what, whether it is actually available, what has been consumed, who is responsible for it, and what it costs the business**.

This is not a payment processor in a nice new coat. It is the company's product-specific commercial control room. Financial settlement and payment credentials can remain with a specialized provider, while Offscreen owns the truth of what a player may do in the game.

An employee should be able to answer:
- What offering did this customer subscribe to, on what terms and at what lifecycle state?
- What effective gameplay capabilities and allowances does a specific **beneficiary** have right now?
- Which funded source and policy made that access possible?
- Did an AI operation consume a customer's allowance, the company's promotional budget, an internal diagnostic budget or nothing?
- When an externally reported payment and local entitlement disagree, what is confirmed, stale, pending or unresolved?
- What intervention is appropriate, with which authority and financial exposure?
- Does serving a particular tier or cohort remain economically sustainable?

The payer, player, campaign, character, beneficiary and sponsor must not be silently conflated. Shared campaigns add special cases; **who pays for another participant's activity is an open business rule**, not a guessed model.

## 2. Product objects and distinctions

| Concept | Operator-facing meaning | Common confusion to prevent |
| --- | --- | --- |
| Offering/plan and version | A marketed promise of features, limits and price terms at a particular time | A historical customer contract is not automatically rewritten when today's plan catalog changes |
| Customer/payer | Party commercially responsible for a purchase or subscription, if supported | Need not equal the player using the product or the campaign creator |
| Subscription/billing relationship | Recurring commercial status, renewal or cancellation, charges and disputes | Provider payment status is not the same fact as effective game access |
| Entitlement | Named product capability available to a specified beneficiary under current policy | Feature access is not identical to remaining resource allowance |
| Grant/allowance | A bounded source of permitted consumption, window, scope, funding and expiry | Not a player's fictional gold, real-money wallet or provider invoice |
| Usage reservation/consumption | Accountable lifecycle of a permitted resource for an actual admitted activity | A queued request, model attempt and successful published turn are different units |
| Adjustment | Independently recorded compensation, correction or promotional grant | Do not overwrite original history to make an error disappear |
| Refund/payment action | A monetary movement or provider instruction with external confirmation | Never label request accepted as funds returned |
| Provider expense | Cost or estimated cost of model/infrastructure work | May occur without a successful player-facing result |
| Internal funding/budget | Company-controlled exposure for free trials, promotions or diagnostics | Does not override a contractual entitlement or game rule |
| Restriction/stop | Separate eligibility controls for account, campaign, service or provider | A paid account can still be temporarily unable to dispatch work |

**Recommended business invariant:** customer allowance, internal provider expenditure and fictional world resources have distinct histories and responsibility. A system may display them together but never treat them as interchangeable balances.

## 3. Workspace map: the operator's working surfaces

| Surface | Primary job | Who primarily uses it |
| --- | --- | --- |
| Commercial Overview | Revenue/service health, unusual spend, billing exceptions, reconciliation queue | Finance, Revenue Operations, Leadership |
| Offerings Catalog | See proposed, current, retiring and historical plan promises | Product, Finance, authorized Commercial |
| Customer Commercial Record | Understand a named payer, subscription, invoicing and purchase context | Support, Revenue Operations |
| Effective Access Inspector | Explain exact beneficiary/campaign capability, allowance and blockers *now* | Support, Customer Success |
| Allowances and Adjustments | Inspect grant origin, consumption, expiry, compensatory activity and policy | Support Resolution, Commercial |
| Usage and Cost Explorer | Trace one gameplay operation through allowance effects and company expenditure | Engineering, Finance |
| Payments and Exceptions | Investigate failed/unknown settlements, disputes, authorized refunds and mismatches | Revenue Operations |
| Exposure and Economics | Cost by tier/task/model/cohort, sponsorship commitments, margins and risk | Finance, Product, Leadership |
| Promotional Controls | Define authorized offers, funding, eligibility and performance, distinct from marketing delivery | Commercial, Growth |

A Support user can enter the Effective Access Inspector from Player 360 with no financial-management authority. A Finance operator can investigate aggregate costs without reading raw story content. A Growth employee can propose a promotion without being able to issue arbitrary credits.

## 4. Effective entitlement and allowance explanation

**The primary question is not "is the user Premium?" but "can this exact operation proceed for this beneficiary in this campaign under today's constraints?"**

Recommended explanation:
1. Identify the requested capability and subject (player/campaign/participant).
2. Show its relevant plan, subscription, sponsorship or authorized exceptional source.
3. Show feature entitlement and its effective date/status, with provenance.
4. Show available allowance, reservations, pending/uncertain consumption and relevant expiry.
5. Show operational restrictions: account, campaign, platform budget, provider availability, safety hold.
6. Present the **effective outcome** and an honest next action or escalation.

Example: subscription paid; entitlement synchronizing; a compensatory grant active; provider dispatch globally paused. The result is **not currently dispatchable**, even if the player has unused units. Explain each dimension separately.

A *sponsored trial* should not be labeled equivalent to a *paid subscription*. An *estimated reset* should not look like a contractual renewal guarantee.

### Distinct usage lenses

- **Player experience unit:** accepted command, Storyteller turn, passage or completed session. These are different quantities, not alternate words for one meter.
- **Commercial allowance unit:** whatever billable/limited unit the future offering legitimately defines. Do not choose "one turn = one credit" accidentally.
- **Provider work unit:** model request, input/output tokens, inference call, retry, auxiliary task, retrieval or diagnostic activity.
- **Company cost unit:** incurred or estimated spend, sometimes delayed or uncertain.
- **Game resource unit:** fictional time, experience, inventory or currency, owned by game mechanics.

The product must remain able to explain failed attempts that cost money but did not produce an accepted player result. The actual charging rule is still a business decision; admin should preserve the distinctions needed to implement that rule honestly.

## 5. Catalog, lifecycle and customer promise

A plan is a versioned **promise**. Operators should see marketing description, effective feature access, applicable usage policies, grace/cancellation behavior, relevant eligibility and historic customer associations.

An authorized catalog change should distinguish:
- draft proposal versus approved publication;
- new subscriptions versus existing subscriptions;
- immediate access changes versus changes at the next renewal;
- grandfathered promises versus mandatory service/safety restrictions;
- whether the change requires customer notice or explicit acceptance.

**Recommendation:** do not silently strip existing players' valid entitlements merely because a product manager edits the current catalog. The scope of a price or policy change must be explicit and reviewable.

A cancellation may mean "no future renewal", not "access ceases immediately". An invoice retry is not automatically a voluntary cancellation. A chargeback/dispute is not automatically a content-moderation finding.

## 6. Administrative actions and risk

| Action | Recommended product contract | Guardrail |
| --- | --- | --- |
| View access explanation | Read effective capability and blockers | May omit sensitive payer details |
| Grant limited compensation | New bounded allowance record, reason and case | Cap, beneficiary, expiry, outcome verification |
| Temporarily extend access | New visible exceptional source with start/end | Cannot mutate contractual purchase history |
| Correct entitlement mismatch | Investigate and reconcile from authoritative sources | Do not manufacture a payment success |
| Change subscription | Explicit external/commercial lifecycle operation | Authority, customer communication and provider outcome |
| Issue refund | Separate money-movement request and verified result | Stronger permission, amount ceiling, purpose |
| Bulk promotion | Defined eligibility, funding ceiling, exclusions and review | Independent scope/approval, impact preview |
| Pause sponsored spending | Clearly separate new-operation admission from already committed play | Incident policy, effect verification, player messaging |
| Export commercial records | Independent export authority and purpose | Never infer from per-account view permission |

**No direct ledger surgery:** an authorized employee cannot simply delete usage, rewrite provider charges or alter invoice history to make a dashboard green.

## 7. Representative operator journeys

### C-01: paid but unable to play
Support opens beneficiary access and sees valid payment evidence, entitlement mismatch and perhaps a separate platform stop. The case links both sources. Authorized Revenue Operations reconciles or issues a narrowly bounded provisional remedy, then checks the *effective* gameplay permission. If external data are delayed, the UI remains pending/uncertain, not "fixed."

### C-02: provider attempt lost its acknowledgement
A model dispatch may have cost money even though the game has no published passage. Support sees a pending/unknown resource effect; Engineering sees provider uncertainty. The operator investigates the original receipt rather than pressing Retry Grant or Replay Charge. Customer compensation is a distinct decision after evidence review.

### C-03: a legitimate goodwill credit
Support requests 20 extra units, only if the current offering recognizes those units, with target beneficiary, expiration, purpose, and source case. A cap breach goes to Commercial approval. Once applied, the grant appears alongside other funding sources without pretending to be a paid subscription.

### C-04: trial promotion with an actual budget
Growth proposes an eligible cohort, start/stop conditions and offer. Commercial sees aggregate maximum exposure, whether existing subscribers qualify, fraud/abuse exclusions and changes to future entitlements. Activation is separate from a drafted campaign. Stop means no new awards where policy allows; it does not silently revoke already earned grants.

### C-05: refund versus service compensation
Finance can issue a valid monetary refund through its authorized workflow, while Support can separately compensate an affected player with game allowance. Neither action implies the other. The customer-facing history must not count an allowance grant as returned money.

### C-06: one payer, several beneficiaries
If an eventual supported plan pays for multiple campaign participants, operators see the allocation rule and beneficiary boundaries. A staff member investigating one participant is not automatically entitled to another participant's payment or account details. This is a **stress case**, not approval for a family/team plan.

## 8. Metrics with explicit definitions

The operator should see acquisition of paying customers, active paid relationships, renewal/cancellation, refund/dispute rates, entitlement mismatches, allowance exhaustion, promotional liability, cost per successful gameplay outcome, cost per model task and gross margin **only when definitions/data support them**.

A calculated "gross margin" is not an accounting-certified financial statement. Gross revenue, net receipts, refunds, recognized revenue, company provider expense and sponsored consumption are different notions. Every chart states population, accounting/measurement basis, source, time window, freshness and known gaps.

Important correlations: expensive AI tasks versus meaningful player outcomes; failed work versus player compensation; sponsoring free users versus conversion; model cost optimization versus narrative complaints. None alone proves causality.

## 9. Failure and abuse cases

- Paid status is current, entitlement is stale: no misleading universal "active" badge.
- A player holds a grant but a platform spending stop is active: accessible read-only history does not authorize new charged generation.
- Staff compensation request times out: do not double-grant on retry.
- Provider charge exists but publication failed: do not bill a player automatically based solely on technical expenditure.
- Two entitlements with different scopes exist: the effective explanation preserves each source and condition.
- Staff can view one invoice but not refund or bulk export: contextual controls enforce those separations.
- Catalog update would affect established contracts: show versioned affected population and require appropriate customer-policy decision.
- Account has both a restriction and a paid plan: restriction remains visible and is not erased by a sales action.
- No live payment-provider data: show unknown/unavailable rather than fictitious zero revenue or successful refund.
- Fictional in-world gold or time is never an editable commercial balance.

## 10. Decisions before product acceptance

- AD-P02/09: payer/beneficiary/participant relationship, actual metered units, plan/grant priority, handling of partially used sponsored work.
- AD-P04: routine support grant/refund caps and approval class.
- AD-P12/13: promotion eligibility, customer promises and communication.
- AD-P21 (proposed in decision register): catalog versioning and how existing subscribers adopt commercial changes.
- AD-P22: ownership of sponsored-budget controls, billing/usage reconciliation and unit-economics definitions.

Do not invent prices, SLA targets, exact monetary thresholds, provider features or a technical ledger shape here.
