> **Terminal owner disposition:** Superseded by owner 2026-11-27 in preparation for monorepo redesign. Historical narrow scripted resolution/snapshot extraction and Compose compatibility acceptance retired; no live PASS inferred. Existing implementation untouched. Preserve single authoritative mutation ownership, authenticated private boundaries, trusted actor provenance, authorization and tenant isolation, transactional integrity and idempotency. Future service topology and acceptance must derive from new architecture. No dispatch.
> Earlier readiness, branch and acceptance instructions below are historical only.

# DIST03 | Composer verification of existing GA boundary

**Baseline:** 584b594. **State:** implemented one seam on a branch and merged into current source; packet still open for receipt/closure. **Scope receipt (T02, 2026-11-20, HEAD `ec73a535`):** DIST03 is only owned snapshot read plus one scripted resolution admission on private HTTP. It is not “all game authority is now separate.” **Model:** Composer Standard, VERIFY first. **Source:** `apps/game-authority/src/{application,server,bootstrap/main}.ts`, `apps/api/src/modules/stories/{controller,game-authority-client}.ts`, `apps/game-authority/test/story-seam.test.ts`.

**Verified source facts:** `server.ts:routeFor` permits internal health, GET story snapshot and PUT resolution; `game-authority-client.ts` only exposes `read/admitResolution`. `controller.ts:startFromCandidate` and `fork` are still **local**, which is BOOT03/DATA06's later extension, not a reason to declare this one-seam implementation missing. Token body limit is 64KiB; service is loopback by default and private, not deployed in Kubernetes.

## T01 | Run the exact one-seam proof | PARTIAL (in-process PASS; two-process NOT-RUN)
Use current scripts to build/test `@offscreen/game-authority`, and if authorized run two-process private HTTP with an approved disposable DB. Positive: identity-checked snapshot, stable resolution operation, GET and retry. Negative: forged bearer/wrong actor/malformed version, duplicate operation with changed body, local fallback **not triggered** when distributed mode is configured and GA unavailable. Include actual process count and test results; mocks are a weaker tier.

**Receipt (2026-11-20, HEAD `ec73a535`):** resolution no-fallback on MAIN — `apps/api/test/game-authority-seam.test.mjs` **6/6 PASS** after `pnpm run build` in `apps/api` (`distributed admitResolution does not fall back to local stories when Game Authority is down`). Two-process disposable DB **NOT-RUN**.

## T02 | Freeze explicit scope and reconcile Done eligibility | DOC complete; Change not Done

### Frozen in-scope (DIST03 only)

| Seam | Transport | Writer |
| --- | --- | --- |
| Owned story snapshot read | `GET /internal/v1/stories/:storyId` | `createStoryApplication` via `apps/game-authority` when `GAME_AUTHORITY_MODE=distributed` |
| One scripted resolution admission | `PUT …/resolutions/:operationId` | Same. Stable operation id, no second receipt insert |

Negative claims bundled with that seam: forged bearer, wrong owner, duplicate operation with changed body, Nest local `read`/`admitResolution` counts stay zero in distributed mode for those routes, Compose mode makes zero Game Authority calls for that seam.

### Explicitly out of scope (later packets — do not count toward DIST03 closure)

| Later write | Packet |
| --- | --- |
| `startFromCandidate` and campaign start commands on Game Authority | [BOOT03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--boot03-game-authority-start-admission/CHANGE.md) |
| Fork and branch-context minimum on Game Authority | [DATA06](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/data/2026-11-19--data06-fork-scoped-memory-context-minimum/CHANGE.md) |
| Storyteller publication, executor split, generation custody | [STORY03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md) |
| Full one-writer migration across all story commands | Program gaps, not this Change |

Source may already route or mock start on the client for coordination; that does not widen DIST03 acceptance. `controller.ts:startFromCandidate` and `fork` staying local at the narrow boundary is expected, not a DIST03 failure.

### Evidence tier (provider-free, recorded 2026-11-20)

| Check | Result | Notes |
| --- | --- | --- |
| `@offscreen/game-authority` in-process HTTP (`story-seam.test.ts`) | **3/3 pass** | Credential, owner, duplicate operation; slow admission unavailable |
| Nest seam with live GA child (`game-authority-seam.test.mjs`, read/resolution) | **6/6 pass** | At HEAD `ec73a535`: distributed read/resolution, Compose skip, and resolution no-fallback when GA down |
| Nest seam plus start-client mocks (combined run) | **8/8 pass** | Includes start routing mocks; **BOOT03 prep**, not DIST03 scope |
| Two-process private HTTP with disposable DB | **NOT-RUN** | T01 optional stronger tier |
| Nest `admitResolution` when GA configured and unavailable — no local fallback | **PASS** | In-process: `pnpm run build && node --test test/game-authority-seam.test.mjs` in `apps/api`, **6/6**; dedicated case `distributed admitResolution does not fall back to local stories when Game Authority is down`. Production path already fail-closed (test-only delta). BOOT03 start-unavailable negative unchanged |

### Done eligibility

**No.** One seam is locally implemented; the in-process resolution no-fallback discriminating negative is **PASS** at HEAD. Packet stays **open** until the two-process disposable-DB proof from T01 is run (still **NOT-RUN**) and reconciliation ledger guards close without skipped mandatory checks.

**Blocker:** In-process resolution no-fallback **PASS** at HEAD (`game-authority-seam.test.mjs` **6/6**). **Two-process private HTTP with disposable DB — NOT-RUN** (Change stays open).

Canonical [topology](../../../../../../docs/technical/platform/topology.md#distributed-learning-target) and [STATUS.md](../../../../../../STATUS.md) name this narrow seam only; they do not claim cluster deploy or migrated start/publication.

No Grok needed merely to check bearer-token routing or a two-process HTTP test.
