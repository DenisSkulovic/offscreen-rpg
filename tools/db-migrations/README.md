# @offscreen/db-migrations

Drizzle migration generation and schema review helpers for Offscreen RPG.

## Commands

| Script | Purpose |
| --- | --- |
| `pnpm generate` | Runs `check-history` first, then `drizzle-kit generate`. Refuses generation when the migration journal and terminal snapshot metadata are out of alignment (see `scripts/check-history.mjs`). |
| `pnpm check:history` | Read-only journal vs terminal snapshot metadata check; does not repair metadata. |
| `pnpm check:schema` | Frozen digest guard for tracked migration bytes during generation experiments. |
| `pnpm review:change -- --base <ref> [--head <ref>] [--json]` | Read-only migration **change review** between two git refs: historical integrity inventory, conservative lexical risk hints, and a human checklist. No database access. |

From the repository root:

```bash
pnpm --filter @offscreen/db-migrations review:change -- --base main
```

Lexical hints are heuristic (they may match SQL comments and miss dynamic SQL). **Absence of hints does not mean a migration is safe.** There is no automatic down migration or enforced approval gate in this package.

Authority: [Controlled database operations](../../docs/technical/platform/database-operations.md) — schema review covers historical integrity and lexical risk hints; recovery and compatibility remain human-owned.

## Schema change PR template

Copy into your PR description when adding migrations:

```markdown
## Schema change review

- **Owner:**
- **Change reason:**
- **Recovery strategy:** (how to detect failure and what durable state remains)
- **Rollout ordering:** (app vs migration Job vs mixed-version window)
- **Affected tables / estimated rows:**
- **Disposable proof:** (commands or evidence run against a throwaway database)
- **Reviewer:** (optional locally; not enforced by tooling)

### New migrations (from `review:change`)

- Tags:
- Integrity: `pnpm --filter @offscreen/db-migrations review:change -- --base <integration-ref>`
- Metadata: `pnpm --filter @offscreen/db-migrations check:history`

### Manual checklist

- [ ] Locking / table rewrite
- [ ] Existing data backfill or constraint impact
- [ ] Mixed-version / API compatibility
- [ ] Recovery if migration fails mid-flight
- [ ] Transaction / lock interaction with operations channel
- [ ] Expected verification after apply
```