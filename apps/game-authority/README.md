# Game Authority: one private story seam

`@offscreen/game-authority` is the private story process. It is not a copy of the Nest API, and it is not a public cluster route. Nest remains the browser session surface.

**Owns:** `GET /internal/v1/stories/:storyId`, `PUT /internal/v1/stories/:storyId/start`, `PUT /internal/v1/stories/:storyId/forks/:forkId`, and `PUT /internal/v1/stories/:storyId/resolutions/:operationId`.

**Does not own:** player `/api` routes, campaign commands beyond that seam, publication, Temporal, or a paid provider.

## Where the work goes

| Question | First source | Continue to |
| --- | --- | --- |
| Which process listens? | [bootstrap/main.ts](src/bootstrap/main.ts) | [config.ts](src/config.ts) for host, port, service token, and timeout |
| Which routes exist? | [server.ts](src/server.ts) | Private prefix `/internal/v1` only. `/api` is absent |
| Which writer runs? | [application.ts](src/application.ts) `createGameAuthoritySeam` | `createStoryApplication` in `@offscreen/application/stories`. Start, historical fork, and resolution each call that façade once. This process does not insert a second receipt or a second fork algorithm |
| Where is a Launch admission stored before any HTTP route exists? | [launch-ledger.ts](src/launch-ledger.ts) `admitLaunchOperation` | Owner-scoped `story_launch` row. No route in [server.ts](src/server.ts) calls it. A reserved id is not a published story |

The service credential is `Authorization: Bearer`. The actor is `x-offscreen-actor-id`, supplied by Nest after the browser session check. A body `ownerId` is rejected. A forged credential is HTTP 401. A story the actor does not own is HTTP 404. The same operation id returns the stored admission. A different body for that id is HTTP 409. The snapshot read is HTTP 200. Resolution admission is HTTP 202.

`GAME_AUTHORITY_MODE=distributed` on the API makes Nest call this process for that one seam. Unset mode keeps the in-process writer. There is no fallback from a failed call back to a second SQL write. The procedure is [Game Authority seam](../../docs/runbooks/local-development.md#game-authority-seam).
