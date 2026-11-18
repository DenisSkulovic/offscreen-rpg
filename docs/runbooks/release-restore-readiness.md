# Release and restore readiness (NOT TESTED, not a production runbook)

**Reader question:** Before anyone treats a backup as a consistent recovery, which checks are already required, which local facts exist, which hosted steps are unproven, and which actions does this page refuse?

**Normative status:** task checklist. **NOT TESTED.** This page is not a production runbook. It does not change the selected recovery requirement, and it does not add a player availability promise, a deletion SLA, or a retention duration.

**Owner:** this page, for the classification below. PostgreSQL, Temporal, and document-root custody stay on the technical pages linked here. Uncertain-attempt settlement stays on [Uncertain work recovery](uncertain-work-recovery.md).

**Explore by question:** [how to read a row](#how-to-read-a-row) · [checklist](#checklist) · [one store is not the recovery](#one-store-is-not-the-recovery) · [settlement is a different job](#settlement-is-a-different-job) · [commands refused](#commands-refused) · [negative cases](#negative-cases) · [where the contract lives](#where-the-contract-lives).

No backup was listed for this page. No restore was executed. No RTO or RPO is stated. A future hosted rehearsal is a separate owner decision.

## How to read a row

| Class | What it means on this page |
| --- | --- |
| selected requirement | A technical owner already requires the rule. This checklist does not demonstrate it. |
| local fixture/proven | A local development record already describes the behavior. This session did not re-run it, and it is not a hosted restore. |
| hosted unproven | A hosted backup, restore, or rehearsal would have to exist. None was inspected or executed here. |
| explicitly blocked | This page refuses the step. No command is supplied. |

A row can name a selected rule and still leave the hosted demonstration unproven. Those are separate rows when a reader could confuse them.

## Checklist

| Step | Class | What a reader may conclude | Where the fact lives |
| --- | --- | --- | --- |
| Versioned schema compatibility: overlapping application processes use expand/contract changes, stored generation payloads keep a readable schema, and workflow code stays replay-compatible | selected requirement | The rule is selected. This page did not migrate a restored database and did not replay a history. | [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment), [Flexible without becoming untyped](../technical/platform/data-and-persistence.md#flexible-without-becoming-untyped), [Implemented generation records](../technical/platform/data-and-persistence.md#implemented-generation-records), [Workflow replay compatibility](../technical/engine/lifecycle-and-compatibility.md#workflow-replay-compatibility) |
| Treat local migration, a disposable database test, or `/api/health/ready` as proof that a restored schema matches | explicitly blocked | Ready checks PostgreSQL connectivity. It does not check schema compatibility. Local migrate is startup procedure. | [Checks and boundaries](local-development.md#checks-and-boundaries), [PostgreSQL component](local-development.md#postgresql-component) |
| Inventory an application PostgreSQL backup for one named checkpoint | hosted unproven | The selected target requires a backup and a demonstrated restore. No backup was listed. No restore was run. | [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment) |
| Inventory Temporal history for that same checkpoint | hosted unproven | Temporal owns workflow history. Application migrations do not include it. No history export was listed. | [Who owns the durable record](../technical/platform/data-and-persistence.md#who-owns-the-durable-record), [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment) |
| Inventory the immutable document roots for that same checkpoint | hosted unproven | Canonical prose is content-addressed. The object-store adapter is not a backup scheduler. No root was listed. A committed SQL root with an unreadable object is unavailable or corrupt. | [Selected document store](../technical/platform/data-and-persistence.md#selected-document-store) |
| Inventory secrets by the existing policy | selected requirement | Access keys stay out of source, logs, and the web client. Temporal history carries no credentials. Local `.env` stays private. This page records no secret value and names no secret-backup product. | [Selected document store](../technical/platform/data-and-persistence.md#selected-document-store), [Changes, retention and deletion](../technical/platform/data-and-persistence.md#changes-retention-and-deletion), [Requirements and startup](local-development.md#requirements-and-startup) |
| Validate a restore before resume: compare SQL revisions, Temporal history, and document-root readability for the same checkpoint | hosted unproven | The selected target requires that reconciliation before affected stories resume. The comparison was not performed. | [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment) |
| Quarantine affected stories when Temporal history is missing, and keep a known committed boundary | selected requirement | Restored PostgreSQL alone is insufficient. Quarantine and a controlled restart from a known committed boundary are the selected recovery words. | [Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) |
| Supply a quarantine API, a restart command, or a procedure that finds that boundary | explicitly blocked | This checklist does not define those steps. The identification guide already records them as untested. | [Restored SQL without Temporal history](uncertain-work-recovery.md#restored-sql-without-temporal-history) |
| Owner approval to leave quarantine, resume stories, replay histories, or charge a provider | explicitly blocked | No approval is recorded. Reading this page is not that approval. | This page |
| Replay and charging safety: a retry inspects the saved attempt, unknown metering stops further paid admission, and operation identity survives Temporal history retention | selected requirement | Those rules stay in force across a restore discussion. A worker restart is a different test from disaster recovery of both stores. | [Retry boundaries and uncertain side effects](../technical/platform/execution-and-delivery.md#retry-boundaries-and-uncertain-side-effects), [Window accounting and admission](../technical/platform/spending-and-entitlements.md#window-accounting-and-admission), [Story snapshot and chronology](../technical/platform/data-and-persistence.md#story-snapshot-and-chronology), [Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) |
| Execute workflow replay, a provider send, or an attempt settlement from this checklist | explicitly blocked | This page does not authorize those actions. | [Uncertain work recovery](uncertain-work-recovery.md) |
| Local named volumes that survive `infra:down`, and local boot with `pnpm infra:up` or `pnpm dev` | local fixture/proven | The local guide records development-volume retention across a stop, and a scripted opening suite that exercises worker restart. This session did not stop a volume, restore one, or run that suite. That record is not a backup inventory and not a restore rehearsal. | [Local dependencies](local-development.md#local-dependencies) |
| Count Redis, or another cache, as a member of the consistent recovery set | explicitly blocked | Caches are not the durable record. | [Who owns the durable record](../technical/platform/data-and-persistence.md#who-owns-the-durable-record), [Redis boundary](../technical/platform/persistence-and-caching.md#redis-boundary) |
| Define a media retention duration or a media backup schedule | hosted unproven | The selected target says to define media retention and backup expectations. This page does not define a duration. | [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment), [Changes, retention and deletion](../technical/platform/data-and-persistence.md#changes-retention-and-deletion) |
| Promise player availability, an account-deletion SLA, or a retention duration | explicitly blocked | This page ratifies none of those. The persistence owner already says it does not set a retention period. | [Changes, retention and deletion](../technical/platform/data-and-persistence.md#changes-retention-and-deletion) |

**Reading example, not a restore.** A checkpoint named only as an example has no PostgreSQL backup id, no Temporal history id, and no document-root id. The secrets cell points at the policy headings and contains no value. The set is hosted unproven. Stop. Do not resume stories.

## One store is not the recovery

A consistent recovery for one checkpoint names three stores together:

1. Application PostgreSQL, including the schema version that wrote the rows.
2. Temporal history for the executions those rows still depend on.
3. The immutable document roots those committed publication records address.

[Who owns the durable record](../technical/platform/data-and-persistence.md#who-owns-the-durable-record) splits that custody: application PostgreSQL owns committed story state, and Temporal owns workflow history, timers, and execution progress. [Selected document store](../technical/platform/data-and-persistence.md#selected-document-store) keeps canonical prose content-addressed. PostgreSQL keeps the publication root. The object store does not join the SQL transaction. A staged object with a failed commit is unreferenced garbage. A committed root with an unreadable object is unavailable or corrupt.

[First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment) already requires a PostgreSQL backup and a demonstrated restore, Temporal history retention and recovery, and a reconciliation of restored revisions against workflow state before affected stories resume. Temporal persistence upgrades stay separate from application migrations. This checklist does not perform that demonstration.

[Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) recovers workflow state through Temporal history. When that history is lost, restored PostgreSQL alone is insufficient: quarantine the affected stories and reconcile a controlled restart from a known committed boundary. Test worker restart separately from disaster recovery of both systems. This page does not run either test.

## Settlement is a different job

A backup restore and an uncertain Storyteller or workflow attempt are different questions.

Use [Uncertain work recovery](uncertain-work-recovery.md) when one attempt or workflow operation looks unfinished: the reader names the story, operation, generation, and attempt, then holds, records unknown, or escalates. That guide does not restore a database. Its [restored SQL branch](uncertain-work-recovery.md#restored-sql-without-temporal-history) already says a restored PostgreSQL copy is held and escalated when Temporal history is gone, and that the guide does not define quarantine, a restart command, or a new workflow. This checklist does not add those missing steps, and it does not settle the attempt.

Restoring rows does not create a provider generation id, does not classify an `uncertain` attempt, and does not clear a stopped funding account. [Window accounting and admission](../technical/platform/spending-and-entitlements.md#window-accounting-and-admission) keeps the conservative allocation and stops further paid admission until the attempt is reconciled. [Hold and recovery semantics](../technical/platform/spending-and-entitlements.md#hold-and-recovery-semantics) keeps a usage hold distinct from an exhausted window. This page does not resume the story.

## Commands refused

No restore, export, replay, or settlement command is cited. Each candidate below was refused without being executed. A live database session and a Temporal session are untested, and this page does not supply either command.

| Candidate | Disposition |
| --- | --- |
| Database dump, restore, or hosted SQL admin | Refused. Not run. No hosted backup was listed. |
| Temporal export, reset, or namespace admin | Refused. Not run. |
| Object-store copy or sync | Refused. Not run. The selected adapter is not a backup scheduler. |
| `pnpm infra:up`, `pnpm dev`, `pnpm db:migrate`, `pnpm db:reset:test`, `pnpm chamber:reset` | Refused as a rehearsal. Local startup and disposable reset are not a restore. Not run for this page. |
| Uncertain-attempt settlement and live story-play mutations | Refused. Identification of an uncertain attempt stays on [Uncertain work recovery](uncertain-work-recovery.md#commands), which also refuses those commands. Not run. |
| Provider lookup, workflow start, SQL update, or SQL delete | Refused. Not run. |

`/api/health/live` and `/api/health/ready` are not restore validation. Ready checks connectivity. It does not check schema compatibility, workflow history, or document roots.

## Negative cases

These outcomes stay false.

**A PostgreSQL restore alone is not a consistent recovery.** Temporal history or the immutable document roots can still be missing. The SQL copy is the SQL copy. Quarantine stays in force until an owner rehearsal reconciles the checkpoint. This page does not declare that reconciliation done.

**An untested checklist is not a production runbook.** The table classifies requirements and gaps. It does not record a restore, a backup id, an RTO, or an RPO.

**Local boot is not a restore rehearsal.** Named development volumes and a scripted worker-restart exercise are local records. They do not inventory a hosted checkpoint.

**A restore is not an uncertain-attempt settlement.** Holding an unknown charge, keeping a saved receipt, and refusing a second paid call stay on [Uncertain work recovery](uncertain-work-recovery.md#negative-cases). This page does not retry the send.

**No availability, deletion, or retention promise is added.** [Changes, retention and deletion](../technical/platform/data-and-persistence.md#changes-retention-and-deletion) does not set a retention period. Backup retention meaning that physical removal is not instantaneous stays on that page, without a duration.

## Where the contract lives

| Question | Owner |
| --- | --- |
| What must a hosted release back up, restore, and reconcile? | [First hosted deployment](../technical/platform/deployment-and-compatibility.md#first-hosted-deployment) |
| Which store owns SQL state, Temporal history, and canonical prose? | [Who owns the durable record](../technical/platform/data-and-persistence.md#who-owns-the-durable-record) and [Selected document store](../technical/platform/data-and-persistence.md#selected-document-store) |
| What happens when Temporal history is actually lost? | [Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) |
| How does a reader identify one uncertain attempt without restoring anything? | [Uncertain work recovery](uncertain-work-recovery.md) |
| What stops another paid admission while usage is unknown? | [Window accounting and admission](../technical/platform/spending-and-entitlements.md#window-accounting-and-admission) |
| Why is local boot not this rehearsal? | [Local dependencies](local-development.md#local-dependencies) |
