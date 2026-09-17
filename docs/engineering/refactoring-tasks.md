# Refactoring handoff

This is an executable work queue requested by the owner, not a review archive. Update task statuses in place; keep completed implementation history in Git. All tasks below are pending. Do not interpret this document as permission to add product features or make provider calls. The receiving chat should be explicitly asked to execute it. No new chat, agent or model was launched to prepare this handoff.

## Start here

Read [AGENTS.md](../../AGENTS.md), [Code quality](code-quality.md), [Architecture](../technical/architecture.md), [Execution](../technical/execution.md), [Data](../technical/data.md) and [Progress](../progress.md). Inspect the working tree and current code before editing; this task list is not a substitute for reading it.

At handoff preparation, `packages/server/src/stories.ts` has an unrelated uncommitted edit. The observed diff predominantly changes indentation; do not assume that remains its only change. Compare the current diff against HEAD, preserve substantive edits, and never reset/stash/drop them automatically. If ownership or intent of a conflicting change is unclear, ask before overwriting it. Stage explicit files/hunks, not the entire repository.

Use the supported Node 24 runtime, pnpm and existing local PostgreSQL/Temporal. The default shell's Node may be older: check `node --version`. The integrated suite requires its dedicated `offscreen_auth_test` database; database tests require `offscreen_db_test`. Read the development guide for environment variables. Do not point cleanup tests at a user's stories or recreate database volumes.

**No OpenRouter or other LLM calls, no key inspection, no dependency/framework migrations, no schema migrations, no new mechanics, no UI redesign.** Ordinary tests, builds and this refactor require no model inference. Preserve the existing chamber, API behavior and stored data. Report $0 only when no provider was invoked; cumulative account usage is unverified unless independently established through an authorized process.

## Execution strategy

Do one numbered task at a time in dependency order. Commit a verified slice before moving on. Do not spend a turn merely proposing this same plan; implement the next ready task when the user asks to execute the handoff. A receiving agent can continue through multiple tasks, but must stop adding changes when an invariant or failing baseline needs resolution.

Use feature-local modules, functions and explicit dependencies. Keep useful framework classes already present. No mandatory OOP, generic repository, dependency-injection framework expansion, new microservice or workspace-package explosion. Names below indicate responsibilities, not compulsory filenames. Keep the existing public package exports stable where possible; internal call sites may be migrated together to named arguments. Avoid permanent compatibility wrappers for internal APIs once all consumers have moved.

### 1. Establish the baseline and one read-side seam — complete

Scope: `packages/server/src/stories.ts`, its package exports and existing story tests.

- Run the baseline checks and identify pre-existing failures separately. The last recorded application suite had 32 checks; AI-package tests had 10. Counts may change after legitimate test reorganization; preserving scenarios matters more than preserving counts.
- Extract story snapshot/history reads and their query details into cohesive story-local persistence/read modules. Keep one public read operation with explicit owner/story identity. Separate relevant schemas/types/errors only where needed to avoid a circular dependency.
- Preserve single-statement snapshot consistency, item ordering, owner filtering, bounded history pagination and the distinction between inaccessible versus exhausted history. Do not replace one consistent read with several independently changing reads.
- Leave unrelated write/timing behavior in place for the next task. Do not attempt the entire stories module in this first slice.

Done: an engineer can find the snapshot/history query without reading all commands; existing read/reopen/history and isolation tests pass; no outward DTO or query behavior changes.

### 2. Separate story commands, policy and persistence — in progress

Depends on task 1. Scope: story initialization, continuation commit, item effects, control receipts and timing operations currently in `packages/server/src/stories.ts`; internal consumers.

- Group initialization, continuation, journey control and decision timeout into explicit application operations. Extract pure input/precondition policy where it genuinely has no I/O dependency. Keep transaction coordination readable at the operation entry point.
- Move domain-named reads/writes into transaction-aware persistence functions. Pass the current transaction explicitly; never let a helper silently acquire another connection or commit independently.
- Use named arguments for owner/story/operation IDs and revisions. Distinguish command inputs from stored rows and public snapshots. Replace repeated unchecked optional access with validated invariants and deliberate errors, not type casts.
- Preserve exact retry ordering: authorize first; identify a prior accepted operation before rejecting an old revision/deadline; changed payload under the same operation conflicts. Preserve source/seed matching on initialization retry without resetting current items.
- Preserve atomic effects/prose/version/outbox writes, item expected-holder checks, rollback of all effects when any fail, and view-version changes separate from narrative revision.
- Preserve lock ordering and database time checks. Reload mutable interval state after the story lock. Pause after the cutoff remains rejected; resume retains the saved remainder. Late player responses cannot win because the worker is delayed.

Done: each operation has an obvious responsibility, transaction and failure contract; its main path no longer interleaves every unrelated story concern. Existing retry, rollback, ownership, timing and race checks pass. No schema or gameplay changes.

### 3. Consolidate fixture selection — pending

Depends on task 2. Scope: `packages/server/src/chamber.ts` and authored scenario content.

- Separate fixture definitions from chamber application orchestration. Use one typed, closed selection boundary for source versions and resolvers; remove repeated nested ternaries and parallel allowlists.
- Preserve each existing fixture's source key, opening content, options, durations, endings and response interpretation. Retried old operations must still resolve using their original source/revision, not the current scene.
- Keep authored policy explicit. Do not create an executable JSON language or accept arbitrary handler names from HTTP/model input.

Done: adding an authored fixture does not require editing several dispatch chains; all existing chamber scenarios still pass, including earlier read-only fixtures.

### 4. Make worker dispatch and lifecycle explicit — pending

Depends on task 2; task 3 can precede it. Scope: `apps/worker/src/runtime.ts`, relevant Activity adapters and `apps/api/dev/chamber.ts`.

- Separate runtime composition/startup/shutdown, Activity error mapping and outbox dispatch into cohesive modules or functions. Use one explicit mapping for a notice's workflow type/ID rather than duplicated nested selection expressions.
- Preserve topics, workflow IDs, activity names, reuse policies, signal names, lease behavior, retry semantics and sanitized errors. Unknown messages remain untouched. A wake notice must not start a new execution.
- Give each background promise an owner and rejection path. Ensure partial startup and cleanup failures cannot strand other acquired resources. The local launcher must remain loopback-only with ordinary session checks.
- If replacing numeric/null timing sentinels with named results inside application code, adapt at the existing Activity boundary. **Do not change recorded Activity wire results or deterministic workflow commands in place.** Existing Temporal histories may replay. Keep the current workflow protocol intact in this refactor; versioning a protocol is a separate task.

Done: dispatch and lifecycle are understandable without reading nested orchestration callbacks; repeat delivery and restart behavior remain correct. Run the real local integration/restart checks and launcher smoke check.

### 5. Separate browser transport/state from presentation — pending

Depends on task 3. Scope: `apps/web/app/chamber/view.tsx`, `history.tsx` and directly related UI modules.

- Extract the cohesive request/response lifecycle from rendering. Keep a small typed transport boundary and an explicit state owner for pending/error/retry behavior. Do not build a general client framework.
- Separate scene, offered choices, timing controls and inspection presentation where that reduces mixed responsibilities. Preserve accessible text/controls and the existing user flow; this is not a visual redesign.
- Preserve operation IDs on uncertain retries, refresh-on-conflict, monotonic view-version handling, polling while paused, cancellation/unmount behavior and read-only history. Do not lose retries merely because a newer snapshot arrived.
- Avoid a separate hook per trivial expression, duplicated caches or several competing sources of current story state.

Done: transport and timing behavior can be understood/tested apart from JSX, while browser tests still demonstrate the same saved choices, pause/resume, defaults and item ownership after reload.

### 6. Untangle AI contracts and request preparation — pending

Independent of tasks 2–5 after baseline inspection. Scope: `packages/ai/src/playable.ts`, `opening.ts` and their tests.

- Separate cohesive proposal validation, presentation adaptation, prompt definition and request preparation where useful. Avoid one file that becomes every part of the storyteller.
- Replace semantic coupling through `openingArtifactSchema.shape.content` with an explicitly owned shared premise contract if both features truly use the same meaning. Do not duplicate the schema or introduce a global schema bucket.
- Name helpers for their purpose, expose deliberate artifact/result types and preserve copied/frozen inputs. Do not add new output fields or pretend schema validity proves narrative truth.
- Preserve prompt versions/text, output schema meaning, task validation, matching of saved offers, source references excluded from model messages and the prohibition on timed/waiting continuation in this initial component.

Done: all AI-package fake-output tests pass; no provider, persistence, prompt behavior or new product capability is introduced.

### 7. Apply the established pattern to remaining hotspots — pending

Depends on the representative patterns in tasks 1–6. Scope: `packages/server/src/drafts.ts`, `openings.ts`, `generations.ts`, `outbox.ts`, `scripted-openings.ts` and their API adapters.

Inspect before deciding to split. Only separate genuinely mixed concerns; do not force already-cohesive modules into a new template. Keep draft ownership/revision semantics, generation claim/uncertainty behavior, opening freshness and outbox leases intact. Error-to-HTTP mapping belongs at transport; do not hide unexpected invariant failures behind a success or change externally visible statuses in this refactor. Keep public contracts stable and avoid redundant wrappers.

Done: remaining substantial mixed-concern modules follow the same readable conventions, with no mechanical splitting for its own sake and relevant tests passing.

### 8. Make tests and enforcement maintainable — pending

Perform local test cleanup alongside earlier tasks where needed; finish this task last. Scope: `apps/api/test/auth.integration.ts`, `stories.integration.ts`, other affected tests, quality checks and docs.

- Split unrelated test scenarios into focused helpers/files while retaining one understandable resource lifecycle. Keep the actual race, delayed response, browser closure and restart evidence. Avoid copying the entire setup into every file or creating parallel port/database collisions.
- Fix mechanical quality violations in the touched handwritten code without suppressions, unsafe casts or misleading invariant helpers. Inspect remaining `lint:quality` findings; resolve them in bounded groups rather than a blind repository autofix.
- A full quality audit is currently expected to fail. The initial snapshot counted 182 brace, 77 non-null-assertion and 14 nested-ternary violations across 42 files; recompute rather than treating those counts as current truth.
- Promote the quality command into CI only after the full intended scope passes and exclusions are justified (generated files, not inconvenient handwritten code). Update instructions to state the actual enforcement level.
- Update architecture/development/progress references to the resulting structure without appending an amendment history. Keep product status honest: a refactor has not connected the offline storyteller to live gameplay.

Done: the resulting code passes the agreed full quality gate and behavior checks, or remaining exceptions are explicitly reported as unfinished rather than declared complete.

## Verification and stopping rules

Use existing commands and inspect their call paths; none should invoke a model:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm test`.
- `pnpm lint:quality` for the full baseline; `pnpm exec eslint --config eslint.quality.config.mjs <changed-files>` for each slice.
- `pnpm test:db` against `offscreen_db_test` for changed database behavior/boundaries.
- `pnpm test:auth` against `offscreen_auth_test` for affected server, HTTP, worker and browser flows. Run sequentially with the launcher because they share port 3001.
- `pnpm chamber --smoke` for launcher/connected fixture verification. Its dedicated `offscreen_chamber` data persists; do not describe it as a destructive disposable database test.
- `python scripts/check_docs.py` after documentation changes.

Do not weaken tests, delete scenarios or change expected behavior to make restructuring pass. When a likely behavior bug is discovered, explain it and separate the fix from refactoring; do not silently redefine the contract. An assertion replacing `!` must enforce a real invariant with the existing outward error semantics.

For each completed task, report the responsibility boundary changed, behavior preserved, actual checks run and remaining limitations. Update its status here in place. If context runs out, leave the current task and next action clear; do not mark it complete because time or tokens ran out. Report provider spend as required by AGENTS.md. Do not create additional review logs or task-specific architecture catalogues.
