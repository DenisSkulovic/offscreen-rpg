# INF56 | Human-readable platform CLI

**Status: Ready / owner-commissioned source implementation. Kind: implementation. Profile: PATCH.** Baseline a652df1ac53daec1eecbe02878c41c2708baf5b9; integration target main. [Operator experience standard](../../../../docs/technical/platform/infrastructure-operator-experience.md) · [Tasks](TASKS.md).

Add human presentation and useful help to existing infra:plan/up/status commands, with explicit --human and --json. Keep default JSON unchanged initially because full external machine caller inventory is not established. This is a bounded compatibility-first migration; default switch is later after consumer review. No root manifest edits or topology CLI edits. Independent of INF55; parent serializes shared catalog/runbook joins.

Separate Change branch and linked worktree from current main; `node scripts/repo-tools/change-branch-guard.mjs --change INF56 --target main`. One Composer Standard child at a time; parent owns shared docs/catalog and join. No live resources, paid provider calls, or infrastructure mutation. Source tests and before/after output samples required; human acceptance separately NOT-RUN. Stop on a material source/contract contradiction. Preserve existing data, flags, exits and internal protocols. No global queue change.
