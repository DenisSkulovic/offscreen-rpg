# HR01 | A Nest API a human can read and navigate

**Profile:** STRUCTURAL/REFACTOR · **Status: READY WITH EXPLICIT LIMITS for owner-commissioned source-only execution after current host writer/branch check (source-reconciled 2026-11-23 at `1c68ade1`).** MA12 and CL01 are integrated. See the current-head overlay in SOURCE-MAP.md. Historical planning text below describes the earlier gated state. Source-inspected baseline: `d3ba291763de`; integration branch `undertaking/storyteller-workshop`, current packet commit does not alter production. **This is a future readability wave, not a parallel editor of ongoing MA12 or planned CL01.**

## Source diagnosis and desired outcome

The current production API has a **644-line `modules/stories/controller.ts`** with 30+ route decorators, an **849-line `modules/admin/controller.ts`** with ~17 routes, and a **415-line `app.ts`** doing domain composition, Nest registration, Express guards and startup lifecycle. Errors, validation and identity vary between families: Stories `run/runLaunch` duplicate `StoryError` mapping, Admin has an existing separate `admin-http-errors.ts`, some handlers call `z.uuid().safeParse`, others rely on imported domain schemas. Different families **do not need identical schema classes**; they need consistent trust/HTTP separation.

**Selected organization after MA12/CL01:**
```text
apps/api/src/
  app.ts                         # short readable composition entrypoint; NO Lab implementation
  bootstrap/                     # existing startup/config, only extract if cohesive
    api-controllers.ts           # explicit registry ordered static-first
    api-providers.ts             # explicit typed DI providers, with names/context
  modules/
    stories/
      controller.ts              # compatibility exports only if still imported
      story-http-context.ts      # injected story-only identity + StoryError → HTTP, no domain SQL
      controllers/
        catalogue-and-launch.ts  # GET list, presets, PUT launch, GET launch
        story-reads.ts           # story, history, events, scenes, visit, documents GET
        story-commands.ts        # settings, actions, controls, retries, start, responses, forks
        story-events.ts          # SSE updates and reauthorization (dedicated handler)
        story-documents.ts       # documents PUT, custom intents, accept, visit ack where cohesive
      game-authority-client.ts   # existing private client stays its owner
      story-update-hub.ts        # existing event hub stays its owner
    admin/
      controller.ts              # compatibility export surface only if needed
      admin-actor-service.ts     # existing staff auth/actor owner
      admin-http-errors.ts       # existing mapping, one canonical source
      controllers/
        admin-session.ts         # session enter/me/exit and staff access
        admin-cases.ts           # create/list/get/assign/status and case situation
        admin-players.ts         # player search/detail/campaign list
        admin-evidence.ts        # audit, operations, usage and access check
```
These are **semantic groups, not mandatory per-route files**. Cursor may combine adjacent groups if that materially improves cohesion and leaves an easy route map; it may not invent generic repositories, rewrite business logic, hide critical error mapping or add runtime dependencies. Ensure the actual route list above reconciles against current source after predecessors.

**Architectural law:** Nest controllers: `authorize → parse (Zod at trust boundary) → call existing Story Engine/Admin/GA seam → map domain result/error`. No domain SQL, story-clock decisions, bearer-token scope expansion or money/dispatch logic moves into controllers. Keep public URL/method/status/body, session+story-only bearer auth (after CL01), expectedRevision/operationId, owner and SSE reauthorization **bit-for-bit compatible**. Preserve **static-before-`:id`** route matching when spreading controllers across registration order. `app.ts` remains the 1-glance composition root, not a 500-line anonymous provider factory.

**Scoped writes:** `apps/api/src/app.ts`, `apps/api/src/modules/{stories,admin}/**`, and new `apps/api/src/bootstrap/{api-controllers,api-providers}.ts` only, local README navigation for those two modules, focused existing API/integration tests only when an internal import path changes. No `packages/**`, `apps/web/**`, database schema/migration, GA/Worker, API terminal-auth implementation, OAuth/auth config, global lockfile/docs until custodian. No new npm package.

**Acceptance:** every original route accounted for in a readable `stories/README.md` and `admin/README.md`; API production build/typecheck; route inventory and at least existing auth/owner/revision/SSE negative tests retained; no extra route or changed JSON payload; source graph unchanged at package layer; no new hidden `StoryError`/AdminSessionError leakage. Behavior stays identical, including held/uncertain status. Keep existing tests; don't generate one test per controller.

[Source/caller map](SOURCE-MAP.md) · [bounded refactor route](TASKS.md) · [proof/readability rubric](PROOF.md).


**Execution-wave coordination:** [HR01–HR03 post-CL01/WR11 wave](../../../undertakings/storyteller-workshop/NEXT-WAVE.md). This packet was promoted from backlog for the next execution window, not retrospectively implemented. Revalidate against the actual post-predecessor undertaking HEAD before starting a linked worktree.
