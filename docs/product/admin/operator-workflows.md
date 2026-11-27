# Operator workflows

**Owns:** the interaction contract for a staff action that crosses workspaces, from finding a subject to a verified effect.

**Status:** proposed journeys, 2026-11-14, pending owner acceptance. This page is not a route map and not permission to perform the writes in the examples; gated writes stay gated. Where a landed Admin slice already records a case or a read, that slice does not expand into these journeys.

A staff action is a lifecycle with an accountable actor, a bounded scope and a visible status. It ends in verified success, verified failure, or an honestly partial or unknown result. Clicked, approved, provider-accepted and job-queued are never completion.

## Surfaces

| Surface | Must show |
| --- | --- |
| Global finder | The right subject, access-filtered, with freshness, and no forbidden metadata |
| Entity context | Source, time, verified versus unknown, and only related records the operator may open |
| Case workspace | Owner, subject, private versus customer-visible evidence, next action |
| Access explanation | Effective capability, scope and reason, without leaking the hidden policy |
| Action composer | One bounded change: target, blast radius, cost, side effects, reason |
| Approval queue | Requester, exact effect, approver, expiry. Revocation is visible |
| Action history | Attempt, pending, unknown, partial, verified result, later compensation |
| Delegated player view | Permanent actor and target, scope, duration. Non-mutation when the mode is view |

No route names are selected.

## Lifecycle

**Draft → preflighted → awaiting approval when required → authorized → executing → awaiting verification → verified success, verified failure, or partial / unknown.**

Cancel, expiry, rejection and supersession happen before execution. Reversal and compensation are new attributable actions. They do not delete the earlier record.

Every step is accountable and scoped. The operator is the named actor, even when assisting as a player. Each action carries one target, its blast radius and the grant that allows it, and nothing mutates silently: a change the operator did not compose is not made on their behalf. The state the operator sees is the lifecycle state, so partial and uncertain results are shown as such rather than rounded to success or failure.

| State | Means |
| --- | --- |
| Denied | No current grant can produce this effect |
| Can request | Someone else may consider this exact proposal |
| Waiting | Not approved yet, or blocked on a dependency |
| Authorized but stale | Input, state or approval changed. Preflight again |
| Outcome unknown | Inspect the original attempt before any retry |
| Partially completed | Name the verified parts and the remediation |
| Completed | The target's authoritative state shows the intended effect |
| Compensated | A later action remedied impact. History remains |

## Journeys

The journeys below are product sequences that illustrate the lifecycle, scoped action and status contract above. They are not implemented flows. Each powerful step still needs the grant named on [authority](authority-and-governance.md), [commercial and trust](commercial-and-trust.md), or [AI investigation](ai-engineering-and-investigation.md).

**Normal — ordinary access complaint.** Support finds the account, reads effective entitlement and a separate restriction, and answers from the safe status. If the mismatch needs Revenue Operations, Support files the case with both sources linked. Nobody retries a grant because the first screen was slow.

**Normal — repeated failed narration.** Support sees player impact. Engineering sees the task timeline. A goodwill allowance, if the offering has such units and the cap allows, is a new allowance record. It is not a refund and not a reroll of the settled action. See [AI investigation](ai-engineering-and-investigation.md).

**Conditional — shared-campaign continuity.** Staff may inspect the shared committed state they are permitted to see. Repairing another participant's private material, or editing committed history, is not part of this journey. Shared-play rules remain a [deferred design](../../../work/designs/backlog/shared-play/README.md).

**Conditional — model-cost incident.** One incident, a proposed stop of new paid dispatch, finance exposure, and customer remedy are separate actions. The stop does not cancel in-flight provider charges and does not unpublish past passages.

**Staff join and leave.** Overlapping responsibilities compose by union of intact grants. When access is revoked mid-investigation, saved views die and an in-flight approval does not execute on the departed employee's leftover session.

## Negative

- A deep link does not disclose a protected record or grant the power to open it.
- Assist as Player is attributed to the operator and cannot smuggle a staff-only write into the player session.
- Investigate in Sandbox does not mutate the live campaign.
- An unknown provider result is not completed, and it is not retried into a duplicate credit or a second state repair.
- Customer-visible notes do not contain raw prompts, complainant identity, or another participant's private text.
- Closing a case to satisfy a count, when the evidence is insufficient, is not a finding.
- Resolving or closing a support case does not prove that a refund or a repair happened. Only the target's authoritative state shows the intended effect (the Completed state above).
- Finding a player does not reveal a raw prompt. Lookup shows the access-filtered subject, freshness and safe status; raw model context needs its own grant on [AI investigation](ai-engineering-and-investigation.md).
