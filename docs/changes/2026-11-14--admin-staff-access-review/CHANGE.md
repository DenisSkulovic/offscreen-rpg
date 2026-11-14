# AD07 | Staff access inspector and sanitized administrative audit view

**State: Proposed, NOT Ready.** Code-bearing governance visibility. **Depends on:** AD01–AD04. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** authorized staff-governance reviewers can inspect actual staff status, bounded package assignments, effective permission reasoning and existing bootstrap/session/access audit, without obtaining power to grant privilege or expose private player content.
>
> **Authority:** [Governance product](../../admin/access-and-governance-product.md), [identity/policy](../../admin/technical/staff-identity-and-policy.md), [audit contract](../../admin/technical/action-approval-and-audit.md), [V1 API](../../admin/technical/core-v1-contracts.md).
>
> **Start/revalidate:** AD01 staff/audit schema and actor resolver, AD02 policy registry, Nest Admin controller, AD04 `/control` shell; existing auth/DB integration proof route.
>
> **Do not:** implement universal superuser, staff invitation, self-grant, paid refund, raw story export, hidden direct SQL or unrestricted audit payload browser.

## Intended code delta

1. Add safe staff directory/access read model with package/version/provenance/scope/expiry, and an exact action/resource inspector returning `allow/deny/approval_required/step_up_required` safely.
2. Authorize `GET /api/admin/staff/:id/access` and `GET /api/admin/audit` by dedicated inspector/auditor capabilities and target scopes. Restrict ordinary employee self-view to their own permitted information.
3. Expose an accessible staff access/audit viewer with current vs expired grants and sanitized event detail. Audit reviewer sees **that** a sensitive read occurred, not its underlying private text.
4. Validate that privileged audit records are append-only/restricted through existing AD01 storage; this Change may extend audit event types for permission-denied/access-inspector decisions without rewriting history.
5. Test two staff people, one with limited self-view, one auditor, one denied, and stale/revoked access.

## Normal and discriminating negative

**Normal:** authorized auditor selects a named staff subject and sees precisely which intact grant permits a safe action, its environment/scope/expiry, and recent permitted Admin session audit events.

**Negative:** same auditor cannot open a private narrative from an audit reference without separate capability; a staff user cannot inspect another employee's privileged access, promote themselves, discover hidden account existence via inspector, or edit/delete historical audit.

**Proof:** pure explanation-policy tests; disposable DB/Nest two-staff request tests and audit integrity; browser denied/allowed/revoked rendering. Unavailable audit source is marked unavailable, not "no activity."

## Excluded / risk

No staff invitations or privilege mutations yet; those require a separate explicit, higher-risk authorization and assurance packet. No hosted regulatory retention certification.

**Ready gate:** AD01–AD04 verified, audit schema/interface current, owner selects. **Return:** actual audit access behavior, safe source/field coverage, denial/privilege test evidence and no provider spend.
