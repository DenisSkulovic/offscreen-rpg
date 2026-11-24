# CACHE04 | Story snapshot migration

**Status: In progress / source-only landed; SQL acceptance open. Kind: implementation. Profile: CONTRACT.** Source baseline 7e2b554fbaaede28cbdbbf536c44c44a9ac511e5; release baseline f26ce36dcee1bda6e9eee4d305ec6200ef924b44. Target undertaking/storyteller-workshop. Prerequisite: joined CACHE02/CACHE03/CACHE05 plus wave-2 dependency wiring; no overlapping Story Engine reads owner (lane A). Owner commissioned the entire finite CACHE batch on 2026-11-24. No additional owner commission is needed after dependency and readiness gates pass.

[Selected architecture](../../../../docs/technical/platform/persistence-and-caching.md) · [TASKS](TASKS.md) · [Frozen interfaces and parallel ownership](../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md)

## Cursor first-screen brief

After the dependency/export/ownership gates in CACHE-PARALLEL.md pass on latest undertaking HEAD, parent creates separate linked worktree and change branch; run node scripts/repo-tools/change-branch-guard.mjs --change CACHE04 --target undertaking/storyteller-workshop. Dispatch T01 then remaining tasks sequentially. Only the eight named CACHE Changes are commissioned; follow the assigned lane and barriers, no unrelated successor. During parallel waves, return accepted branch SHA and proof to the CACHE02 parent as integration custodian; custodian owns shared exports/manifests, squash join and closure.

## Planner source map and scope

Anchors: packages/story-engine/src/stories/reads.ts:createStoryReads/snapshotIdentity/builtIdentity; packages/story-engine/src/stories/read-cache-options.ts; apps/api/src/app.ts; apps/api/src/main.ts; tools/api-integration/test/stories-core.integration.ts. Old adapter uses get/set JSON, Promise.race, disabled reconnect. DO01 owns port relocation. Story Engine owns SQL preflight and repeatable-read built identity; lexical reuse and immutable Documents bytes remain domain-owned. Canonical architecture defines algorithms, policy, authority and failure invariants. Exclusive write scope: Story reads/options, API composition (main.ts and app.ts) and named tests only; shared dependencies prepared at wave-1 join; no route/schema change.

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

Owner release is conditional, not blanket readiness certification. Parent verifies exact predecessor exports and source anchors against latest integrated HEAD; mechanical drift is allowed, contract/fixture/design contradictions stop for planner. No additional release message needed when gates pass. Live resource permission remains separate. Parallel wave ownership is mandatory; do not edit another lane, core contracts, shared manifests/lockfile or shared documentation. The named integration custodian alone serializes joins, exports, dependency wiring and shared reconciliation; no independent push to undertaking while peers are active. See frozen interface/ownership contract. Stop on changed authority/identity, missing harness or source contradiction; return exact evidence to planner. No live stack for unit tests. Follow AGENTS, parent integration/archive policy.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| Story snapshot cache | persistence-and-caching Current state | Versioned bindCache on byte store; SQL proof still open | reads.ts, read-cache-options.ts, api main/app; joined 83746d67 | source-only PASS; stories-core NOT-RUN | read-snapshot-cache.test.ts 6/6 (malformed, failure, revision, disabled, owner-order contract) | Current state updated; packet stays open |
