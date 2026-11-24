# CACHE07 | Distributed reliability evidence

**Status: Source harness implemented; live execution NOT-RUN and still owner-gated. Kind: implementation. Profile: PROOF. Not Done.** Current baseline c0d3c283e60e1c06d627f9a9b96603f7294d5202; target undertaking/storyteller-workshop. Wave 2 source joined. [Exact fixture and commands](PLAN.md). No further commission needed for source. Actual local disposable Docker Redis run requires explicit owner permission; CACHE04 SQL proof remains independent.

[Selected architecture](../../../../docs/technical/platform/persistence-and-caching.md) · [TASKS](TASKS.md) · [Frozen interfaces and parallel ownership](../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md)

## Cursor first-screen brief

After the dependency/export/ownership gates in CACHE-PARALLEL.md pass on latest undertaking HEAD, parent creates separate linked worktree and change branch; run node scripts/repo-tools/change-branch-guard.mjs --change CACHE07 --target undertaking/storyteller-workshop. Dispatch T01 then remaining tasks sequentially. Only the eight named CACHE Changes are commissioned; follow the assigned lane and barriers, no unrelated successor. During parallel waves, return accepted branch SHA and proof to the CACHE02 parent as integration custodian; custodian owns shared exports/manifests, squash join and closure.

## Planner source map and scope

Anchors: infra/kubernetes/lab/redis/redis.yaml; work/changes/open/2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md; packages/cache/src/adapters/redis-store.ts. Old adapter uses get/set JSON, Promise.race, disabled reconnect. DO01 owns port relocation. Story Engine owns SQL preflight and repeatable-read built identity; lexical reuse and immutable Documents bytes remain domain-owned. Canonical architecture defines algorithms, policy, authority and failure invariants. Exclusive write scope: new packages/cache/test/distributed files and proof/reconciliation; PLAN.md pins the new fixture and exact commands. Source implementation starts now. No full stack for unit tests.

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

Owner release is conditional, not blanket readiness certification. Parent verifies exact predecessor exports and source anchors against latest integrated HEAD; mechanical drift is allowed, contract/fixture/design contradictions stop for planner. No additional release message needed when gates pass. Live resource permission remains separate. Parallel wave ownership is mandatory; do not edit another lane, core contracts, shared manifests/lockfile or shared documentation. The named integration custodian alone serializes joins, exports, dependency wiring and shared reconciliation; no independent push to undertaking while peers are active. See frozen interface/ownership contract. Stop on changed authority/identity or actual source contradiction; absence of new harness is the implementation task, not a blocker; return exact evidence to planner. No live stack for unit tests. Follow AGENTS, parent integration/archive policy.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| Current state, CACHE07 distributed proof | docs/technical/platform/persistence-and-caching.md | Source harness exists; live Redis proof not claimed | packages/cache/test/distributed at change/cache07-distributed-proof | source-only; live NOT-RUN | harness.test.mjs refuses Docker without opt-in | README and PROOF.md |
