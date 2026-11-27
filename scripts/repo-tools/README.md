# Repository tooling

Repository-level maintenance and architecture checks live here. `module-graph.mjs` discovers workspace packages and inspects their source imports; workspace discovery and source scanning must agree.

## Known limitations

**AC-M01 focused proof (2026-11-27, PASS):** `module-graph.mjs` loads manifests before listing source and keeps a file only when it sits under a loaded package `src/` tree. A temp Git fixture showed an undeclared grouped import of `@offscreen/fixture` from `packages/platform/nested/src/index.ts`, then a declared resolved edge, a README-only directory excluded, and a duplicate package name refused through the existing manifest-unreadable route. `node --test scripts/repo-tools/module-graph.test.mjs` passed, including the existing injected graph cases.

**Affected-check grouped manifests (2026-11-27, PASS):** `isWorkspacePackageManifest` recognizes `packages/(domain|ai|commerce|platform|foundation)/<leaf>/package.json` as well as flat `apps`, `packages`, and `tools` leaves. Grouped deletion and both sides of a rename select full scope. An ordinary grouped source path stays affected. `packages/not-a-family/leaf/package.json` is not a recognized manifest. `node --test scripts/repo-tools/affected-check.test.mjs` passed.

**Knowledge boundary (2026-11-27, PASS):** `classifyPackageExport` and `classifyCommandAuthority` accept one recognized family segment. Direct `classifyKnowledgeBoundary` cases cover a grouped manifest export, a grouped `src/index.ts` export, a grouped command schema, an unrecognized nested path, and a test file. Named persistence paths are unchanged. `node scripts/repo-tools/wiki-content-health.mjs --self-test` passed.

Joint E1 certification, the real repository graph after packages move, and broad wiki maintenance remain with AC08. These focused checks do not certify that layout.
