# MA07 | exact source ownership and caller migration map

**Inspected:** exact uploaded GitHub HEAD `e122d080677263aa6f38961f8734713664827c55`. No planner build/test run. All listed paths are production .ts/.tsx.

| Old-domain caller | Prefixes |
| --- | --- |
| `apps/api/src/app.ts` | generations, stories, storyteller |
| `apps/api/src/main.ts` | storyteller |
| `apps/api/src/modules/drafts/openings-controller.ts` | generations |
| `apps/api/src/modules/stories/chamber-tools-controller.ts` | generations, stories, storyteller |
| `apps/api/src/modules/stories/controller.ts` | stories |
| `apps/api/src/modules/stories/game-authority-client.ts` | stories |
| `apps/game-authority/src/application.ts` | stories, stories/persistence, stories/resolution, storyteller, storyteller/saved-generation-publish |
| `apps/game-authority/src/branch-evidence.ts` | storyteller |
| `apps/game-authority/src/launch-admission.ts` | storyteller |
| `apps/game-authority/src/launch-put.ts` | stories, storyteller |
| `apps/game-authority/src/server.ts` | stories |
| `apps/worker/src/activities/index.ts` | generations, stories, storyteller |
| `apps/worker/src/activities/scripted-writer-scene.ts` | storyteller |
| `apps/worker/src/activities/storyteller-application-bridge.ts` | storyteller |
| `apps/worker/src/activities/writer-research.ts` | storyteller |
| `apps/worker/src/bootstrap/main.ts` | storyteller |
| `apps/worker/src/launch/scripted-launch.ts` | storyteller |
| `apps/worker/src/outbox/dispatch.ts` | generations, stories, storyteller |
| `apps/worker/src/runtime/index.ts` | generations, stories, storyteller |
| `apps/worker/src/runtime/storyteller-distributed-live.ts` | storyteller |

`apps/worker/src/{runtime/index.ts,outbox/relay.ts}` use real `createOutbox` in `packages/application/src/outbox/index.ts`; API still uses drafts/developer tools/cache; hosts use runtime logging. Retain these imports. `packages/application/src/{stories,generations,storyteller}` are MA06A compatibility cohorts. `packages/story-engine/package.json` exposes the destination root and wildcard subpaths. Retain compatibility for `packages/application/test`, scripts and other legacy test consumers until a separate proven retirement.

The strings in `packages/game/src/immediate-actions.ts` and `packages/storyteller/src/fixtures/mechanical.ts` are comments, not real graph edges. Do not count those as production imports. Preserve Story Authority locks/publication and worker Temporal responsibilities. No source-owner or transaction movement in MA07.
