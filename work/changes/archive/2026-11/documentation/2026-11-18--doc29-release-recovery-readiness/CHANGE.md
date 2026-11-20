# DOC29 | Separate production-readiness and backup/restore proof from local development instructions

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Why this is missing:** Technical deployment doc requires restoring both PostgreSQL and Temporal histories and handling media/document objects. The docs/runbooks tree currently contains local development, ChatGPT ZIP export and historical harness evaluation, not an evidenced safe release/restore procedure.

**Start with actual current owners:**
- [docs/technical/platform/deployment-and-compatibility.md](../../../../../../docs/technical/platform/deployment-and-compatibility.md)
- [docs/technical/platform/data-and-persistence.md](../../../../../../docs/technical/platform/data-and-persistence.md)
- [docs/runbooks/local-development.md](../../../../../../docs/runbooks/local-development.md)
- [docs/runbooks/README.md](../../../../../../docs/runbooks/README.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Write a state-of-readiness checklist: versioned schema compatibility, backup inventory (Postgres, Temporal, immutable document roots, secrets by policy), restore validation, quarantine/known checkpoint, owner approval and replay/charging safety.
2. Classify each step: selected requirement, local fixture/proven, hosted unproven or explicitly blocked. Use no fictional commands or RTO/RPO promise; actual production recovery requires separate owner rehearsal.
3. Crosslink runbooks and technical deployment, preserving separation of human operational procedure vs normative architecture.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no availability SLA, user promise, account deletion or retention duration is ratified by this guide | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because Postgres+Temporal disaster recovery is a selected target, not a demonstrated operational procedure; no change to the runtime contract | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because no infrastructure manifests, workflow deployments, DB migration or hosted backups are to be changed by this doc | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: CREATE docs/runbooks/release-restore-readiness.md with explicit 'NOT TESTED/NOT PRODUCTION RUNBOOK' sections and update runbook/router links; move only durable operational checklist text if necessary | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

**Execution note:** This session's owner instruction sets Ready for close with an explicit CREATE. The new file is present at the revision recorded in the ledger. Code was not edited. `docs/technical/platform/data-and-persistence.md` was read and not edited. No provider call was made. No database session was opened. No restore was executed. No dump, export, or settlement command was run. At `b3113814`, a focused link check of the four DOC29 pages returned no broken links. `pnpm wiki:change-guard --mode plan --change work/changes/archive/2026-11/other/2026-11-18--doc29-release-recovery-readiness` returned plan ok with no findings. `pnpm wiki:change-guard --mode close --base b3113814` failed on other sessions' dirty files, as undeclared-path plus missing-dependent for pages this packet did not edit. That close result is not a proof of this packet. No live database or Temporal session was opened.

**CREATE:** `docs/runbooks/release-restore-readiness.md`

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** A standalone PostgreSQL restore is declared a consistent recovery while Temporal history or document roots are lost; an untested checklist is called a production runbook.

**Evidence:** Source contract review and safe fixture-only negative checklist; no remote/disposable restore assumed to have run. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | docs/runbooks/release-restore-readiness.md | new owner; no old heading moved | A PostgreSQL restore alone is not a consistent recovery, and an untested checklist is not a production runbook. |

## Reconciliation ledger (fill at execution)

**CREATE:** `docs/runbooks/release-restore-readiness.md`

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/release-restore-readiness.md#checklist | task checklist | changed: new untested classification of schema compatibility, backup inventory, restore validation, quarantine, owner approval, and replay/charging safety | no source behavior changed; inspected b3113814 in docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment and docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record and docs/technical/platform/data-and-persistence.md#selected-document-store and docs/technical/platform/data-and-persistence.md#changes-retention-and-deletion and docs/technical/platform/execution-and-delivery.md#outages-and-recovery | source-inspected; no restore was executed | A PostgreSQL restore alone is not a consistent recovery while Temporal history or document roots are missing, and an untested checklist is not a production runbook | CREATE docs/runbooks/release-restore-readiness.md; one route on docs/runbooks/README.md |
| docs/runbooks/release-restore-readiness.md#settlement-is-a-different-job | task checklist | changed: a backup restore is classified apart from uncertain-attempt settlement, and the existing identification guide is linked rather than rewritten | no source behavior changed; inspected b3113814 in docs/runbooks/uncertain-work-recovery.md#restored-sql-without-temporal-history and docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission | source-inspected; no settlement command was run | A restore is not an uncertain-attempt settlement and does not authorize another paid send | link to docs/runbooks/uncertain-work-recovery.md; that page was not edited |
| docs/runbooks/release-restore-readiness.md#commands-refused | task checklist | changed: dump, export, object copy, local boot, and settlement candidates are refused and were not executed | no source behavior changed; inspected b3113814 in docs/runbooks/local-development.md#local-dependencies and docs/runbooks/uncertain-work-recovery.md#commands | source-inspected; none of the candidates was executed | A refused command must not be described as a restore rehearsal | command table in the new checklist |
| docs/runbooks/README.md#runbooks | runbook index | changed: one task route was added; the content-package route and the uncertain-work route remain | no source behavior changed; inspected b3113814 | source-inspected | The new route must not be read as a production runbook or a player availability promise | row added after the existing uncertain-work row |
| docs/runbooks/local-development.md#local-dependencies | runbook | unchanged because local startup instructions stay as written and one sentence says local boot is not a restore rehearsal | no source behavior changed; inspected b3113814 in docs/runbooks/local-development.md#local-dependencies | source-inspected; local boot was not run as a rehearsal | Local boot is not a restore rehearsal | one sentence and a link |
| docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment | technical | unchanged because the selected backup, Temporal history, and reconcile-before-resume sentences were not rewritten; one pointer to the checklist was added | no source behavior changed; inspected b3113814 in docs/technical/platform/deployment-and-compatibility.md#first-hosted-deployment | source-inspected; no restore was executed | A PostgreSQL restore alone is not a consistent recovery while Temporal history or document roots are missing | one paragraph after the existing requirement |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | technical | unchanged because this file was not edited and SQL, Temporal, and document-root custody stay on their existing headings | no source behavior changed; inspected b3113814 in docs/technical/platform/data-and-persistence.md#selected-document-store and docs/technical/platform/data-and-persistence.md#changes-retention-and-deletion | source-inspected; the other session's dirty copy was read and not written | The checklist must not set a retention period or treat a document root as optional when the SQL root addresses it | cited from the new checklist; persistence page not edited |
| docs/technical/platform/execution-and-delivery.md#outages-and-recovery | technical | unchanged because quarantine and the known committed boundary stay on that page and this packet did not edit it | no source behavior changed; inspected b3113814 in docs/technical/platform/execution-and-delivery.md#outages-and-recovery and docs/technical/platform/execution-and-delivery.md#retry-boundaries-and-uncertain-side-effects | source-inspected | Restored PostgreSQL alone is not workflow history, and a worker restart is not disaster recovery of both systems | cited from the new checklist; execution page not edited |
| docs/runbooks/uncertain-work-recovery.md#restored-sql-without-temporal-history | task guide | unchanged because the identification guide was not rewritten and a restore is linked there when a reader might settle an attempt from a backup | no source behavior changed; inspected b3113814 in docs/runbooks/uncertain-work-recovery.md#restored-sql-without-temporal-history | source-inspected; no settlement was run | A restore is not an uncertain-attempt settlement | new checklist links the existing branch; uncertain-work page not edited |
| docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission | technical | unchanged because unknown metering still stops further paid admission and that page was not edited | no source behavior changed; inspected b3113814 in docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission and docs/technical/platform/spending-and-entitlements.md#hold-and-recovery-semantics | source-inspected | A restore does not authorize another paid send | cited from the new checklist; spending page not edited |
| docs/technical/engine/lifecycle-and-compatibility.md#workflow-replay-compatibility | technical | unchanged because replay compatibility stays the selected first proof on that page and this packet did not edit it | no source behavior changed; inspected b3113814 in docs/technical/engine/lifecycle-and-compatibility.md#workflow-replay-compatibility | source-inspected; no history was replayed | A hosted production history is not a replay corpus, and this checklist does not claim a replay was run | cited from the new checklist; lifecycle page not edited |
| docs/product/README.md#product | product | unchanged because this checklist adds no player availability promise, deletion SLA, or retention duration | no source behavior changed; product pages were not edited; inspected b3113814 | source-inspected | The checklist must not grant a new player right or a recovery time promise | product pages not edited |
| docs/technical/README.md#technical-contracts | technical map | unchanged because the deployment owner remains the compatibility route and this map was not edited | no source behavior changed; inspected b3113814 | source-inspected | A new runbook route must not become a second deployment contract | technical map not edited |
| packages/db and packages/documents and infrastructure | code | unchanged because no executable modification is authorized and no source, manifest, or database was edited | no source behavior changed; inspected b3113814 | source-inspected | An executable diff or an imagined restore report blocks close | no code edit |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
