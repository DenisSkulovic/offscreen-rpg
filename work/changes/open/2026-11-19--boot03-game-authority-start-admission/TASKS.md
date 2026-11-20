# BOOT03 | Composer microtasks: authoritative opening start

**Baseline reviewed:** 584b594 (2026-11-19). **Verify SHA:** `ec73a535` (2026-11-20 batch). **Change:** [CHANGE.md](CHANGE.md), **Proposed / not Done**. **Profile:** CONTRACT/STATE. **Planner map:** [SOURCE-MAP.md](SOURCE-MAP.md). **Default executor:** Composer 2.5 Standard; parent remains Composer. One GA router writer at a time, coordinated with DIST03 and STORY02. Packet receipt below is **partial**; it does not select the Change or satisfy closure guards.

### Batch evidence tier (provider-free, 2026-11-20 @ `ec73a535`)

| Task | Check | Result | Notes |
| --- | --- | --- | --- |
| T01 | Start remote client unit tests | **3/3 PASS** | URL/method, actor/body fidelity, success DTO shape |
| T01 | Related API seam/client tests (batch) | **PASS** | Counted with T01 receipt; no new auth policy |
| T02 | GA private start handler (`story-seam.test.ts` start path) | **9/9 PASS** | Credential, owner, body bound; no start side effects on negatives |
| T03 | Nest distributed start via seam | **5/5 PASS** | Compose path unchanged; GA unavailable does not call local writer |
| T04 | `tools/api-integration` `story-start.integration.js` (`pnpm test:stories:start`) | **5/5 PASS** | Port **3001** free on winning retry; `OpeningStateError` / `not_found` **not** observed that run |
| T04 | `storyteller-imported-start.integration.js` (Compose imported-start) | **4/4 PASS** (~5.1s) | `GAME_AUTHORITY_MODE` unset → compose; `withAppIntegration` in-process Nest + spawned Next; **no** private GA child; `STORYTELLER_LIVE_ENABLED=false`; port **3001** free @ `ec73a535` |
| T04 | Live Nest → private GA imported-start (two-process) | **8/8 PASS** (~12s) | `test:boot03:imported-start-distributed`; happy + idempotent; GA down / bad token **503**; raw playable+startPackage **400**; foreign owner **404**; stale revision **409**; no story row on negatives |
| T04 | Canonical technical headings / atlas reconciliation | **NOT-RUN** | PACKET-only receipt; do not edit DIST01 execution-and-delivery, DIST03 topology, or ENG03 concurrency here |

**Planner answer to BOOT03 question (2026-11-20):** **Do not require fork of `microbe.v3` or its executable obligation in BOOT03 or in the first TURN03 golden.** The current intentional v1 exclusion is correct, and the mechanical/obligation test must continue asserting no selector. [Fixture and future-v2 decision](../../../designs/open/distributed-turn-poc/DECISION-2026-11-20--GOLDEN-FORK-SCOPE.md). **Important separate TURN03 defect:** its Harbor-watch golden start package embeds an executable obligation, despite `worldObligations: []` on the request, which makes its scene1 ineligible; fix its *fixture* under TURN03 T01, not by changing BOOT03's start transaction. **Remaining BOOT03 T04 gates** are real disposable S3-compatible store outage, two actual GA processes racing the same start, and closure reconciliation. Do not wait for checkpoint v2 or archive without these proofs.

**Blocker for Done:** the packet stays Proposed. Plan guard is ok. Close guard against `84ad45fb` is ok and warns that the planned-impact heading does not match the guard's expected section title. `pnpm test:boot03:imported-start-distributed` is **16/16 PASS**. A start package pinned to a changed rules root returns 400 and leaves no story. Compose `storyteller-imported-start.integration.js` is **4/4 PASS**. `microbe.v3` still has no v1 selector.

### Source contract (settled, do not investigate again)

- Existing public PUT /stories/:id/start goes to StoriesController.startFromCandidate and calls local this.stories.startFromCandidate.
- Existing remote StorySeam has read/admitResolution only. GA has a private read/resolution router with bearer auth, version headers, owner context, error mapping and bounded body.
- Existing createStoryApplication/startFromCandidate remains the domain owner; preserve staged immutable document + SQL transactional start.
- A pinned startPackage requires a **succeeded Storyteller-kind** opening candidate. A Storyteller opening with scripted execution is allowed; raw opening.playable.scripted.v1 with startPackage is **rejected** in stories/start.ts. Use storyteller-imported-start.integration.ts fixture. Never weaken the guard for a demo.

## T01 | Contract and remote-client shape | VERIFY PASS (`ec73a535`)
**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** Requires chosen DIST03 HTTP version, verified current HEAD; coordinate with STORY02 internal contracts editor.

**Write:** apps/api/src/modules/stories/game-authority-client.ts and its focused client tests; shared contracts path only if current DTO schemas cannot be reused (ask planner before adding a new independent public start payload). **Read:** StoriesController.startFromCandidate, startStorySchema, current StorySeam.read/admitResolution, GA internal server routing.

**Algorithm:** add StorySeam.startFromCandidate(ownerId, storyId, validated start input) whose remote variant forwards actor and exact validated start schema over a **private versioned PUT**. Keep the existing Compose implementation direct. Use existing bounded timeout/auth/version/error mapping, no implicit fallback when distributed GA fails. Preserve exact expectedDraftRevision/candidateId and startPackage reference; don't synthesize it from the importer.

**Positive:** unit test verifies remote URL/method, actor and body fidelity, and success DTO matches local shape. **Negative:** GA unavailable or mismatched version returns unavailable/conflict; never calls local writer in distributed mode. **Stop:** unknown current request body/response DTO; return exact source mismatch. **Receipt:** touched contract/client and tests, no new auth policy.

## T02 | GA private start handler | VERIFY PASS (`ec73a535`, 9/9)
**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** Requires T01 DTO finalized and private GA route owner unlocked.

**Write:** apps/game-authority/src/{server,application}.ts and apps/game-authority/test/story-seam.test.ts. **Read:** current routeFor/handle auth/body limit, createGameAuthoritySeam, createStoryApplication.startFromCandidate, contract from T01.

**Algorithm:** add private start route under same GA namespace; enforce existing service bearer and validated owner identity before invoking exactly one application.startFromCandidate. Preserve request-size bound and return mapping; never expose route on public Gateway. Do **not** move start's S3 staging/SQL transaction into HTTP handler or add another writer service.

**Positive:** private valid owner + supported candidate calls application once and returns same committed start shape. **Negative:** wrong token, wrong owner, stale expectedDraftRevision and corrupt candidate have **no** start side effects. **Stop:** auth/body contracts unavailable or conflict with STORY02 edits; defer merge to one GA integrator.

## T03 | Nest route uses selected seam | VERIFY PASS (`ec73a535`, 5/5)
**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** Requires T01/T02 in branch and current constructor injection checked.

**Write:** apps/api/src/modules/stories/controller.ts plus corresponding controller tests. **Read:** startFromCandidate route, game-authority-client.ts, current read/admitResolution routing tests.

**Algorithm:** in distributed mode call this.seam.startFromCandidate with parsed input and authenticated owner; in Compose preserve old local this.stories.startFromCandidate path. Preserve path/status/body/validation. Do not create a second public start route. No DB direct write fallback if private GA down.

**Positive:** distributed route invocation observed to GA; Compose regression unchanged. **Negative:** GA unavailable does not call local stories and does not pretend campaign started. **Stop:** dependency injection/schema mismatch outside these named paths.

## T04 | Integration and permanent-doc reconciliation | PARTIAL VERIFY (`ec73a535`)
**MODEL=Composer 2.5 Standard | DEPTH=VERIFY then PATCH only if explicitly selected.** T01–T03 **PASS** on this batch; full acceptance **not** met.

**Executed (2026-11-20):** `pnpm test:stories:start` → `story-start.integration.js` **5/5 PASS** @ `ec73a535`; disposable DB path; port 3001 available on successful retry.

**Executed (2026-11-20, Compose slice):** `storyteller-imported-start.integration.js` **4/4 PASS** (~5.1s) @ `ec73a535`; `GAME_AUTHORITY_MODE` unset → compose; `withAppIntegration` (in-process Nest + spawned Next); **no** private GA child; `STORYTELLER_LIVE_ENABLED=false`; port **3001** free.

**Executed (2026-11-20, two-process):** `pnpm --filter @offscreen/api-integration test:boot03:imported-start-distributed` → **4/4 PASS** (~8.7s). GA bootstrap `defaultRules` restored onto story seam only (STORY02 custody/publication unchanged).

**Executed (2026-11-20, parent `13bcd6cf`):** `pnpm test:boot03:imported-start-distributed` **13/13 PASS** (~8.2s). The mechanical fixture asserts its remapped obligation, active offer, source pin, idempotent retry, and zero v1 selector rows. A separate quiescent fixture asserts one scene-1 selector, a readable checkpoint object, the canon root, the same hash after retry, and a 409 when the retry pace changes. An eligible start whose staged checkpoint object is missing or corrupt rolls back with no story row. `data-and-persistence.md` records that distinction.

**Executed (2026-11-20, parent `8796daaa`):** `pnpm test:boot03:imported-start-distributed` **15/15 PASS** (~75s). Two Game Authority processes raced one quiescent start and left one passage and one scene-1 selector. Closing the TCP proxy in front of adobe/s3mock made the eligible start return 503 with no story. The mechanical fixture still has no v1 selector.

**NOT-RUN this batch:** closure guard, disallowed-rules case, cross-Pod S3, `pnpm test:focus storyteller`. DIST01, DIST03, and ENG03 were not edited.

**Write (still open):** named BOOT03 tests and affected canonical technical headings only; evidence/Change status receipt as authorized. **Read:** tools/api-integration/test/storyteller-imported-start.integration.ts, stories/start.ts, scene-checkpoint.ts and selected private route tests.

**Positive:** quiescent scene-1 selector, identical retry, and the two-process race are covered. The mechanical opening stays outside v1. **Negative:** other rules, s3mock unreachable, missing or corrupt checkpoint object, deleted local start object, wrong actor, stale draft, and raw playable plus startPackage are covered.

**Execution order:** T01 → T02 → T03 → T04. T04 remains **open**.
