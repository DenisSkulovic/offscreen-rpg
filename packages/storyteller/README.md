# Storyteller contracts and adapters

This package prepares bounded tasks and validates their results. It does not own database transactions, story publication, dice execution or durable retries. Those live in the [application package](../application/README.md). A profile is creative data; it is not a running agent.

## Follow one request

| Stage | Owner | What to inspect |
| --- | --- | --- |
| Load committed context | Application [storyteller/context.ts](../application/src/storyteller/context.ts) | Story-scoped reads and evidence sources |
| Validate and bound context | [context/index.ts](src/context/index.ts) | Required evidence, current-passage consistency, recent-window selection and overflow |
| Capture exact request | [tasks/index.ts](src/tasks/index.ts), `prepareStorytellerTask` / `requestFor` | Task-specific instructions, result schema, profile guidance and serialized payload |
| Choose execution policy | [tasks/policy.ts](src/tasks/policy.ts) | Scripted/provider distinction and reservation bounds |
| Produce output | [fixtures/index.ts](src/fixtures/index.ts) or [providers/openrouter.ts](src/providers/openrouter.ts) | Scripted data selection versus explicitly enabled external transport |
| Validate output | [tasks/index.ts](src/tasks/index.ts), `validateStorytellerResult` | Task version, opportunity IDs, continuity evidence and result constraints |
| Commit the result | Application [storyteller/publication.ts](../application/src/storyteller/publication.ts) | Current-story fence and atomic publication; outside this package |

`contextInputSchema` is the captured internal artifact. `contextPayload` is the provider-facing projection; they are intentionally different. For example, mechanical opening private plans are captured internally but omitted from the provider payload. Inspect both before changing context or asserting what the model can see.

## Implemented tasks and limits

- **Opening:** prepares a reviewable beginning. Mechanical openings currently copy content-supplied opportunities.
- **Continuation:** resolves a narrative selection into an immediate scene or a prepared timed arrival. It does not adjudicate general mechanical effects.
- **Consequence:** narrates already resolved mechanics and selects from admitted actions. It cannot roll, add effects or create new action IDs.

There is no tool-using DM planner yet. Task/schema versions and the authored content graph must not be mistaken for an agent loop. The proposed runner's status belongs in [progress](../../docs/progress.md).

## Content and rules

[profiles/definitions](src/profiles/definitions/) holds creative profiles; [profiles/index.ts](src/profiles/index.ts) validates and resolves their revisions. [fixtures/content](src/fixtures/content/) holds authored offline narrative responses. The fixture's term/profile/note lookups exercise scripted content only; they do not decide which species or mechanics an arbitrary world supports. Mechanical seed content lives in the application catalogue.

Continuity patches in [context/continuity.ts](src/context/continuity.ts) are source-backed reminders, not state-changing effects. Result validity establishes structural constraints, not fictional truth or enjoyable choices. The selected D&D rules and capability admission belong in `@offscreen/game`.

The present notes are also an always-loaded working set: each source passage is mandatory raw context, not merely a provenance reference. Updating/retiring a note changes which older passages the loader can discover; it does not delete chronology, but no archival search replaces that access path. Current content is duplicated in the provider-facing `current` and `evidence` fields. A structurally valid new passage/notes combination is not preflighted for the next request's size. These limitations are the starting point for the proposed [memory and recall slice](../../docs/features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md), not implemented fixes.

## Working safely and economically

Live calls remain disabled under [spending rules](../../.agents/rules/spending.md). The provider adapter exists but a stored credential is not permission to dispatch. The existing [Storyteller test](test/storyteller.test.ts) uses injected fake transport; tests under `test/` consume compiled output. Read [verification policy](../../.agents/rules/verification.md) before choosing checks. Package commands and exports are listed in [package.json](package.json).
