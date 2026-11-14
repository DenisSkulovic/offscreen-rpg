# Staff identity, session assurance and bounded authorization

**Status:** Selected technical target, 2026-11-14. Product owners: [Authority](../authority-operating-policy.md), [Governance](../access-and-governance-product.md), [Product acceptance](../product-acceptance-and-scope.md). This describes a technical operating contract, not an already installed IAM plugin or approval to enable staff accounts.

## 1. Identity separation and session model

A **player identity** proves who may play/read their own story. A **staff principal** is a different internal security subject with employer/member lifecycle, explicit human identity, invitation/bootstrap provenance, active status, and scoped privileges. One human may be linked to both but one session never silently inherits the other's permissions.

**Target flow:**
1. Authenticate a human through a supported provider. Current code has Better Auth with GitHub OAuth; a future staff SSO/MFA provider can replace authentication without changing authorization contracts.
2. **Explicitly enter Admin**. A verified active staff principal linked to that authenticated subject, not email alone, receives a distinct short-lived `admin_session` purpose and scope. A player cookie alone is **never** an Admin credential.
3. For every Admin operation, validate the Admin session, underlying authenticated actor, staff active status, authentication assurance level, current grant/revocation epoch and operation-specific policy. Request context carries stable `staffPrincipalId`, `adminSessionId`, assurance and current policy version.
4. Session invalidation (logout, expiry, suspension, grant revocation, step-up expiry) removes authority on the next request and invalidates open streams/assisted views. A cached frontend role badge is not authoritative.
5. Mutation requires origin/CSRF defenses, not just a cookie; sensitive actions require fresh assurance/step-up when policy says so.

**Concrete security posture:** HttpOnly Secure same-origin Admin session cookie, appropriate SameSite, limited absolute/idle duration, rotation/revocation and explicit admin logout. Exact TTL should be bounded and verified in the security work; do not borrow the existing 7-day player session lifetime. Persistent browser token or a client-supplied role claim is forbidden.

**Hosted real-user launch gate:** reliable phishing-resistant or sufficiently strong second-factor authentication for privileged staff, secure secret management, session revocation, access review, incident recovery and operational monitoring must be proven. A local/dev read-only Admin may use a limited authenticated/staff allowlisted bootstrap flow for tests, but it must not be mistaken for commercial-grade staff SSO. **Do not auto-grant staff status to GitHub users or email addresses.**

### Bootstrap / first human

An initially empty company must have a **deliberate one-time, out-of-band administrative bootstrap** using a verified authenticated subject, environment and minimal permitted starter package. Never expose `POST /admin/create-root` or grant superuser merely from a configured email. Bootstrapping must be explicit, nonrepeatable without review, attributable and reversible by subsequent governance.

Tests must cover bootstrap double-use, wrong environment, nonstaff identity, terminated staff, deleted/relinked OAuth identity and concurrent privilege changes.

## 2. Capability registry and bounded grants

Do not implement an arbitrary AWS IAM JSON interpreter in V1. Use a **versioned, typed capability registry**, domain-scoped resource types and validated grant packages. A grant remains one atomic tuple of:
- allowed operation(s) on a resource family;
- exact scope predicate (organization, environment, named resource or legitimately assigned case/team/incident);
- nonwidening conditions: purpose, validity/expiry, sensitive class, amount/cardinality/spend ceiling;
- required assurance and approval class;
- provenance: granting actor/approved exception, package/version and effective period.

**Composition:** evaluate grants individually against the same resource/action/context; if **any intact active grant** fully covers the operation, it may pass *only if* no global restriction, conflict-of-interest constraint or mandatory approval/assurance gate denies it. Never form the Cartesian product of one role's actions and another role's resource scope.

A full request decision can be expressed as:

`permit(actor, action, resource, purpose, context) = activeStaffSession AND currentActor AND matchingCompleteGrant AND resourceScopeSatisfied AND conditionsSatisfied AND noHardProhibition AND assuranceSatisfied AND approvalSatisfied`

**A case-assignment precondition cannot be self-satisfied by self-assigning a protected case.** Assignment/ownership changes themselves require a governing capability, real workflow relationship and audit; especially sensitive content still needs separate purpose-bound access.

### Candidate capability families (typed examples, not browser-controlled policy)

| Family | Read/differentiation | Controlled writes / governance |
| --- | --- | --- |
| `player.*` | `player.summary.read`, `player.identity.read` | `player.status.change`, `player.recovery.request` |
| `campaign.*` | `campaign.metadata.read`, `campaign.state.read`, `campaign.narrative.read` | `campaign.repair.request`, `campaign.repair.execute` |
| `ai.*` | `ai.operation.read`, `ai.context.read` | `ai.diagnostic.run`, `ai.mitigation.request` |
| `commercial.*` | `commercial.access.read`, `commercial.usage.read`, `commercial.finance.read` | `commercial.grant.create`, `commercial.refund.request` |
| `case.*` | `case.summary.read`, `case.restricted.read` | `case.create`, `case.assign`, `case.manage` |
| `growth.*` | `growth.metrics.read`, `growth.cohort.read` | `growth.cohort.manage`, `growth.campaign.request` |
| `staff.*` | `staff.profile.read`, `staff.access.inspect` | `staff.invite`, `staff.grant.assign`, `staff.suspend` |
| `audit.*` | `audit.events.read`, `audit.sensitive.read` | None for editing past events |
| `platform.*` | `platform.status.read`, `platform.spend.read` | `platform.spend.pause`, `liveops.release.request` |
| `privacy.*` | `privacy.request.read` | `privacy.request.process` |

The registry must enforce **exact operation + resource kind** and reject unknown permission names; wildcards and arbitrary script predicates are not needed for the first launch. Package definitions and changes are versioned, visible to authorized reviewers and do not silently widen existing assignees.

### Minimal starter packages

**Candidate first bootstrap packages** (separately assignable, no automatic union):
- **Admin Reader:** named player summaries, basic campaign metadata and redacted operation status, where scope permits; no raw passages, notes or payer identity.
- **Support Operator:** case-limited player summaries and selected access explanations; assignments governed separately; no billing/write grant by default.
- **Engineering Observer:** platform health and redacted generation/status diagnostics; raw prompt independently restricted.
- **Staff Access Steward:** staff directory, narrow staff invitation/assignment/revocation; cannot grant self-unbounded privileges.
- **Security Auditor:** audit/privilege review, no automatic commercial or gameplay mutations.

Exact package membership may evolve, but no reader package may include an arbitrary grant, refund, export, global content browse, or repair permission.

## 3. Access evaluation pipeline

1. Authenticate Admin session and staff principal; fail closed on missing/stale assurance.
2. Parse/validate action/resource kind/identifier and purpose.
3. Determine safe resource attributes through **trusted server reads**, without first revealing protected existence to the requester.
4. Apply global account/environment/sensitivity restrictions and staff conflict-of-interest rules.
5. Evaluate each intact applicable grant, scoped conditions and assignment provenance.
6. Apply approval and assurance requirements for the exact operation. A requester's permission to ask for approval is not permission to execute.
7. Emit a **safe decision category** (`allow`, `deny`, `approval_required`, `step_up_required`, `unavailable`) and internal decision reference for reviewed audit. No full policy source, hidden entity ID or private title in ordinary denial responses.
8. Recheck policy at the **actual mutation commit/dispatch boundary** rather than trusting a frontend preflight from minutes ago.

Read response fields and linked subjects are separately filtered when sensitivity differs. A general read grant is never a bulk export grant, and a deep link carries no authority.

## 4. Role changes, revocation and cache safety

- Every staff assignment/session has an epoch/version or equivalent revocation marker; state changes invalidate future requests even if a JWT/cookie or React state looks valid.
- Check staff active/permissions on **every API request**, and revalidate periodically on long-lived subscriptions and at each sensitive action.
- Offboarded staff have active delegated sessions disabled and work reassigned; pending actions requiring their authority are cancelled/held pending reauthorization as policy requires.
- Privilege approvals bind exact request subject, action, delta, limits and expiry; editing any material term invalidates approval.
- Self-approval and actions on linked personal player accounts are prohibited under ordinary paths and require controlled exceptional policy.
- The Access Inspector is a protected query for a specific action/resource with safe explanations, not a reconnaissance oracle for arbitrary account existence.

## 5. Negative proofs for technical design

- Player-only cookie hitting `/api/admin/players` → no data; staff invitation cannot be inferred from matching email.
- Reader role requests `campaign.narrative.read` → denied before materialization or serialization of raw content.
- Two packages with different action/scope combinations → union of **intact grants**, no generated third permission.
- Case assignee creates own case → cannot access a protected target solely through that assignment.
- Admin session revoked while open Next tab remains → next request/stream/command fails, old cached information is purged on client boundary.
- Staff permission to invite another employee → cannot assign forbidden privileged package.
- Admin actor tries to approve their own elevated grant or pay themselves compensation → denied/exception route with independent authorization.
- A denied request reveals neither private account existence nor underlying secret capability assignment.
- A staff member views an allowed account in test, then passes `environment=production` as URL param → production data remains denied.
- Normal player Storyteller commands cannot carry a valid staff permission through arbitrary headers.

**Technical uncertainty to revalidate:** exact supported Better Auth session/assurance hooks, dedicated Admin cookie options and identity-mapping capabilities depend on actual pinned package versions at implementation. Architectural invariants here are binding; adapters should be proved on the current code/version instead of guessing provider APIs.
