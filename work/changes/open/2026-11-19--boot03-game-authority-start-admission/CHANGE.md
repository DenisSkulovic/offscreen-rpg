# BOOT03 | Migrate existing startFromCandidate into private Game Authority

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: four prepared narrow GA start tasks, dependency-gated and single route writer. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**State:** Proposed; dependency-gated (2026-11-19). **Batch receipt (T04 slice, 2026-11-20):** unit/seam/start-integration tiers **PASS** @ `ec73a535`; imported-start Compose **4/4 PASS**; two-process discriminator **4/4 PASS**; **not Done**.  
**Kind:** implementation  
**Selection:** Not currently selected; existing active Cursor batch remains untouched.  
**Program:** [D3 campaign bootstrap](../../../designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../designs/open/distributed-turn-poc/GAPS.md)

**Packet profile:** `CONTRACT`/`STATE` (source-inspected `584b594`). See planner investigation [SOURCE-MAP.md](SOURCE-MAP.md) for exact `startFromCandidate` call path, private GA transport ownership, error states and already-tested offline fixture. It is **not** a runtime pass or a selected implementation. Cursor starts with this route card, reads the map only for the affected symbol or a contradiction.\n\n**Candidate discriminator:** the pinned `startPackage` path requires a `storyteller.profiled.v1` opening candidate, which **may** be generated with `execution.mode=scripted` offline. The older raw `opening.playable.scripted.v1` candidate is explicitly rejected when `startPackage` is present. Reuse `tools/api-integration/test/storyteller-imported-start.integration.ts` instead of weakening `start.ts` to pass a convenient fixture.\n\n## Exact outcome and preconditions

Migrate existing startFromCandidate into private Game Authority. **Preconditions:** BOOT01, DIST03 narrow private GA boundary, DATA02/03 complete scene-1 checkpoint for final acceptance, BOOT02 roots for full cluster test.

The POC must retain current successful opening-candidate admission. A start package is not a successful candidate. It describes reusable pinned world/rule/start content and activation, but an actual generation candidate and associated current draft are validated separately. Existing current source `packages/application/src/stories/start.ts::createStoryStart` requires `candidateId` and `expectedDraftRevision`, and `packages/contracts/src/stories.ts::startStorySchema` preserves this. Reinspect current main and Cursor branches before changes.

## Scope and implementation boundaries

Move exactly the existing startFromCandidate domain write path into the single GA owner, preserving candidateId, expectedDraftRevision, campaign pins and current validation. Nest authenticated public PUT /api/stories/:id/start forwards a versioned private operation with trusted actor assertion, original request identity and bounded timeout; no duplicate Nest-side start SQL writes in distributed mode. GA reads candidate/draft, validates start package+rules/world/activation, stages existing S3 bootstrap objects and first checkpoint according to DATA03, then initializes SQL story/first passage/settings/root/checkpoint atomically. Keep old Compose/local code path via explicit environment composition, not implicit fallback after GA failure; source-origin client retry semantics remain. Ensure no untrusted user-supplied ownerId and no direct Game Authority public ingress.

**Owner files and first-class docs:** Code: apps/api/src/modules/stories/controller.ts and DI boundary, apps/game-authority route/handler from DIST03, packages/application/src/stories/{start,initialization,passage-documents}.ts only for changed domain boundary, versioned DTO in packages/contracts, tests. Technical: creation/start, runtime topology, data persistence and runbook claims in same diff.

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
| T04 | Nest + GA two-process `test:boot03:imported-start-distributed` | **8/8 PASS** (~12s) | happy + idempotent; GA down / bad token **503**; raw playable+startPackage **400**; foreign owner **404**; stale revision **409** |
| T04 | Permanent technical reconciliation | **NOT-RUN** | packet receipt only; no edit to DIST01/DIST03/ENG03 canonical headings this batch |

**Done eligibility:** **No.** Remaining S3 staging negative, DATA03 scene-1 checkpoint acceptance, and reconciliation ledger closure guards are still open. Two-process imported-start **8/8 PASS**.

**Blocker:** full T04 negative matrix and authorized wiki reconciliation before `pnpm wiki:change-guard --mode close`.

## Parallelization

After DIST03 can split private DTO/handler read-only analysis from BOOT02 fixture import; publication files overlap DATA03 so single integrator and no concurrent write.

Independent authoring or tests may use separate Git worktrees under the repo's parallel Change policy, but shared `apps/api`/GA private endpoints, scene-1 publication and canonical technical headings must be integrated by one owner. Shared Kubernetes cluster commands run under the existing lock. This packet alone is not approval for execution.

## planned-impact.v1

| Plane | Intended diff | Verification |
| --- | --- | --- |
| Product | Unchanged: text-first D&D-like DM, meaningful authored world/rule pins; no mandatory economy or forced inventory | Existing creation promise, no new product mechanic |
| Technical | Campaign bootstrap + exact scene-1 state/canon root in selected technical owners; current/target/implemented distinguished | Versioned path diagram, negative reading |
| Code | Bounded source and tests at explicit owners above | Provider-free test and later real cluster evidence |
| Related | Change queue and impacted runbooks/status, not an invented completed deployment | Wiki and Change guards, link repair |

## Absorbed BOOT01 cases (2026-11-19)

HK09 cancelled BOOT01 as superseded. These checks were not already an acceptance line above. They are not implemented, and this packet stays Proposed. A start package is still not a successful candidate.

- A succeeded Storyteller-kind opening candidate with scripted execution and the same pinned start-package source is admissible once.
- A package by itself must not start a story.
- An arbitrary success row must not start a story.
- A changed candidate must not start a story.
- The proof names the current code guard and which writer moves.

## Reconciliation ledger (complete at closure)

| Claim owner | Delta or no-op | Source SHA/diff | Normal/negative proof | Link/status |
| --- | --- | --- | --- | --- |
| Creation/product | unchanged | `ec73a535` | N/A (no product edit) | open; no bible delta |
| Technical bootstrap | reconcile to code | `ec73a535` | **Partial:** start seam tests PASS; full bootstrap doc reconcile **NOT-RUN** | open; packet receipt only |
| Candidate/game-authority source | bounded migration | `ec73a535` | **Partial:** T01–T03 PASS; imported-start Compose **4/4 PASS**; two-process **4/4 PASS** | open; BOOT03 not Done |
| Canonical package + scene1 | pending | `ec73a535` | `story-start.integration.js` **5/5 PASS**; Compose imported-start **4/4**; two-process **4/4**; remaining scene1/raw-playable/S3 negatives **NOT-RUN** | open; DATA03 still gates final acceptance |

Archive only after actual evidence and `pnpm wiki:change-guard --mode plan` / `--mode close` where applicable; no automatic next packet.
