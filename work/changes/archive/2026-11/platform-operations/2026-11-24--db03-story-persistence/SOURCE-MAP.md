# DB03 | Current source map and bounded dispatch

Baseline d08e36d809bb53c48fef3351224994bae92b6e7c; source ZIP inspected. Selected relocation is mechanical, not an ORM redesign. Move eleven files from packages/db/src/schema into packages/story-persistence/src preserving filenames and storyteller/ nesting. Exact map:

| Old @offscreen/db subpath | New @offscreen/story-persistence subpath | File |
|---|---|---|
| draft-schema | drafts | drafts.ts |
| generation-schema | generations | generations.ts |
| story-schema | stories | stories.ts |
| launch-schema | launch | launch.ts |
| campaign-schema | campaign | campaign.ts |
| storyteller-schema | storyteller | storyteller.ts and storyteller/{capture,execution,funding,policy,writer}.ts |

55 tables = 1+2+12+1+19+20. Identity imports already point to @offscreen/identity-persistence/auth; keep them and all intra-schema relative imports. Copy identity-persistence tsconfig/package conventions (rootDir ".", dist/src, NodeNext, no root export); add identity-persistence and drizzle-orm 0.45.2 runtime deps, config/typescript dev deps. Use six explicit exports, no wildcard. Move declarations, do not duplicate them.

Exact consumer selection: tracked files in the workspace groups below containing the quoted old module specifier from the six-row map. Replace only that literal, not SQL or identifiers. Mechanical selection is complete by construction; no architecture discovery by Cursor. Current per-family occurrence-bearing file counts (a file may appear in several columns):

| Workspace | draft | generation | story | launch | campaign | storyteller |
|---|---:|---:|---:|---:|---:|---:|
| apps/game-authority | 0 | 3 | 2 | 3 | 0 | 4 |
| apps/worker | 0 | 4 | 2 | 1 | 3 | 5 |
| packages/story-engine | 6 | 39 | 47 | 4 | 50 | 46 |
| packages/admin | 0 | 2 | 3 | 0 | 2 | 3 |
| packages/lab-support | 0 | 1 | 1 | 0 | 1 | 1 |
| tools/chamber | 0 | 2 | 0 | 0 | 0 | 2 |
| tools/api-integration | 1 | 35 | 35 | 4 | 36 | 29 |
| tools/db-migrations | 1 | 1 | 1 | 1 | 1 | 1 |

All eight manifests receive direct workspace dependency; no production API→lab edge. Keep DB dependency until DB05 where still used; migration tool registry/story.ts reexports unchanged names, config stays registry/index.ts. Tests in registry already check the 71-table digest and 20 Writer fingerprint; do not relocate raw SQL integration tests (they have no schema imports). Package-local docs may be corrected at join. Existing wiki classifier scripts/repo-tools/wiki-core/model.mjs restricts persisted entities to packages/db: DB10 owns correction across all schema families.

Proof: build/typecheck all eight consumers and leaf using turbo filters, pnpm --filter @offscreen/db-migrations check:schema, pnpm --filter @offscreen/db-migrations test after build, git diff against Change base on packages/db/migrations (empty), tracked source search zero retired six subpaths. No changes to SQL/journal, baseline fixture, registry names, cache code, domain transaction/query logic. New imports appearing after baseline are mechanical mapping if same six exact names; otherwise stop on new owner/semantic contradiction. Legacy existing typecheck or graph failures must be identified against baseline, not silently waived.