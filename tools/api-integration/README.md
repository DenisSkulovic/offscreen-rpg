# API integration: disposable full-stack verification

`@offscreen/api-integration` runs tests across real application/database/API/web/worker boundaries. It is a **verification harness**, not a feature owner or the default method to explore game architecture. Use [QA journeys](../../docs/engineering/qa-journeys.md) for scenarios and [technical execution](../../docs/technical/execution.md) for the intended failure/ordering semantics.

**Start small:** [test-source map](test/README.md) routes one scenario to one test and explains real Nest/DB/worker side effects. For a pure React component, use web-local Vitest after W01; do not read or run this integration harness.

## Find the relevant verification

| Concern | Test entry | Coverage type |
| --- | --- | --- |
| Authentication and HTTP session behavior | [auth.integration.ts](test/auth.integration.ts) | Cookie/owner and API composition |
| Story lifecycle and HTTP operations | [stories.integration.ts](test/stories.integration.ts), [stories-http.integration.ts](test/stories-http.integration.ts) | Composed flow, not a substitute for the product spec |
| Story creation, admitted resolution and browser | [story-start.integration.ts](test/story-start.integration.ts), [story-resolution.integration.ts](test/story-resolution.integration.ts), [stories-browser.integration.ts](test/stories-browser.integration.ts) | Selected concerns, actual runtime boundaries |
| Committed-view SSE hints | [story-updates.integration.ts](test/story-updates.integration.ts) | Owner hint after NOTIFY; anonymous/other-owner denied |
| Storyteller accounting/holds/recovery | [storyteller.integration.ts](test/storyteller.integration.ts) | Fake provider and durable attempt state, no real provider needed |
| Reusable world/start-package import | [start-package.integration.ts](test/start-package.integration.ts) | Canonical source and Start behavior |
| Shared test server/DB/worker setup | [helpers/app-integration.ts](test/helpers/app-integration.ts) | Requires `DATABASE_TEST_URL` naming the **disposable `offscreen_auth_test`** DB |
| Isolated concern registration | [helpers/story-suite.ts](test/helpers/story-suite.ts) | Per-test boundary/entry behavior |

## Verification is not automatically harmless

The root [focused integration runner](../../scripts/repo-tools/focused-integration.mjs) is the preferred route when warranted: `pnpm test:focus -- <suite> [test-name-pattern]`. **It rebuilds the integration workspace and destroys/recreates only the designated disposable test database.** Inspect the script and confirm the target before running. It may also launch local web, API and worker processes; that is not a trivial compile check.

The package manifest exposes `test:auth`, `test:stories:core`, `test:stories:browser`, `test:storyteller` and other select suites. Their presence does not authorize DB resets or live provider calls. Follow the [verification rule](../../.agents/rules/verification.md) and record the exact test executed and its result rather than saying "integration passed" generically.
