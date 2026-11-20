# BOOT03 | start-route forensic source map

**Profile:** CONTRACT/STATE. **Inspected:** `584b594` lean main snapshot on 2026-11-19. Source observation only; not a deployed-HTTP or database test. This is background for the [BOOT03 route card](CHANGE.md); Cursor should not preload the whole file.

## Source truth: supported start is not an imported package insert

- **Public request:** `apps/api/src/modules/stories/controller.ts:StoriesController.startFromCandidate` accepts `PUT :id/start`, parses `packages/contracts/src/stories.ts:startStorySchema` and calls **local** `this.stories.startFromCandidate` at baseline. Distributed mode's `StorySeam` in `apps/api/src/modules/stories/game-authority-client.ts` has only `read` and `admitResolution`; BOOT03 must extend it with `start`.
- **Current destination:** `packages/application/src/stories/index.ts` calls `createStoryStart(...)` in `stories/start.ts`. Preserve its domain function and reuse it behind GA; do not rewrite the validation into the HTTP handler.
- **Canonical preflight:** `createStoryStart` validates ID and `expectedDraftRevision`, start/world/rule manifest identity, optional executable obligations and source references, then stages `stageStoryBootstrapDocuments` and `instantiateStartPackage` on the selected DocumentStore. If supported, it stages the **opening scene checkpoint object before the SQL transaction**.
- **Commit:** in one SQL transaction it locks/checks the candidate and draft, calls `startStorytellerCandidate` or `initializeStoryInTransaction`, and inserts the staged opening scene selector where eligible. It cannot have S3 and SQL as two independent commit authorities. A staged object with failed SQL remains unreachable.
- **Retry:** existing passage/root and campaign settings are checked against the same requested pins. Idempotence applies to the same story/candidate/settings, not permission to change source roots on retry.
- **GA:** `apps/game-authority/src/{server,application,bootstrap/main}.ts` currently implements private read and resolution. `server.ts:routeFor` has no start route. The private bearer/actor checks and body-size bound already exist and should be reused/extended, not duplicated.
- **Storage:** `apps/game-authority/src/bootstrap/main.ts` calls `createDocumentStoreFromEnv` and ensures an S3 bucket when appropriate. Configure the **same real S3** root as importer/reader for Kubernetes. Never mount the source directory into running game Pods.
- **BOOT02 handoff:** Exact lab store path, manifest list, and pinned world/rule/start roots are [Kubernetes content bootstrap — Integration handoff (BOOT03, TURN02)](../../../../docs/runbooks/kubernetes-content-bootstrap.md#integration-handoff-boot03-turn02). BOOT02 already proved a second Pod can read those roots after the importer Pod is gone (2026-11-19 receipt; not a story start). BOOT03 must still create a succeeded Storyteller-kind opening candidate and call `startFromCandidate`; the importer does neither.

## Most easily missed discriminator: what 'scripted opening' means

`packages/application/src/stories/start.ts` explicitly does:

```ts
if (requestedCampaignOptions.startPackage) {
  throw new StoryError('invalid', 'start_package_requires_storyteller');
}
```

in the **non-Storyteller candidate** branch. Therefore a raw `opening.playable.scripted.v1` candidate **cannot** be used with the pinned `startPackage` path. A start package is not itself a generation candidate either.

The working source-backed **provider-free** route is instead the `storyteller.profiled.v1` **opening candidate with `execution.mode=scripted`**. `tools/api-integration/test/storyteller-imported-start.integration.ts:checkImportedStart` demonstrates the exact shape:

1. Import rule package and a source start package into a document store.
2. Save an owned draft, profile and revision 1.
3. Call `createScriptedOpenings(..., offlineExecution, ..., {documentStore}).request(..., 'microbe.v3', startReference)`. This creates a **Storyteller-kind generation**, not the older raw playable-scripted generation.
4. Settle it with `runtime.complete(generationId)`; it becomes a succeeded **Storyteller opening candidate** under the same start reference.
5. Call `storiesWithDocuments.startFromCandidate({ownerId,storyId,candidateId,expectedDraftRevision:1,campaign:{...startPackage:startReference}})`.
6. Verify immutable root, committed start/reference documents and exactly one namespaced obligation across retries. The test uses `LocalDocumentStore`, **not** live S3, Gateway or separate GA.

**Decision:** BOOT03 and TURN03's golden campaign use this proven *Storyteller-kind, offline scripted candidate* for a pinned start package. If the POC needs to demonstrate the simpler legacy playable-scripted candidate, run it **without** `startPackage` as a separate negative/compatibility case. Do not weaken the existing source guard to make a fixture convenient.

## Smallest plausible code ownership

| Existing file | Intended bounded change |
| --- | --- |
| `packages/contracts/src/stories.ts` plus existing internal GA contracts | Request/response for start, reuse current `startStorySchema`; **no** new browser-facing public start format |
| `apps/api/src/modules/stories/game-authority-client.ts` | Extend `StorySeam` with `startFromCandidate`; remote call includes trusted actor/service identity and bounded timeout |
| `apps/api/src/modules/stories/controller.ts` | Route `PUT :id/start` to `this.seam` in distributed mode; do not call `this.stories` there |
| `apps/game-authority/src/{application,server}.ts` | Private start route and one call to existing `createStoryApplication.startFromCandidate` |
| `packages/application/src/stories/{start,initialization,scene-checkpoint}.ts` | No domain edit expected if tests pass; investigate only a demonstrated transacting/staging bug |
| `apps/game-authority/test/story-seam.test.ts` and `tools/api-integration/test/{story-start,storyteller-imported-start}.integration.ts` | Remote route, wrong actor, retry, wrong package/root, fallback/local preservation |
| `docs/technical/platform/{topology,data-and-persistence}.md` and relevant creation/start technical owner | Reconcile exact moved boundary, not aspirational microservice completion |

## Negative checklist and stop conditions

- Wrong actor or service token does not start; GA service is not exposed by Gateway.
- No candidate, wrong generation kind, stale draft, wrong `task.source.startPackage` or unexpected world/rule hash: no first scene and no checkpoint selector.
- Start package alone and raw playable-scripted candidate **with a startPackage** fail by existing rule.
- Two identical PUTs return same first scene/root/checkpoint; conflicting pins or story owner fail. A timeout must be checked by the existing story state before any **new** retry identity.
- S3 unavailable or a staged object's content/hash mismatch fails closed before DB commit; SQL failure leaves no reachable selector.
- Distributed mode never silently falls back to Nest SQL writer when GA is unavailable. Compose explicitly retains old direct behavior.
- Checkpoint becomes current only as part of committed scene and root state. Do not pretend provider-free local test proves cross-Pod S3 or cold kind.

**Source-staleness rule:** first compare just `start.ts`, `startStorytellerCandidate`, the controller and GA route against `584b594`. Only widen investigation on a substantive change or failing negative test. The planner has already mapped the broad route.
