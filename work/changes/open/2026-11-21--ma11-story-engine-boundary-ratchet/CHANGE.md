# MA11 | Enforce Story Engine's internal architectural boundaries

**State: READY, independent parallel lane C.** Inspected HEAD 6dd1276131a813f694ec3bccf4f9062ad3708208, target undertaking/storyteller-workshop. No package-moving task, no SQL or model spend. Selected target is the modular monolith in docs/technical/engine/selected-architecture.md.

**Observed defect:** scripts/repo-tools/module-graph-core.mjs:applicationDomain still recognizes only packages/application/src, now ~152 mostly forwarding source modules. module-graph.mjs computes and reports those legacy domains even though the real 161-module, ~1.5 MiB engine lives at packages/story-engine/src/{stories,campaign,storyteller,generations}. Package-level acyclicity conceals authority→Writer implementation dependencies and source cycles.

**Deliverable:** AST-driven current Engine module/domain graph with stable reporting of file-level runtime SCCs and type-only SCCs, the five existing authority→Writer backedge pairs explicitly documented as transitional architectural debt, a ratchet that rejects any NEW unauthorized authority→Writer runtime implementation import, and hard failure for Engine→Lab or pure Game/Contracts→Engine production imports. Retain undeclared workspace dependency and unknown-export hard failures. Do not rewrite the actual Story Engine product code to improve graph scores, and do not forbid existing authority-internal cycles merely because their size is nonzero. MA09 later eliminates the exception list. Two undeclared production imports were already reported by MA08; keep their FAIL status visible rather than downgrading.

**Exclusive implementation writes:** scripts/repo-tools/module-graph-core.mjs, module-graph.mjs, module-graph.test.mjs and optionally a bounded new test fixture. Do not touch any packages, apps, tool workspaces, lockfile, work catalogs or status. MA10 owns package deletion and legacy tests; WR09A owns provider custody and DB schema. All three operate in separate worktrees, with **Cursor A (MA10) as the named integration custodian**. MA11's parent pushes its tested branch and gives SHA/receipt to A, never merging into undertaking while siblings are active.

**Pass:** new and old graph tests, deterministic member/edge reports, negative injection test, no change in previously raised hard errors. No unverified claim all existing graph errors vanished.

See SOURCE-MAP.md, EXECUTION.md, TASKS.md, PROOF.md.

### Executable report contract (revision 2)

The selected graph change is **additive**, not a schema-breaking redesign. Preserve `SCHEMA='offscreen.module-graph.v1'`, existing package/module fields, `domainEdges` and legacy synthetic tests. Add `storyEngineFileEdges` (including **same-domain** relative imports), `storyEngineDomainEdges` (only between distinct logical domains), and their **file-level** and domain-level runtime/type-only SCC arrays. Existing `classifyRelative` drops same-domain relative imports; merely reusing `domainEdges` is incorrect. Detailed field names, integration points and test input shapes are frozen in EXECUTION. All new edges use resolved TypeScript target filenames and AST kinds. Known five Authority→Writer paths are a *closed allowlist of existing debt only*, not a general exception. MA09 must remove them later.
