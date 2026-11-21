# MA04 | exact positive/negative evidence

| Assertion | Actual proof path | Expected |
| --- | --- | --- |
| Normal playable source unchanged | `stories-http.integration.ts`, `stories-core.integration.ts` | real `playableOpeningStorySource` eligible when interaction is active and no campaign character/resolution |
| Chamber dev mode preserved | existing `stories-http.integration.ts` chamber.v2 HTTP start/respond tests, `stories-core.integration.ts` | true `canRespond`, allowed fixture responds, later terminal scene false |
| Plain story factory denies fixture UI permission | extend existing chamber.v2 fixture case to call `createStoryApplication(database).read` | false for same synthetic source even with live interaction |
| Explicit opt-in works | same fixture case with `fixtureSourceCanRespond: chamberAllowsResponse` | true for chamber.v2 only; chamber.v1 without respond false |
| Wrong owner/invalid origin denied | existing HTTP tests | 404/403; no new permission from HTTP origin alone |
| GA / worker default | code diff plus API/GA typecheck | no injected fixture predicate; no changed SQL admission |
| Package direction | `pnpm repo:module-graph --json` and source grep | `stories → developer-tools` absent; no manifest cycle |

**Commands (root):** `pnpm --filter @offscreen/application build`, `pnpm --filter @offscreen/api build`, `pnpm --filter @offscreen/game-authority build`, `pnpm --filter @offscreen/worker build`, `pnpm --filter @offscreen/api-integration build`, `pnpm repo:module-graph --json`. For authorized disposable SQL run `pnpm --filter @offscreen/api-integration test:stories:http` and `test:stories:core` if exact package scripts exist (they do in inspected baseline); otherwise NOT RUN, never a fabricated security pass. Changed-file Prettier and quality ESLint. No real provider.

**No false authority claim:** `canRespond` is presentation eligibility, not a complete server-side authorization fence. Existing owner, submission and revision validation remain mandatory and must be compared in the diff. If tests reveal production reliance on a fixture without developerTools, stop and return evidence to planner; don't re-enable global default.
