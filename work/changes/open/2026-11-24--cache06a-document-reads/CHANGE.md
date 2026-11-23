# CACHE06A | Immutable document read decorator

**Status: Proposed / not commissioned. Kind: implementation. Profile: CONTRACT.** Source baseline 7e2b554fbaaede28cbdbbf536c44c44a9ac511e5; live planning parent 9d753b2cc2b9168b3144c4d0e0a5219e3d481693. Target undertaking/storyteller-workshop. Prerequisite: CACHE05; LIB05 integrated at f6a796f4; refresh after earlier cache changes. Owner-selected near-term open work, not execution permission.

[Selected architecture](../../../../docs/technical/platform/persistence-and-caching.md) · [TASKS](TASKS.md)

## Cursor first-screen brief

After ChatGPT confirms predecessor integration and current-source readiness, parent creates separate linked worktree and change branch; run node scripts/repo-tools/change-branch-guard.mjs --change CACHE06A --target undertaking/storyteller-workshop. Dispatch T01 then remaining tasks sequentially. No next Change authorization.

## Planner source map and scope

Anchors: packages/documents/src/s3-store.ts: S3DocumentStore.readValidated/readRaw/putValidated; packages/documents/src/local-store.ts: LocalDocumentStore.readValidated/putValidated; packages/object-storage/src/object-storage.ts: ObjectStorage.get(key,maxBytes)/putIfAbsent/exists; packages/object-storage/test/object-storage.test.mjs. Old adapter uses get/set JSON, Promise.race, disabled reconnect. DO01 owns port relocation. Story Engine owns SQL preflight and repeatable-read built identity; lexical reuse and immutable Documents bytes remain domain-owned. Canonical architecture defines algorithms, policy, authority and failure invariants. Exclusive write scope: Documents owns hash/schema-aware decorator with explicit eligible read seam, not blanket ObjectStorage.get wrapper. Preserve S3 readRaw for putValidated verification and local direct get. No navigation/trie migration.

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

G0 branch and selected authority established; G1–G7 not certified on future source. ChatGPT must refresh predecessor source, exact task/fixture commands and readiness before Ready. Serial ownership deliberately avoids Documents/Contracts overlap. Stop on changed authority/identity, missing harness or source contradiction; return exact evidence to planner. No live stack for unit tests. Follow AGENTS, parent integration/archive policy.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| Pending closure | persistence-and-caching | Immutable document read decorator | pending | NOT-RUN | TASKS | pending |
