# WR09A | adversarial source-based readiness and proof matrix

**Baseline:** MA08-integrated `6dd1276131a813f694ec3bccf4f9062ad3708208`. **No implementation, SQL or network tests executed by ChatGPT.** Existing P3B tests prove raw SHA and usage, **not** durable private replay.

| G | Cold-read result |
| --- | --- |
| G0 | PASS: correct integration branch/HEAD, strict no-funded-call authority, one custodian |
| G1 | PASS: inspected budget.ts settle body and locks, Writer step/attempt/dispatch, provider transport, Docs structured object, SQL table, P3B and transport tests |
| G2 | PASS: precise prepared transport/preflight API, private CAS document, nullable pointer and shared existing budget TX selected |
| G3 | PASS: T01 schema/CAS; T02 transport; T03 settlement/strict runtime; T04 fake SQL proof; exact edit files and stop on lock contradiction |
| G4 | PASS: T01 first edit legal on MA08 branch, no need to discover a new schema or wallet |
| G5 | PASS: disjoint source/files from MA10 test relocation and MA11 AST graph; provider and SQL resources fake/disposable only |
| G6 | PASS in *design only*: negative tests below distinguish atomicity/security from simply passing TypeScript |
| G7 | PASS: one correctness slice enabling later WR09B, no live provider/auth/Worker scope creep |

**Readiness: READY WITH STRICT FINANCIAL SAFETY STOP.** An executor contradiction in lock hierarchy returns to planner; it is never license to redesign cost policy or mark a failing test Done.

**Mandatory normal/fault tests (fake provider, disposable SQL only):**
1. Without credential/with whitespace key or corrupted wire, `preflight` rejects; no fetch, **no new attempt**, zero reserved amount; when an already-dispatched prior attempt exists, preserve uncertain liability rather than releasing it.
2. Exact prepared wire hash equals `requestCasHash` and expected sha under locked step; altered model/provider/price/attempt/revision/child identity denied pre-send.
3. Strict reserve-to-dispatch SQL acquires advisory `714092631` as **first lock**; concurrent strict requests on same allowance cannot deadlock or dispatch the same step twice.
4. Delivered fake content: private CAS stored/read, linked `responseObjectHash`, legacy raw `resultCasHash=SHA256(serializedResponse)`, attempt charged exactly once, mission state valid. Fresh database/storage reader yields identical original response **without credential** and zero extra fetch/charge.
5. Inject SQL error **after budget settled rows/window writes but before step-pointer CAS**: entire SQL transaction rolls back step pointer, attempt settled state, funding/run counters, operation counters and usage windows. Orphan CAS inert; restarted step dispatched→uncertain, **no retry send**.
6. Known `failed,sent:true` returns failed, preserves usage charge, and commits failure state **atomically**; injected failure rolls both back. `failed,sent:false` confirms unsent, releases reserved allowance and holds; later ambiguous restart never sends on the old attempt.
7. `unknown`, thrown fetch, timeout, missing CAS, corrupt schema/hash, oversized output, wrong mission/context/ordinal/attempt/request SHA all fail closed, no raw body in logs/outbox/player and no new provider send.
8. Legacy `packages/application/test/p3b-writer-provider-custody.integration.test.mjs` (moved by MA10) keeps its exact raw SHA equality, original P3B accounting and WR04 bounded-child research tests. Test this only after joined branch acceptance; WR09A alone does **not** edit/move that file.
9. Old `createStorytellerBudget(...).settle(input)` tests retain unchanged calculated charge, window limits, recoveryFence, idempotent settlement comparisons, settled vs reserved counters.

**Parallel resource negative:** new test must create a unique run-specific disposable DB and cleanup even on assertion failure; never share a fixed database with MA10's migration tests. MA10 postpones its 52 environment-dependent tests until custodial join. **Proof commands from repo root:** `pnpm --filter @offscreen/db build`, `pnpm --filter @offscreen/story-engine build`, `pnpm --filter @offscreen/storyteller build`, `pnpm --filter @offscreen/storyteller test`, scoped disposable `pnpm --filter @offscreen/api-integration ...` as actual script/test harness supports, `git diff --check`, changed-file formatting; report exact PASS/FAIL/SKIP/NOT RUN. **No actual OpenRouter request or protected SQL.**

**Not accomplished by WR09A:** real-model Worker mode, credential host wiring, scene creativity, Launch/continuation admission, live paid proof, long-form campaign, authority/Writer inversion. All remain explicit later goals.
