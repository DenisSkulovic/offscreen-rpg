# CQ04 | verification
| Source adapter | Expected |
| --- | --- |
| Complete LocalDocumentStore | passes guard; unchanged fork/checkpoint behavior |
| Missing `readStructuredDocument` | fails guard before any read/write |
| Missing `readLibraryRoot` | fails guard before any read/write |
| `putManifest` missing from fork adapter | fork with checkpoint refuses `document_store` (no TypeError) |
| Fake non-function method | fails runtime guard, compile-time cast cannot bless it |
| Valid v1/v2 historical fork | same root revision, hashing, scene checkpoint, no duplicate publication |
| Different owner/stale selector | original 404/conflict and no fork effect |

Run `pnpm --filter @offscreen/application build` and focused newly added pure guard test, then `historical-fork.test.mjs` / `library-v2-fork.test.mjs` with disposable SQL when authorized. Changed-file Prettier and quality lint. **Independent security/correctness review** before integration because trust boundary and historical state are involved.
