# Real API/browser test entries | fastest correct route

**First look:** These are **connected Nest/PostgreSQL/Next/Temporal/Chromium tests**, not an inner-loop Vitest suite. They can reset a disposable DB and occupy shared ports. For pure React state, use the W01 web-local Vitest runner instead.
**Start:** [integration safety guide](../README.md) → **one test source below** → [focused runner](../../../scripts/repo-tools/focused-integration.mjs) only when explicitly authorized.
**Source inspected:** baseline `470a5df`. Suites exist; they were **not run** by this documentation review.

## Choose the narrowest existing connected proof

| Need to prove | Existing test source | What a narrow check can establish |
| --- | --- | --- |
| Better Auth cookie/owner/CSRF | [auth.integration.ts](../../../auth.integration.ts) | Real session composition; not full external GitHub OAuth exchange |
| Story HTTP owner/errors | [stories-http.integration.ts](../../../stories-http.integration.ts) | API route/status semantics |
| Stored resolution/retry | [story-resolution.integration.ts](../../../story-resolution.integration.ts) | Durable admission, duplicate/conflict, publication against real DB |
| Start from reviewed candidate | [story-start.integration.ts](../../../story-start.integration.ts) | Persisted Start, current published opening, same ID retry |
| Real navigation/Play/Chamber | [stories-browser.integration.ts](../../../stories-browser.integration.ts) | Browser UI, reload and persisted story scenario with local fixture |
| Draft two-tab/version | [drafts.browser.ts](../../../drafts.browser.ts) | React edit/draft conflict, browser session interaction |
| Storyteller uncertain/accounting | [storyteller.integration.ts](../../../storyteller.integration.ts) | Fake provider and durable attempt lifecycle, **no paid model** |
| Shared launch/DB setup | [app-integration helper](../../../helpers/app-integration.ts), [story-suite helper](../../../helpers/story-suite.ts) | Test server composition, disposable URL and local dependencies |

## Side effects are part of the command

- `pnpm test:focus -- <suite> [name-pattern]` first runs Turbo build for `@offscreen/api-integration`, **drops/recreates `offscreen_auth_test`** through [reset script](../../../scripts/repo-tools/reset-test-db.mjs), migrates, then runs selected compiled tests. It is not a cheap cached component test.
- Tests may launch actual Next server, Nest API and Temporal worker and use localhost ports shared by other launchers. Stop conflicting dev instances. Never run two real suites concurrently against same DB/ports.
- The helper removes live provider credentials and disables Storyteller execution. Do not replace this with an environment that accidentally enables paid inference.
- Only an explicitly designated disposable database is eligible. Never treat “test” in a command name as permission to modify user/hosted data.

## Future evidence ownership (not implemented)

- **W01/W20:** fast web Vitest/RTL/MSW tests, **without** Next build/DB.
- **W02/W15/W03:** authenticated HTML/Query hydration and story identity need targeted real browser proof eventually.
- **W19/W04:** stable operation receipt and no duplicate effect need **real persisted DB** proof beyond MSW.
- **W16/W17:** SSE back-pressure/missed-event behavior needs real Nest stream test plus focused client invalidation.
- **W14:** production-like proxy/cache/bundle/browser acceptance, not a test on every edit.

**When to stop reading:** if the Change is only a pure component, hook or form selector, return to [web map](../../../apps/web/README.md) and its local Vitest seam. Only inspect these test files when crossing the real backend/browser boundary; read narrowly by test name. Maintain this map only when test entrypoints, fixtures or safety behavior change.
