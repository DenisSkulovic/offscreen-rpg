# DO06 | lab ownership

**Status: Owner-commissioned / Ready after prerequisites. Kind: implementation. Profile: CONTRACT.** Baseline `032f00700eb13cad0d3115d9f5d91c5f16feeb10`. Integration target `undertaking/storyteller-workshop`. Prerequisite: DO03 already integrated; DO05 must be integrated on the undertaking and its creative-exploration export available. DO04 is not a prerequisite.

[Program](../../../designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md) · [TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [PROOF](PROOF.md).

## Cursor first-screen brief

> Current-source map: SOURCE-MAP.md; frozen snapshot. Governing technical owner: `docs/technical/platform/topology.md#code-organization` (selected and ratified; reconcile realized claims at closure). Known trap: do not add an inverse dependency or old-package alias. Scope: exact source migration and tests, no behavior change. Route: TASKS.md, one T-ID at a time, parent joins.

**Parallel execution authority (2026-11-24):** [coordination and join rules](../../../designs/open/code-architecture-health/DO-PARALLEL-EXECUTION.md). This replaces any earlier serial program or generic post-Documents gate. Each Change has its own isolated linked worktree and branch; one child at a time within each parent. DO04 parent is the wave B integration custodian while wave B remains active. Coordinate any DO06 join with that custodian; after wave B is fully joined, the sole remaining commissioned parent owns its own join. DO07 begins only after all extraction joins. Other parents deliver locally accepted branch receipts to that custodian, do not independently push the undertaking, and do not require another human approval for a safe serialized join. Shared files are edited in isolated branches by owned import/key only; merge against the latest integration base, regenerate lockfile from merged manifests, rerun required proof. Do not overwrite siblings' edits. Local worktree/dirty-path and branch guard checks remain mandatory.

**Dependency correction:** wait for DO03 and DO05; DO04 is independent. Do not claim residual contracts workspace is empty if DO04 remains unjoined; remove only DO06-owned exports/files and leave any DO04 modules intact.

**Conditional admission:** DO03 already integrated; DO05 must be integrated on the undertaking and its creative-exploration export available. DO04 is not a prerequisite. Commission granted now; execution remains gated by source reality, not by another approval message. No new architectural decisions delegated. Current chamber.ts already imports story-interface campaign/interactions/stories and owns startChamberSchema; its controller and test already import it from chamber. Move that declaration with chamber, unchanged. After DO05, use its exact @offscreen/storyteller/context/creative-exploration subpath. DO06 may leave DO04 modules in residual contracts if DO04 has not joined. Retain old closure assertion until final retirement.

## Outcome and exact scope

Only Chamber and QA wire schemas go into browser-safe `lab-interface`; move startChamberSchema from residual chamber.ts with that module. Lab-specific implementation is not a Web dependency. Four evaluation modules move under lab-support/src/interfaces; relative imports rewritten, including creative-exploration-evaluation -> storyteller/context/creative-exploration. Only live-evaluation is externally consumed (tools/chamber); expose exact subpath, retain existing package wildcard for unrelated paths, no new umbrella. Existing chamber-lab tests move to src/interfaces and run emitted path; Chamber tests use same canonical startChamberSchema. Worker currently imports lab-support intentionally; do not change existing lab admission or Worker closure. API and Authority production closure must omit lab-support and lab-interface unless actual post-Documents existing authorized dependency proves otherwise; Web existing lab-interface usage remains as before, no production implementation dependency. At end DO06-owned old modules are gone. Other outstanding DO04 modules may remain until its join. DO07 owns final workspace deletion.

## Execution rules (all stages)
- Integration target `undertaking/storyteller-workshop`; original source map snapshot `ed0837d0531be4050b40d9b2485b5759ef479fea`, refreshed baseline `032f00700eb13cad0d3115d9f5d91c5f16feeb10`. Owner has commissioned this Change conditionally. Before edits, fetch the latest undertaking and verify the stated predecessor acceptance/archival receipts and expected source/export postconditions. If satisfied, start without another ChatGPT release or approval. Record actual starting HEAD and narrow mechanical anchor refresh. If a genuine architecture/source contradiction remains, report the exact mismatch; do not redesign.
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

After actual prerequisites land and the narrow preflight passes, execute T01 and remaining tasks without further commission or planner refresh. Do not start implementation before the gate is satisfied. DO06 and DO07 are individually owner-commissioned; a parent executes only its assigned Change.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
|---|---|---|---|---|---|---|
| To fill at close for every impacted claim | technical/product | pending | pending | not executed | pending | pending |
