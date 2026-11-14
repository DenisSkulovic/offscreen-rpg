# AD08 | Minimal internal Support cases and governed assignment provenance

**State: Proposed, NOT Ready.** Code-bearing case/workflow foundation. **Depends on:** AD02/AD03/AD07 and Admin UI shell AD04. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** an authorized Support operator can create a minimal case, link a permitted player/campaign/operation reference, assign it under a separately scoped `case.assign` authority and track state/ownership without manufacturing new access to private records.
>
> **Authority:** [Support product](../../admin/support-and-customer-success-product.md), [case lifecycle](../../admin/operations-and-workflows.md), [case assignment risk PR-01](../../admin/product-adversarial-review.md#pr-01-case-ownership-becomes-privilege-escalation), [action/audit contract](../../admin/technical/action-approval-and-audit.md).
>
> **Start/revalidate:** AD02 capability evaluator and grant assignment, AD03 safe reference lookup, AD07 audit visibility, `packages/db/src/schema` migration owner, Admin Nest modules and Next `/control` pages. Do not reuse private player story methods via synthetic owner.
>
> **Do not:** build an entire helpdesk/email system, attach raw passages by default, create Trust investigation through ordinary Support, or grant global account access via a case link.

## Intended code delta

1. Add `admin_case` and source-ref/assignment records with stable ID, status, issue category, assigned actor/team, requester/source metadata, safe note classification and updated provenance. Separate customer-visible messages and restricted evidence (not implemented here).
2. Define strict case-create/read/update/assign DTOs, with idempotent case creation and protected actor/assignment provenance. Link existing authorized account/campaign/operation reference **without copying restricted contents**.
3. Implement `case.create`, `case.summary.read`, `case.assign` and allowed bounded state updates in Admin application/API; revalidate actor and target scope at each step. **Case creation/assignment cannot itself satisfy a separate sensitive evidence or commercial write permission.**
4. Expose small Support queue/case detail UI with owner, related safe references, next step and access-limited status; link permitted Player 360/campaign state.
5. Add audit for assignment and state changes, preserving actor and target. No unrestricted free-text narrative ingestion into broad-access notes.
6. Tests for create/assign/close/reopen, concurrent assignment conflict, denied links, self-assignment laundering and access revocation after case handoff.

## Normal and discriminating negative

**Normal:** Support operator opens a case for a permitted known account, attaches only a safe authorized account/operation reference, and an authorized lead assigns it; two staff can follow links according to their independent grants.

**Negative:** staff creates/reassigns a case to themselves about a restricted account, then tries to access protected narrative, another player's billing or grant compensation. Assignment does **not** create the missing privilege. Case title, global finder and notifications must not disclose Trust evidence or other private content.

**Proof:** Zod/case lifecycle tests; disposable DB/Nest with two staff+two players showing no assignment-to-sensitive scope escalation; browser queue/detail states. No provider or email sends.

## Excluded / risk

No external helpdesk vendor, SLA delivery, arbitrary narrative attachment, sensitive Trust case, private data export, refunds or world repair. Exact priority/notification policy can be a later Change.

**Ready gate:** AD02/03/04/07 Done, case and audit source owners rechecked; owner explicitly selects. **Return:** schema/migration, real identity/assignment/provenance tests, denied access proof, and updated Admin source maps. No live spend.
