---
name: transactional-correctness-review
description: Investigate or review transactional correctness for Offscreen RPG PostgreSQL/Drizzle, outbox and Temporal execution: state authority, locks, retries, ambiguous provider effects and exactly-once business outcomes. Read-only unless coding explicitly assigned.
---

# Transactional and asynchronous correctness review

**Trigger:** A feature or code change crosses SQL locks, Drizzle transactions, immutable documents, outbox, Temporal activities, at-least-once delivery, retries, external inference billing or accepted-game effects. This is a **coding-agent engineering review**, not the game's Storyteller prompt tuning. Use `architecture-boundary-review` for broader design choices.

Read the affected technical owner and transaction path. Primary references: [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [Temporal docs](https://docs.temporal.io/), [OWASP API authorization](https://owasp.org/API-Security/). Read only relevant sections and the actual installed versions.

## Professional decision reference

For a consequential design/review, select the relevant section of [durable operations and stateful-system choices](../../knowledge/durable-operations.md). It covers when to choose relational modeling, conditional updates, row locks, optimistic versions, serializable transactions, cache/read models, synchronous commands, outbox, queues, Temporal or external integration protocols. If the decision is mainly about module/services/deployment, also consult [architecture decision space](../../knowledge/architecture-decision-space.md). **Compare options before hunting for failures**, and do not require both manuals if one answers the question.

## Trace one operation end to end

1. Name the command identity, owner, expected revision/fence, held resources, possible database writes, document staging, outbox event and external effect. Trace the path from API command through application transaction and worker wake back to public projection.
2. Map **points of no return**: before/after reservation, SQL commit, provider request dispatch, provider response reception, publication and acknowledgement. A network timeout after dispatch is neither a proven failure nor permission to send it again.
3. Analyze at least these interleavings when applicable: duplicate request, two parallel workers, stale expected revision, crash before commit, commit before ack, timeout after external charge, late completion after cancellation, retried publication, stale document root. Use concrete rows/IDs/locks, not slogans.
4. Determine what is **actually exactly once** (business outcome under unique key/revision fencing) versus delivered at least once (workflow/outbox), merely reserved (money), or best effort (external provider). A unit test of a pure helper is not evidence about transaction ordering.
5. Evaluate lock order/deadlocks, account/story isolation, conflict-checked updates, idempotent replay, release vs settle, and whether rollback leaves staged documents or uncertain liabilities observable. Never globally stop unrelated accounts to handle an account-specific error without explicit platform policy.
6. Identify missing tests as **discriminating scenarios**, not 100 copy-pasted fixture cases. Prefer deterministic injected faults/retries over live provider calls or non-disposable database mutation.

## Expected output

`Invariant | evidence (files/symbols + state transition) | most likely failure interleaving | smallest safe fix or clarifying experiment | exact acceptance`.

If recommending a change, supply a bounded transactional slice for Cursor and name what must remain unchanged. Reject generic assertions that a system is "idempotent" without identifying the persistent key, side-effect fence and duplicate delivery behavior. No broad data resets, live inference, or worker/deployment changes without task-specific permission.

**Example:** a late provider settlement exceeds one funding account's reservation. Its stop action must target the liable account; separately defined shared usage windows still constrain all affected operations. A regression must create at least two accounts and demonstrate no unrelated stop, not merely check that the charged account stopped.
