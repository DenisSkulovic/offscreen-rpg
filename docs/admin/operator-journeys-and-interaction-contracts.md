# Operator journeys and interaction contracts | product review packet

**Status:** Proposed product journeys, 2026-11-14; pending owner acceptance. **Owns:** the operator-facing sequence across workspaces for high-value and high-risk scenarios. Related permanent owners: [authority](authority-and-delegation.md), [authority operating policy](authority-operating-policy.md), [Player 360](player-360-and-entities.md), [Player 360 blueprint](player-360-service-blueprint.md), and [operational workflows](operations-and-workflows.md). This is **not** an implementation Change or screen/route specification.

## A. Reusable interaction surfaces

| Surface | Job | Minimum trustworthy state |
| --- | --- | --- |
| Global finder | Identify a permitted subject from stable reference or allowed search | Correct identity, access-filtered results, freshness, no forbidden metadata |
| Entity context | Explain current account/campaign/operation truth | Source, timestamp, verified/unknown distinction, related authorized records |
| Case workspace | Keep ownership, investigation and communication together | Owner, affected subject, private/public evidence distinction, next action |
| Access explanation | Explain allowed, denied or approval-gated operations | Effective capability, scope and reason, without policy leakage |
| Action composer | Review and stage one bounded intervention | Target, proposed change, blast radius, costs, side effects, reason |
| Approval queue | Obtain separate authorization for a specific action | Requester, target, exact proposed effect, approver, expiry, revocation |
| Action history | Reconcile what actually happened | Attempt, pending/unknown, partial, verified result and compensation |
| Delegated player view | Preview or assist without identity confusion | Permanent actor/target indication, scope, duration, nonmutation guarantees |

No technical route names are selected. These are product interaction responsibilities that may be presented across existing workspaces.

## B. Reusable action lifecycle

**Draft / proposed -> preflighted -> awaiting approval (when required) -> authorized -> executing -> awaiting verification -> verified success OR verified failure OR partial/unknown outcome.**

An action can be cancelled/expired before execution, rejected, or superseded by a new request. Reversal (when possible) and compensation are **new attributable actions**, not a silent deletion of the earlier record.

The interface must never label "clicked", "approved", "provider accepted", or "job queued" as verified business completion.

### States the operator must not confuse

- **Denied:** requester lacks power and no current route permits the requested effect.
- **Can request:** another eligible authority may consider the exact proposal.
- **Waiting:** proposal has not been approved or is waiting on a dependency.
- **Authorized but stale:** input/state/approval changed; preflight must be repeated.
- **Outcome unknown:** response absent or dependency uncertain; inspect/reconcile original action before retry.
- **Partially completed:** multiple affected systems differ; show verified sub-results and remediation path.
- **Completed:** target's authoritative state confirms the intended effect.
- **Compensated:** follow-up action remedied impact, without erasing history.

## C. Concrete cross-workspace journeys

### OJ-01: ordinary account-access complaint

**Actor:** Support Intake. **Entry:** customer contact, case or permitted account search.

1. Confirm the correct account and summarize the stated problem without exposing private narrative.
2. Open effective access: subscription/grant, allowance, restrictions and platform/provider status **separately**.
3. Link an identifiable operation/entitlement discrepancy and known incident, preserving source and freshness.
4. If remedy is outside Intake authority, prepare a scoped request or escalate with links and customer impact.
5. Verify permitted access and send an appropriate explanation; close/reopen case according to evidence.

**Failed path:** payment confirmed but entitlement pending; do not mark resolved on payment status alone. **Privacy path:** another payer's sensitive data and private story do not become readable via this case.

### OJ-02: temporary narrative evidence in a genuine investigation

**Actors:** Support escalator, privileged reviewer or authorized Engineering staff.

1. An ordinary diagnostic view cannot answer a reported continuity issue without selected private passages.
2. Operator requests access for the **named account/campaign, evidence depth, reason, relevant case, and bounded duration**.
3. An eligible independent reviewer approves, denies or narrows the proposal where policy requires.
4. During the active window, an unmistakable sensitive-view affordance shows scope and reason. Selected evidence is inspectable; unrelated content remains inaccessible.
5. The session expires or is revoked; sensitive access appears in a reviewable audit history.

**Failed path:** case ownership or staff employment ends; access is no longer effective. **Abuse path:** copying protected passages into general case notes must not make them available to the whole company.

### OJ-03: compensate for repeated failed storyteller generations

**Actors:** Support Resolution / Commercial Operations.

1. Link verified failure receipts and explain affected beneficiary, funding source and current allowance.
2. Prepare a **new grant** with target, amount, window/expiry and reason, rather than rewriting consumption.
3. Show whether the proposal fits the operator's cap and whether commercial approval is needed.
4. Execute once and verify the new effective allowance against authoritative state.
5. Explain the outcome in the support case and show the grant in the customer's administrative history.

**Failed path:** timeout after submission; do not offer a blind duplicate grant. **Dispute path:** original consumption remains visible, even if a separate compensation corrects the customer impact.

### OJ-04: repair a shared-campaign continuity problem

**Actors:** Support -> Engineering -> GameOps/LiveOps.

1. Support links the affected participant and shared campaign; checks for known issue without reading other players' restricted content.
2. Engineering traces committed facts and published passages to the failing storyteller task or state transition.
3. Specialist optionally recreates an **isolated snapshot** for diagnosis; fresh model simulation is labeled as new evidence, not replayed history.
4. Proposed production repair identifies **which shared state and which participants** it affects; already witnessed/published events and existing commitments remain explicit.
5. Appropriate authority and any required participant notice/approval are established before execution.
6. Operator verifies the real campaign's resulting authoritative state and records limits/remaining uncertainty.

**Failed path:** game progressed after preflight; proposed correction must be rechecked. **Safety path:** do not let a story repair silently create a new branch, overwrite unrelated participants, or charge player allowances for internal experiments.

### OJ-05: staff joins with overlapping responsibilities, then leaves

**Actors:** Staff Administrator, supervising manager, Security reviewer.

1. Invite a real staff identity with Support Intake and a narrowly scoped Engineering Diagnostics package.
2. Inspect actual effective permissions. Package overlap must not create cross-product action/scope escalation.
3. For one sensitive case, request a temporary narrative-evidence exception with expiry and subject.
4. On exit/suspension, revoke the staff member's active authority, delegated sessions and queued operational ownership.
5. Review outstanding approvals/actions. The departure cannot leave an invisible executor or self-approved emergency capability.

**Failed path:** privileged access was requested but never approved. Do not apply it automatically after staff removal. **Separation-of-duty path:** the inviter cannot grant themselves broader power via the new identity.

### OJ-06: AI model regression causes runaway cost

**Actors:** Engineering, LiveOps, incident commander, authorized approver.

1. Command Center/engineering detects abnormal failure/retry/cost data with source and freshness.
2. Open incident and affected executions, model/configuration identity, usage and impacted players/cohorts.
3. Distinguish a permitted immediate budget-protection **pause** from broader configuration rollback or rewriting player state.
4. Propose a targeted mitigation with known blast radius and uncertainty; use emergency route only when explicitly warranted.
5. Observe actual cessation/recovery and any unsettled in-flight provider spend; open follow-up cases/grants where necessary.

**Failed path:** telemetry unavailable does not mean cost is zero. **Truth path:** rollback changes future behavior; it cannot undo already committed story events.

## D. Cross-cutting UX hazards

1. **Ambiguous subject:** show whether the operator is acting on a person, membership, shared campaign, payer, grant or execution. Do not silently switch subjects.
2. **False reversibility:** never offer Undo for a side effect that requires a new, compensating operation.
3. **Authority laundering:** moving from case to deep link, export, player preview or sandbox does not change effective permissions.
4. **Stale state:** a preflight conducted before player activity, role revocation or invoice update may no longer authorize execution.
5. **External ambiguity:** provider acceptance is not local entitlement completion; model spend may occur without accepted gameplay.
6. **Hidden collateral effect:** an intervention in shared campaign state may affect other players with independent privacy and notification rights.
7. **Operational deadlock:** small-team routine service needs bounded autonomous remedies; emergencies need a deliberate exception, not habitual root access.
8. **Internal cost attribution:** diagnostics and assisted actions cannot silently deplete a player's commercial allowance.
9. **Audit accuracy:** record the real staff actor, approval and effects, including denied attempts and sensitive evidence reads when appropriate.
10. **Human review:** a speculative AI diagnosis may suggest next steps, but cannot itself confer authority or certify a repair.

## E. Product acceptance gate for these journeys

For each journey, before advancing to technical design, an owner/reviewer must be able to identify:
- actor and legitimate purpose;
- entry surface and exact intended subject;
- evidence necessary **without default overexposure**;
- allowed versus requested/approved action;
- impact on commercial/game truth and other participants;
- what success, pending, failure and unknown look like;
- observable audit and safe handoff;
- which policy question is still open rather than silently decided.

**Current status:** scenarios are designed as proposed product outcomes. No staff packages, consent rules, monetary thresholds, repair primitives, assistance actions or interfaces have been finally accepted by the owner.
