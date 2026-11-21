# MA06 | dependency-ordered future Change decomposition (planner route only)

**NOT a Cursor task queue.** The following are independently mergeable **future Change** boundaries, to be finalized with current source after MA05. The user explicitly chose `undertaking/storyteller-workshop` as the integration branch; no second Undertaking branch, no direct main edits.

## Stage A | low-level shared SQL ports and package ownership
Planner decides and verifies `@offscreen/db/outbox` (`Transaction`/typed `enqueue`) from current `application/outbox/index.ts`: move only SQL-neutral outbox functions/notice identity, preserve `@offscreen/application/outbox` strict compatibility and leave actual dispatcher/lease host integration unmodified. Before any code, reconcile generic `createGenerations`/scripted generation paths into a selected low-level generic persistence and story-specific cohort. Exact exports + consumers/test map must be completed. **No new generic package without dependency evidence.**

## Stage B | authority extraction by bounded SCC-free cohorts
After MA05, create `packages/story-authority` with selected `@offscreen/story-authority` public export subpaths for pure story/campaign SQL/core operations. Start with an independently testable slice and compatibility exports; follow source SCCs/transaction cohorts for larger files. Keep `stories/index.ts` outer factory/composition in Application, never move it merely by directory name. Move campaign/Story SQL operations that share lock/fence together. Each subchange needs a read/write/consumer matrix, explicit NodeNext types/default export and targeted DB negative proof. New Authority must not import Application, Storyteller runtime, providers or Dev tools.

## Stage C | durable Writer/Storyteller-runtime extraction
Create `packages/storyteller-runtime` only after Authority exports and runtime injection are stable. Move a *coherent measured dependency cohort* at a time: runtime setup, context/capture, budgeting/admission, custody/Writer, publication. The new runtime may consume narrow Story Authority APIs and `@offscreen/storyteller` pure task/provider contracts but not public Application facade or test-only Developer tools. One source of custody and SQL publication truth. Distinct workers' host composition remains outside runtime package.

## Stage D | consumer and compatibility retirement
Migrate explicit API, Game Authority, worker and tool importers to the new subpaths in tested waves, then retire corresponding Application re-exports **only after source import graph finds zero legitimate external consumers**. Test strict identity for compatibility during overlap, preserve old test imports until evidence is gathered. Update one shared lockfile/catalog/technical heading per integration custodian. Final `@offscreen/application` exports must be finite, intentional composition or a temporary shim with named removal gate.

## Required planning acceptance before creating Cursor-ready stage packets
- Each Stage A-D becomes a **separate Change folder only when its current source/edit map is fully decided**; large stages may need several Changes. No one-shot MA06 180-file task.
- For each Change, list every source→target path, retained/removed API export, manifest/import/lockfile row, consumer edit, fixture move, exact negative outcome, test command/cwd, compiler/build order, integration collision and Composer T-ID DAG. Audit G0–G7 independently against live Undertaking HEAD.
- If mandatory transactional identity/security/money correctness cannot be tested in authorized disposable SQL, label NOT RUN and state the acceptance limitation. Do not declare a fully proven architecture merely from green types/graph.
- Sequence and parent commission strictly scoped: complete one small Change, integrate to Undertaking, refresh next Change anchors, then commission its successor separately. No automatic execution of the entire MA06 program.

**Stop:** MA05 incomplete, unratified lower-level outbox/generation owner, unresolved source SCC, or missing exact caller/export/test map. Such findings return to ChatGPT; Cursor never decides package ownership while moving files.
