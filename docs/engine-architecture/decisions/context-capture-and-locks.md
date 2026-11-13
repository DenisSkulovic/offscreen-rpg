# Architecture decision study | short story lock, immutable context preparation

**Status:** preferred target, **not** implementation-ready. Source inspection 2026-11-13: [`campaign/actions.ts`](../../../packages/application/src/campaign/actions.ts), [`campaign/narration.ts`](../../../packages/application/src/campaign/narration.ts), [`storyteller/context.ts`](../../../packages/application/src/storyteller/context.ts), [`storyteller/publication.ts`](../../../packages/application/src/storyteller/publication.ts). This is a *critical-section design*, not a demand for a new service.

## The real product cost

A player should not experience “I clicked a valid choice; the game froze” because the engine is scanning an old story and waiting for object storage while holding their story's write lock. A solo story may rarely conflict; a shared party and provider-backed documents make this more likely. PostgreSQL row locks are held through transaction completion ([official docs](https://www.postgresql.org/docs/current/explicit-locking.html)).

**Observation:** the admission path holds the story lock and assembles context from SQL and an optional document store. The present store is local; **no measured lock-latency regression has been observed**.

## Three alternatives

| Strategy | Advantages | Failure mode | Verdict |
| --- | --- | --- | --- |
| **A. Everything inside one serializing transaction** (today, for some tasks) | Source cannot change mid-assembly; simple to reason about | Remote I/O increases lock duration; can starve party commands; failed object read aborts accepted action | Safe baseline, poor long-term operating model |
| **B. Read everything outside transaction without a version fence** | Very short database locks | Stale evidence, stale actor/rules, wrong item ownership, paid work based on a nonexistent source | **Reject** |
| **C. Short captured-authority transaction → source materialization outside lock → fenced commit/publication** | Consistent frozen inputs, bounded lock hold, safe retry and scalable remote CAS | Requires captured task/intent state and two-phase orchestration; stale facts must be handled explicitly | **Preferred direction** |

## Proposed phase structure

### Phase 1: authoritative admission/capture (short SQL transaction)

Under owner/actor and story row lock:
1. Revalidate immutable operation ID, offer/version, actor control, available commitments, relevant rule version and explicit authorization.
2. Record the **accepted action** and any immediate canonical changes, with receipt/revision as applicable. Never defer a dice/resource mutation behind an external object read merely to prepare prose.
3. Create a durable **context-build intent** containing exact *references*, not an enormous duplicated conversation:
   - story, source passage/revision, effective actor and intended action;
   - fixed rule/settings/usage snapshot identities;
   - SQL current-state projection ID/version or a minimal exact frozen mechanical context;
   - canonical root hash/revision, required passage IDs, discovered knowledge scope;
   - task purpose, output/byte/read/round budget and permitted visibility;
   - idempotent build operation ID.
4. Enqueue durable preparation (outbox) inside that transaction. No model provider or object-store read is required while holding the story lock.

**Guard:** this must work even if subsequent narrative publication changes the source. An admitted action is not undone merely because the preparation is delayed.

### Phase 2: immutable materialization and bounded source validation (outside story write lock)

The worker:
- loads the captured immutable root and source documents by **hash**;
- verifies bytes/schema/visibility, source versions and covered evidence;
- reads any needed SQL ledger data with captured version constraints, not mutable “latest” aliases;
- builds the actual finite provider message and records included/omitted evidence;
- persists the exact artifact/request/hash before any paid dispatch;
- records a specific failure/hold if source unavailable or required evidence cannot fit.

Materialization may take seconds with remote CAS and still not block new game commands. If the same exact build is retried, it produces the same source-grounded artifact, or a typed held/error state; it does not silently grab new facts.

### Phase 3: fenced publication/transition (short SQL transaction)

Under story lock:
- check operation/generation identity, current narrative/actor authority and captured source revision/root;
- verify the actual committed mechanic if the task narrates an outcome;
- publish candidate source/descriptive changes only if it fits the target current situation;
- if facts changed, classify **stale source / admissible historical report / must regenerate or rebase** according to purpose, rather than blindly publishing;
- atomically promote a staged immutable root with SQL commit and outbox downstream view/index notices;
- never reapply already settled game effects because publication is retried.

The current implementation already stages immutable output outside final publication transaction. **Re-use that pattern** for context preparation where it helps; do not introduce a second “staging engine.”

## What happens if the world changes while context builds?

Different tasks deserve **different staleness policies**:

| Task | Legitimate frozen basis | World changed before output | Correct response |
| --- | --- | --- | --- |
| A finite action's committed receipt | Receipt + captured rule/action state | Later unrelated event | Narrate as **historical result** if supported; current next scene needs fresh situation |
| A controlling new decision/scene | Current narrative revision, actor scope, source root | Relevant source or actor state changed | Hold as stale/reprepare from current authority |
| Optional historical report | Saved event and source passage | World has progressed | Publish read-only report to original hook, not replace current choice |
| An opening candidate | Draft revision/pinned world and profile | Draft changed before Start | Candidate invalid for changed draft; no silent adoption |
| Custom-intent interpretation (future) | Reviewed text and known situation | Target/rule eligibility changed | Revalidate and potentially clarify/deny at admission |
| Memory index rebuild | Immutable root and index format | New root committed | Store index for old root, mark current index stale; rebuild later |

**Do not over-fence every historical report on latest narrative revision.** That would lose useful work during ordinary progression; the immutable event basis is enough for its own read-only hook.

## Why a full SQL snapshot outside the transaction is not the answer

A PostgreSQL transaction-level MVCC snapshot generally should not be held open during network I/O or paid model calls. It can pin old row versions, impede vacuum and tie up connections. Use **small immutable state captures plus versioned references**, then release DB connection promptly.

Do not stage potentially large document bodies into a hot SQL JSON column merely to avoid external reads; preserve references to shared immutable source objects and capture only small authoritative mechanical facts needed for validation.

## Proof that would justify changing source

**Baseline first:** instrument one representative admission to measure transaction length, row-lock wait, local/CAS read duration and number of objects loaded. Reproduce a concurrent second command under artificially slow object storage. No live player data.

**Refactor proof:** with an injected 2s object read, another authorized action on the same story is blocked **only where the first accepted action genuinely owns a conflicting decision**, not because unrelated context materialization holds the lock. Admission still produces one receipt, context still matches captured canon, stale publication can't overwrite new source, no extra paid request.

**Negative tests:** same operation two preparation wakes; missing CAS object; actor capability changed; root changed; old report published after new scene; extra model round withheld; network timeout after provider accepted.

**Important qualification:** in a single-actor story, the first accepted action may correctly block a second incompatible action regardless of lock time. The test must distinguish **logical authority conflict** from **unnecessary database lock contention**. Faster lock alone doesn't make conflicting game actions legal.

## No code readiness yet

Before Cursor receives this, define the exact captured-context schema, task-category staleness matrix, old-task compatibility, migratability of any pre-existing in-flight generation, outbox lifecycle and explicit performance target. The current source's transaction invariants are more valuable than a premature async rewrite.
