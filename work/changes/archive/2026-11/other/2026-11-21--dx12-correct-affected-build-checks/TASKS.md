# DX12 | three bounded Composer tasks

**Gate:** after current MA10/WR09A/MA11 integrated, create linked change/dx12-correct-affected-checks worktree from actual undertaking HEAD and run change-branch guard. Does not overlap WR09B or OPS12.

T01 **Pure CLI/scope engine.** Read root package.json, turbo.json, scripts/repo-tools/{ci-change-scope,ci-change-scope.test}.mjs, pnpm-workspace.yaml. Write affected-check.mjs and affected-check.test.mjs only. Implement full fallback cases and default dry plan. Positive docs/core/leaf fixtures; negative dirty, missing base, unknown => FULL. STOP missing safe path classification.

T02 **Turbo plan/execution.** Read affected-check.mjs, actual pnpm exec turbo run --help / --dry=json, root package.json. Write affected-check.mjs/test and ONLY new root repo:affected script. Explicit TURBO_SCM_BASE/HEAD, parse selected tasks, no shell interpolation, --run opt-in. Positive fake selected reverse dependent, dry plan; negative malformed Turbo output/full fallback and no --run means zero execution. STOP installed Turbo incompatible with specified flag semantics.

T03 **Local receipt and docs.** Read affected-check.test.mjs, turbo.json, ENGINEERING.md. Write ENGINEERING.md brief usage and turbo.json only if exact proof demands. Run node --test scripts/repo-tools/affected-check.test.mjs, pnpm repo:affected --base ACTUAL_SHA in plan-only, optional two clean provider-free local --run passes, git diff --check. Report selected tasks, warm/cold task logs and cache hits only when observed. No GitHub workflow, paid provider, DB reset or app edits. Return tested branch SHA/receipt.

**Stop:** any affected selection omits reverse-dependency consumers, invalid task selection secretly runs DB/live tests, or stale output caching would violate correctness.
