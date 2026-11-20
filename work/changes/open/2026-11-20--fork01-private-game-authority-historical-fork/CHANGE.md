# FORK01 | Make historical fork a private Game Authority write

**State:** In progress on branch `change/fork01-private-ga-fork`. Global queue selection remains TURN02. **Kind:** implementation. **Baseline:** ZIP `64f3de7`, remote main through `09f8d08`, this branch from `a0690c09`. **Roadmap:** [current ordered gates](../../../IMPLEMENTATION-ROADMAP.md). **Prerequisites:** BOOT03 GA route handoff, existing DATA04 checkpoint domain, settled quiescent TURN03 Harbor-watch fixture. No code or runtime PASS claimed by this planning packet.

## Real uncovered boundary

`apps/api/src/modules/stories/controller.ts` handles public `PUT /api/stories/:id/forks/:forkId` by calling `this.stories.fork` (the Nest writer). Meanwhile `apps/api/src/modules/stories/game-authority-client.ts:StorySeam` only has read/start/resolution, and `apps/game-authority/src/application.ts:createGameAuthoritySeam` and `server.ts:routeFor` lack a private fork. The existing `packages/application/src/stories/forks.ts:createStoryForks.fork` is the correct *domain* checkpoint implementation. It should not be cloned into a second writer.

**Goal:** public Nest fork in distributed mode forwards validated `forkStorySchema` plus trusted owner, source ID, child ID and exact as-of pair to the versioned, authenticated **private GA** endpoint; GA calls the same application `stories.fork` once. Preserve public route, error mapping, transactional checkpoint reconstruction, retry/owner/role guards, S3 pin and no fallback on GA failure. Retain local process seam solely for host tests until DXK06 renames the old `compose` mode; Kubernetes always uses distributed. Never expose GA through public Gateway.

**Explicit scope limit:** the only initial fork is quiescent Harbor-watch scene1 *after parent reaches scene2*. Must reread independent child source root, lineage, no future parent state. Do not expand checkpoint v1 to `microbe.v3` mechanical/obligation active states; no generic branch-scoped memory feature. DATA04 owns core fork state, DIST03 its original narrow read/resolution scope, TURN03 its full cold-kind/browser proof.

**Source-level concern to check:** `forks.ts:matchingPriorFork` compares prior owner/source/revision and optional passage, but not the supplied `sourceCheckpointHash`. Prove whether retrying the same child with a *different hash* incorrectly succeeds before deciding on a **coordinated narrow domain repair**. Don't invent a parallel snapshot store.

## Acceptance and stops

**Positive:** local provider-free Harbor-watch scene1-after-scene2 read/fork; two-process Nest→GA private fork exact source checkpoint and independent child root; retry unchanged is idempotent. **Negatives:** wrong owner/actor, bad token, GA down, stale/wrong checkpoint or passage, changed-intent same child, malformed body leave no illegal child or future-state leak. Lower-tier process proof is not Kubernetes proof.

**Stop:** BOOT03/GA shared-file writer conflict, new as-of invariant not representable by existing DTO, unsafe DB/cluster, or architectural design mismatch. Report the exact symbol and failed case. No paid provider or destructive mutation.

## planned-impact.v1

| Plane | Boundary/claim | Required check |
| --- | --- | --- |
| Product | Unchanged restricted v1 historical fork | no invented mechanics/checkpoint v2 |
| Technical | private GA is sole distributed fork writer | actor/auth, stale pin, GA down |
| Code | Nest controller + StorySeam; GA server/application; narrow core fork patch only if proven | local + two-process positive and negative |
| Related | DATA04 and TURN03 dependency, technical docs and status | Change ledger and link checks |

## Cursor

[One T-ID at a time](TASKS.md); current active selection remains TURN02. No automatically running FORK01 until QUEUE handoff. Coordinate all Game Authority server modifications with BOOT03/STORY03 and TURN02 app-release integrator.

## Reconciliation ledger

| Authority | Inspected source | Positive/negative run | Docs impact | Remaining |
| --- | --- | --- | --- | --- |
| Planner audit | `64f3de7` + `09f8d08` (source only) | NOT RUN, no code changed | proposal only | superseded by the rows below |
| T01 application fork | `packages/application/src/stories/forks.ts` idempotent hash recheck; Harbor-watch scene1 fork in `turn03-distributed-poc-fixture.integration.ts` | historical-fork 3 pass / 0 fail; turn03 fixture 4 pass / 0 fail. Negative: same child id with a different hash returns `checkpoint_hash_mismatch` | none | not Game Authority or Kubernetes |
| T02 private GA fork | `apps/game-authority` `PUT /internal/v1/stories/:id/forks/:forkId` calls `stories.fork` once | game-authority build pass; story-seam + story-start 8 pass / 0 fail. Negative: forged bearer returns 401 and does not call the seam | none | Nest still calls `this.stories.fork` directly (T03) |
