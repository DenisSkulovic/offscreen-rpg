# DX12 | inspected build dependency and current change classification

**Root package.json:** build = turbo run build, typecheck = turbo run typecheck, test = turbo run test, test:fast = turbo run test:fast --filter=@offscreen/web. Separate test:db and test:auth run explicit database/integration work; DO NOT include those in affected default.

**turbo.json:** build dependsOn [^build], outputs [dist/**, .next/**, !.next/cache/**, !.next/dev/**]; typecheck dependsOn [^build], outputs []; test dependsOn [build], outputs []; test:fast dependsOn [^build]; dev cache false/persistent true and has deployment env. Never cache a protected DB/integration suite via an empty-output test trick.

**Actual reverse graph:** API Integration depends on API, Worker, Web, Story Engine, DB, Lab, Documents and more. Chamber depends on multiple hosts. Story Engine depends on Contracts, DB, Documents, Game, Storyteller. A changed lower layer can correctly select many dependents; do not hardcode an independent second package graph or fake that a Story Engine change is cheap.

**Existing scripts/repo-tools/ci-change-scope.mjs:** classifyChangeScope and exported isDocsPath classify docs versus source and CI integration. Tests in ci-change-scope.test.mjs. PR code.yml currently always full; user has not authorized more paid CI. This Change does not modify either. It may reuse isDocsPath and run git for changed paths, but needs its OWN local changed-package semantics.

**Global-change fallback set:** package.json, pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json, .node-version, .npmrc, root tsconfig*.json, eslint*.mjs, packages/config/**, .github/workflows/**, scripts/repo-tools/** except recognized docs. Any unknown non-doc file outside apps/packages/tools => full. Package manifest removal/rename and workspace moves => full.

**Turborepo CLI:** v2.10 supports --affected with TURBO_SCM_BASE/TURBO_SCM_HEAD and --dry=json; require the executor to smoke-test actual installed version, not invent flags. Missing Git history is FULL, never main. No remote cache setup implied.

**Owned source paths:** only new affected-check.mjs/test, root package.json one script, ENGINEERING.md and turbo.json conditional; no package or GitHub Action edits.
