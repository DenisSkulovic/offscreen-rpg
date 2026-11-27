# AC02 | assigned proof boundary

**Standing:** PASS for the assigned focused checks on the AC02 worktree. `node --test scripts/repo-tools/module-graph.test.mjs` PASS (37). `node --test scripts/repo-tools/affected-check.test.mjs` PASS (16). `node scripts/repo-tools/wiki-content-health.mjs --self-test` PASS. `pnpm` wrappers were not used because this linked worktree has no installed workspace and `pnpm` tried to purge modules. The node commands are the same scripts those wrappers invoke. Joint proof remains mandatory with AC08. No real providers, protected data, release/default cluster, migrations, destructive operations or unassigned heavy checks.

Actual commands, exit codes, source SHA, failed/unrun cases and durable owner belong in the closure receipt. Joint proof remains mandatory; no blanket waiver. No real providers, protected data, release/default cluster, migrations, destructive operations or unassigned heavy checks.
