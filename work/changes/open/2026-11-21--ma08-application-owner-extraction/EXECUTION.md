# MA08 | decided ordered implementation, failure contracts

## A. Lab extraction

Copy/move entire `developer-tools` tree to `packages/lab-support/src`, including `lab/**` and `qa-catalog/**`, without rewriting algorithms. Preserve its `index.ts` exports and `ChamberStorytellerControl` types. Replace old `../stories,` `../campaign,` `../storyteller` relative imports with exports from `@offscreen/story-engine/{stories,campaign,storyteller}` or narrow public deep paths already available; where nested fixture path is not exported, introduce one exact lab-required export or move the read-only fixture ownership to lab, and document its production isolation. New lab workspace imports Story Engine; Story Engine cannot import lab. The API's developer-only composition keeps the same explicit gate. `createChamber` continues supplying `chamberAllowsResponse` only for fixtures and cannot elevate normal story user permissions.

### Required test-only deep facade preservation

The original 112 Application tests import actual compiled paths, not only public package subpaths. After migrating real lab code, create one-line `packages/application/src/developer-tools/index.ts` **and deep** reexports from `@offscreen/lab-support` for these exact legacy test paths (and only other direct paths verified by the same regex): `usage-profiles`, `lab/fixture-specimens`, `chamber-lab-catalog`, `long-story-memory-corpus`, `memory-evaluator`, `evidence-packing-evaluator`, `creative-exploration-evaluator`, `live-evaluation`, `storyteller-control`, `playability-harness`, `live-comparison`. Preserve `application/src/{drafts,outbox,runtime-logging}/index.ts` as precise reexports from new owners, and `application/admin` test deep forwarders. **Never leave Application's build broken by moving source but forgetting test-relative dist.** Use direct lab nested exports where necessary. Remove these remaining test-only shims in MA10 once 112 test files have been migrated.

## B. Actual service owners

Move drafts exact service code, changing only imports needed for new location; retain `DraftError`, `createDrafts`, `Drafts` and database owner predicate. Move outbox lease service into DB under `./outbox-relay`, retaining `Notice`, `enqueue`, `Transaction` exports in original `db/outbox`. Preserve 30 second SQL clock lease, `FOR UPDATE SKIP LOCKED` and `leaseId` acknowledgment predicate. Move logger pure source verbatim into small runtime-logging workspace; preserve immutable safe field schema and direct stderr default, no raw Errors or secrets. No DB, API or retry contract modification.

## C. Production migration and compatibility

Migrate all literal `@offscreen/application/{developer-tools,drafts,outbox,runtime-logging,cache,admin}` source imports to new owner as in SOURCE-MAP, including test/tools scripts where touched. For imports of `Notice` and `Transaction` previously reexported from `application/outbox`, import from `@offscreen/db/outbox`; for `createOutbox` from `@offscreen/db/outbox-relay`. Update manifests for actual runtime imports. Retain old Application exports/forwarders to keep 112 legacy tests until MA10. Remove Application dependency **only** from production host/tool manifests after every runtime source import has migrated; ensure TypeScript NodeNext resolves old built files within the legacy test-only package. `pnpm install --lockfile-only` from root as allowed (no package downloads / network if lockfile can be updated offline), otherwise a focused `pnpm install --offline --lockfile-only`; on unavailable offline metadata, report rather than fake a lockfile.

## D. Guard and validation

Prefer existing `scripts/repo-tools/module-graph.mjs` AST source scanner to add a **scoped production-import ban** on `@offscreen/application` in `apps/**/src`, `tools/**/src`, `scripts/repo-tools/*.mjs` runtime entrypoints while excluding intentional synthetic fixture unit tests; not a blanket ban on test/legacy package imports yet. Inject one temporary forbidden import into disposable fixture under test harness and assert nonzero check, then remove; comments should not fail. Build/typecheck new and modified workspaces; run relevant existing draft/outbox/story permission and chamber tests. Baseline worker generation-evidence and module-graph failures from MA07 receipt remain clearly NOT PASS if still present; don't weaken tests to make a chart green.

## Exit and rollback

Only one parent owns package manifests/lockfile, integration ledgers and archive. Execute T01–T05 serial to avoid compiler/build races. No destructive branch operation. If a lab internal dependency requires an unbounded cross-package public export or imports lab from core, **STOP for ChatGPT** with exact paths; do not create a hidden dependency cycle. Maintain old Application test fixture exports through closure, marking eventual complete package retirement to MA10.
