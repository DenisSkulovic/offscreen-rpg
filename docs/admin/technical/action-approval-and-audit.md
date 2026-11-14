# Governed Admin actions, approvals, durable receipts and audit

**Status:** Selected technical target, 2026-11-14. Product owners: [Intervention workflows](../operations-and-workflows.md), [Authority](../authority-operating-policy.md), [Governance](../access-and-governance-product.md), [Adversarial review](../product-adversarial-review.md). Initial read-only delivery requires **audit and safe action contracts**, not immediate implementation of money-moving or world-editing actions.

## 1. Operational intent is not a raw CRUD mutation

An administrative action is a typed business operation:
- **actor:** verified staff principal, staff session and source of authority;
- **subject:** exact resource kind, stable target ID and environment;
- **requested effect:** named allowed change, bounded parameters and intended delta;
- **reason:** approved reason taxonomy, optional case/incident and safe explanatory note;
- **context:** effective policy/version, subject's expected relevant version and affected parties;
- **approval:** when required, independent approval of that precise effect and scope;
- **result:** one durable action/attempt/receipt with actual target state, uncertainty and correction path.

**Do not implement generic `PATCH /admin/tables/:name/:id`, "edit arbitrary JSON", "execute SQL", or `ownerId` impersonation.** Each effect must pass the owning game's/commercial system's domain validators and concurrency fences.

## 2. Bounded envelope and identities

Conceptual contract to crystallize into strict Zod only during the relevant Change:

```text
AdminActionIntentV1 {
  clientRequestId: UUID;          // stable for retry/reconciliation
  operation: registered action key;
  subject: { kind, id, environment };
  expectedSubjectVersion?: exact version/reference;
  proposedDelta: operation-specific typed body;  // never arbitrary JSON patch
  reasonCode: registered value;
  caseId?: UUID;
  incidentId?: UUID;
  evidenceRefs?: authorized references[];
  requestedApprovalId?: UUID;
}
```

**Operator ID, approval authority and granted scope are taken exclusively from the authenticated server actor, never browser fields.** The resulting server action record binds `clientRequestId + actor + operation` to a **canonical request digest**. Same key plus same body returns the original result/status; same key plus different body is a conflict. A new client UUID after timeout must **not** be used to evade reconciliation.

The actor may later be offboarded; the original action and audit remain attributable, but a newly requested execution must use current authority. A pending workflow cannot execute indefinitely under a departed employee's old privilege.

## 3. User-visible lifecycle

```text
Proposed / draft
  -> Preflighted (what would change, current risk, authorization result)
  -> Approval required [if applicable] -> Approved / Rejected / Expired
  -> Authorized against *current* staff/subject/policy state
  -> Executing / pending external effect
  -> Verified success OR verified failure OR partial OR uncertain
  -> Optional new corrective / compensating action
```

Cancellation before execution is different from reversing a committed effect. An approval may expire or be revoked. A provider saying "request accepted" is not proof of a completed refund, notification or entitlement update.

**Preflight is informational, not a standing grant.** Commit and worker dispatch must re-evaluate relevant facts, including staff revocation, subject version, payer ownership, campaign current state, policy restrictions, budget stop and approval scope.

### Approval binding

An approval references the **canonical digest** of the proposed action: operation, subject, environment, delta, limits, impact, expiry and relevant policy/subject revisions. A changed amount, beneficiary, affected population, source revision, privacy sensitivity or blast radius invalidates it. Requester and approver are distinct where separation of duty is required; self-approval cannot be laundered through multiple sessions/accounts belonging to one human.

A permitted emergency **protective** action follows its own recorded policy; it is not an implicit exception to refunds, account deletion, private export or broad staff privilege creation.

## 4. State owners and transaction guarantees

Recommended Admin persistence families (conceptual; no migration selected here):
- `admin_action`: authoritative intent, digest, actor, subject, state and expected conditions.
- `admin_action_attempt`: each actual invocation/dispatch/retry with confirmed/unknown result.
- `admin_approval`: approver decision, exact request binding, validity and rationale.
- `admin_audit_event`: protected append-only facts about staff/grant/access/action decisions and outcome.
- `admin_outbox`: only when external asynchronous effects must be retried/reconciled; may reuse the existing established outbox where safe.

**Local DB effects:** for a supported same-PostgreSQL Admin operation, audit intent/outcome and authoritative domain mutation must be committed with a coherent transaction or an equally strong proven fail-closed causal mechanism. Never expose a successful write without an attributable durable record.

**External effects:** at-least-once delivery/recovery is realistic, not magical exactly-once money transfer. Use provider idempotency keys where available, durable mapping of original request/attempt, verified callback/status reconciliation, and `uncertain` when no authoritative evidence exists. The operator must not execute a fresh payment/refund merely because a response was lost.

**Causal receipt:** the relevant gameplay/entitlement/provider source reference is preserved, including before/after or compensating action. Post-fact `audit: success` text cannot override a provider failure.

**Failure posture:** if durable audit/preflight/authorization evidence required for a sensitive write is unavailable, fail closed. For logging of routine nonsensitive denied requests, safe security telemetry may be asynchronous; never leak private payloads in the name of debugging.

## 5. Administrative audit is a product ledger, not a console.log

Minimum sensitive audit fields:
- event ID, monotonic relation/sequence as needed and timestamp;
- human staff principal or nonhuman service actor, admin session/assurance reference;
- action or sensitive-read class, resource kind/reference/environment;
- capability/package/policy decision and safe reason;
- case/incident/approval/exception link;
- intent/decision/attempt/result status and validated object/version evidence;
- scope/amount/blast-radius **safe descriptors** without raw secrets;
- provenance for emergency access and subsequent review.

Audit records are protected from ordinary staff editing/deleting, with restricted reviewer access, monitoring and deliberate retention policy. Staff audit inspection does **not** confer permission to open the private story content behind a recorded read.

Sensitive narrative/raw-prompt reads must be **attributable before releasing the sensitive result**. Denials, privileged access change, session start/termination, grants, exports and emergency controls need explicit reviewable evidence. A generic GET of nonsensitive aggregate metrics need not create a sprawling personal surveillance log, but Admin sign-ins and important access decisions remain inspectable.

## 6. Case, incident and cross-service relationship

A Support case may reference many actions; an action can stand alone for an authorized incident. A case assignment is a governed event and cannot self-create sensitive resource scope. Linking evidence preserves source-authorization checks; attaching a private passage reference never copies it into a broad case note.

A result may be:
- **completed:** authoritative target state proves desired effect;
- **failed:** authoritative negative outcome;
- **partial:** multiple required sources/components completed unequally;
- **uncertain:** original request may have succeeded; needs reconciliation;
- **compensated:** separate follow-up remedy, **never erased prior event**.

Do not define `case.status = resolved` as a substitute for these states.

## 7. First-wave enabled operations

The foundational Admin delivery should enable **only** safe session/staff bootstrap and scoped read-oriented workflows after proof, with audit. Case creation/assignment may follow after the governing assignment rule is proven.

For later write categories, each gets its own specialized technical contract and packet:
1. Bounded service compensation / entitlement adjustments (depends on commercial funding policy).
2. Platform new-sponsored-dispatch emergency stop (depends on real dispatcher enforcement, accepted/in-flight policy and verification).
3. Restricted customer/session assistance (depends on consent, attribution and precise allowed actions).
4. Bounded game repair (depends on exact mechanical correction taxonomy and shared-world impact).
5. Refund/subscription changes (depends on verified external financial provider).
6. LiveOps release and experiment commands (depends on version compatibility and blast-radius policy).

No one generic action engine should launch those six unreviewed domains as a batch.

## 8. Negative acceptance

- Same `clientRequestId` with two bodies → conflict; same body after lost ACK → same original action.
- Approved refund changes target or amount → approval invalid before dispatch.
- Staff role revoked after preflight → no action despite previously green UI.
- Case self-assignment used to manufacture a grant scope → denied.
- One user clicks a repair while same campaign advances → check current committed state, hold/refuse stale repair.
- Provider status unknown → action stays unknown; no second charge or falsely "completed" badge.
- An approved emergency stop is invoked → does not allow raw story export or permanent privilege elevation.
- Writer attempts a sensitive action while audit persistence is unavailable → no unaccounted successful effect.
- An audit reviewer sees the record of a private-story read, but still cannot read the story without its own capability.
- Compensation for a failed model task is recorded separately from the actual provider attempt and immutable mechanical receipt.

No live action implementation has been run or evidenced by this design.
