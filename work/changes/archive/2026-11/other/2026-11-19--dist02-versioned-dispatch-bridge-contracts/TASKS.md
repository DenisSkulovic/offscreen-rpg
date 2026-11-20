# DIST02 | Cancelled tasks (historical, do not execute)

**Disposition (2026-11-20):** [Change cancellation](CHANGE.md#terminal-disposition--source-audit-2026-11-20). T01–T03 were never implemented and are not remaining work. The rejected RabbitMQ→Temporal bridge does not return, and the optional fact DTO has no independent consumer. A new actual consumer would start with a new separately authorized Change. This file is historical evidence, not a task queue.

**Baseline:** 584b594. **State:** Proposed/unselected; optional independent consumer. **Model:** Composer Standard. **Do not execute merely because Storyteller POC needs Temporal.**

**Current source:** `apps/worker/src/outbox/dispatch.ts:noticeDispatch` maps durable outbox topics to **direct Temporal** workflow start/signal. `packages/application/src/storyteller/records.ts:storytellerTopic` is a workflow wake. `docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows` rejects routing those through RabbitMQ. Existing source has no canonical application `scene.published.v1` derived fact contract.

## T01 | Optional strict pure business fact schema | PLANNER-READY **only after independent projection selected**
**Write:** one `packages/contracts/src/` versioned strict schema and parser test, with eventId, storyId, committed passage ID, revision, exact root hash, causation and visibility-safe references. Reject unknown version, body with workflow wake lease/operation command fields, arbitrary narrative text and private document content. **Positive:** stable authorized committed root produces parsed fact. **Negative:** duplicate/unknown version and wake-shaped payload fail; DTO has no dispatchAuthority or permission to start Temporal. No worker runtime edits, no cluster.

## T02 | Mapping from committed publication only | DEPENDS ON T01
One narrow pure mapper at existing publication/dispatch owner, not a second SQL scene writer. Event exists only after a committed publication; no speculative “accepted means published” emission. Test duplicate fact event ID and out-of-order committed revisions. **STOP:** if no explicit publication hook/visibility source exists, planner supplies source-backed connection instead of Cursor guessing.

## T03 | Broker consumer only if separately chosen | GATED ON DIST04
Distinct subscriber owns only read-model inbox and projection; never starts/signals a Temporal workflow. An absent broker must not block command→Temporal→scene. **No Grok or speculative service required for first playable POC.**
