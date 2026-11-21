# MA08 | Extract real Application owners; eliminate the production facade

**State: Done (2026-11-21).** Lab, drafts, outbox relay, and runtime logging have real owners. Production apps and tools no longer import `@offscreen/application`. The package remains a test-only compatibility build with 112 test files until MA10. Not on `main`. Integration branch `undertaking/storyteller-workshop`, inspected source baseline `e122d080`, MA07 integration `4168db589eff302dab176e532d53db0425cd853c`. **This packet supersedes the broad MA08 candidate in the architecture audit; it does not delete the 112-file test suite.** Run branch guard against current undertaking HEAD; targeted source drift from MA07 is expected and approved. No DB migration, provider request, deployed service, protected environment or new policy.

## Selected end-state and ownership

- Move complete `packages/application/src/developer-tools/**` to a **new, deliberately outermost** `packages/lab-support/src/**` (`@offscreen/lab-support`). Its `./` root exports replace `@offscreen/application/developer-tools`; its internal relative imports to former Application forwarding files become direct `@offscreen/story-engine` imports. The lab is available to API's explicitly developer-gated routes and CLI/tests only; production engine/admin does not depend on lab.
- Move real `packages/application/src/drafts/index.ts` to `packages/story-engine/src/drafts/index.ts` and expose `@offscreen/story-engine/drafts`; drafts are persistent pre-story authoring data, not developer fixtures. Preserve schema, owner predicates, revision/conflict behavior.
- Move lease-and-ack logic `packages/application/src/outbox/index.ts` to **`packages/db/src/outbox-relay.ts`**, exporting `createOutbox` under `@offscreen/db/outbox-relay`; existing `@offscreen/db/outbox` enqueue/types remain unchanged. The worker uses DB relay directly. Preserve 30-second lease, SKIP LOCKED ordering and lease-token ack fence.
- Move `packages/application/src/runtime-logging/index.ts` to **`packages/runtime-logging/src/index.ts`** (`@offscreen/runtime-logging`), intentionally a small, precise host-neutral operations package, rather than putting stderr side effects in pure Contracts. Preserve fixed-field JSON safe logging and error classification.
- Migrate `@offscreen/application/cache` consumers directly to `@offscreen/contracts/read-cache` (the already selected port); `@offscreen/application/admin` to `@offscreen/admin`.
- Retain `@offscreen/application` temporarily as a **test-only legacy compatibility build**, with its forwarder source and 112 existing test files until MA10 retires it after all regression consumers are converted. **No production app/tool source may import Application after this Change;** Application must be absent from production app and tool manifests. Its legacy tests and intentional graph-test fixtures are excepted only. Do not make the package itself disappear while its tests need `dist`.

**Why this cut:** One meaningful migration gets every surviving real implementation out of Application without making Cursor relitigate 112 tests or silently discarding evidence. The subsequent MA10 will retire the test facade and enforce its removal after callers are covered. Deliberate temporary compatibility is documented debt, not a claim of 100% retirement.

## Required joined acceptance

Changed workspace `build` and `typecheck` pass, changed API/Worker/GA and two tools build, lab and test consumers resolve NodeNext exports, no runtime import cycle, integration/chamber developer auth gates unchanged, outbox lease negative tests, drafts owner/revision tests, harmless logging records, `pnpm repo:module-graph` plus focused graph tests; report pre-existing baseline failures honestly. Test-only Application remains compiled. Source guard ensures no App production/tool imports. Existing developer paths remain gated; no live evaluation/external model requests, no sandbox reset. Update package references, catalog and ledger after proof; archive, squash-integrate to undertaking and retire worktree.

Read [source map](SOURCE-MAP.md), [decided edits](EXECUTION.md), [bounded tasks](TASKS.md), [proof](PROOF.md). Parent executes whole Change T01–T05, not sibling MA09 or MA10.

## Affected-claim reconciliation

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Lab ownership | changed: `@offscreen/lab-support` owns developer tools; Story Engine does not depend on lab | `packages/lab-support/src` | `pnpm --filter @offscreen/lab-support build` PASS | no `@offscreen/application` import under lab-support; no lab-support dependency on story-engine manifest | technical lab links retargeted |
| Drafts | changed owner, same predicates | `packages/story-engine/src/drafts/index.ts` | story-engine build PASS; wrong-owner `DraftError('not_found')` PASS on disposable DB | cross-owner read denied | N/A |
| Outbox lease | changed owner, same SQL | `packages/db/src/outbox-relay.ts` | db build PASS; wrong `leaseId` leaves row undelivered PASS | ack fence kept; no migration | N/A |
| Runtime log | changed package, verbatim fields | `packages/runtime-logging/src/index.ts` | runtime-logging build PASS | spread still emits extra runtime keys; TypeScript whitelist only; not a new strip | N/A |
| Production imports | changed: apps and tools import new owners | apps and tools manifests | api, chamber, api-integration typecheck PASS | production-import ratchet 18/18; Application absent from host/tool manifests | N/A |
| Legacy tests | unchanged: 112 files remain | `packages/application/test` | application build PASS; 112 files counted | no claim the package is removed | N/A |

`pnpm repo:module-graph` still FAIL on the pre-existing undeclared imports `apps/api/src/app.ts` `@offscreen/game-authority/application` and `apps/game-authority/src/launch-put.ts` `@offscreen/storyteller/tasks`. Same two errors on base `ae312c863`. Worker generation-evidence typecheck remains the known baseline failure and was not rerun as a pass.
