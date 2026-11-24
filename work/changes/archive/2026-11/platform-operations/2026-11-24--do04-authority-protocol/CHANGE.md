# DO04 | authority protocol

**Status: Done (2026-11-24), source-only, joined to `undertaking/storyteller-workshop`. Kind: implementation. Profile: CONTRACT.** Baseline `372df9646108f0442dcca4f1dcc992fddfe50511` (worktree start `032f00700`). Live Kubernetes and providers NOT RUN. Prerequisite: DO03 integrated; satisfied. No sibling prerequisite.

[Program](../../../../../designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md) · [TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [PROOF](PROOF.md).

## Cursor first-screen brief

> Current-source map: SOURCE-MAP.md; frozen snapshot. Governing technical owner: `docs/technical/platform/topology.md#code-organization` (must be reconciled by ChatGPT at promotion). Known trap: do not add an inverse dependency or old-package alias. Scope: exact source migration and tests, no behavior change. Route: TASKS.md, one T-ID at a time, parent joins.

**Parallel execution authority (2026-11-24):** [coordination and join rules](../../../../../designs/open/code-architecture-health/DO-PARALLEL-EXECUTION.md). This replaces any earlier serial program or generic post-Documents gate. Each Change has its own isolated linked worktree and branch; one child at a time within each parent. DO04 parent is the integration custodian for wave B. Other parents deliver locally accepted branch receipts to that custodian, do not independently push the undertaking, and do not require another human approval for a safe serialized join. Shared files are edited in isolated branches by owned import/key only; merge against the latest integration base, regenerate lockfile from merged manifests, rerun required proof. Do not overwrite siblings' edits. Local worktree/dirty-path and branch guard checks remain mandatory.

**Dependency correction:** no wait on DO02 or DO05. Recheck mapped source at DO03 join, especially residual game-authority.ts now importing respondToStorySchema from story-interface.

**Wave B exact implementation addendum:** DO03 is integrated; game-authority.ts already imports respondToStorySchema from @offscreen/story-interface/stories. Move all four modules and tests intact; new protocol manifest runtime deps story-interface and zod only. In module-graph.mjs classifySpecifier, after resolved export check and before runtime-only restrictions, reject any production import (including type-only) targeting @offscreen/game-authority-protocol unless owner.name is @offscreen/api, @offscreen/game-authority or @offscreen/worker (same-package exempt); code forbidden-private-authority-protocol. Test consumers remain governed by normal manifest rules. Add synthetic buildModuleGraph tests using packageRecord with declared deps and exported ./game-authority: web and workflows runtime/type-only rejected, API runtime accepted. In eslint.config.mjs add private protocol ban to webBackendPatterns and a final restricted-import block for packages/workflows/src, preserving existing rules (merge patterns, not override). Graph is authoritative for all other production owners. DO04 owns those private protocol edits; DO05 owns only the exact residual evaluation exception in eslint and graph described below. Preserve all four old tests including owner override, body size, canonical money and hash checks. No changes to actual private HTTP authorization or dispatch.

## Outcome and exact scope

Private Game Authority protocol workspace owns the Nest seam and Worker custody wire. Four files move together so all internal `./game-authority` references keep one schema identity. Depend on story-interface only for respondToStorySchema; no reverse imports. `node:crypto` and `node:buffer` stay in server-only package. Preserve route helpers, body-byte limits, headers, private response/status/error schemas, canonical microusd, hash and identity functions byte-for-byte. No browser/Temporal deterministic workflow runtime import; enforce private import restrictions in module-graph + eslint, permit API, Authority, Worker and actual integration test consumers only. Existing protocol tests move unchanged. No changes to custody persistence, dispatch authority, spend, retry or provider transport.

## Execution rules (all stages)
- Integration target `undertaking/storyteller-workshop`; original source map snapshot `ed0837d0531be4050b40d9b2485b5759ef479fea`, refreshed baseline `372df9646108f0442dcca4f1dcc992fddfe50511`. Owner released this Change; no further planner approval required for scope.
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

Start T01 after local branch/worktree checks, finish this Change and join through DO04 custodian; no next-stage authorization.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
|---|---|---|---|---|---|---|
| Product player/staff/spend behavior | product docs | unchanged because validators, hashes, limits and routes were moved without behavior edits | four protocol sources renamed with zero body diff | source-only | existing negative schema/hash tests 18/18 | N/A |
| Private Game Authority protocol ownership | docs/technical/platform/topology.md#code-organization | changed: seam and custody wire live in `@offscreen/game-authority-protocol` | packages/game-authority-protocol plus api, worker, game-authority, api-integration importers | source-only; relocated tests 18/18; module-graph tests 27/27; turbo build/typecheck 44/44 | old protocol subpaths removed from contracts; synthetic web/workflows imports rejected as forbidden-private-authority-protocol | catalog, parallel plan, undertaking note |
| Full-repo module graph | scripts/repo-tools/module-graph.mjs | unchanged baseline failures | pre-existing forbidden-authority-writer-import and unresolved-relative warnings | recorded, not introduced by this move | no new private-protocol production edge in allowed owners | N/A |
