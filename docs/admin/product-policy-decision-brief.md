# Admin product policy decision brief | converge without prematurely coding

**Status:** Author recommendations for owner review, 2026-11-14; **not accepted policy**. **Owns:** grouping the decision register's questions into a manageable set of product decisions. It does not replace the domain owners or [decision register](decisions-and-readiness.md). The [adversarial review](product-adversarial-review.md) explains why several choices are safety-critical.

## How to use this brief

The Admin suite now specifies every proposed logical workspace. That does **not** mean the product is accepted. This brief gathers consequential cross-cutting choices into ten policy packages. For each, the owner can **accept**, **revise**, or **defer a capability explicitly**. A deferral is valid when its future impact and safe initial behavior are clear. A proposal is not acceptance.

Priority classes:
- **Gate A:** cannot build a safe core admin product without a settled rule.
- **Gate B:** must be settled before the specific sensitive/write/commercial capability is launched.
- **Later:** can remain conditional until the business actually needs it.

## Policy package summary

| Package | Priority | Strong recommendation | Remaining owner choice |
| --- | --- | --- | --- |
| PB-01: internal audience | Gate A | Staff-only console, separate staff identity; community moderation later through restricted experience | Accept boundary and future delegation posture (AD-P01) |
| PB-02: core subjects | Gate A | Distinguish player, campaign, participation, character, payer, beneficiary and sponsor conceptually | Confirm which relationships enter initial scope; shared campaign rights (AD-P02) |
| PB-03: permissions and workflow assignment | Gate A | Bounded complete grants, separate request/approve/execute, case assignment cannot self-escalate | Package defaults, who can assign cases, scope and cap policies (AD-P03/04/38) |
| PB-04: privacy and customer access | Gate A for reads; Gate B for sensitive modes | Metadata-first Support; separate purpose-bound raw evidence; no default global story browsing | Consent, notice, raw prompt access, export and processor policy (AD-P05/06/23/33) |
| PB-05: support and service actions | Gate A for core; Gate B for writes | Native linked case/action context; external communication tooling permitted; verifiable bounded remedies | Case source of truth, identity verification, communication and Service Success outreach (AD-P08/13/20/27/28) |
| PB-06: commercial access and spend | Gate B before paid live service | Offering vs subscription vs entitlement vs grant vs usage vs provider expense separate; no history surgery | Chargeable unit, funding, failed/unknown work and catalog migration (AD-P09/21/22) |
| PB-07: gameplay correction and sandbox | Gate B before repair/assist | No unrestricted state editor, no silent reroll, sandbox isolated and internally funded | Allowed repair classes, shared-world impact, Chamber surface, customer notice (AD-P07/16/23/24) |
| PB-08: LiveOps and emergency control | Gate B before scaled paid rollout | Preserve committed history, protect existing campaign promises, tightly scoped stop of new spend | Compatibility matrix, emergency approvals and accepted/in-flight work policy (AD-P10/15/26) |
| PB-09: Trust, privacy and human review | Gate B before relevant operations | Restricted evidence, contestable findings and reviewable data-rights workflows | Enforcement taxonomy, legal applicability, retention and processor handling (AD-P17/32/33/34) |
| PB-10: analytics and governance | Later, except safe default views | Define people vs campaigns vs model rounds; metric provenance; staff access review and audit | KPI definitions, cohort thresholds, AI advisory scope, staff bootstrap (AD-P11/12/14/18/19/29–31/35–40) |

## 1. A safe initial Admin is possible without every future policy

**Recommended earliest coherent scope:** distinct staff identity and bounded permissions, internal account search, permission-aware Player 360, effective access read, campaign/operation state summary, linked support case context, basic audit, and visibility into sponsored operation cost uncertainty. Such a slice is **conceptual maturity guidance**, not a Change dossier or authorization to implement it.

Defer until policy is signed:
- any live player write-assistance that cannot prove acceptable consent/attribution;
- raw private narrative export, broad support browsing and bulk identity export;
- generalized game-state repair, rollback of historical events and unrestricted sandbox copying;
- arbitrary refund, subscription contract rewrite or global allowance editor;
- production-wide experimental rules changes in already active shared campaigns;
- third-party/community access to the internal operator environment.

A capable read-only Admin remains useful; pretending an unsafe write path is necessary for launch is not.

## 2. Core choices that should not be outsourced to technical implementation

### The relationship scope problem
If "assigned support case" grants account visibility, someone must decide which employees may **create/assign/reassign** such cases and which additional sensitive powers require separate approvals. This is a product/access-policy decision before designing any RBAC/ABAC system.

### Consent is action-dependent
Preview, selected narrative evidence read, live assistance and shared-campaign repair are not the same privacy action. The owner should approve a risk/notice/consent matrix rather than choose one blanket consent toggle. Exact legal obligations need qualified review.

### Funded model work is not the player's meter
One model task can contain several rounds; one mechanical action may settle before narration; provider expense can occur even with no published player outcome. The commercial catalog must choose its own charging unit and consumer promises. Engineering telemetry cannot define those promises by accident.

### The earned world limits administrative powers
A permitted correction must not retroactively manufacture earned progress, erase a witnessed consequence or reroll accepted mechanics to appease a customer. Some recovery procedures may need explicit new story/fork or unavailable status rather than a silent Undo.

### Emergency operations protect future exposure
Stopping new sponsored dispatch may be urgent and feasible with one on-call employee. It does not imply authority to erase already accepted work, cancel existing provider charges, or tamper with financial records. A bounded one-person exception is safer than a standing all-powerful operator.

## 3. Owner acceptance worksheet (for a future review, not a questionnaire)

| Decision record | Status now | Proposed next decision |
| --- | --- | --- |
| Product charter and workspaces | Authored, owner review pending | Confirm intended internal product and the proposed ten logical workspaces |
| Identity, access and staff governance | Authored, high-risk policy open | Accept bounded grants, assignment-scoping and conflict rules; decide bootstrap/emergency exceptions |
| Player 360 and shared games | Authored, relationships not fully settled | Accept conceptual distinctions; choose earliest supported membership and commercial scope |
| Sensitive reads, cases and delegated modes | Authored, purpose/consent policy open | Accept metadata-first default; decide exact write/sensitive-access preconditions |
| Commercial and AI economics | Authored, metering and sponsorship policy open | Set a legitimate allowance unit and uncertain-use/refund promise before paid live operation |
| Gameplay repair and version adoption | Authored, intervention policy open | Choose narrowly supported repairs and compatible-update categories, defer the rest |
| Trust and data rights | Authored, requires policy/legal review | Confirm safe initial workflow; do not claim universal deletion or retention obligations |
| Metrics and experiments | Authored, exact metric dictionary open | Accept unit distinctions; postpone precise KPIs/cohorts until real traffic and business policy exist |
| Native versus integrated service tooling | Authored, owner choice open | Keep native case context and auditable interventions, select integrations later |
| Product completion gate | **Not passed** | Resolve Gate A, explicitly scope Gate B deferrals, and obtain owner acceptance |

## 4. What counts as a resolved decision?

A policy is resolved when the owning document specifies:
- who is affected and who may decide;
- the intended user/operator outcome, including negative/unknown states;
- what information may be seen or changed and with what scope;
- how the effect interacts with existing contractual, game and privacy obligations;
- whether the capability is included, excluded or conditional at first delivery;
- an identifiable owner acceptance or clearly documented deferral.

A technical possibility or vendor feature is not a product decision. "We'll build it later" without a safe initial behavior is also not a completed policy.

## 5. Next recommended sequence

1. Review the [adversarial scenarios](product-adversarial-review.md) and challenge the ten packages, starting with Gate A.
2. Mark owner-accepted policy versus author-proposed policy in the [decision register](decisions-and-readiness.md) and permanent owners.
3. Explicitly exclude any unapproved sensitive/write/commercial capabilities from an initial scope, without deleting the long-term vision.
4. Re-walk Support, shared-player, incident, financial and privacy journeys using the accepted rules.
5. **Only after product gate:** inspect current source and design the technical target. **Only after technical gate:** create scoped code-bearing Change folders for Cursor.

This brief does not force the owner to answer 40 micro-questions in one sitting, and it does not quietly approve defaults on their behalf.
