# Engine concurrency and recovery

**Owner (DOC01 P3):** story locks, outbox, Temporal wake coordination, capture races, recovery.  
**Status:** skeleton + pointers — fold ENG03 capture race matrix, execution.md durable delivery, and engine program concurrency claims here without inventing full ENG03 Done.

## Start here until fold completes

- [Execution and delivery](../platform/execution-and-delivery.md)
- [Chronology and activities](chronology-and-activities.md)
- Engine decisions: `docs/programs/engine/decisions/eng03-*.md` (C1/C2: correct stale “not executed” banners on promote)
- Full ENG03 short-lock remains **Proposed** Change

**Negatives to preserve:** settlement races, provisional capture promotion, interrupted-action capture, no second speculative generation for the same accepted action identity.
