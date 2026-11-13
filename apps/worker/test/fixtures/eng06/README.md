# ENG06 replay corpus

`manifest.json` is rewritten by `eng06-workflow-replay.live.test.ts` against the local Temporal service. Histories are replayed from in-memory `fetchHistory()` objects (JSON round-trip corrupts protobuf Duration/Timestamp WKTs in SDK 1.24.0).

Incompatible negative uses `@offscreen/workflows/eng06-incompatible` (extra `sleep` before the first Activity).
