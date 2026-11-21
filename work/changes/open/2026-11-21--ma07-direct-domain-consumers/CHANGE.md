# MA07 | Direct domain consumers and enforce modular-monolith boundaries

**State:** READY for bounded Cursor execution, subject to current-HEAD symbol validation. **Planning baseline:** `e122d080677263aa6f38961f8734713664827c55`. **Integration target:** `undertaking/storyteller-workshop`, NOT `main`. Substantial behavior-preserving import migration; no SQL, model provider calls, new package, or public flag changes.

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
