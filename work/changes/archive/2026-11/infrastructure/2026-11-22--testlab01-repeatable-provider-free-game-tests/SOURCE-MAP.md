# TESTLAB01 | Source map and settled technical boundaries

**Read source on `undertaking/storyteller-workshop@73186189e2912d5d809a996595f8a0c1f97a53b0` via connected GitHub.** No local cluster, live environment, or test command was observed from this planning environment.

| Current path and symbol | Current fact | Scope |
| --- | --- | --- |
| `packages/story-engine/src/storyteller/launch-admission.ts::loadAdmissibleGrant` | transaction requires 1 grant with enabled/unrevoked/unexpired owner, stopped=false funding, enabled run and both limits >=250000 microUSD | Read-only oracle; do not weaken |
| `packages/story-engine/src/storyteller/launch-admission.ts::admitLaunchWriterMission` | locks pending launch, checks grant, creates generation + operation + mission + parent step, updates launch to preparing, emits `story.launch.v1` in one transaction | Positive/negative integration fixture; no edits |
| `packages/db/src/schema/storyteller.ts::storytellerFunding` | `limitMicrousd`, `stopped`, `verifiedAt`, reserved and settled counters | Insert bounded enabled account in one transaction |
| `packages/db/src/schema/storyteller.ts::storytellerRun` | `accountId`, `limitMicrousd`, `maxAttempts`, `enabled`; counters must stay bounded | Insert finite enabled run |
| `packages/db/src/schema/storyteller.ts::storytellerCurrentOwnerGrant` | real FK to auth `user`, two-column FK to run account; `revision` equals JSON profile revision; explicit `noExpiry=false` requires `expiresAt` | Insert one finite scoped grant with explicit operator/approval |
| `tools/api-integration/test/longform-acceptance/launch-grant.mjs::seedLaunchGrant` | test-only raw INSERTs, hard-coded `op-p3c`/`approval-p3c`, no expiry, random IDs each run | Extract/reuse profile + transactional provisioning; preserve existing callers |
| `apps/game-authority/src/writer-round-lab-policy.ts::readWriterRoundBootstrapMode` | scripted mode refuses key/pin and has separate provider-authorized mode | Reuse gate in read-only verifier and focused tests |
| `packages/storyteller/src/providers/writer-provider-authorization-policy.ts::assertScriptedOfflineLabNotMixedWithProviderPin` | explicit check for model pin and policy version | Do not duplicate weaker string checks |
| `packages/storyteller/src/providers/writer-round-transport.ts` | actual network adapter can `fetch` external OpenRouter endpoint | Provider-free tests need negative tripwire; never call adapter with real keys |
| `infra/kubernetes/lab/dev/{authority,workers}.yaml` | dev GA and executor use `OFFSCREEN_WRITER_EXECUTION_MODE=scripted-offline-lab` | Live config observation only, no manifest changes |
| `scripts/repo-tools/stack-preflight.mjs` and `infra/kubernetes/lab/dev/owned-app-resources.json` | cluster `kind-offscreen-lab` and guarded release lifecycle | Refuse foreign target; never reuse `stack:reset` |
| `tools/api-integration/package.json` | `build` via tsc, named test targets including `turn03-proof` | Add focused test, no broad test rewrite |
| `work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/TURN03-CURRENT-EXECUTION.md` | real cold-kind, signed-in, 8-gate proof is separate | Actual TURN03 run after separate approved grant provision |

## Exact invariant and transaction
The requested `user.id` must already exist in the selected disposable DB or explicitly owned local kind test DB. Transaction uses one `storyteller_funding` insert, one `storyteller_run` referencing funding, and one `storyteller_current_owner_grant` with `revision=1`, profile JSON `schemaVersion=1/revision=1`, `requested_route='writer:launch'`, `requested_funding_mode='prepaid'`, `enabled=true`, `revoked_at=NULL`, `no_expiry=false`, `expires_at=now()+24h`. Funding and run limits are 250000 microUSD, run max_attempts=4 and initial counters=0. The existing test profile already has 8k input, 2k output, 4 rounds, 1 concurrent dispatch; preserve it. Use DB-side clock for expiry and a single transaction to prevent partial rows.

**Important:** a 250000 microUSD account cannot fund unlimited launches; exhaustion is a correct result. Future suites receive new separately provisioned fixtures in disposable databases or explicitly reviewed test sessions, not invisible top-ups to one persistent account. The grant **does not prove provider-free mode**. All launch/continuation flows that might dispatch paid requests require a separate runtime fence.

## Duplicate/concurrent ensure
Transaction advisory lock keyed by exact DB/owner/suite identity, acquired before inspecting active and historical grants. If one matching enabled+unexpired+unexhausted grant exists, return it without changing anything. If the owner has an active incompatible, exhausted, expired, or otherwise ambiguous grant history that the tool did not create for the same declared suite identity, refuse and show safe metadata. If a prior expired grant is clearly owned by a **disposable test suite** and new suite identity is supplied, fresh suite setup may proceed under test-harness lifecycle; no SQL overwrite/delete. Same-scope concurrent ensures serialize and return same IDs. Store suite identity in explicit operator/approval metadata using a stable deterministic string, not random new approvals on every retry.

## Threat/verification boundary
Cluster identity and source file pins are not sufficient to prove absence of real provider dispatch. Read-only check uses actual Pod env/config *without emitting secrets* and the test-only executor transport must have an explicit fail-on-send adapter or network deny. If the configured worker can secretly fall back to an external provider route, stop and report. Tests cannot call public OpenRouter; no token in test process. Checking only `OFFSCREEN_WRITER_EXECUTION_MODE` is insufficient.

**Known uncertainty for the Cursor:** actual test runner's disposable DB/fixture plumbing and Kubernetes database access from the current workstation must be checked against the named anchors. If existing runner cannot obtain safe identity without credentials, stop with exact missing entrypoint. This is not an invitation to invent a new database/operator authorization layer in an implementation task.
