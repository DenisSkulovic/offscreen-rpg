# LIB07 | Planned serial execution

## T01 | Pure batch adapter
**Read:** `library-navigation.ts` actual `open`; `writer-library-tools.ts` privacy decisions; `packages/story-engine/package.json`; source map. **Write:** new `storyteller/library-batch-read.ts` only. Validate 1–8 distinct paths, <=4096 chars/file, <=32768 UTF-8 bytes aggregated including result JSON metadata; call injected navigation.open serially, fail whole batch on stale-root/not-authorized/corrupt-source, map only not-found to indistinguishable unavailable. Bound error metadata. **Positive:** 8 input paths in order. **Negative:** duplicate/9th path, overbyte Unicode content, authorization loss on second read, corrupt 3rd document abort.

## T02 | Isolated proof
**Read:** T01 file, existing API integration test conventions, existing navigation behavior. **Write:** new `tools/api-integration/test/library-batch-read.test.ts`. Inject real navigator with fake reader/authorize; measure store read count, verify no reads after invalid request, fail closed on stale roots, and byte budget includes serialized response. **Positive:** root/hash citations retained, per-file nextOffset truthful. **Negative:** private vs absent indistinguishable, oversized JSON metadata cannot bypass cap. **Stop:** cannot preserve existing error semantics.

## T03 | Focused verification
Build Story Engine + api-integration; run named compiled test; changed-file quality and source scan. Reconcile packet and integrate after LIB06 acceptance. No SQL, Pod, S3 or model test.
