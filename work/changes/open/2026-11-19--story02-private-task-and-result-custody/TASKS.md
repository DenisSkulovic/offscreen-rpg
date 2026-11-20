# STORY02 | Composer microtasks: private task custody façade

**Inspected source:** 584b594, 2026-11-19. **Change:** [CHANGE.md](CHANGE.md), Proposed/unselected, custody SQL primitive partially landed; remote service not. **Source map:** [SOURCE-MAP.md](SOURCE-MAP.md). **Executor:** Composer Standard only by default. One Game Authority file-owner coordinator together with BOOT03. Do not treat a TASKS.md as independent authorization.

### Invariants already decided

The existing createStorytellerTaskCustody facade implements fetchCommittedGeneration, claimGeneration, saveValidatedResult, readValidatedResult. It uses a database transaction and storyteller_attempt.attribution.custody, with exact pinnedRoot and first-saved-result hash checks. **Claim with created:false is deduplication, NOT an exclusive provider-send lease.** It must never authorize a second paid wire. The existing worker execution+publication remains unchanged until STORY03. No new attempt/funding schema or global document read rights.

## T01 | Private wire schemas only | PLANNER-READY
**DEPTH=PATCH | MODEL=Composer Standard.** Requires agreed private version (existing /internal/v1), no active contracts editor collision. **Write:** packages/contracts/src/ owning internal DTO module and focused parser tests. **Read:** execution.ts types FetchedStorytellerGeneration, StorytellerClaimOutcome, StorytellerSaveOutcome, StorytellerReadOutcome and storytellerTaskSchema; GA server existing route shapes.

**Algorithm:** expose exact versioned task GET/claim PUT/result PUT/read-saved GET schema with generationId and pinnedRoot, normalized status/refusal and size bound. A result payload must match existing validateStorytellerResult and canonical hash, not a new bespoke scene schema. No worker-supplied ownerId trust. **Negative:** wrong format, mismatched identity and oversized body refuse before DB. **Stop:** task schema cannot be safely represented without redesign; return concrete DTO mismatch. **Receipt:** schemas, unit parser count.

## T02 | Role-scoped Game Authority custody endpoints | PLANNER-READY
**DEPTH=PATCH | MODEL=Composer Standard.** Requires T01 and private GA transport ownership. **Write:** apps/game-authority/src/{server,application,bootstrap/main}.ts and dedicated test; coordinate BOOT03 path writer. **Read:** routeFor/authorized/readBody/error handling and existing custody creation in packages/application/src/storyteller/execution.ts.

**Algorithm:** use **a separate executor credential**, with least-permission task GET, claim, saved-result PUT/read. Derive trusted owner/story/root from generation and DB, not request headers. The executor role must not reach existing /internal/v1/stories read/resolution, start, fork or future publish. Keep existing Nest→GA credential for story routes, and reserve a separate control identity for STORY03 publication. Preserve bounded request body/timeout/response size; do not accidentally remove the old 64 KiB limit globally. **Negative:** executor credential cannot call a game-write route; wrong root/refusal does not mutate attempts. **Stop:** if auth config cannot distinguish roles cleanly, request narrow planner correction rather than share superuser token.

## T03 | Tiny executor HTTP client, no SQL dependency | PLANNER-READY
**DEPTH=PATCH | MODEL=Composer Standard.** Requires T01/T02. **Write:** a small private client module in apps/worker/src or separate isolated worker package, plus mock HTTP tests; no Temporal changes. **Read:** existing GA internal client pattern in apps/api/src/modules/stories/game-authority-client.ts, T01 DTO and STORY03 SOURCE-MAP.

**Algorithm:** implement fetch(task), claim(root), save(resultHash,result), readSaved() with explicit executor-only token, bounded timeouts and response schemas. No DATABASE_URL or raw S3 mutation in this worker client. No model call or publication in this task. **Negative:** token rejected, mismatched root, malformed JSON or timeout is typed unavailable/refused and is not retried into a second claim with a different ID. **Stop:** broader worker boot/change needed; return exact missing constructor rather than redesign all worker runtime.

## T04 | Two-client persistence and auth proof | VERIFY PASS (`ec73a535`, 2026-11-20)
**DEPTH=VERIFY | MODEL=Composer Standard.** Baseline inspect @ `ec73a535` (working tree dirty, unrelated paths). Requires T01–T03, authorized disposable PG test DB `offscreen_auth_test` via `DATABASE_TEST_URL`.

**Executed (2026-11-20):** provider-free custody proof suites **10/10 PASS** total:
- `packages/application/test/story02-task-claim.test.mjs` → **4/4 PASS**
- `apps/game-authority/test/storyteller-task-custody.test.ts` → **3/3 PASS**
- `apps/game-authority/test/storyteller-task-custody-persistence.integration.test.ts` → **3/3 PASS** (disposable PG)

**Positive:** two separate private HTTP clients claim the same generation → one persisted attempt ID; same valid fake result hash saved twice → idempotent; read-saved returns exact hash.

**Negative:** conflicting result hash refused; wrong pinned root refused; missing or wrong story token → **401** / no task reveal. Generation row remains pending with null `attemptId`/`output` until **STORY03** adoption.

**Not claimed:** cross-Pod, Kubernetes, or multi-process executor races beyond two HTTP clients in one test process. Change **not Done**. Packet receipt: [CHANGE.md](CHANGE.md) (T04 section). Permanent headings reconciled: `docs/technical/storyteller/generation-and-publication.md#remote-task-custody`, `docs/architecture/03-data-and-transactions.md`, `docs/architecture/07-client-and-trust.md`.

**Order:** T01 → T02 → T03 → T04. The facade itself is not a new provider send lease, an executor Pod or a published scene. **No tests were executed by this planning commit.**
