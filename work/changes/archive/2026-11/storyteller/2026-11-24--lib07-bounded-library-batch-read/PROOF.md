# LIB07 | Required regression
- Input path count 1–8, no duplicates, stable order.
- No raw hash lookup, no root switch, no call to unauthorized document bypassing navigator.
- Each existing navigator.open rechecks authorization; midbatch revocation fails all.
- Only not-found maps to generic unavailable; corrupt source, stale root and authorization reject batch.
- Per-file character budget, total serialized JSON <=32 KiB including metadata, UTF-8 multibyte counts correctly; no oversized partial data.
- Returned successful item carries exact authoritative root, document and revision identifiers; no LLM tool/schema changes.
- No tests run by planner. **Readiness:** verify post-LIB06 source API and exact test harness, then promote.
