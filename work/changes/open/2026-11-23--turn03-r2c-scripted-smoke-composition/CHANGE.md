# TURN03-R2C | Compose one guarded scripted player smoke

**State: READY WITH EXPLICIT LIMITS, SOURCE-ONLY.** **Parent:** [TURN03](../2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md), remains OPEN. **Source baseline:** `undertaking/storyteller-workshop@3a3aa4d8` inspected 2026-11-23. R1 route, R2A HTTP adapter, R2B pinned verifier are already integrated. **This packet does not grant permission to run against live Kind or a real account.**

## Source map and constraints

- `infra/kubernetes/lab/app-release/turn03/trace-route.mjs::runPublicRouteTrace` accepts `{identity,request,maxAttempts,sleep}` and implements PUT draft/opening/start/resolution/fork plus bounded GETs for opening, scene1 checkpoint, receipt, scene2 and child lineage. It freezes operation ID and refuses retry. Its `assertFrozenIdentity` checks required identifiers, source pins and campaign. Reuse it, don't duplicate methods/DTOs.
- `infra/kubernetes/lab/app-release/turn03/live-http.mjs::createLiveHttpRequest` is an **async** constructor with `{origin,sessionFile,fetchImpl,allowMutations}`; it returns `request(method,path,body)`. It rejects insecure session files/origins/routes and never dials by itself. Don't alter it in this Change.
- `infra/kubernetes/lab/app-release/turn03/fixture-pins.mjs::verifyPinnedFixture` takes `{manifest,expectedReleaseSha,expectedBucket,store}`, returns `{verified:true,bucket,releaseSha,startRootHash,rulesRootHash,evidence:'injected-readonly-store'}` or typed FAIL/BLOCKED. This receipt establishes *only* local/injected-store identity. The real S3 verifier/credential boundary is still planner-held.
- `turn03/run.mjs::runTurn03ColdTrace` and `report.mjs::assertNoFakePass` retain the eight-gate report. Do not modify or elevate them; do not create another proof schema.

## Implementation contract

**Exclusive new code:** `infra/kubernetes/lab/app-release/turn03/player-smoke.mjs`, `player-smoke.test.mjs`. One small joining function rather than a new framework. Export `runScriptedPlayerSmoke({readiness,verifiedFixture,identity,request,maxAttempts,sleep,authorized})`, with required exact args and no globals. `authorized` is an explicit injected capability for **this function's story writes**, not permission to install resources, mint cookies or run this Change's tests on a network.

**Validate before invoking `request`:**
1. `authorized === true`; otherwise return `{status:'BLOCKED',code:'operator-authorization-required'}` and **zero requests**.
2. `readiness` supplied as caller-verified `{releaseSha,bucket,contextName,imagesCurrent:true,sessionVerified:true}`; context **exactly** `kind-offscreen-lab`. Deny missing, mismatched or unverified fields, and require release SHA equal to `verifiedFixture.releaseSha`.
3. `verifiedFixture.verified===true` and exact bucket + referenced start/rules root hash consistency with `identity.sourcePins`. Validate identity using **existing** `assertFrozenIdentity` before side effects; caller cannot replace frozen IDs midtrace. Because R2B currently labels its result `injected-readonly-store`, R2C may use this in fake tests but must label *all* results `source-only-observation`. Never claim real S3 or cross-Pod authentication from such receipt.
4. `request` must be injected. No direct `fetch`, network, Kubernetes, file IO, SQL or S3. Caller must supply bounded positive `maxAttempts` (finite integer 1..50) and `sleep` function. No unbounded loops.

Then call `runPublicRouteTrace` **once**. Return a small sanitized summary with frozen IDs, passage1/passage2/checkpoint hash/fork lineage status and `status:'OBSERVED-LOCAL'` / `evidence:'source-only-observation'`; no raw auth, story prose, HTTP bodies or logs. For `TraceAbort`, map its FAIL/BLOCKED and sanitized summary without reissuing writes; unexpected errors map to `FAIL` without raw exceptions. **No `PASS` field, no `kind-cross-pod` tier.** Preserve the trace's own guard that a returned `forkProved:false` is an explicit FAIL, not overall success. If scene2 checkpoint is missing, do not claim authoritative checkpoint proof. The trace lacks independent child *continuation*: keep this out of the success claim and parent TURN03 open.

**Important source-only constraint:** Tests inject a fake `request` and simulated readiness/verified fixture. Do not assemble or run a real `createLiveHttpRequest` against a target, pass real cookies, or produce a live CLI. A later approved operator wraps this function with genuine source-image, session and S3 read authority.

## Tasks/proofs

T01 implement pre-side-effect validation and sanitized result mapping in the two new files, with simple scan-first phase comments. Test authorization false, wrong cluster/sha/bucket/root, incomplete readiness/fixture/identity and missing request produce *zero* calls.
T02 fake-execute exact R1 story sequence once with pre-approved fake values; prove trace preserves unique frozen operation and aborts on 401/403, pending receipt, missing scene1 checkpoint, missing/false fork. Assert no duplicate PUT and no human-visible provider cost. Include one negative where a reply contains secret-looking strings and output must not include them.
T03 run `node --test infra/kubernetes/lab/app-release/turn03/player-smoke.test.mjs` and existing `trace-route` / `run` focused tests (exact existing filenames), `git diff --check`; review code-quality rule. No live tests. Update Change receipt and minimal existing parent navigation without stepping on R2D shared files; serially integrate and archive **R2C** only. Parent TURN03 remains OPEN.

**Stop conditions:** Existing R1 return contract differs, input source roots cannot be matched structurally, or a real-run authorization protocol would require new privileged design. Stop with exact source evidence, not a shortcut to `fetch` or fabricated readiness.

**Readiness G0–G7:** repository/branch/source anchors inspected; scope and algorithm fixed; positive/negative proofs explicit; write-set disjoint from R2D; tests **NOT RUN by planner**; actual local writer guard mandatory. Ready solely for source-only fake tests. No host/runtime permission inferred from a boolean.
