# @offscreen/db-operations

Local operator CLI for the reviewed database-operations catalog, loopback target guard, explicit enrollment, and atomic operation ledger. It does not import application runtime code.

Configure the target only through `DB_OPS_URL` (literal `127.0.0.1` or `[::1]`, explicit port, database, role, and password). Loopback enforcement reduces accidental remote targets; it is not environment attestation.

Authority and programme context: [database-operations.md](../../../docs/technical/platform/database-operations.md).

## Commands

From the repository root (builds the tool, then runs the CLI):

```bash
pnpm db:ops help
pnpm db:ops list
pnpm db:ops list --json
pnpm db:ops inspect example-op@1
pnpm db:ops inspect example-op@1 --json
pnpm db:ops target
pnpm db:ops target --json
pnpm db:ops enroll --confirm-target '<exact targetLabel>'
pnpm db:ops enroll --confirm-target '<exact targetLabel>' --json
pnpm db:ops plan example-op@1 --target-id <uuid>
pnpm db:ops status example-op@1 --target-id <uuid>
pnpm db:ops run example-op@1 --target-id <uuid> --confirm-target '<exact targetLabel>' --actor you
```

`target` opens one read-only session (`BEGIN READ ONLY`, session identity check, `ROLLBACK`). `enroll` creates the once-only `offscreen_ops` marker schema under the shared migration advisory lock; it refuses an existing namespace and never auto-adopts. `plan` / `status` are read-only against the enrolled marker. `run` requires a clean Git tree, matching provenance SHA, low/medium atomic registration, and the session lock; the production registry remains empty until a reviewed operation is added.

The registry is currently empty; `list` prints an empty catalog and `inspect` / `run` refuse unknown keys before connecting.

## Batched fixture example (tests only)

`test/fixtures/normalize-labels.ts` demonstrates a keyed batched backfill against a **test-only** table shape. It is not registered in the production CLI catalog (`registry.ts` remains empty for batched entries).

Intended fixture table (create only on a disposable target during operator proof, not by this package):

```sql
CREATE TABLE offscreen_ops_fixture.labels (
  id bigint PRIMARY KEY,
  original text NOT NULL,
  normalized text,
  revision bigint NOT NULL DEFAULT 0
);
```

Each batch selects pending rows with `id > $cursor` (`ORDER BY id LIMIT $n FOR UPDATE`), applies `normalized = lower(original)` with a revision compare-and-set update, advances `lastId` to the last selected row, and sets `done` when the selected row count is below the limit. Final `verify` requires zero rows where `normalized` is distinct from `lower(original)`. Original text is never overwritten.

Package tests in `test/batched-operation.test.ts` drive the fixture through an in-memory SQL adapter (query order, cursor progression, CAS refusal, resume, and duplicate-run noop). **Live verification** on a real PostgreSQL instance belongs to the existing VER02 owned disposable verification resource and a later explicit operator task; this README does not add a second provisioner or Docker scenario.
