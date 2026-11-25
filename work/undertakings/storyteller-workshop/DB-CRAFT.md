# Database craftsmanship wave | 2026-11-25

Baseline 630f70bb0d2bf1f4de0304dc3bd6bde5c6e696d0, main. Owner commissioned source-only DB package improvements while learning actual mechanisms. DB10 T01–T03 already source joined; live acceptance not run. VER04/05 own transaction/migration/recovery/topology proof; no duplicate live harness. DBOPS01 owns stale generator metadata (journal idx24 vs newest snapshot idx4), mixed-version releases/backfills and nontransactional DDL. No schema migration edits or live DB access.

- [DB11 Database package navigation and test ownership](../../changes/archive/2026-11/platform-operations/2026-11-25--db11-db-navigation/CHANGE.md): Done (source). README navigation map and eight responsibility-named unit tests; 85/85; migrations unchanged; live NOT RUN.
- [DB12 Repair managed transaction outcome and cleanup safety](../../changes/archive/2026-11/platform-operations/2026-11-25--db12-db-transaction-outcomes/CHANGE.md): Done (source). BEGIN/ROLLBACK tag cleanup; definitive COMMIT refusal via pg DatabaseError ERROR + 40001/40P01/23xxx; attempt/validate-policy split; 96/96; migrations unchanged; live NOT RUN.
- [DB13 Migration runner postcondition and failure reporting](../../changes/archive/2026-11/platform-operations/2026-11-25--db13-db-migration-runner/CHANGE.md): Done (source). Post-ledger assert under lock, applied-ledger extract, safe CLI diagnostics; 94/94; migrations unchanged; live NOT RUN. Independent of DB12.
- [DB14 Explicit admission telemetry ownership and probe navigation](../../changes/archive/2026-11/platform-operations/2026-11-25--db14-db-admission-ownership/CHANGE.md): Done (source). Explicit `AdmissionInstrumentation` options (no module-global handoff); `connection/probe.ts`; admission-error/deadline split with reexports; 106/106; migrations unchanged; live NOT RUN.

## Design findings
- database.ts returns raw drizzle(pool) and managed transaction/withClient; raw callers bypass custom admission. Later SQL01/domain audit, not this wave.
- DB12 source-fixed confirmed BEGIN cleanup and narrowed definitive COMMIT refusal to direct pg DatabaseError severity ERROR and known 40001/40P01/23xxx; ambiguous failures remain nonretryable commit-unknown. Require actual rollback tag before retry. No general SQLSTATE trust widening. Live VER04 still owns real setup failure and deferred constraint refusal.
- Admission controller converts callback success to timeout after deadline, including possible already-acknowledged COMMIT. This is a separate real correctness seam: decide committed result vs generic lease deadlines before implementation. Do not commission a broad admission rewrite or claim hard cancellation. Existing managed policy limits remain unchanged.
- runner.ts (DB13 Done): full post-ledger verification under existing lock, explicit primary/close failure records, safe CLI diagnostics; retains internal Drizzle verified-array call until pinned ORM API/transaction behavior reviewed. No reread of verified SQL at execution. DBOPS01 metadata reconciliation remains blocked from tracked generation intentionally.
- telemetry/runtime.ts (DB14 Done): explicit `AdmissionInstrumentation` injected through managed-client/admission options; probe extracted; admission-error/deadline helpers colocated; no queue semantics change.

## Readiness and proof
G0–G6 held. DB11–DB14 source Done/archived. DBOPS01 and post-commit admission-deadline issue remain planner work; no new live/outcome credit. [Overview](OVERVIEW.md).
