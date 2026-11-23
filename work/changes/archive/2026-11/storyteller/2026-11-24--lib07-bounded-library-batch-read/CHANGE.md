# LIB07 | Bounded batch reads for an already-authorized Story Library

**State: Done.** Source-only. Baseline and integration target: `undertaking/storyteller-workshop@f6a796f4b13632c5642558e795945fc7bf908028` after integrated LIB06 (`d52b38b9`). Planner gate passed: `open` calls `requireAccess()` on every invocation and keeps `not-authorized`, `stale-root`, `invalid-path`, `invalid-page`, `not-found`, and `corrupt-source`. The batch result copies the named citation fields. `kind`, `authority`, and `visibility` stay on `open` and are not copied onto an unavailable row. No Writer tool, Pod, Redis, SQL, or storage change.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| packages/story-engine/src/storyteller/library-batch-read.ts | Code | changed: new sequential batch helper over an existing pinned navigation | readLibraryDocumentsBatch on change/lib07-bounded-library-batch-read | source-only | Duplicate, ninth, and over-4096 requests perform zero authorize, manifest, and body reads. Revocation, corrupt-source, and stale-root abort the batch | packages/story-engine/README.md |
| tools/api-integration/test/library-batch-read.test.ts | Code | changed: injected v1 navigation proof | node --test tools/api-integration/dist/test/library-batch-read.test.js passed 7/7 | source-only | A private path and a missing path are both `{ status: unavailable, path }` with no other fields. Two 4096-character four-byte strings exceed 32 KiB and the third path is not opened | No Writer tool test was added |
| packages/story-engine/src/storyteller/library-navigation.ts | Code | unchanged because LIB07 must consume open and must not edit browse, find, or grants | open and requireAccess inspected at f6a796f4 | source-inspected | invalid-path is thrown by open before authorize | Writer tools were not edited |
| docs/product | Product | unchanged because no player-facing behavior, route, or story rule changed | No product page was edited | reviewed | A batch read is not a play action | work/QUEUE.md was not the selector |
| docs/technical | Technical | unchanged because no mission schema, SQL, or tool grant changed | writer-library-tools.ts was not edited | reviewed | Full story-engine tsc remains blocked by missing sibling package outputs and was not acceptance | The storyteller wildcard export was reused |

Receipt: the two library files typechecked together with strict NodeNext settings. `@offscreen/story-engine` full `tsc` was not acceptance because unrelated campaign and Writer files still lack sibling outputs. Changed-file ESLint quality passed. Focused tests 7/7. No database, cluster, or provider call.

## Decision
Provide a new provider-neutral `readLibraryDocumentsBatch` helper in `packages/story-engine/src/storyteller/library-batch-read.ts`, accepting an already created `createPinnedLibraryNavigation` navigation object and up to 8 **ordered distinct logical paths**, a per-file character budget <=4096 and a combined response budget <=32768 UTF-8 bytes. It calls the navigation's `open({path,offset:0,characters})` **sequentially**, so each file enforces its existing authorization, root membership, schema and visibility checks. It must never use `DocumentStore` raw hashes, take arbitrary roots, cache permissions or broaden grants.

**Result contract:** one result per requested path in the input order. For success include path, rootHash/rootRevision, documentId, revision, objectHash, returned content, nextOffset and totalCharacters; for inaccessible/missing return one generic `unavailable` without identifying private document existence. A stale root, authentication failure or source corruption aborts entire operation with existing error, not per-path fallback, to avoid misclassifying integrity problems. Validate inputs and whole output budget *before* accumulating the response; once the next valid item would exceed the response cap, return a typed `budget-exceeded` failure for the whole request, never partial unbounded data. No hidden implicit text summarization or truncation other than explicitly requested per-file characters and existing `nextOffset`.

**Existing exported tool formats remain unchanged.** This is a library-domain helper, not a new `library.read_many` Writer tool. Later agent integration requires its own captured permission and mission budget policy. The user can use it through future UI/server orchestrators without duplicating hash/path access rules.

## Writes
NEW `packages/story-engine/src/storyteller/library-batch-read.ts`, NEW `tools/api-integration/test/library-batch-read.test.ts`, optional package Story Engine README discoverability and packet receipts. Do not modify existing `library-navigation.ts`, Writer tool dispatch, Documents storage, package manifests or production routes.

## Acceptance
8 valid documents, mixed missing/private, repeated-path refusal, invalid path, oversized item, Unicode byte cap, revocation mid-batch, corrupt document abort, every returned citation exact to root and object. Runs Story Engine typecheck and integration named test, changed-file checks. No runtime/cluster acceptance implied.

**Stop:** if post-LIB06 `open` return type or error codes differ, if sequential authorization is not actually rechecked, or if the API would require a new broad package contract. Return exact evidence to planner before release.
