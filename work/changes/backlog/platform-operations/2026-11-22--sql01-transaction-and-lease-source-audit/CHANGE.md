# SQL01 | Human-guided transaction, lease and recovery audit

**State: PROPOSED / review-first Change; no executable data mutation.** Owner intends to personally understand SQL semantics, locks, fault safety and scaling. [HR03](../../../archive/2026-11/other/2026-11-22--hr03-db-schema-and-sql-navigation/CHANGE.md) creates the initial query-owner atlas and reorganizes **table declarations**, but deliberately does **not** assess whether transactional code is correct. SQL01 records that separate, harder task rather than bury it inside a cosmetic refactor.

## End state

A maintained, source-grounded **transaction and recovery atlas** covering the most important Story Engine and platform flows, navigable by a human reviewer:
- story/scene publication, resolution receipts, fork and canonical root/checkpoint changes;
- SQL outbox enqueue/dispatch, lease/claim/ack and Temporal start identity;
- funded Writer mission, attempt reservation/possibly-sent/cost settlement, tool ledger and private CAS pointer;
- campaign action/clock/holds, idempotency fences and multi-actor concurrency;
- retention/purge where private model documents/receipts are linked.

For each selected operation, show **entrypoint → transaction owner → rows/locks/order → durable state before external side effects → restart/retry/lease expiry → observable receipt**. Record which guarantee is source-inspected, covered by focused test, demonstrated in a real process/Pod fault, or still unverified. Include deadlock/race, duplicate wake, stale revisions, crash after CAS before SQL, provider unknown-send and partial publication as concrete failure scenarios.

## Boundaries

Read current `@offscreen/db` schema/outbox primitives, Story Engine use cases, GA and SQL-capable Worker ownership, and focused fault tests. Reuse HR03 SQL-OWNERSHIP map and AI01 Temporal tour; **do not move queries into generic repositories** or substitute guesses for observed SQL statements. A source audit may identify defects; any substantial unsafe fix becomes its own separately planned implementation Change, with transaction algorithm decided by ChatGPT first. Do not run destructive/mutating tests on real accounts or protected DB.

## Completion and human acceptance

Deliver a concise cross-linked source/transaction table and a prioritized findings ledger: confirmed defects vs missing evidence vs reasonable design choices; clear reproducer/proof routes, indexes/query-plan concerns and next validation steps. Walk through at least one Writer dispatch and one gameplay operation with the owner, explaining how leases recover and where idempotency prevents duplicate effects. Existing test evidence must be cited with exact scope; do not say “scalable” from code shape alone.

**Dependency:** after HR03 and important WR10/WR11 source stabilization, coordinate with K8S10 fault trials and AI01 topology. **No implementation, SQL migration, privileged query, money spend or real cluster fault is authorized by this proposal.**
