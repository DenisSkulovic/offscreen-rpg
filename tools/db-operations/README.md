# @offscreen/db-operations

Local operator CLI for the reviewed database-operations catalog and loopback target guard. It does not import application runtime code.

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
```

`target` opens one read-only session (`BEGIN READ ONLY`, session identity check, `ROLLBACK`). No writes, DDL, or enrollment marker yet.

The registry is currently empty; `list` prints an empty catalog and `inspect` refuses unknown keys before connecting.