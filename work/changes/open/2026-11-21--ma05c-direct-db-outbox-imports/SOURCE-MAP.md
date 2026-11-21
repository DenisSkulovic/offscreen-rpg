# MA05C | verified source→DB outbox import migration inventory

**Source baseline:** `undertaking/storyteller-workshop` at `22e8af7e38ade6cf6797e6446702d2203074a439`. Every listed target file was fetched from this branch and contains one or two matching `from '../outbox/index'` module specifiers. The inventory was initially found by a local **older** source search then **rechecked from all 46 current remote files**. Only `from '../outbox/index'` in source is targeted; do not change `import ... from '@offscreen/db/outbox'` already present or unlisted test/host importers.

## Wave 1A: Campaign (12)
`packages/application/src/campaign/`:
`action-executions.ts`, `actions.ts`, `activities.ts`, `activity-lifecycle-events.ts`, `delegated-offer.ts`, `follow-up-intents.ts`, `holds.ts`, `narration.ts`, `persistence.ts`, `reports.ts`, `settings.ts`, `world-obligations.ts`.

## Wave 1B: Stories (10)
`packages/application/src/stories/`:
`continuation.ts`, `delegation-policy.ts`, `documents.ts`, `forks.ts`, `initialization.ts`, `persistence.ts`, `public-events.ts`, `resolution.ts`, `scene-checkpoint.ts`, `timing.ts`.

## Wave 2A: Storyteller A (12)
`packages/application/src/storyteller/`:
`admission.ts`, `budget.ts`, `capture-materialization.ts`, `capture-rearm.ts`, `context-capture.ts`, `context.ts`, `dispatch-review.ts`, `execution-stages.ts`, `execution.ts`, `load-current-dispatch-authority.ts`, `memory.ts`, `openings.ts`.

## Wave 2B: Storyteller B plus other owners (12)
`packages/application/src/storyteller/`:
`prompt-provenance.ts`, `records.ts`, `recovery.ts`, `start.ts`, `test-revoke-current-owner-grant.ts`, `window-accounting.ts`, `writer-loop.ts`, `writer-mission-custody.ts`, `writer-workdesk.ts`.
`packages/application/src/generations/`: `openings.ts`, `scripted-openings.ts`.
`packages/application/src/developer-tools/`: `chamber.ts`.

**Replacement contract:** All matching import statements (including separate `import type` and value imports) change **only their literal module specifier** from `'../outbox/index'` to `'@offscreen/db/outbox'`. Keep imported symbol names/order/aliases untouched. `packages/db/src/outbox.ts` and its manifest already export `Transaction`, `Notice`, `enqueue` since MA05B; `packages/application/src/outbox/index.ts` directly re-exports them. Application already depends on DB. There are no new dependencies or lockfile changes. Run no circular compensation refactor.

**Boundary preserved:** SQL row locks, outbox identity-conflict validation, retry/replay, historical source roots, admission, prompt/usage/lease, and provider spend are **not** changed. Do not confuse "zero old outbox import" with "authority package extraction completed".
