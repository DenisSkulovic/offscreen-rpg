# Game Authority: one private story seam

`@offscreen/game-authority` is the private story process. It is not a copy of the Nest API, and it is not a public cluster route. Nest remains the browser session surface.

**Current private source routes:** story snapshot GET; launch PUT/GET (`/internal/v1/stories/launch/:operationId`); story start, fork and resolution PUT under `/internal/v1/stories/:storyId`. Separately role-scoped internal Storyteller task custody, saved-generation publication and Writer-round routes are also implemented. See [server.ts](src/server.ts) for exact dispatch and permission tokens; these are **not public `/api` routes**.

**Does not own:** browser `/api` session handling, Temporal scheduling or a paid provider. **It does expose private publication authority** for saved Storyteller results, and its application/engine boundary commits authoritative scene state. Do not confuse this with an executor writing directly to story tables.

## Where the work goes

| Question | First source | Continue to |
| --- | --- | --- |
| Which process listens? | [bootstrap/main.ts](src/bootstrap/main.ts) | [config.ts](src/config.ts) for host, port, service token, and timeout |
| Which routes exist? | [server.ts](src/server.ts) | Private prefix `/internal/v1` only. `/api` is absent |
| Which writer runs? | [application.ts](src/application.ts) `createGameAuthoritySeam` | `createStoryApplication` in `@offscreen/story-engine/stories`. Start, historical fork, and resolution each call that façade once. This process does not insert a second receipt or a second fork algorithm |
| How is a direct prompt launch admitted and finished? | [launch-ledger.ts](src/launch-ledger.ts) `admitLaunchOperation` → [launch-put.ts](src/launch-put.ts) | Owner-scoped launch ledger, staged source, scripted Writer and opening publication. `ready` is a status, not just reservation |

The service credential is `Authorization: Bearer`. The actor is `x-offscreen-actor-id`, supplied by Nest after the browser session check. A body `ownerId` is rejected. A forged credential is HTTP 401. A story the actor does not own is HTTP 404. The same operation id returns the stored admission. A different body for that id is HTTP 409. The snapshot read is HTTP 200. Resolution admission is HTTP 202.

`GAME_AUTHORITY_MODE=distributed` on the API makes Nest call this process for the configured Story Seam (read, launch, start, fork and resolution). Unset mode keeps the in-process writer. There is no fallback from a failed call back to a second SQL write. The procedure is [Game Authority seam](../../docs/runbooks/local-development.md#game-authority-seam).
