# DIST01 | Composer DOC route: reconcile ownership and topic table

**Baseline:** 584b594. **Change:** documentation, Ready for explicit owner selection. **Model:** Composer Standard; no source code change needed merely to ratify. Source: `apps/worker/src/outbox/dispatch.ts:noticeDispatch`, `apps/worker/src/runtime/index.ts:startRuntime`, `apps/worker/src/activities/index.ts`, `packages/workflows/src/contracts.ts`, `apps/game-authority/src/{server,application}.ts`.

**Source-based correction:** `ARCH02` is **merged**, despite an obsolete prerequisite line claiming it is active/unmerged. `storyteller.profiled.v1` and campaign wake topics use direct SQL-outbox→Temporal RPC in `dispatch.ts`, no Rabbit hop. In `apps/game-authority/src/server.ts` private GA only handles snapshot and resolution. The current worker still owns one combined activity; a target two-queue split is not implemented.

## T01 | One table, current versus target | PLANNER-READY, DOC PATCH
**Read:** `work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md` existing per-topic route table, canonical `docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows`, source files above. **Do:** correct each table cell's “current Compose”, “selected target” and “optional business fact” without changing workflow IDs, introducing Rabbit-to-Temporal or claiming remote publication. Explicitly say STORY03 controls the new queue and BOOT03 owns GA start. **Negative:** no topic changes route because broker exists; an unselected optional derived projection does not block game.

## T02 | Freeze handoff/switch and source heading | DOC PATCH landed 2026-11-20
Name per-service migration switches and rollback: `GAME_AUTHORITY_MODE=compose|distributed` for selected story RPC, versioned durable Storyteller notice selector, explicit old workflow queue retained; no silent fallback. Current source must match before claiming a switch implemented. Update canonical topology/execution headings **only** for ratified new distinctions and link packets. **Stop:** any already-merged D1 contract conflict returns precise heading/symbol to ChatGPT. No deployment, no Grok.
