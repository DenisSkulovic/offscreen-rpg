# DOC28 | Create a safe local diagnostic runbook for uncertain Storyteller and workflow operations

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Why this is missing:** Uncertain paid attempts, SQL/Temporal divergence and short-lock publication require different recovery rules. Details are scattered in technical documents and code; HK01 was blocked because an existing repair CLI is the only safe way to settle some local uncertain attempts.

**Start with actual current owners:**
- [docs/technical/platform/execution-and-delivery.md](../../../../../../docs/technical/platform/execution-and-delivery.md)
- [docs/technical/storyteller/provider-boundary.md](../../../../../../docs/technical/storyteller/provider-boundary.md)
- [docs/technical/engine/concurrency-and-recovery.md](../../../../../../docs/technical/engine/concurrency-and-recovery.md)
- [apps/worker/README.md](../../../../../../apps/worker/README.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Write a READ-ONLY first-response decision tree: identify story/operation/generation/attempt, exact current source, persisted receipt, pending/outbox/Temporal status, provider usage uncertainty and which system owns truth.
2. Separate authorized local disposable investigation from production/staging instructions. Identify when to HOLD, record 'unknown' or escalate instead of automatic redrive; include HK01 CLI's supported evidence gate.
3. For each branch, cite the authoritative technical heading and actual read command only if verified safe and no side effects. Do not invent repair/delete/charge API. Mark advanced operational steps explicitly untested.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player guarantee or auto-retry policy can be decided by an operator how-to | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because the exact SQL/outbox, Temporal, generation and provider custody fences remain in their technical owners; guide is only a safe procedure and status check | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because this runbook is documentation-only and forbids worker dispatch, provider spend, DB mutation or custom repair code | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: CREATE docs/runbooks/uncertain-work-recovery.md and add docs/runbooks/README.md task route; link selected technical docs and active blocked HK01 recovery warning | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

**Execution note:** This session's owner instruction sets Ready for close with an explicit CREATE. The new file is present at the revision recorded in the ledger. Working-tree `scripts/repo-tools/wiki-core/change-guard.mjs` already recognizes CREATE; this session did not edit that file. Code was not edited. No provider call was made. No database session was opened. No worker was dispatched. Candidate commands were read and not executed. At `b3113814`, `pnpm wiki:change-guard --mode plan --change work/changes/archive/2026-11/other/2026-11-18--doc28-uncertain-work-recovery` returned plan ok with no findings. A focused link check of the seven DOC28 files returned clean. `pnpm wiki:change-guard --mode close --base b3113814` failed on other sessions' dirty files, as undeclared-path plus missing-dependent for pages this packet did not edit. That close result is not a proof of this packet. No live database or Temporal read was run.

**CREATE:** `docs/runbooks/uncertain-work-recovery.md`

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** An ambiguous provider send is blindly retried, a saved mechanical receipt is rerolled, or restored SQL alone is asserted to reconstruct lost Temporal work.

**Evidence:** Dry-run/read-only trace and two planted ambiguity examples; no remote commands, provider calls or mutation. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | docs/runbooks/uncertain-work-recovery.md | new owner; no old heading moved | An ambiguous provider send is not retried, a saved mechanical receipt is not rerolled, and restored SQL is not lost Temporal history. The local settlement file stays. |

## Reconciliation ledger (fill at execution)

**CREATE:** `docs/runbooks/uncertain-work-recovery.md`

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/uncertain-work-recovery.md#decision-tree | task guide | changed: new first-response tree that names story, operation, generation, attempt, receipt, notice, and provider usage before any later action | no source behavior changed; inspected b3113814 in packages/application/src/storyteller/execution.ts and packages/application/src/storyteller/budget.ts and packages/db/src/schema/generations.ts and packages/db/src/schema/storyteller.ts and packages/db/src/schema/outbox.ts and packages/db/src/schema/campaign.ts and packages/workflows/src/contracts.ts and apps/worker/src/outbox/dispatch.ts | source-inspected; live SQL and Temporal reads were not run | An ambiguous provider send is not blindly retried, a saved mechanical receipt is not rerolled, and restored SQL alone is not a reconstruction of lost Temporal work | CREATE docs/runbooks/uncertain-work-recovery.md; task row on docs/runbooks/README.md |
| docs/runbooks/uncertain-work-recovery.md#ambiguous-provider-send | task guide | changed: a dispatched or uncertain attempt is held and its usage is recorded unknown when it is not a stored match | no source behavior changed; inspected b3113814 in packages/application/src/storyteller/execution.ts and packages/application/src/storyteller/budget.ts and packages/db/src/schema/storyteller.ts | source-inspected; the reading example was not executed | An ambiguous provider send is not blindly retried | links to docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call and docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission |
| docs/runbooks/uncertain-work-recovery.md#saved-mechanical-receipt | task guide | changed: a stored game-action receipt stays the mechanical outcome for that story and offer | no source behavior changed; inspected b3113814 in packages/db/src/schema/campaign.ts | source-inspected; no live row was read | A saved mechanical receipt is not rerolled | link to docs/technical/engine/concurrency-and-recovery.md#before-during-and-after-the-lock |
| docs/runbooks/uncertain-work-recovery.md#restored-sql-without-temporal-history | task guide | changed: a restored PostgreSQL copy is held and escalated when Temporal history is gone | no source behavior changed; inspected b3113814 in docs/technical/platform/execution-and-delivery.md#outages-and-recovery | source-inspected; no restore was performed | Restored SQL alone is not a reconstruction of lost Temporal work | link to docs/technical/platform/execution-and-delivery.md#outages-and-recovery |
| docs/runbooks/uncertain-work-recovery.md#already-uncertain-local-attempt | task guide | changed: the local settlement file is recorded as the only saved-evidence settlement and is left in place | no source behavior changed; inspected b3113814 in scripts/repo-tools/reconcile-storyteller-response.mjs | source-inspected; the file was not run | The local settlement file is not deleted and is not authorized to run from this guide | link to work/changes/open/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md |
| docs/runbooks/uncertain-work-recovery.md#commands | task guide | changed: no identification command is cited; each candidate was refused after its source was read | no source behavior changed; inspected b3113814 in scripts/repo-tools/story-play.mjs and scripts/repo-tools/reconcile-storyteller-response.mjs | source-inspected; none of the candidates was executed | A refused command must not be described as a side-effect-free identification step | command table in the new guide |
| docs/runbooks/README.md | runbook index | changed: one task route was added and the content-package route remains | no source behavior changed; inspected b3113814 | source-inspected | The new route must not be read as a player guarantee or a custody contract | row added beside the existing content-package row |
| docs/technical/platform/execution-and-delivery.md#outages-and-recovery | technical | unchanged because only a pointer was added and the delivery contract stays as written | no source behavior changed; inspected b3113814 in docs/technical/platform/execution-and-delivery.md#outages-and-recovery | source-inspected | Restored SQL alone is not a reconstruction of lost Temporal work | one sentence |
| docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call | technical | unchanged because custody rules and the contract-dependency table were not rewritten; one ordinary link follows that table | no source behavior changed; inspected b3113814 in docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call and docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission | source-inspected | An ambiguous provider send is not blindly retried | one sentence after the existing table |
| docs/technical/engine/concurrency-and-recovery.md#recovery-the-player-can-see | technical | unchanged because only a pointer was added and the capture race stays the owner of that page | no source behavior changed; inspected b3113814 in docs/technical/engine/concurrency-and-recovery.md#before-during-and-after-the-lock and docs/technical/engine/concurrency-and-recovery.md#recovery-the-player-can-see | source-inspected | A saved mechanical receipt is not rerolled | one sentence |
| apps/worker/README.md | worker source map | unchanged because one link was added and the exact-once fence stays as written | no source behavior changed; inspected b3113814 in apps/worker/README.md and apps/worker/src/outbox/dispatch.ts | source-inspected | A repeated notice must not be described as a second game effect or a free model retry | one sentence |
| docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission | technical | unchanged because that page was not edited and unknown metering still stops another paid admission | no source behavior changed; inspected b3113814 in docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission | source-inspected | An ambiguous provider send is not blindly retried | cited from the new guide; spending page not edited |
| docs/product/README.md | product | unchanged because this guide adds no player guarantee and no automatic retry policy | no source behavior changed; product pages were not edited; inspected b3113814 | source-inspected | The guide must not grant a new player right or an automatic retry | product pages not edited |
| work/changes/open/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md | blocked housekeeping packet | unchanged because the settlement file stays blocked until a supported replacement exists | no source behavior changed; inspected b3113814 in scripts/repo-tools/reconcile-storyteller-response.mjs | source-inspected; the file was not run | The local settlement file is not deleted | new guide links the blocked packet; HK01 was not edited |
| packages/application/src/storyteller/execution.ts | code | unchanged because no executable modification is authorized and no source file was edited | no source behavior changed; inspected b3113814 | source-inspected | An executable diff or an imagined test result blocks close | no code edit |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
