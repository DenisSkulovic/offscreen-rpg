# Admin product adversarial review | failure-focused design challenge

**Status:** Independent desk critique of the **proposed** Admin product suite, 2026-11-14. **Not:** owner acceptance, penetration test, legal validation, code audit or implementation authorization. **Owns:** cross-domain risks and scenarios that could invalidate an otherwise elegant product design. Read [product policy decision brief](product-policy-decision-brief.md) for proposed disposition and [decisions](decisions-and-readiness.md) for owner-facing open choices.

## Scope and method

Challenge the whole intended operating product, not the current POC's code. For each scenario ask:
1. What is a normal employee trying to accomplish?
2. What legitimate shortcut might the Admin accidentally create?
3. What is the worst plausible impact on player rights, world truth, paid allowances, external expense or staff authority?
4. Does the current product specification express a safe **operator-visible outcome**?
5. Is that outcome already a proposed standard, or does a product owner still have to choose a policy?

**Severity labels are prioritization recommendations, not defect findings in running software.**
- **Critical policy blocker:** cannot finalize the related product contract without an explicit decision.
- **Major product risk:** design should explicitly preserve the negative path; a specific capability may be deferred if business policy remains unsettled.
- **Conditional:** relevant only when a future capability or market is introduced.

## Risk register

| ID | Severity | Adversarial situation | Likely hidden failure | Required product outcome / owner question |
| --- | --- | --- | --- | --- |
| PR-01 | Critical | Employee can assign themselves a support case, and grants are scoped to assigned cases | **Self-assignment launders privilege** to accounts they should not serve | Case assignment itself is governed; sensitive access requires an independent purpose/scope. AD-P03/04 |
| PR-02 | Critical | Support copies a private passage into an ordinary case or asks an AI investigator to summarize it | Restricted evidence becomes available to the entire team or external helpdesk | Evidence stays purpose-bound with audience controls, references, redaction and export limits. AD-P05/08/23 |
| PR-03 | Critical | Player preview invokes a route with "seen" cursors, automatic gameplay, notifications or provider generation | A supposedly read-only session changes player state or spends money | View-as-player requires actual non-mutating product behavior, or is **unavailable**; no fake read-only overlay. AD-P06 |
| PR-04 | Critical | Shared-campaign repair for Alice modifies Bob's witnessed history or private choices | Support fixes one complaint by corrupting another player's earned world | Exact affected population and commitments; unsupported repair must be declined or require a separately consented/forked path. AD-P02/07/23/24 |
| PR-05 | Critical | A paid request times out after provider dispatch; Support/Engineering retries from separate consoles | Duplicate provider spend, grant, mechanic or published output | All consoles show uncertain original operation and one reconciliation path; no blind second paid action. AD-P09/22 |
| PR-06 | Critical | On-call person with emergency stop permission also manages privileged staff access | Emergency authority accidentally becomes permanent all-powerful account | Precisely bounded emergency power, recorded cause, temporary scope, retrospective review; nonrelated powers prohibited. AD-P04/15/38 |
| PR-07 | Critical | Privacy deletion request concerns a shared world and provider-held data | "Delete account" hides login but leaves copies, or removes Bob's historical story | Scope, lawful exceptions, processor statuses and honest partial completion. Policy and legal review required. AD-P23/33 |
| PR-08 | Major | Finance reads aggregate subscriber revenue while Support writes case-limited grants | Package mixing creates write access to all paying users | Only the union of **intact** grants, never union of verbs and scopes. AD-P03/04 |
| PR-09 | Major | LiveOps rolls back a Storyteller model route while older work is accepted/in flight | Operator thinks old story/receipts were rewound or in-flight tasks rebased | Version effective-by-subject and future-only rollback semantics; separate repair. AD-P10/26 |
| PR-10 | Major | Trust alleges abuse based on generated violent roleplay | Player punished for fiction authored by model or permitted campaign style | Separate authored vs generated provenance, evidence/appeal; content alone not automatic guilt. AD-P32/34 |
| PR-11 | Major | Marketing builds a tiny cohort with unusual story attributes | Private identity or narrative inferred; unsolicited personal outreach | Suppressed/purpose-limited segments, consent policy, no unrestricted narrative targeting. AD-P28/30 |
| PR-12 | Major | A new plan catalog promise is updated globally | Existing paid accounts silently lose features or grants | Historic promise and adoption/re-notice policy explicit. AD-P21 |
| PR-13 | Major | Dashboard cost collector is offline | Green "0 spend" incorrectly permits new sponsored generation | Stale/unknown state clearly shown; conservative stop policy needs owner approval. AD-P15/22/35 |
| PR-14 | Major | Support and Trust investigate same player in linked cases | Complainant/evidence leak through case title, notification or global search | Distinct case audiences, restricted metadata and safe handoff. AD-P05/08/17/36 |
| PR-15 | Major | Employee is suspended with an active assisted session and approved pending action | They continue writing as the player or an old approval executes later | Effective authority revoked promptly; pending actions re-evaluate actor/purpose. AD-P04/06/38 |
| PR-16 | Major | High-value employee views own player's account, changes membership, then grants themselves compensation | Conflict evaded via another identity, another package or case assignment | Explicit human-conflict checks, independent exception process, audit. AD-P03/04/38 |
| PR-17 | Major | Metric dashboard counts offline world ticks as daily active human users | Product decisions optimize fictitious engagement | Person/account/campaign/task distinct; named activation and retention events. AD-P11/29 |
| PR-18 | Major | An operator creates a sandbox from an unredacted shared story | Private participant text exported into another team's debugging environment | Sandbox input authorization and evidence scope; output references remain restricted, no live writes. AD-P05/16/23 |
| PR-19 | Conditional | Third-party community moderator uses the full staff console | External trust boundary inherits internal engineering, payment or identity powers | Separate restricted product/access model, not a cloned staff role. AD-P01 |
| PR-20 | Conditional | Internal AI investigator recommends an account action from private prompts | Model crosses evidence boundary or becomes a silent privileged actor | Advisory-only, citing permitted evidence, action proposed separately with human authority. AD-P18/34 |

## Worked adversarial walkthroughs

### PR-01: case ownership becomes privilege escalation

**Original normal job:** a Support employee needs the right account to investigate a case.

**Attack surface:** if any employee can self-assign any case, and the grant is scoped to "accounts on my assigned cases," the employee may add themselves to a case about a protected player, then acquire access that no independent reviewer granted.

**Required product conclusion:** case assignment and reassignment must themselves be authorized and auditable; merely creating a case must not confer arbitrary sensitive evidence, payment changes or broad compensation. A stricter per-case exception can still be needed. The Access Inspector must explain the *source* of the qualifying assignment and its current limits.

**Product test:** can an employee with the two legitimate abilities "open general cases" and "grant compensation on assigned cases" ever obtain a nonpermitted customer's account by manufactured case ownership? If yes, design fails.

### PR-02 + PR-14: protected evidence escapes through a helpful colleague

**Original normal job:** Support asks Engineering to help with a player's continuity complaint.

**Leak path:** raw prose is copied into a general case, an alert title, an email reply, a shared screenshot, an analytics export or a summarizing AI investigator. Downstream readers who could not open the original restricted passage now receive it secondhand.

**Required product conclusion:** evidence needs an audience/purpose boundary across reference, summarization, attachment, export and notification. Permission to link an entity cannot become permission to duplicate its contents. An authorized Support agent should still be able to hand off **a useful redacted issue**.

**Product test:** open the same case as Support, Engineer, Trust reviewer and unauthorized coworker. Verify each has useful permitted context but none learns protected narrative or complainant identity through side surfaces.

### PR-03: "read-only" is a behavioral promise

**Original normal job:** Support wants to see exactly what the player sees.

**Hidden effect:** visiting a live game route may advance a seen cursor, trigger a default action, invoke a paid inference, emit read receipts, alter presence or expose another participant's state.

**Required product conclusion:** Viewer Preview is a separate behavioral mode with zero live side effects, or the product transparently refuses to offer an accurate preview. Visual disabling is not proof. Player-assisted actions are a separately authorized experience with explicit cost/consent/attribution.

**Product test:** perform a full preview visit, navigation and exit and compare all authoritative player/game/commercial records. Any unauthorized effect invalidates preview as designed.

### PR-04 + PR-07: one person's control over a shared life

**Original normal jobs:** Support wants to repair Alice's game; Privacy wants to process Alice's deletion request.

**Complication:** Bob shares the campaign and has witnessed durable events; a payer may fund both; private passages or characters may have different audiences. Repair, deletion and membership removal are **different** requested outcomes.

**Required product conclusion:** classify subject and affected audiences. Never claim that one account's relationship provides sole authority over a shared world. A narrow reversible correction might be offered; some historical change must instead be unavailable or require a clear forward/fork policy. Privacy handling must separately address legal exceptions and other people.

**Product test:** inspect the account, campaign, character, membership, payer and entitlement beneficiary under separate roles. They must not merge into one ownership power.

### PR-05 + PR-13: cost uncertainty during an incident

**Original normal jobs:** Engineering wants to recover narration; Finance wants to bound provider expense.

**Complication:** provider timeout occurs after dispatch, cost telemetry is delayed, a mechanical action has already settled, and a new model route worsens failures. A human sees a stale green cost card and retries.

**Required product conclusion:** status must distinguish mechanical settlement, required narration, provider attempt, commercial allowance and spend certainty. Reconciliation follows the original accepted operation; emergency stop can block **future** dangerous dispatch without rewriting historical state or claiming in-flight expense was cancelled.

**Product test:** no operator path may automatically duplicate a charge, reroll a receipt or mark the provider expense zero merely because the last query failed.

### PR-06 + PR-16: founder and employee abuse

**Original normal job:** a tiny company needs to react instantly to an AI spend incident.

**Complication:** an employee may be the only available approver, may hold several packages, and may have a personal player account. Requiring two simultaneous staff is infeasible; global standing superuser is unsafe.

**Required product conclusion:** emergency **protective** actions are distinct from financial transfers, exports, self-compensation and permanent privilege elevation. An incident-specific, time-limited, attributable exception is reasonable for some actions. Independent later review and conflict-of-interest handling remain product requirements.

**Product test:** an employee cannot turn "pause new sponsored model requests" into "issue myself refunds", "view all private story text", or "invite unrestricted second admin".

## Challenge conclusions

### Strong proposed guarantees worth preserving

- Role overlap composes **bounded intact authority**, not action/scope cross-products.
- Player, participant, payer, beneficiary and shared campaign stay distinct.
- Observation, sensitive evidence inspection, assistance, sandbox and production repair are separate capabilities.
- Commercial, gameplay, AI execution and LiveOps truths have separate statuses and causal links.
- Every intervention shows proposal, authority, attempt, verification, unknown/partial outcome and correction path.
- A rollback is not a rewind; a story fork is not a silent repair; a model call is not a successful player turn.
- A legitimate work queue/dashboard must not confer new privileges or display unauthorized metadata.

### Highest-risk product policies still unchosen

1. **Who is allowed to assign cases and thereby expand resource-scoped authority?** Existing authority docs prohibit broad escalation but must explicitly cover assignment laundering.
2. **What is the consent/notice policy for private narrative reads, live assistance and other shared-world impacts?**
3. **Which repairs or privacy operations may change persistent shared content or character history?**
4. **What exactly is a customer-metered allowance unit, and who funds an operation when payer and player differ?**
5. **How do current campaigns adopt incompatible updates, and what does an emergency stop do to already accepted work?**
6. **Which privileged actions may proceed with one human during an emergency?**
7. **How does the company treat external helpdesk, analytics and AI-provider copies of protected data?**

These are decisions at the **product and policy level**. The team must not solve them by choosing an ORM, permissions package, queue or route first.

## Exit standard

The review has **identified** concrete failure modes; it does not prove they are solved in a running system. For each critical blocker, the product owner must accept a policy or explicitly exclude the dangerous capability from the initial product. Then the owning product document should be updated, negative journeys revisited and the readiness gate reconsidered. **No technical design or implementation handoff is authorized by this review.**
