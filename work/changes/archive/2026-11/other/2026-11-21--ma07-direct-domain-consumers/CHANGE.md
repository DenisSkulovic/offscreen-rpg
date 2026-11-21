# MA07 | Direct domain consumers and enforce modular-monolith boundaries

**State:** Done (2026-11-21). Squash-integrated to `undertaking/storyteller-workshop`. Not on `main`. Planning baseline `e122d080677263aa6f38961f8734713664827c55`. Execution HEAD `ba3dfc36eb1d03409f3c7be4103c8621d2ce57ea`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| Production hosts call story, generation, and Storyteller use cases through Story Engine | docs/technical/platform/topology.md | changed: API, Game Authority, and worker source import `@offscreen/story-engine` for those domains | apps/api, apps/game-authority, apps/worker `src` import lines | source-inspected plus host build/typecheck | `repo:host-domain-imports` fails a synthetic old import and ignores a comment | host package.json workspace dependencies |
| Application still owns outbox, drafts, cache, logging, and compatibility forwarders | docs/technical/platform/topology.md | unchanged because those facilities were not moved | `createOutbox` remains `@offscreen/application/outbox` in apps/worker/src/runtime/index.ts | source-inspected | guard test keeps `@offscreen/application/outbox` and drafts | N/A |
| Story behavior, permissions, and charges are unchanged | docs/technical/platform/data-and-persistence.md | unchanged because this Change only retargets import specifiers | named imports preserved | fixture-tested | API game-authority seam 9/9; writer research dispatch 2/2; no permission or charge files edited | N/A |

## Execution proof

Twenty production host files now import `@offscreen/story-engine` for stories, generations, and storyteller, including nested persistence, resolution, and saved-generation-publish. Application forwarders were not deleted. Each host declares `@offscreen/story-engine` as a direct workspace dependency and still depends on `@offscreen/application`.

`pnpm --filter @offscreen/story-engine build` passed. API and Game Authority builds and typechecks passed. Worker `tsc` fails only in `apps/worker/test/storyteller-generation-evidence.test.ts` (`GameAuthoritySeam` missing `putLaunch` and `getLaunch`). That test file was not edited. The same module-graph errors exist on the pre-change HEAD: undeclared `apps/api/src/app.ts` `@offscreen/game-authority/application` and `apps/game-authority/src/launch-put.ts` `@offscreen/storyteller/tasks`. `pnpm repo:module-graph:test` 15/15. `repo:host-domain-imports` tests 3/3. Writer research dispatch 2/2. API game-authority seam 9/9. Scripted writer scene 3/4; the fourth failure is disposable database cleanup `42501 permission denied to terminate process`, after the scene assertions. No provider call.



## Scope and decision

MA06A moved 134 modules into `@offscreen/story-engine` while retaining 134 compatibility forwarders in `@offscreen/application`. Production hosts still reference the old facade. Migrate every production `apps/{api,game-authority,worker}/src` import of old domain exports to direct Story Engine exports in one whole Change, retaining all actual Application-owned facilities (outbox, developer-tools, drafts, cache, runtime-logging). Do not retire forwarders while tests/scripts still need them.

| Old import specifier | New import specifier |
| --- | --- |
| `@offscreen/application/stories` | `@offscreen/story-engine/stories` |
| `@offscreen/application/stories/persistence` | `@offscreen/story-engine/stories/persistence` |
| `@offscreen/application/stories/resolution` | `@offscreen/story-engine/stories/resolution` |
| `@offscreen/application/generations` | `@offscreen/story-engine/generations` |
| `@offscreen/application/storyteller` | `@offscreen/story-engine/storyteller` |
| `@offscreen/application/storyteller/saved-generation-publish` | `@offscreen/story-engine/storyteller/saved-generation-publish` |

All destination subpaths are already represented by `packages/story-engine/package.json` exports. Preserve named imports, type-only imports, runtime behavior, locks, authority and notifications. This is not permission to rewrite handlers or split Story Engine into extra packages.

## Execution

A commissioned parent creates one linked `change/ma07-direct-domain-consumers` worktree from the current undertaking HEAD, runs `pnpm repo:change-branch --change MA07 --target undertaking/storyteller-workshop` per repository rules, implements T01–T03, runs focused proof, reconciles, archives, squash-integrates, pushes and retires the worktree without routine approval checkpoints. One integration owner. No main change, real provider call or destructive environment operation. Exact missing exports, new forbidden cycle or real security/data defect are stop conditions.

**Acceptance:** no production host import of the three old domain prefixes, required direct workspace dependencies declared, changed-host builds/typechecks and relevant tests, source guard detecting a forbidden import, no new module-graph violation, existing compatibility kept. Report baseline-only failing suites as NOT PASSED rather than falsely changing the goal. Reconcile the modular-monolith and Storyteller ledgers and actual status only once proven.

[Exact caller map](SOURCE-MAP.md) · [Executor route](TASKS.md) · [Readiness/proof](PROOF.md).
