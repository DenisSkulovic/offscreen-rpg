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

**Blocker for Done:** S3 staging failure negative and authorized permanent-doc reconciliation remain open. Two-process imported-start **8/8 PASS** (happy, idempotent retry, GA down/bad token, raw playable+startPackage, foreign owner, stale revision).

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

**NOT-RUN this batch:** remaining discriminating negatives from recipe below; `pnpm test:focus storyteller` package sweep; permanent technical-heading reconciliation (authorized separate slice — not DIST01/DIST03/ENG03 shared headings).

**Write (still open):** named BOOT03 tests and affected canonical technical headings only; evidence/Change status receipt as authorized. **Read:** tools/api-integration/test/storyteller-imported-start.integration.ts, stories/start.ts, scene-checkpoint.ts and selected private route tests.

**Positive (remaining):** same imported world/rule/start pin; scripted Storyteller-kind opening admitted through private GA; first passage/root/checkpoint, identical retry idempotent. **Negative (remaining):** raw playable scripted candidate **with** startPackage rejected, wrong actor/root/draft revision rejected, S3 staging failure leaves no selector.

**Execution order:** T01 → T02 → T03 → T04. T04 remains **open**.
