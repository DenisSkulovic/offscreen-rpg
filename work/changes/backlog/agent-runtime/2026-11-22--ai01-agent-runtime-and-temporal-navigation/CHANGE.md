# AI01 | Human-readable Writer runtime, capture stages and Temporal topology

**State: PLANNED, NOT DISPATCHABLE before WR10/WR11 current source rebase.** Kind: structural readability and living source navigation. Baseline source inspected at `f8a45a7e0a0daa408f05651eb1bb2997ec2daf22` on `undertaking/storyteller-workshop`. No gameplay/schema/provider policy changes. This packet exists to make the owner capable of personally following one scene's agent execution without reconstructing model-authored source moves.

**Actual hotspots:** `packages/story-engine/src/storyteller/context-capture.ts` ~3,079 lines combines 7 versioned capture families and capture writers; `capture-materialization.ts` ~1,598 lines combines task assembly with lease/commit/outbox machinery; `writer-loop.ts` ~1,302 lines combines SQL round transitions, tool receipts, Library/Workdesk execution, decision interpretation and scripted façade. `packages/workflows/src/index.ts` ~219 lines, `contracts.ts` ~89 lines map 10+ workflows, while `apps/worker/src/outbox/dispatch.ts` separately maps topics to task queues. Current provider-enabled route remains future WR10/WR11; a code diagram is not runtime proof.

**Selected ownership layout, within existing packages (NO new npm package):**
```text
packages/story-engine/src/storyteller/
  context-capture.ts              # stable public facade
  context-capture/
    schemas.ts                    # 7 capture families + cross-field Zod
    collect.ts                    # snapshot queries and capture constructors
    persist.ts                    # identity/hash, provisional rows and reader
  capture-materialization.ts     # stable public facade
  capture-materialization/
    assemble.ts                   # pure/from-capture task assembly by subtype
    lifecycle.ts                  # SQL leases/revisions/retry/promote/outbox (keep atomic flows)
  writer-loop.ts                  # stable public facade
  writer-rounds/
    request-and-step.ts           # prior tool summaries, exact request wire, step reader
    tool-ledger.ts                # request hash, idempotent Library and Workdesk receipt
    decision.ts                   # validate, hold, finalize proposal/next round
  writer-round-replay.ts          # existing strict response/finance edge, preserve
packages/workflows/
  README.md                      # workflow identity, taskQueue and retry/side effect chart
apps/worker/src/
  RUNTIME-TOPOLOGY.md             # who runs SQL, sends provider, consumes outbox
```
Actual function-to-file assignment is in SOURCE-MAP. **These are semantic targets, not a demand to extract every 20-line helper.** Composer may keep a cohesive function in a neighboring module if it reduces reading hops without crossing SQL/authority/transaction limits. Avoid wildcard barrels except existing compatibility entrypoints. Keep one clear “start here” page per package and cross-links to read exact transactions.

**Hard invariants:** Preserve all public `@offscreen/story-engine/storyteller` exports, request/compiler version and serialized bytes (legacy v1 byte oracle), DB SQL/transaction/advisory lock sequence, persisted capture hashes, tool-call idempotency, scene source/fork pins, Temporal workflow names/task queues/retry, no SQL in executor and no provider calls. No migration. Never move a transaction callback into two independent transactions to shorten a file. No business logic rewrite, new tests per extracted function or invented `Agent` class.

**Owned edits:** above Story Engine files and limited new nested modules; `packages/workflows/README.md` and `apps/worker/src/RUNTIME-TOPOLOGY.md` documentation only. No executable `packages/workflows/src`, `apps/worker/src`, GA, API, Web or DB schema edits. One Cursor parent, 3 bounded subedits sequentially. Cannot overlap WR10/WR11 on writer-loop/context source; use actual merged baseline before dispatch.

**Human acceptance:** from Writer entrypoint to frozen context, exact prompt assembly, tool result, SQL step, Temporal activity and GA publication in <=2–3 documented hops. No behavioral changes, and a before/after importer, capture identity and request wire hash comparison. Next AI02 must consume the same code without another reorg.

[Source owner map](SOURCE-MAP.md) · [Composer tasks](TASKS.md) · [proof](PROOF.md).
