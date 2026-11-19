# BOOT03 | Composer microtasks: authoritative opening start

**Baseline reviewed:** 584b594 (2026-11-19). **Change:** [CHANGE.md](CHANGE.md), Proposed/unselected. **Profile:** CONTRACT/STATE. **Planner map:** [SOURCE-MAP.md](SOURCE-MAP.md). These are implementation-ready **task recipes for selection**, not evidence that an endpoint or tests already work. A T-ID does not override the central Change selection guard. **Default executor:** Composer 2.5 Standard; parent remains Composer. One GA router writer at a time, coordinated with DIST03 and STORY02.

### Source contract (settled, do not investigate again)

- Existing public PUT /stories/:id/start goes to StoriesController.startFromCandidate and calls local this.stories.startFromCandidate.
- Existing remote StorySeam has read/admitResolution only. GA has a private read/resolution router with bearer auth, version headers, owner context, error mapping and bounded body.
- Existing createStoryApplication/startFromCandidate remains the domain owner; preserve staged immutable document + SQL transactional start.
- A pinned startPackage requires a **succeeded Storyteller-kind** opening candidate. A Storyteller opening with scripted execution is allowed; raw opening.playable.scripted.v1 with startPackage is **rejected** in stories/start.ts. Use storyteller-imported-start.integration.ts fixture. Never weaken the guard for a demo.

## T01 | Contract and remote-client shape | PLANNER-READY
**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** Requires chosen DIST03 HTTP version, verified current HEAD; coordinate with STORY02 internal contracts editor.

**Write:** apps/api/src/modules/stories/game-authority-client.ts and its focused client tests; shared contracts path only if current DTO schemas cannot be reused (ask planner before adding a new independent public start payload). **Read:** StoriesController.startFromCandidate, startStorySchema, current StorySeam.read/admitResolution, GA internal server routing.

**Algorithm:** add StorySeam.startFromCandidate(ownerId, storyId, validated start input) whose remote variant forwards actor and exact validated start schema over a **private versioned PUT**. Keep the existing Compose implementation direct. Use existing bounded timeout/auth/version/error mapping, no implicit fallback when distributed GA fails. Preserve exact expectedDraftRevision/candidateId and startPackage reference; don't synthesize it from the importer.

**Positive:** unit test verifies remote URL/method, actor and body fidelity, and success DTO matches local shape. **Negative:** GA unavailable or mismatched version returns unavailable/conflict; never calls local writer in distributed mode. **Stop:** unknown current request body/response DTO; return exact source mismatch. **Receipt:** touched contract/client and tests, no new auth policy.

## T02 | GA private start handler | PLANNER-READY
**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** Requires T01 DTO finalized and private GA route owner unlocked.

**Write:** apps/game-authority/src/{server,application}.ts and apps/game-authority/test/story-seam.test.ts. **Read:** current routeFor/handle auth/body limit, createGameAuthoritySeam, createStoryApplication.startFromCandidate, contract from T01.

**Algorithm:** add private start route under same GA namespace; enforce existing service bearer and validated owner identity before invoking exactly one application.startFromCandidate. Preserve request-size bound and return mapping; never expose route on public Gateway. Do **not** move start's S3 staging/SQL transaction into HTTP handler or add another writer service.

**Positive:** private valid owner + supported candidate calls application once and returns same committed start shape. **Negative:** wrong token, wrong owner, stale expectedDraftRevision and corrupt candidate have **no** start side effects. **Stop:** auth/body contracts unavailable or conflict with STORY02 edits; defer merge to one GA integrator.

## T03 | Nest route uses selected seam | PLANNER-READY
**MODEL=Composer 2.5 Standard | DEPTH=PATCH.** Requires T01/T02 in branch and current constructor injection checked.

**Write:** apps/api/src/modules/stories/controller.ts plus corresponding controller tests. **Read:** startFromCandidate route, game-authority-client.ts, current read/admitResolution routing tests.

**Algorithm:** in distributed mode call this.seam.startFromCandidate with parsed input and authenticated owner; in Compose preserve old local this.stories.startFromCandidate path. Preserve path/status/body/validation. Do not create a second public start route. No DB direct write fallback if private GA down.

**Positive:** distributed route invocation observed to GA; Compose regression unchanged. **Negative:** GA unavailable does not call local stories and does not pretend campaign started. **Stop:** dependency injection/schema mismatch outside these named paths.

## T04 | Integration and permanent-doc reconciliation | PLANNER-READY
**MODEL=Composer 2.5 Standard | DEPTH=VERIFY then PATCH only if explicitly selected.** Requires T01-T03 and approved disposable test DB.

**Write:** named BOOT03 tests and affected canonical technical headings only; evidence/Change status receipt as authorized. **Read:** tools/api-integration/test/storyteller-imported-start.integration.ts, stories/start.ts, scene-checkpoint.ts and selected private route tests.

**Positive:** same imported world/rule/start pin; scripted Storyteller-kind opening admitted through private GA; first passage/root/checkpoint, identical retry idempotent. **Negative:** raw playable scripted candidate **with** startPackage rejected, wrong actor/root/draft revision rejected, S3 staging failure leaves no selector. **Run:** verify supported scripts at HEAD; use focused test runner with only an approved disposable offscreen_auth_test DB (pnpm test:focus story-start; pnpm test:focus storyteller), then package tests; report exact test cases, not just a green build. **Stop:** test runner would reset valuable DB, cluster occupied, or source assertion differs. **Docs:** technical topology, story initialization contract, architecture atlas chapter 1/2/6 with current evidence.

**Execution order:** T01 → T02 → T03 → T04. A single tiny Composer task at a time; no independent role reasoning. **No implementation or multi-Pod proof occurred when this file was authored.**
