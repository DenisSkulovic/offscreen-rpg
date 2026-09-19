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

`contextInputSchema` is the captured internal artifact. `contextPayload` is the provider-facing projection; they are intentionally different. Narrative evidence receives passage handles and mechanical opening identity is omitted, but `resolution` currently passes through its captured structure, including receipt identities. Do not assume the projection strips every internal ID. Inspect the exact request before changing context or asserting what the model can see. The [worked request and tool/cost walkthrough](../../docs/technical/playthroughs/storyteller.md) explains this boundary with a concrete failed-check scene and distinguishes current one-shot tasks from proposed exploration/report-only contracts.

When a controlling scene blocks an accepted itinerary, `activitySituation.acceptedPlan` contains only the current blocked entry, not the whole queue. Its exact private plan is intentional: the Storyteller may hand that already-chosen commitment back as a fresh offer without reconstructing or broadening it. Publication still does not execute it; the player must select the newly authorized offer, and the application rechecks the plan horizon and ordinary mechanical eligibility before rebinding the durable entry.

## Implemented tasks and limits

- **Opening:** prepares a reviewable beginning. A mechanical opening proposes fresh private plans from the captured character/story-fact seed; validation rejects unsupported or currently unavailable plans before review.
- **Continuation:** resolves a narrative selection into an immediate scene or a prepared timed arrival. It does not adjudicate general mechanical effects.
- **Consequence / DM turn:** narrates already resolved mechanics and proposes zero to four fresh private immediate-action plans. It cannot roll or alter the committed receipt. Pure validation checks the captured capabilities, facts, quantities and evidence before application publication repeats admission.

There is no tool-using or multi-round planner yet. The current one-shot offline DM turn is enough for the short playable loop; pre-narrative retrieval remains the separate memory proposal. Task/schema versions and the authored content graph must not be mistaken for demonstrated live-model quality.

## Content and rules

[profiles/definitions](src/profiles/definitions/) holds creative profiles; [profiles/index.ts](src/profiles/index.ts) validates and resolves their revisions. [fixtures/content](src/fixtures/content/) holds authored offline narrative responses. The fixture's term/profile/note lookups exercise scripted content only; they do not decide which species or mechanics an arbitrary world supports. Mechanical benchmark branches recognize authored fact shapes only inside the offline fixture adapter so tests can prove state-responsive proposals; unknown shapes hold rather than inventing understanding. Mechanical seed content lives in the application catalogue, while generic application admission never branches on fixture identity.

Continuity patches in [context/continuity.ts](src/context/continuity.ts) are source-backed reminders, not state-changing effects. Result validity establishes structural constraints, not fictional truth or enjoyable choices. The selected D&D rules and capability admission belong in `@offscreen/game`.

The present notes are also an always-loaded working set: each source passage is mandatory raw context, not merely a provenance reference. Updating/retiring a note changes which older passages the loader can discover; it does not delete chronology, but no archival search replaces that access path. Current content is duplicated in the provider-facing `current` and `evidence` fields. A structurally valid new passage/notes combination is not preflighted for the next request's size. These limitations are the starting point for the proposed [memory and recall slice](../../docs/features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md), not implemented fixes.

## Working safely and economically

Live calls remain disabled under [spending rules](../../.agents/rules/spending.md). The provider adapter exists but a stored credential is not permission to dispatch. The existing [Storyteller test](test/storyteller.test.ts) uses injected fake transport; tests under `test/` consume compiled output. Read [verification policy](../../.agents/rules/verification.md) before choosing checks. Package commands and exports are listed in [package.json](package.json).
