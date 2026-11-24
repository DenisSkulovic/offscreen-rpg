# CACHE01 | Typed cache foundation

**Status: Done (2026-11-24). Kind: implementation. Profile: PATCH.** Source baseline 7e2b554fbaaede28cbdbbf536c44c44a9ac511e5; release baseline f26ce36dcee1bda6e9eee4d305ec6200ef924b44. Target undertaking/storyteller-workshop. Prerequisite: DO01–DO07 and LIB05–LIB07 integrated (verified at release baseline); freezes core interfaces for wave 1. Foundation parent owns its single join. Owner commissioned the entire finite CACHE batch on 2026-11-24. No additional owner commission is needed after dependency and readiness gates pass.

[Selected architecture](../../../../../docs/technical/platform/persistence-and-caching.md) · [TASKS](TASKS.md) · [Frozen interfaces and parallel ownership](../../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md)

## Cursor first-screen brief

After the dependency/export/ownership gates in CACHE-PARALLEL.md pass on latest undertaking HEAD, parent creates separate linked worktree and change branch; run node scripts/repo-tools/change-branch-guard.mjs --change CACHE01 --target undertaking/storyteller-workshop. Dispatch T01 then remaining tasks sequentially. Only the eight named CACHE Changes are commissioned; follow the assigned lane and barriers, no unrelated successor. During parallel waves, return accepted branch SHA and proof to the CACHE02 parent as integration custodian; custodian owns shared exports/manifests, squash join and closure.

## Planner source map and scope

Anchors: packages/cache/src/index.ts; packages/cache/package.json; packages/cache/tsconfig.json; post-DO01 cache-port. Old adapter uses get/set JSON, Promise.race, disabled reconnect. DO01 owns port relocation. Story Engine owns SQL preflight and repeatable-read built identity; lexical reuse and immutable Documents bytes remain domain-owned. Canonical architecture defines algorithms, policy, authority and failure invariants. Exclusive write scope: Cache package only. Freeze the selected core contract and core/codecs exports in CACHE-PARALLEL.md; preserve root legacy adapter. This is the only foundation barrier. No API/story edits or network.

## Acceptance

Every task positive and diagnostic negative passes; actual emitted tests run; root pnpm repo:module-graph and affected build/typecheck; changed-file quality/format reviewed. Record baseline failures without masking. No paid provider, destructive actions or unauthorized SQL/cluster. Source-only is not distributed acceptance. Missing fixture is NOT-RUN and keeps acceptance open.

## planned-impact.v1

| Plane | Disposition | Evidence |
| --- | --- | --- |
| Product | Unchanged: no game, authorization or spend change | Existing behavior and negatives |
| Technical | Realize persistence-and-caching contract; update Current state only as proven | Source and receipt |
| Code | Stage files/tests in TASKS | Focused normal/negative |
| Related | Package README, graph, catalog/status and links reconciled at closure | Parent join |

## Readiness and stop

Post-DO07 source checked: cache-port exists, Contracts workspace absent, Cache imports cache-port, src-root TypeScript output and existing legacy adapter confirmed. Foundation T01 may start after local worktree/branch guard. No runtime fixture required. T01 uses build; T02 adds test script and runs all emitted cache tests. Parallel wave ownership is mandatory; do not edit another lane, core contracts, shared manifests/lockfile or shared documentation. The named integration custodian alone serializes joins, exports, dependency wiring and shared reconciliation; no independent push to undertaking while peers are active. See frozen interface/ownership contract. Stop on changed authority/identity, missing harness or source contradiction; return exact evidence to planner. No live stack for unit tests. Follow AGENTS, parent integration/archive policy.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| Typed cache core and codecs | docs/technical/platform/persistence-and-caching.md Current state | Foundation interfaces exist beside the legacy adapter | packages/cache/src/core, codecs; SHA at integration | source-tested: `pnpm --filter @offscreen/cache test` 14/14 | bad keys, invalid policy, malformed JSON, oversize skip, disabled bypass | package README and catalog updated |
| Game, authorization, spend | product docs | unchanged because no player or permission behavior moved | legacy packages/cache/src/index.ts preserved | source-inspected | no product page edit | N/A |
| Redis runtime, strategies, memory, consumers | CACHE-PARALLEL.md | unchanged because those lanes start after this SHA | not implemented here | NOT the claim of this Change | no Redis process | contract left in place |
