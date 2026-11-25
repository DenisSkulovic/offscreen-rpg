# VER01 | Bounded Composer tasks

Baseline 0c45ae7318295398d706511b9d702720a55c8a92; main; None; coordinate shared root package.json / pnpm-lock.yaml joins with active DB/infra parents. MODEL=Composer Standard / DEPTH=PATCH. One child at a time. Parent owns manifests, lockfile and join. Read normative verification contract once; dispatch only selected task + anchors. All commands from repo root; stop on actual safety/semantic contradiction; no live mutation unless separately invoked by operator. Receipt paths, command, result, source/fixture/live tier, cleanup and SHA.

## T01 | Catalog and CLI

Read root package.json, pnpm-workspace.yaml, infra/verification/verify.mjs, normative verification-programmes.md. Create tools/verification/package.json (private @offscreen/verification, type module; no runtime domain deps yet), runner/catalog.mjs and runner/cli.mjs. Add root verify script node tools/verification/runner/cli.mjs. Enumerate direct packages/* and apps/* manifest names; register infra adapter only and explicit DB placeholder; list unimplemented. Implement strict parser and plan. Tests runner/catalog.test.mjs and cli.test.mjs: unknown/ambiguous/duplicate flags, invalid profiles, no side effects, missing suite nonzero. node --test tools/verification/runner/{catalog,cli}.test.mjs.

## T02 | Executor and report

Read infra/verification/diagnostic-engine.mjs executeChecks/runCommand, diagnostic.mjs atomic report, normative contract. Implement runner/plan.mjs, execute.mjs, report.mjs; validate section order/dependencies/resource specs and stable IDs; use existing executeChecks for ordered sections and runCommand for child commands via explicit import, allowlist returned evidence, map timeout, incremental atomic report and cleanup ledger. For live adapter interface define acquire(requirement,runContext)->{publicFacts,privateHandle,release()}, acquire only after --live, scope cleanup with try/finally even after failure, no adapter implemented yet. Process shutdown bounded, no arbitrary URL. Tests injected adapter failure, sibling continuation, blocked deps, timeout, cleanup failure, interrupt, malformed reports, secret sentinel excluded. node --test tools/verification/runner/*.test.mjs.

## T03 | Infrastructure compatibility adapter

Read infra/verification/verify.mjs, diagnostic.mjs, provisioning.mjs, infra/verification/CAPABILITIES.md. Create suites/infra/manifest.mjs and adapter.mjs; invoke existing source/diagnostic CLI as child, source and diagnostic tier metadata, parse explicit result/report only, preserve child report paths; no provisioning or mutation hidden in diagnostic. Missing live acceptance stays NOT-RUN. Existing infra CLI remains untouched (INF51 active). Test fake child PASS/FAIL/malformed and no mutation, existing infra verify tests. pnpm verify list; pnpm verify infra --plan; node --test infra/verification/verify.test.mjs tools/verification/runner/*.test.mjs. Reconcile docs and lockfile through custodian.

