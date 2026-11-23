# DO07 | retire contracts

**Status: Proposed / dependency-gated. Kind: implementation. Profile: CONTRACT.** Baseline `f28085e3e5cbf15bb32f430bd3b0b833f7429c6e`. Integration target `undertaking/storyteller-workshop`. Prerequisite: All DO01–DO06 integrated.

[Program](../../../designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md) · [TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [PROOF](PROOF.md).

## Cursor first-screen brief

> Current-source map: SOURCE-MAP.md; frozen snapshot. Governing technical owner: `docs/technical/platform/topology.md#code-organization` (must be reconciled by ChatGPT at promotion). Known trap: do not add an inverse dependency or old-package alias. Scope: exact source migration and tests, no behavior change. Route: TASKS.md, one T-ID at a time, parent joins.

**Parallel execution authority (2026-11-24):** [coordination and join rules](../../../designs/open/code-architecture-health/DO-PARALLEL-EXECUTION.md). This replaces any earlier serial program or generic post-Documents gate. Each Change has its own isolated linked worktree and branch; one child at a time within each parent. DO01 parent is the integration custodian for the first wave. Other parents deliver locally accepted branch receipts to that custodian, do not independently push the undertaking, and do not require another human approval for a safe serialized join. Shared files are edited in isolated branches by owned import/key only; merge against the latest integration base, regenerate lockfile from merged manifests, rerun required proof. Do not overwrite siblings' edits. Local worktree/dirty-path and branch guard checks remain mandatory.

**Dependency correction:** require every DO01–DO06 acceptance and integration receipt, not just DO06.

## Outcome and exact scope

Delete packages/contracts (manifest, tsconfig, README, source/test leftovers) and all active references/aliases. Replace former pure package rule in `scripts/repo-tools/module-graph.mjs` and `eslint.config.mjs` with explicit domain DAG and forbidden edges. Preserve existing pure-game and engine-to-lab restrictions. Use graph tests for type-only as well as runtime forbidden imports. Update `infra/kubernetes/lab/dev/dev-sync-paths.mjs` obsolete generated-contracts exception only after checking there are no generated successor files; dev sync discovery must cover new paths. Update `infra/kubernetes/lab/app-release/production-workspace-closure.test.mjs` Web expected story-interface, admin-interface, identity-interface, lab-interface; reject engine/db/admin/lab-support/private protocol/Redis/cache-port in Web production closure except legitimate baseline dependencies explicitly proven by planner; assert API/Authority lab exclusion and existing worker closure. `scripts/repo-tools/focused-integration.mjs` remove old build filter; keep Nest-only admin compile path and topological explicit list if avoiding Web. Update old package-specific graph test fixtures to domain names where semantic purpose unchanged, and add negative old-name import/manifest tests. Update `maintenance-coverage.test.mjs`, `ci-change-scope.test.mjs` fixture path examples to story-interface, do not weaken assertions. Check shell/Docker/config/docs references from inventory. Root pnpm lockfile has no importer or link to old workspace; no runtime/build/test import or manifest old name; historical archive/evidence text may remain immutable, active docs describe retirement, not pretend old files exist. Run frozen install, full build/typecheck, available provider-free unit suites, module graph, closure tests (pure test cases only unless isolated release build approved), dev-sync tests, lint and wiki gates. No compatibility package under another generic name.

## Execution rules (all stages)
- Integration target `undertaking/storyteller-workshop`; original source map snapshot `ed0837d0531be4050b40d9b2485b5759ef479fea`, refreshed baseline `f28085e3e5cbf15bb32f430bd3b0b833f7429c6e`. Do not start until stated actual dependencies land and planner refreshes this packet.
- Parent creates linked worktree and `change/<id>-<slug>` from verified integration HEAD; run `node scripts/repo-tools/change-branch-guard.mjs --change <ID> --target undertaking/storyteller-workshop`. Read current AGENTS/CHANGE/TASKS. Parent owns its local manifests, lockfile, Change receipt and source; integration custodian owns shared docs, final joins and archive reconciliation. One child at a time, no branch per task. No automatic next Change.
- Exact relocation: preserve source tokens other than imports/exports and specifically named symbol splits. Keep strict Zod parsing, error shapes, canonical JSON, schema versions, constants, limits, hashes and privacy; no SQL migration, persisted data rewrite, route or deployment change, paid provider or live cluster. No compatibility re-exports from old package: migrate all consumers in same stage. Relative edges between moved modules stay relative; edges from remaining old files to moved modules become explicit new imports and manifest dependencies. Add direct workspace deps to all actual importers (test-only devDeps when appropriate); remove old dependency from each manifest once last reference gone. Never import an implementation solely for its types.
- New leaf workspace conventions: clone `packages/contracts/tsconfig.json` and build/test/typecheck scripts, private 0.0.0, preserve NodeNext module semantics, explicit named subpaths with types/default to `dist/src/<module>.{d.ts,js}`; use config/typescript/@types/node devDeps; Zod 4.6.5 only when needed; add only actual runtime workspace deps. No root barrel or wildcard for new public surfaces. Existing package tsconfig/output conventions remain unchanged. Parent runs `pnpm install --lockfile-only` then `pnpm install --frozen-lockfile` in own checkout; no hand-edit generated resolution data.
- Preserve tests, including negative cases and compile-time @ts-expect-error; move them with source. For existing src-root packages place relocated tests beside source (`*.test.ts`) and execute compiled file explicitly; Storyteller uses test/ and existing test script. Parent verifies test is actually emitted and executed. If an existing test needs another workspace, use direct dependency and keep test-only edges separate.
- Proof (root cwd): `pnpm repo:module-graph`, `pnpm repo:module-graph:test`, `pnpm exec turbo run build typecheck --filter=<changed workspace>...` for destinations and all reverse consumers (use explicit filters or full graph build at parent closure), focused compiled Node test paths listed in TASKS; changed-file quality/format check using repository commands. Record baseline failures, do not mask or broaden to fix unrelated issues. Compare pre/post package closure and actual import edges, no new cycles, missing exports or forbidden edges. Use no live DB/cluster to prove pure relocation. Existing tests that require live services remain separately labeled unrun unless authorized. Never claim full product acceptance from source-only proof.
- Parent reconcile README links, technical claims, planned-impact ledger and wiki guard plan/close; compare existing wiki failures against baseline rather than claiming zero. Close, archive, integrate, retire branch only after whole-stage acceptance. Exact unexpected owner/symbol/graph conflict returns to ChatGPT; no fallback aliases, permission relaxation or design guesses.


## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
|---|---|---|---|
| Product | unchanged because no player, staff, authorization or spending behavior changes | current product promises | byte-equivalent validators and existing negative tests |
| Technical | changed: `docs/technical/platform/topology.md#code-organization` ownership/realization, affected boundary heading(s) in SOURCE-MAP | existing code-architecture-health design and package READMEs | actual manifest DAG and preserved wire behavior |
| Code | changed: source destinations and exact callers/tests in SOURCE-MAP; negative: old moved subpath remains or forbidden dependency introduced | exports, manifests, lock, build and dev/release closure | focused tests and graph |
| Related | changed: affected package maps, active links, implementation status as observed | backlog/open/archive catalog and undertaking overview if actual milestone changes | reconciliation and link check |

## Acceptance

All assigned modules moved exactly once, old subpaths removed, every actual importer builds, same positive and negative tests pass, no new forbidden dependency. PROOF.md owns exact evidence; source-only evidence is not live acceptance.

## Handoff

After actual prerequisites land and planner refreshes this packet, parent executes T01 and remaining tasks; no next-stage authorization.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
|---|---|---|---|---|---|---|
| To fill at close for every impacted claim | technical/product | pending | pending | not executed | pending | pending |
