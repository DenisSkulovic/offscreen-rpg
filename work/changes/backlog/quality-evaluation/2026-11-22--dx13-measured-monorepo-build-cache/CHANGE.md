# DX13 | Measured affected-workspace build, test and cache effectiveness

**State: PROPOSED / source-rebase required, not currently dispatched.** Independent performance/verifiability improvement, not duplication of the already-Done [DX12 affected planner](../../../archive/2026-11/other/2026-11-21--dx12-correct-affected-build-checks/CHANGE.md). Owner cares about high-quality modular-monolith dependency direction and practical fast local/Jenkins-style incremental builds.

## What remains after DX12

DX12 created a conservative affected-workspace selector with focused tests; the actual `--run` mode and cold/warm build-cache savings **were not demonstrated**. MA11's graph checks and MA12's deployment dependency closure answer other questions. They do not prove that only affected packages rebuild, that generated artifacts are cached correctly, or that cache invalidation responds to SQL/Contracts/schema changes.

## Outcome

A **reproducible, measured** local and CI-compatible matrix for the current pnpm/Turbo monorepo:
1. clean cold build/typecheck/lint/test of selected key packages with accurate dependency topological order and explicit existing failures;
2. unchanged warm run, with per-task cache hits/misses, elapsed time and artifact hashes;
3. small controlled edits to a leaf UI feature, public Contracts, DB/schema, Game Authority/Story Engine implementation and shared test tooling, verifying the set of impacted packages is neither under- nor over-included;
4. fix **demonstrated** gaps in task inputs/outputs, invalidation, generated dist, lockfile/pnpm filters and test target wiring, without introducing global exclusions or cache-key hacks; retain conservative full check where safety cannot be proven.

A compact guide explains what is cached, how to run affected checks, which packages own artifacts and how to diagnose misses. Avoid claiming speedups without baseline/after measurements. No paid GitHub Actions or new Jenkins cluster; local execution and deterministic synthetic graph fixtures first.

## Scope and dependencies

Expected scope `turbo.json`, root pnpm task scripts, `scripts/repo-tools` affected/module tooling, selected workspace manifests/test scripts and technical DX documentation. **Do not** restructure package domains, reconfigure production networking, change runtime SQL or broad-format the entire repo to improve hit rate. Coordinate manifest/lockfile writes with MA12/CL01 and any active package refactor; perform on joined version after those changes.

## Acceptance

Build graph never omits a necessary dependent for a changed shared contract/schema, tests never pass using stale dist, and cache hits are evidenced with actual run receipts. Report both original failing/untested tasks and post-fix improvement. User needs usable commands, not abstract CI diagrams. Documentation-only proposal creates no performance claim. No chargeable CI resource is authorized.
