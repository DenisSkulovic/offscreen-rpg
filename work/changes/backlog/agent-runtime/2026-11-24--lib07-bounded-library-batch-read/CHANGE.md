# LIB07 | Bounded batch reads for an already-authorized Story Library

**State:** PREPARED FOR SUCCESSOR COMMISSION, NOT YET READY. **Baseline:** `undertaking/storyteller-workshop@ed0837d0`; needs LIB06 integrated and current API/output verification. The purpose is efficient *multi-file retrieval*, not bulk canon changes. No new Pod, Redis, batch S3 API, tool registry or runtime agent permission. Keep in backlog until predecessor reconciled.

## Decision
Provide a new provider-neutral `readLibraryDocumentsBatch` helper in `packages/story-engine/src/storyteller/library-batch-read.ts`, accepting an already created `createPinnedLibraryNavigation` navigation object and up to 8 **ordered distinct logical paths**, a per-file character budget <=4096 and a combined response budget <=32768 UTF-8 bytes. It calls the navigation's `open({path,offset:0,characters})` **sequentially**, so each file enforces its existing authorization, root membership, schema and visibility checks. It must never use `DocumentStore` raw hashes, take arbitrary roots, cache permissions or broaden grants.

**Result contract:** one result per requested path in the input order. For success include path, rootHash/rootRevision, documentId, revision, objectHash, returned content, nextOffset and totalCharacters; for inaccessible/missing return one generic `unavailable` without identifying private document existence. A stale root, authentication failure or source corruption aborts entire operation with existing error, not per-path fallback, to avoid misclassifying integrity problems. Validate inputs and whole output budget *before* accumulating the response; once the next valid item would exceed the response cap, return a typed `budget-exceeded` failure for the whole request, never partial unbounded data. No hidden implicit text summarization or truncation other than explicitly requested per-file characters and existing `nextOffset`.

**Existing exported tool formats remain unchanged.** This is a library-domain helper, not a new `library.read_many` Writer tool. Later agent integration requires its own captured permission and mission budget policy. The user can use it through future UI/server orchestrators without duplicating hash/path access rules.

## Writes
NEW `packages/story-engine/src/storyteller/library-batch-read.ts`, NEW `tools/api-integration/test/library-batch-read.test.ts`, optional package Story Engine README discoverability and packet receipts. Do not modify existing `library-navigation.ts`, Writer tool dispatch, Documents storage, package manifests or production routes.

## Acceptance
8 valid documents, mixed missing/private, repeated-path refusal, invalid path, oversized item, Unicode byte cap, revocation mid-batch, corrupt document abort, every returned citation exact to root and object. Runs Story Engine typecheck and integration named test, changed-file checks. No runtime/cluster acceptance implied.

**Stop:** if post-LIB06 `open` return type or error codes differ, if sequential authorization is not actually rechecked, or if the API would require a new broad package contract. Return exact evidence to planner before release.
