# INF55 | Readable manifest inspection

**Status: Ready / owner-commissioned source implementation. Kind: implementation. Profile: PATCH.** Baseline a652df1ac53daec1eecbe02878c41c2708baf5b9; integration target main. [Operator experience standard](../../../../docs/technical/platform/infrastructure-operator-experience.md) · [Tasks](TASKS.md).

Provide readable YAML and pretty JSON for platform and workload render commands, without altering rendered object semantics or internal JSON-line protocols. Existing direct CLI default remains compact for backward compatibility until consumer audit; add friendly root aliases defaulting to YAML. Scope is presentation and help only. No Helm templates, workload values, validation, installers, or topology changes.

Separate Change branch and linked worktree from current main; `node scripts/repo-tools/change-branch-guard.mjs --change INF55 --target main`. One Composer Standard child at a time; parent owns shared docs/catalog and join. No live resources, paid provider calls, or infrastructure mutation. Source tests and before/after output samples required; human acceptance separately NOT-RUN. Stop on a material source/contract contradiction. Preserve existing data, flags, exits and internal protocols. No global queue change.
