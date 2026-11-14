# Operational workflows, casework and accountable interventions

**Status:** Proposed product design, 2026-11-14. **Owns:** cross-team investigation, case resolution and administrative-action lifecycles. Technical transaction, queue and idempotency design is intentionally deferred. For who may perform an action, see [authority](authority-and-delegation.md). Screen-level product journeys and adversarial paths: [operator journeys](operator-journeys-and-interaction-contracts.md).

## A serious Admin is a workflow system, not a tray of dangerous buttons

An operator needs a consistent way to **identify -> investigate -> decide -> request/approve if necessary -> intervene -> verify -> communicate -> close**.

The steps are not a compulsory wizard. Straightforward permitted actions should be quick. Complex or sensitive operations must have enough context to avoid accidental damage.

**Two related but distinct concepts:**
- **Case:** a tracked problem, support request, trust matter or investigation. It has ownership, priority, relevant entities, evidence, communication and resolution.
- **Administrative action:** a deliberate intervention targeting a resource: grant an allowance, change a restriction, restore a campaign, approve a release, or similar. It has actor, authority, reason, impact and execution result.

A case may contain many actions; an action may be associated with a case, incident or independently justified administrative purpose. A case being closed does not turn failed actions into successes.

**Assignment is not a privilege hack.** If assigned-case membership is used to scope account access or service actions, creating/reassigning a case cannot itself manufacture unrestricted authority. The [Support workspace](support-and-customer-success-product.md) owns customer work; [Governance](access-and-governance-product.md) owns privilege policy; the [adversarial review](product-adversarial-review.md) challenges their intersection. Trust investigations retain their own restricted audience even when linked to an ordinary Support case.

## Case experience: what staff actually need

- **Entry:** from player contact, system alert, trust report, internal observation or another team.
- **Triage:** classify customer impact, seriousness, affected subject(s) and urgency; link related known incidents.
- **Ownership:** assign accountable person/team, escalation and response responsibility. More than one collaborating team need not create competing copies of the case.
- **Evidence:** attach references to player, campaign, execution, usage event, billing event, configuration/release, incident or another case. Honor permission boundaries for each viewer.
- **Progress:** notes, requested information, internal discussion, next action, pending approval, blocked dependency.
- **Resolution:** documented root cause or reasonable conclusion, intervention(s), verification, customer-facing explanation when appropriate, and reopen path.

A case timeline should distinguish internal-only notes, customer-visible communication, protected Trust evidence and auditable interventions.

## Administrative action: proposed product lifecycle

1. **Prepare:** identify target(s), desired effect, reason, related case/incident, operator, scale/financial exposure and constraints.
2. **Preflight:** show effective authority, any pending player/game operations, prerequisites, conflicts, expected consequences and whether approval is required.
3. **Approve when necessary:** bind approval to the actual intended effect and current scope, not a vague class of future changes.
4. **Execute:** expose pending, committed, failed, partially applied or timed-out outcomes truthfully; prevent double application on retries.
5. **Verify:** show authoritative resulting account/game/commercial state and actual external-provider result when relevant.
6. **Document:** write attributable history and cross-link it to the subject.
7. **Remediate if needed:** reverse where truly reversible, otherwise perform a distinct compensating action; never erase prior history.

This is a **user-visible contract**. Underlying scheduling, persistence and consistency mechanics belong to future technical design.

### Action hazards and operator expectations

- **Concurrent player activity:** recheck current state before mutation; allow cancellation or safe refusal when the initial assumptions became invalid.
- **Partial success across services:** show exactly which parts succeeded and which failed; an action may need reconciliation rather than a blind retry.
- **Stale approval or changed target:** require renewed review when the material request changes.
- **Irreversible operations:** identify permanence and recovery limits before execution; do not present fictitious Undo.
- **External provider lag:** distinguish accepted request, pending external settlement, and verified result.
- **Operator error:** a separate corrective action preserves accountability; do not silently rewrite logs.

## Scenario A: broken campaign / narrative continuity complaint

**Entry:** player reports a contradictory story fact or stuck campaign.

1. Support finds the Player 360 and specific campaign/turn.
2. The case links a meaningful event, current committed state, associated model execution or pending job, and the player's reported impact.
3. Support may diagnose access/allowance/failure states without reading all private text. If story inspection is needed, the operator uses separately authorized content access.
4. Engineering follows the same trace to distinguish generation, retrieval, state settlement, publication or UI presentation failure; LiveOps can assess whether a release/cohort is affected.
5. If repair is justified, an authorized person prepares a bounded correction or restoration with impact preview and safeguards.
6. Support verifies the real campaign state, records any compensation, communicates the result and closes the case.

**Negative:** copying story text into a case must not make it universally readable; sandbox reproduction must not change the real campaign; a failed or aborted repair must not be recorded as completed.

## Scenario B: paid subscription, missing feature access

**Entry:** player claims payment completed but premium gameplay remains blocked.

1. Support checks subscription status, external billing evidence and the **effective entitlement**, not just a tier label.
2. The system surfaces mismatches, pending synchronization, expired windows or restriction effects without guessing at their cause.
3. Support may request a narrow temporary grant or escalate to Commercial. Financial adjustments require independent authority.
4. The operator verifies both customer access and commercial outcome; the case documents whether compensation, correction or customer contact occurred.

**Negative:** a payment-provider acknowledgment is not proof that feature access was committed; repeated clicks must not create duplicate grants; staff must not rewrite usage to hide a mismatch.

## Scenario C: trial/promotion across Growth, Commercial and Support

**Entry:** Growth proposes a time-limited promotion for a legitimate eligible cohort.

1. Growth defines goal, audience and intended offer using permitted data.
2. Commercial checks the grant economics, caps, effective entitlements and restrictions.
3. Authorized staff approve and schedule activation with controlled targeting.
4. Product/Growth inspect activation and conversion; Finance sees consumed allowance and spend; Support can explain to a particular player why the offer did or did not apply.
5. If stopped, the operator can distinguish future eligibility from previously earned grants according to the offer's policy.

**Negative:** cohort membership alone must not authorize reading private narratives; promotion cancellation must not silently revoke contractual/earned entitlements; no fake retroactive success metrics.

## Scenario D: AI failure/cost incident

**Entry:** model error, latency, runaway retries, context inflation or gameplay-quality regression.

1. AI/Engineering sees alert, relevant version, affected operations and truthful cost/error indicators.
2. An incident captures impact, relevant deployments/configurations, customer-facing effects and linked cases.
3. Engineering diagnoses; LiveOps evaluates candidate mitigation and blast radius.
4. Authorized staff may pause a rollout, disable a problematic feature/configuration or apply an approved rollback.
5. The incident records actual intervention and recovery evidence; Support identifies impacted customers for appropriate follow-up.

**Negative:** a rollback action does not prove existing campaigns reverted to old semantics; an internal diagnostic call must not silently consume customer allowances; bad quality cannot be "fixed" by hiding errors.

## Scenario E: privacy / Trust request

**Entry:** a verified player asks for access, correction or deletion, or reports abuse.

- A qualified operator validates the request, scope and lawful procedure.
- The case identifies relevant records, retention exceptions, dependencies and timelines.
- Affected systems and third-party processors are tracked where applicable.
- The operator receives an honest completion/restriction status and can communicate it appropriately.
- Enforcement decisions and appeals are attributable, reviewable and distinct from routine Support communications.

**Negative:** account deletion must not be a naive one-click cascade ignoring legal retention, billing, shared-campaign rights or processor status; staff without permission must not see protected report evidence.

## Scenario F: new internal employee and privileged request

**Entry:** authorized manager invites a coworker to handle Support plus scoped Engineering diagnostics.

- Invite with minimal access; confirm identity and accepted invitation.
- Add approved packages and review the exact effective scope.
- If later privileged narrative access is needed, request time-bounded expansion with reason and approval.
- Revocation/suspension and relevant access history remain visible to authorized governance staff.

**Negative:** "Can invite users" must not authorize privileged package assignment, self-approval or unbounded bypass via delegated sessions.

## Internal collaboration and handoff requirements

Each major handoff should preserve **the question, affected subject, relevant evidence, current truth, attempted actions, outstanding decision and next owner**. Escalation should not force the receiving team to reconstruct the whole history from chat screenshots.

We should support links and shared work context without automatically copying protected evidence into less privileged surfaces.

## Future assistant for investigations (conditional)

An internal AI investigator might summarize a case from the **requester's permitted evidence**, suggest plausible causes and propose remedies with links. This is **advisory, not autonomous operational authority**. It does not gain extra permissions, silently inspect private stories or execute a remediation because a generated explanation sounds plausible.

## Acceptance questions before technical design

Can Support solve an ordinary access issue without an engineer? Can Engineering explain a gameplay contradiction from the same case without unrestricted data exposure? Can Finance explain a grant versus a refund? Can the company reconstruct a major production intervention, including denied and failed attempts? Can a second operator resume the work without guessing what happened?

If not, the workflows still need product design.
