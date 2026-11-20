# BOOT03 | Migrate existing startFromCandidate into private Game Authority

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: four prepared narrow GA start tasks, dependency-gated and single route writer. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**State:** Done (2026-11-20). Private start admission is on 88ac6c9a: distributed suite 16/16 and compose imported-start 4/4. Cross-pod object storage and checkpoint v2 stay outside this packet. QUEUE stays TURN02.
**Kind:** implementation  
**Selection:** Not selected. [QUEUE.md](../../../../../QUEUE.md) selects TURN02.  
**Program:** [D3 campaign bootstrap](../../../../../designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md) · [DISTURN](../../../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../../../designs/open/distributed-turn-poc/GAPS.md)

**Packet profile:** `CONTRACT`/`STATE` (source-inspected `584b594`). See planner investigation [SOURCE-MAP.md](SOURCE-MAP.md) for exact `startFromCandidate` call path, private GA transport ownership, error states and already-tested offline fixture. It is **not** a runtime pass or a selected implementation. Cursor starts with this route card, reads the map only for the affected symbol or a contradiction.\n\n**Candidate discriminator:** the pinned `startPackage` path requires a `storyteller.profiled.v1` opening candidate, which **may** be generated with `execution.mode=scripted` offline. The older raw `opening.playable.scripted.v1` candidate is explicitly rejected when `startPackage` is present. Reuse `tools/api-integration/test/storyteller-imported-start.integration.ts` instead of weakening `start.ts` to pass a convenient fixture.\n\n## Exact outcome and preconditions

Migrate existing startFromCandidate into private Game Authority. **Preconditions:** BOOT01, DIST03 narrow private GA boundary, DATA02/03 complete scene-1 checkpoint for final acceptance, BOOT02 roots for full cluster test.

The POC must retain current successful opening-candidate admission. A start package is not a successful candidate. It describes reusable pinned world/rule/start content and activation, but an actual generation candidate and associated current draft are validated separately. Existing current source `packages/application/src/stories/start.ts::createStoryStart` requires `candidateId` and `expectedDraftRevision`, and `packages/contracts/src/stories.ts::startStorySchema` preserves this. Reinspect current main and Cursor branches before changes.

## Scope and implementation boundaries

Move exactly the existing startFromCandidate domain write path into the single GA owner, preserving candidateId, expectedDraftRevision, campaign pins and current validation. Nest authenticated public PUT /api/stories/:id/start forwards a versioned private operation with trusted actor assertion, original request identity and bounded timeout; no duplicate Nest-side start SQL writes in distributed mode. GA reads candidate/draft, validates start package+rules/world/activation, stages existing S3 bootstrap objects and first checkpoint according to DATA03, then initializes SQL story/first passage/settings/root/checkpoint atomically. Keep old Compose/local code path via explicit environment composition, not implicit fallback after GA failure; source-origin client retry semantics remain. Ensure no untrusted user-supplied ownerId and no direct Game Authority public ingress.

**Owner files and first-class docs:** Code: apps/api/src/modules/stories/controller.ts and DI boundary, apps/game-authority route/handler from DIST03, packages/application/src/stories/{start,initialization,passage-documents}.ts only for changed domain boundary, versioned DTO in packages/contracts, tests. Technical owner: [Scene checkpoint v1](../../../../../../docs/technical/platform/data-and-persistence.md#scene-checkpoint-v1). Product behavior is unchanged.

**Do not:** invent another creation API, remove existing freeform/scripted pathways, bypass generation status/owner checks with raw SQL, create a fictional Economy service, treat a world-package root as current campaign state, run LLM/image/Stripe providers, import writable source directories into every Pod, or claim a working historical fork based only on the initial source passage.

## Acceptance: normal and discriminating negatives

Repeat a successful start returns same first passage/scene1 root and checkpoint, no duplicates. Wrong user, stale draft, changed package, missing S3 and disallowed rules leave no visible story. Two GA instances race safely. Current Compose tests remain passing.

Minimum test evidence: exact commands and target environment, current source hashes and diff, typed request/response version, source selection and package pins, idempotent repeated start, permission/root mismatch refusal, source-to-technical-doc impact, and all not-run tests labeled honestly. Compare current local/Compose path and target distributed mode independently.

## Evidence tier (provider-free, 2026-11-20 @ `ec73a535`)

| Layer | Command / surface | Result | Tier |
| --- | --- | --- | --- |
| T01 | Start client + API seam tests | **3/3** client + related API tests **PASS** | unit / in-process |
| T02 | GA private `startFromCandidate` handler | **9/9 PASS** (`story-seam.test.ts`) | in-process HTTP |
| T03 | Nest PUT `/stories/:id/start` via distributed seam | **5/5 PASS** | controller/seam tests |
| T04 | `pnpm test:stories:start` → `story-start.integration.js` | **5/5 PASS** | disposable DB; port **3001** free on successful retry; prior `OpeningStateError` `not_found` not seen that run |
| T04 | `storyteller-imported-start.integration.js` (Compose / `withAppIntegration`) | **4/4 PASS** (~5.1s) | `GAME_AUTHORITY_MODE` unset → compose; in-process Nest + spawned Next; **no** private GA child; `STORYTELLER_LIVE_ENABLED=false`; port **3001** free @ `ec73a535` |
| T04 | Nest + GA `test:boot03:imported-start-distributed` | **16/16 PASS** (~91s) on `88ac6c9a` | Prior cases, plus a start package pinned to a different rules root. Re-run in the main checkout against disposable `offscreen_auth_test` |
| T04 | Other rules | **PASS** (400, no story, no selector) | The package imports a changed copy of the SRD subset. Game Authority's default rules stay the unchanged package |
| T04 | Compose `storyteller-imported-start.integration.js` | **4/4 PASS** (~8.2s) on `88ac6c9a` | `GAME_AUTHORITY_MODE` unset. Mechanical obligation coverage still passes |
| T04 | Two Game Authority processes, one quiescent start | **PASS** | Both private PUTs returned 200 or 409, at least one 200. One story, one scene-1 passage, one selector, zero obligations |
| T04 | S3-compatible store unreachable after GA boot | **PASS** (~66s) | GA uses `S3DocumentStore` against adobe/s3mock through a local TCP proxy. Closing the proxy makes `PUT /start` return 503 with no story or selector. This is not a cross-Pod outage |
| T04 | Checkpoint v2 for mechanical openings and world obligations | **NOT THIS CHANGE** | v1 stays quiescent. The first golden campaign does not fork `microbe.v3` |

**Done eligibility:** **Yes** for the original local goal. The 2026-11-20 rerun on `88ac6c9a` is 16/16 distributed and 4/4 compose. Cross-pod S3 and checkpoint v2 are outside this proof.

**Blocker:** none for this goal. Cluster object storage stays with TURN02/TURN03.

Closure index paths named for the close guard: `work/changes/README.md`, `work/IMPLEMENTATION-ROADMAP.md`, `work/changes/ledger/2026-11.md`.

## Parallelization

After DIST03 can split private DTO/handler read-only analysis from BOOT02 fixture import; publication files overlap DATA03 so single integrator and no concurrent write.

Independent authoring or tests may use separate Git worktrees under the repo's parallel Change policy, but shared `apps/api`/GA private endpoints, scene-1 publication and canonical technical headings must be integrated by one owner. Shared Kubernetes cluster commands run under the existing lock. This packet alone is not approval for execution.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended diff | Verification |
| --- | --- | --- |
| Product | Unchanged: text-first D&D-like DM, meaningful authored world/rule pins; no mandatory economy or forced inventory | Existing creation promise, no new product mechanic |
| Technical | changed: docs/technical/platform/data-and-persistence.md#scene-checkpoint-v1 records eligible-start rollback, and a mechanical opening stays outside v1 | Versioned path diagram, negative reading |
| Code | changed: apps/game-authority/src/server.ts forwards start once, and apps/api/src/modules/stories/controller.ts keeps compose on the local seam. Negative: a wrong owner is rejected and leaves no story | Provider-free 16/16 distributed and 4/4 compose proofs |
| Related | changed: work/changes/README.md, work/IMPLEMENTATION-ROADMAP.md, and work/changes/ledger/2026-11.md record this packet Done, while QUEUE stays TURN02 | Wiki and Change guards, link repair |

## Absorbed BOOT01 cases (2026-11-19)

HK09 cancelled BOOT01 as superseded. These cases are covered by the existing start guard and the recorded distributed suite; they are not a second unimplemented API.

- A start package alone does not start a story.
- Raw `opening.playable.scripted.v1` plus `startPackage` is rejected.
- A rules root the authority does not use is rejected.
- A succeeded Storyteller-kind opening with the pinned package can start once.

## Reconciliation ledger (complete at closure)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product gameplay start promise | product | unchanged: a start still needs the same candidate, draft revision, and pins | packages/application/src/stories/start.ts @ 88ac6c9a | fixture-tested | wrong owner returns 404 and leaves no story | QUEUE stays TURN02 |
| docs/technical/platform/data-and-persistence.md#scene-checkpoint-v1 | technical | changed: an eligible start rolls back when the staged checkpoint does not match, and a mechanical opening stays outside v1 | packages/application/src/stories/start.ts @ 88ac6c9a | fixture-tested | microbe.v3 commits an obligation and no selector; a missing checkpoint object leaves no story | technical heading already on main |
| Game Authority private start | technical | changed: Nest forwards start to the private Game Authority route | apps/game-authority/src/server.ts @ 88ac6c9a | fixture-tested | Game Authority down and a bad token return 503 with no story | no public ingress was added |
| tools/api-integration/test/boot03-imported-start-distributed.integration.ts | technical | unchanged: this row records the latest suite, not a new product rule | tools/api-integration/test/boot03-imported-start-distributed.integration.ts @ 88ac6c9a | fixture-tested | other rules return 400 and leave no story or selector; 16/16 PASS on 88ac6c9a | catalog, roadmap, and ledger name this Done packet |

Archive only after actual evidence and `pnpm wiki:change-guard --mode plan` / `--mode close` where applicable; no automatic next packet.
