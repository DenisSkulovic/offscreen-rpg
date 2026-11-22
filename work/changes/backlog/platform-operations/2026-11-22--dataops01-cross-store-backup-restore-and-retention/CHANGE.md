# DATAOPS01 | Whole-game data preservation, restore, reconciliation and lifecycle

**State: PROPOSED / NOT CURSOR-READY.** Cross-store recovery and data lifecycle contract, not a repeat of SCALE02's database failover. Owner wants a repository that demonstrates how to preserve **valuable production-scale user data**, even before there are customers.

## Data isn't one database
A playable historical story depends on **PostgreSQL** (story/source/ownership, receipts, budgets, outbox), **Temporal persistence/history** (ongoing workflow clocks, retries/activities), **private content-addressed DocumentStore/object storage** (Library roots, snapshots, Writer prompt/response/tool evidence), and runtime **configuration/secrets/identity** that must be restorable or safely rotated. Caches/search indexes are rebuildable, not canonical. A database backup alone may leave broken document roots or missing in-flight workflow history, and 3 replicas aren't a backup.

## Desired end state
A documented, tested disaster-recovery contract for a chosen deployment/failure domain, with explicit recovery point/time objectives (RPO/RTO) by record class, backup cadence, off-cluster/independent durable copies, retention, encryption/key rotation and least-privilege access. Define a coherent **recovery cut** across SQL, object generations and Temporal: how to inventory/restore pinned CAS content, reconcile SQL pointers and retained workflow states, hold/repair tasks with uncertain provider charges, and avoid replaying already billed/model-dispatched requests. Include a *new clean environment restore rehearsal* rather than only a restart of an existing PVC.

Separate backup retention from app/user privacy deletion, legal/account retention policy and immutable financial audit requirements. Deletion and redaction may require cryptographic erasure/object tombstones depending on selected storage. Prefer verified data classification and controlled export/erase rather than unbounded retained raw prompts. Source-inspect what is actually canonical versus a cache or transient trace, and handle lost/missing CAS objects honestly.

## Evidence gates
Back up a disposable multi-scene/fork/Writer fixture, destroy only its **explicitly named disposable environment**, restore SQL and objects and compatible Temporal state into a separate clean environment, and prove owner isolation, exact story/Library root/checkpoint hash, operation receipts, budget liabilities, pending timer behavior, old/new schema compatibility and no double provider send. Exercise one **corrupt/missing backup object** to show detection and explicit recovery/hold, not fake success. Record achieved RPO/RTO, what cannot be restored, rehearsal evidence, backup test/alert and who can approve destructive restore.

## Boundaries and dependencies
Coordinate with [SCALE02](../2026-11-22--scale02-stateful-data-and-workflow-ha/CHANGE.md) for operators/replication/PITR and [AI02](../../agent-runtime/2026-11-22--ai02-durable-agent-execution-provenance/CHANGE.md) for private request/retention. Existing `docs/technical/platform/data-and-persistence.md` and `docs/runbooks/release-restore-readiness.md` are canonical source owners; this Change turns design into verified operations. No protected database deletion, auto-cloud backup billing or live data export authorized.
