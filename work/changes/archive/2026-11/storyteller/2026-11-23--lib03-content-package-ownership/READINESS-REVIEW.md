# LIB03 | Promotion readiness review, 2026-11-23

**Baseline:** `undertaking/storyteller-workshop@abdce8d7457305baacd13971f116f343562999ff`. LIB01 and LIB02 integrated. Source-verified exports `packages/documents/src/index.ts`, current `schema.ts`, `hash-schema.ts`, `package-reference-schema.ts`, and importer source; 13 named test blocks in `packages/documents/test/documents.test.mjs`. No implementation tests run by planner.

| Gate | Verdict | Evidence |
| --- | --- | --- |
| G0 branch/owner | PASS | User explicitly commissions LIB03; separate short-lived branch/worktree required |
| G1 current source | PASS with change guard | LIB02 extracted checkpoint and package ref schemas; importers and current barrel still in Documents; current test blocks listed in TASKS |
| G2 decisions | PASS | One-way `content-packages → documents`; campaign instantiation to Story Engine; keep stable manifest/storage codecs |
| G3 bounded children | PASS with stop | T01 importers/test extract, T02 instantiation/tests, T03 caller migration, T04 focused tests and integration; reject any newly found consumer/contract contradiction |
| G4 parent | PASS | One Change owner, serialized integrations; no other Documents edits concurrently |
| G5 concurrency | PASS with limits | No shared runtime; avoid parallel source edits with LIB05; LIB04-A disjoint new Storyteller module |
| G6 proof | READY TO RUN | deterministic root-hash fixture comparison and malformed imports + instantiation negatives; test runner moved with tests; failure stops |
| G7 cost/closure | PASS | Source-only, no spend, no cluster, no archive before accepted evidence |

**Exact test ownership from current source:** `documents.test.mjs` cases at starting lines 87, 126, 417, 559 are importer tests; 659, 961, 987 exercise instantiation; lines 50, 153, 203, 223 retain generic storage tests. Cases at 291, 346, 448 combine stored manifest/reference behavior and MUST be inspected before moving: retain pure store/schema invariants in Documents, move only source import/creation assertions with their fixture builders. Never make Documents depend on Story Engine.

**Required proof technique:** Record baseline fixture hashes from pre-edit in tests or same-version fixtures (some test IDs are random); compare equivalent deterministic inputs before/after. Do not assert random-root equality across independent runs. Preserve `world-import`, `rule-import`, `start-import` source parser and error behavior exactly.

**Stop:** if tests cannot move without changing semantics, if a hidden consumer uses removed exports, if post-LIB02 conflicts exist, or if package graph cycles. Return exact file/line and do not widen commission.
