# MA08A | bounded tasks (one Cursor parent, one worktree)

T01 **New lab workspace.** Initial reads: `application/src/developer-tools/{index,chamber,chamber-inspector,memory-evaluator}.ts`, `packages/story-engine/package.json`. Writes: `packages/lab-support/**`, at most exact nested fixture export in story-engine manifest. Copy entire lab subtree, fix source imports to Story Engine; same index surface. Tests: build/typecheck new package, root import smoke; negative no `@offscreen/application` dependency or lab→authority reverse. Stop: unsafe export.

T02 **Chamber consumer cutover.** Reads `tools/chamber/{package.json,src/main.ts,src/memory-packet-review.ts}`, plus 2 named tests `obs00-c-wire-equality`, `obs00-l-story-trial`. Writes confined to `tools/chamber/**`. Change imports per SOURCE-MAP, manifest only for Chamber. Test existing Chamber test scripts and imported package barrels. Negative: no old domain or developer-tools imports from Chamber source/test. Stop: missing named export requiring algorithm redesign.

T03 **Evidence, reconcile local branch, handoff.** Reads CHANGED files and packet PROOF. Writes receipt in Change's own worktree if required; parent outputs concise receipt and validated SHA. Run relevant builds/typechecks, `git diff --check`, changed-file quality, `pnpm repo:module-graph` where runnable. Do not mutate common catalogs, queue, global lockfile; custodian handles integration and closing documentation. Stop: real security/data or unsupported graph regression.

Parent performs the commissioned whole Change; no auto-start of MA08B or MA10A.
