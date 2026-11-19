# D3 | Campaign bootstrap across Next, Nest, Game Authority and canonical storage

**Status:** proposed architecture 2026-11-19; not yet ratified/implemented on Kubernetes. Leads to [BOOT01](../../../changes/open/2026-11-19--boot01-ratify-campaign-bootstrap-contract/CHANGE.md). Source-checked against GitHub `main` during this pass. Preserve the existing two creation routes; choose *one deterministic fixture route* for the initial distributed acceptance only.

## The source matters: a start package is NOT an opening candidate

Current `PUT /api/stories/:id/start` contract (`apps/api/src/modules/stories/controller.ts`, `packages/contracts/src/stories.ts`) requires `candidateId`, `expectedDraftRevision` and optional `campaign` including a `startPackage` reference. `packages/application/src/stories/start.ts::createStoryStart` validates:
- the opening candidate is owned by the user, belongs to the current draft/revision, is in a succeeded state and has an accepted kind, or is the supported Storyteller opening kind;
- the selected start root's `startPackageId`, root hash, revision, world pins and rule reference;
- matching default ruleset and executable adapter, world mounts, package obligation schemas and stable remapped IDs;
- if a first passage already exists, its source and pinned world/rule/start references match the retry request;
- staged immutable passage/bootstrap documents are prepared through `stageStoryBootstrapDocuments` and optionally `instantiateStartPackage`, before `initializeStoryInTransaction` admits one story/passage/canon root.

**Therefore:** an authored start package is a content/rule/world seed and activation recipe, *not an alternative to a successful opening generation candidate*. Do **not** invent a new API bypass without an explicit product decision. The POC can use an existing provider-free scripted opening candidate generated through the current generation/draft pipeline and a pinned authored start package. Storyteller generation is exercised later on **continuation**, not needed for the initial first scene.

## D3 logical request / durable result

```text
browser/Next creation UI
  -> Nest authenticated draft + candidate generation request
  -> existing scripted/offline opening candidate (durable generation receipt)
  -> choose immutable author-supplied start package and rules/world pins
  -> PUT /api/stories/{storyId}/start {
       candidateId, expectedDraftRevision, campaign: { startPackage, mechanics, ... }
     }
  -> Nest verifies session/CSRF and calls private Game Authority
  -> GA validates candidate + draft association, exact package hashes,
     rules adapter, mounts and obligations
  -> GA stages scene-1 passage, selected rule/world/start references,
     canon manifest and applicable typed bootstrap docs in shared S3
  -> GA commits exactly one story, passage1, current game/campaign settings,
     validated initial item/character facts, root and DATA03 scene1 checkpoint
     in a SQL transaction, with stable receipt identity
  -> Nest owner-scoped GET returns published scene and viewVersion
  -> Next renders Living Book; later choice enters the distributed turn
```

The Game Authority is the sole writer; Nest doesn't keep a second `createStoryApplication` writer for `start` after cutover. Candidate creation/selection may stay in its existing Nest-facing façade if it is not the domain writer; any write-capable candidate admission must similarly route to its selected owner. Do not duplicate a candidate in the API's DB and a separate generation DB. For the POC, the service may share a physical PostgreSQL instance but must have one logical owner for each table/writer operation.

## Concrete POC fixture selection

- Use a **checked-in, verified authored start package** and pinned compatible rules subset. An existing sample lives under `content/starts/seyda-neen-prisoner/`; inspect licenses and fixture suitability before selecting. An authored harbor fixture from REAL01 is also available but may need a proper imported start-package descriptor. Do not manufacture a new game mechanic or license claim merely for integration.
- Candidate from existing `opening.playable.scripted.v1` type or supported offline Storyteller opening, not a forged raw `generation` success row and not an ad hoc direct insert.
- Start with one valid mechanical character/offer where selected, one no-inventory test variant. `campaignStartSchema` defaults `mechanics: false`; opt in deliberately if the fixture needs D&D-like mechanics. A start-package rule reference alone does not mean all SRD mechanics exist.
- First published passage is immutable content, and scene-1 checkpoint (DATA03) must have initial state and canon root. Later subscriptions/choices are separate workflows and do not silently run as part of an HTTP start.
- A start root can contain `initial-canon`, `private-possibility`, and `executable-obligation` activation intents. Honor visibility and only admit executable obligations through validation. This POC may choose a package with **no active obligations** to avoid unattended timers; still preserve the general contract.

## Deployment and content bootstrapping gap

The local code imports world/rule/start directories; a Kubernetes worker cannot assume every Pod has the local repo filesystem. Choose an **explicit admin/bootstrap Job** (or equivalent controlled command) that imports selected content once into shared S3-compatible storage, verifies hashes/pins, and creates a trusted fixture catalogue (or static root references) with stable versions. A repeat is idempotent, produces the same content digest, and never updates campaigns that already pinned older roots. Runtime app Pods receive *hash references*, not writable mounts of source content. Validate app startup handling of `OFFSCREEN_DEFAULT_RULE_SOURCE`; do not mount/import directories in every app replica or auto-import divergent source. Secret/endpoint config must match DATA05.

Package publication and first story admission have different lifecycles. Stage/import content separately, then grant a user-scoped, permissioned root reference for the start operation. Browser request never supplies a raw S3 key or arbitrary object body.

## Start integrity and retry semantics

- `storyId`, `candidateId`, `expectedDraftRevision`, `campaign` plus pins form an idempotent typed command bound to authenticated owner. The route currently uses `PUT` and story ID as stable target; preserve exact retry equivalence rather than silently changing API semantics.
- S3 staging before SQL can leave unreachable objects if SQL aborts; this is acceptable with retention-safe cleanup later. No visible scene exists before DB commit.
- A stale candidate, changed draft, mismatched rule adapter/root, missing S3 object, wrong owner, duplicate obligation ID or incompatible start package must refuse without publishing a partial story.
- Repeated exact start after lost response returns the existing first scene and same pins; materially different retry conflicts. No second scene-1 checkpoint, fork or paid operation.
- Start should not need RabbitMQ delivery merely because other operations use a broker. A synchronous bounded Game Authority admission is appropriate; downstream follow-on events may use an outbox after commit.
- A historical fork must not be implemented as `startFromCandidate` of a new campaign. Fork has its own reconstruct-as-of semantics via DATA04.

## POC-specific acceptance and non-goals

1. Import pinned sample world/rules/start package into a disposable S3 instance **once**; verify root hash and revision after restarting importer.
2. Generate/prepare supported scripted opening candidate via **actual existing candidate path**. Start campaign through real Nest→GA API, verify story root, passage-1 hash, appropriate typed character/items and exact checkpoint (when DATA03 lands).
3. Repeat same PUT after simulated response loss: existing story returned unchanged; changed `candidateId`/pin rejected.
4. Start second campaign from same immutable source library: distinct story/manifest identity, shared immutable source objects, no accidental cross-campaign writable data.
5. Pod restart of Nest and GA: same authorized owner-scoped scene GET, same hashes, no new first-scene generation.
6. Wrong owner, stale draft, missing objects, wrong rules adapter, illegal obligation, invalid visibility and forged candidate fail before publication.
7. No provider spend, customer billing, image generation, new economy, or end-to-end Storyteller turn claim in these bootstrap slices.

## Implementation sequence, safe concurrency

- **BOOT01:** ratify exact existing candidate/start rules and which service owns creation operations; docs-only.
- **BOOT02:** controlled package import/fixture pin bootstrap into shared object store, read-only source mounting only for trusted admin Job, deployment/runbook and digest proof. Can be developed with other K8S work; shared cluster operations serialized.
- **BOOT03:** migrate *one* private `startFromCandidate` route into Game Authority, preserving existing Nest API and retry semantics. Depends on DIST03 interface and BOOT01, and DATA03 for complete scene-1 checkpoint acceptance.
- **BOOT04:** connect browser creation to the real separated start path and add provider-free startup E2E fixture. Depends on BOOT02+03 and K8S11/Next integration. Integration with scripted opening and dataset packaging may proceed as read-only research beforehand.

**Still unsolved:** the precise selected author's fixture compatibility and the full model continuation proposal/canon editing return path. Those belong to a later Storyteller/turn integration design, not as a silent part of start.
