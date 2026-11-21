# DX12 | Correct affected-only builds, typechecks and unit tests

**Status: Done on undertaking/storyteller-workshop (2026-11-22).** Affected-check unit tests 15/15. Live `--run` was not executed. No remote cache or CI workflow change. Source basis: 6dd1276131a813f694ec3bccf4f9062ad3708208, target undertaking/storyteller-workshop. No new package, deployed service, paid GitHub Actions/CI, provider calls or protected SQL.

**Source finding:** root package.json runs Turbo for full build/typecheck/test; turbo.json has build dependsOn ^build with dist/.next outputs, typecheck dependsOn ^build, test dependsOn build with outputs []. The root scripts and code.yml select broad CI checks. There is no trusted affected-only local developer command with a source-scoped task receipt, missing-Git-history/dirty-worktree fallbacks, or measured cache hits. Do not claim Turbo is useless: the existing task graph is a foundation, but optimization needs proof.

**Chosen CLI:** pnpm repo:affected --base REF [--head REF] [--tasks build,typecheck,test] [--run]. Default is a READ-ONLY plan. Explicit --run executes selected tasks. Use Turborepo v2.10 --affected with TURBO_SCM_BASE/TURBO_SCM_HEAD set to the two verified commit SHAs; never assume main or use shell command interpolation. All execution paths preserve the original full pnpm build/typecheck/test scripts.

**Conservative correctness:** dirty/untracked tree, missing/non-ancestor ref, root toolchain/lockfile/package graph/ESLint/TSConfig/Turbo changes, package deletion/rename, unknown non-doc path, malformed Turbo dry run or impossible empty task selection for code change => FULL selected safe tasks, never false zero. Pure docs-only commits => no code tasks, but docs and maintenance checks remain separately required. A changed leaf affects its dependency consumers, and lower-level Story Engine/Contracts edits must select API/Worker/GA/API Integration when actual reverse dependencies require them. No integration/live/DB/provider tests are automatically launched as part of an affected check.

**Writes:** scripts/repo-tools/affected-check.mjs and affected-check.test.mjs; one root package.json script; ENGINEERING.md short usage; turbo.json only if tests demonstrate an exact missing cache input/output. No .github workflow, other package source/manifests, module-graph tooling, lockfile, runtime or Writer files. This is disjoint from WR09B and OPS12.

**Acceptance:** deterministic plan/result, fake Git/Turbo tests, leaf-versus-global negative scope, no unsafe skip, actual warm/cold local receipt when available, exact task/package selection, unchanged existing full commands. Do not invent speedups or remote cache.

See SOURCE-MAP.md, EXECUTION.md, TASKS.md, PROOF.md.
