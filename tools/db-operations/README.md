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
