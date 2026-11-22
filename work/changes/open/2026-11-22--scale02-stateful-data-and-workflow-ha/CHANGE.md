# SCALE02 | Stateful HA: PostgreSQL, Temporal and object storage

**State: PROPOSED; not Cursor-ready.** Stateful durability/failover is distinct from application replicas in SCALE01.

## Observed baseline
The repository's existing Kubernetes proof uses a single CloudNativePG primary with persistent volume surviving Pod replacement; it explicitly does not show three-replica database HA, point-in-time restore, independent node failures or highly available Temporal servers. PostgreSQL is the committed story/funding authority; Temporal has separate workflow-history persistence; private CAS documents may live in separate object storage.

## Owner outcome
Select and prove a three-instance database topology such as one writable PostgreSQL primary and two standbys under an operator, not three independent writable copies. Decide synchronous/asynchronous replication, fencing, failover, primary-only writes, read consistency and app connection reconnection/transaction retry. Assess Temporal server plus its backing persistence separately from scaling Temporal Worker processes. Assess private object-store durability for pinned roots, archival Writer responses and reassembled scene documents. Backups, WAL/PITR and restore rehearsal are distinct from replica availability.

## Proof dimensions
On an approved disposable multi-node environment, create committed scenes/held operations, interrupt one selected DB or workflow service component through operator-safe procedures, prove a single canonical scene, charge and tool effect after reconnect, and record observed RPO/RTO and lag. Separately restore backups into a disposable database and validate root/receipt/ledger identity. An uncertain provider send remains uncertain, not free or replayable. Avoid forceful DB Pod deletion as a substitute for fencing.

## Boundaries
Do not move game SQL ownership, replace Temporal, introduce Redis as authority, or claim that a 3-Pod database automatically survives a whole node/cluster disaster. Depends on TURN03/K8S10 and stabilized Writer custody. No live cluster mutation, expensive cloud deployment, paid model requests or implementation permission now.
