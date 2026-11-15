# Cursor next wave | Correct the live-gate inference, harden local run, then verify real AI

**Status: proposed execution sequence, not started, 2026-11-15.** **This is the shortest next-agent entrypoint** after [the completed connected trial](../evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md) and [independent source review](../evidence/independent-connected-trial-review-2026-11-15.md). `main` baseline when authored: `b88356feebebd47fbe2094189851af553a43a335`. **Current change: none.** These documents are not code, credentials, model-spend authorization or a requirement to rerun S0–S6 from scratch.

## 0. Critical fact: two different dispatch configurations

**Default worker** `apps/worker/src/bootstrap/main.ts→readStorytellerWorkerOptions` has no `dispatchAuthority`; production/general paid path still blocked on OBS00-B.

**Isolated local Story-mode** `tools/chamber/src/main.ts` independently uses `storyLiveAuthority()` to verify route/account at startup, then gives worker `provider:createOpenRouterProvider` **and** `dispatchAuthority:()=>storyAuthority.usagePolicy`. This is potentially live-capable, **not the same unresolved default worker path**. Its authority is **startup pinned**, not dynamically re-resolved at each send, so it does **not** satisfy production OBS00-B, and we must not assert "all local live sends blocked."

**S5 Cursor's original report was right to send zero calls** because packet equality and true task-budget enforcement weren't proven, but its singular explanation that missing default-worker OBS00-B necessarily blocks this local launcher was incomplete.

**Critical source bug:** local launch `ON CONFLICT SET stopped=false` and `run.enabled=true` can revive a stopped account/run on restart. Existing $1/250-attempt defaults are too broad for a $0.25/4-attempt task grant.

## 1. Cursor session 1 | OBS00-L local trial guard (ONE Change)

**Do not run paid transport.** Start by reading only [OBS00-L Change](../../changes/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md) plus `tools/chamber/src/main.ts` relevant ranges (startup credits/prices, funding UPSERT, runtime provider) and `storyteller/budget.ts` relevant reserve/dispatch/uncertainty. Verify current HEAD and exact test DB. If kickoff explicitly selects this packet, set `Current change` to OBS00-L and implement its narrow fail-closed outcome.

**Actually execute in disposable local SQL + fake transport:**
1. New explicit lab-only run, max **250,000 microusd**, **4 total provider attempts**, per-op ≤ **10,000 microusd** (or stricter account cap); test first valid reserved attempt.
2. Fifth attempt denied regardless of remaining dollar funds; insufficient remaining cap denied **before** dispatch.
3. Set `storytellerFunding.stopped=true` or `storytellerRun.enabled=false`; restart local launcher; prove it **does not clear the stop/disable** or send HTTP.
4. Create a simulated uncertain attempt, restart, prove all liability and old operation G/attempt remain and no auto retry.
5. Attempt concurrent budget admission to same Run; max-attempt cap cannot be raced through.
6. Confirm normal worker with no OBS00-B is **still denied** and any local test flags do not leak to production worker.

Log **actual commands/exits**, DB before/after `stopped/enabled/maxAttempts/limit/settled/reserved`, fake provider invocation count and how the trial Run ID survives restart. No raw account credentials or player text. If it cannot be made safe as one bounded Change, mark Blocked and give exact source dependency. **Never bypass by setting `retainsCapturedAuthority` always true.**

Commit/push code and a focused evidence receipt only after tests. Mark OBS00-L Done only if restart-denial and SQL-funded cap actually pass; clear Current change before session 2.

## 2. Cursor session 2 | OBS00-C exact reviewed→HTTP packet (ONE Change)

Read [OBS00-C Change](../../changes/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md) then `openrouter.ts::{inspectOpenRouterRequest,buildOpenRouterRequest,createOpenRouterProvider}`, `dispatch-review.ts` and actual `execution/memory-provider-runtime` round creation. **No live network, use injected `transport` fake.**

**Actually execute**:
1. Create one **real persisted disposable** G/attempt/review row, capture `packetSha256` and byte count. Intercept `RequestInit.body` at the configured mock HTTP edge; SHA must match the **same attempt**.
2. Repeat for repaired request (`task.request ≠ actual dispatch.request`), memory decision/final rounds with different output protocol/limit, and local Story-mode runtime composition. No code-level direct-provider-only test is enough.
3. Deliberately change one byte of the prepared outbound packet *after review* in a controlled negative fixture. **Reject before `budget.dispatch`'s possibly-sent liability boundary**, record safe mismatch, zero external HTTP. Do not mutate the persisted original review to make the test green.
4. Simulated provider timeout *after possible send* stays uncertain; never collapse into a free retry.
5. Confirm ordinary generic worker remains entitlement-blocked (OBS00-B), even with matching bytes.

Save hashed/size-only packet metadata; no raw request/prompt/auth header in Git. Commit/push exact source SHA, test counts, identity/hash equality and mismatch proof; Done only with real configured transport assertion. One Change selected at a time.

## 3. Cursor session 3 | QA-SF01 integration fixture debt (separate Change)

Read [QA-SF01](../../changes/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md) and `tools/api-integration/test/storyteller.integration.ts` around `time.id:'simulation-gameSeconds'`. **Provider-free, disposable `offscreen_auth_test` only.**

- Fix old fixture slug **in test source** (capital `S` violates current lowercase identifier schema); don't relax production validation.
- Rerun **full** `pnpm test:focus -- storyteller`. Initial report: 6 pass/27 fail. Determine whether custom-calendar 0 vs 55 is a genuine mechanic failure after fixture repair. Don't weaken the 55-day expectation without source proof.
- Fix `pnpm test:focus -- story-resolution` cleanup on `storyteller_execution_stage_generation_id_fk` in **test teardown only**; don't add production cascade to make test green.
- Run both full named suites and a small admin-situation regression. Record exact test count, new failures, source and DB reset. Don't call the suite green if one remains red.
- Commit/push a bounded receipt and clear active Change only after proof.

**No need to run all old tests repeatedly between these sessions.** Pick the focused suite per touched owner.

## 4. Conditional session 4 | ONE genuine agentic local Story trial, new permission required

**Separate authorization gate:** previous owner `≤$0.25/4 calls` applied to the **completed** S0–S6 experiment; it is **not perpetual spend permission**. A new kickoff must explicitly authorize one additional task-specific trial and cap. No credentials may be requested, printed or put into Git. If the owner only authorizes code+tests, prepare source/packet and report blocked for real inference.

When authorized, **before a single real send**, verify *all*:
- OBS00-L and OBS00-C both Done by provider-free real source tests.
- Exact local Story-mode source (not generic worker) has verified startup account/model route and current provider pricing; local account/run not stopped/disabled/uncertain.
- Trial run's **DB-enforced aggregate** max ≤250,000 microusd and max attempts ≤4, with ≤10,000 microusd per operation or tighter budget.
- Selected default Story profile/role/route/recipe cannot silently launch an unbounded number of model rounds or repairs; compute worst-case reservations.
- Verified packet bytes are actually the same as persisted review at each actual attempt; if mismatched, deny.
- Synthetic local campaign only, no production/owner data reset; use existing `pnpm story:server`/`pnpm story:play` and strict per-invocation `--confirm-live`. **No automatic loop of choices.**

**Trial action**: one reviewed prepared opening, then, **only if room remains and operation safely settled**, choose exactly one genuine currently offered action and allow its real consequence narration. Optional deeper agent memory needs a separate independently reviewed bounded recipe; don't spend extra simply to create "agentic" screenshots. Preserve original body/outputs privately under ignored `data/story-local-evidence`.

Record one true cross-stage causal chain:
`draft/opening G → exact task/profile/root/source SHA → attempt ID/actual body SHA → model response/usage → output schema validation → Start/story passage → chosen operation O/time/receipt → consequence G → validated publication`.
If any link not observed, mark unknown; don't generate it from current code after the fact. Monitor uncertain billing and stop immediately.

**Stop on** missing key, route stale, source policy mismatch, budget risk, timeout-after-send, new provider uncertainty, incomplete packet identity, or exceeding owner cap. Record actual attempted external requests, settled USD and possible unresolved exposure. If blocked, no paid call: that's a valid outcome.

## 5. Independent product queue after the local proof

**Support grant stewardship:** OBS06/OBS07 are Done **in synthetic/disposable scope**, but no trusted production issuance path exists for `support-investigator` binding exact `caseId+campaignId`. This needs a separate **security/governance Change**, not using arbitrary `admin_case_link` as privilege. [Independent review](../evidence/independent-connected-trial-review-2026-11-15.md#5-support-is-real-in-test-but-blocked-by-governance). No automatic Support role widening.

**OBS04 E0 game history:** still Proposed; no complete arbitrary historic world-state rewind. Plan its first action writer only after measured source/SQL overhead and actual observed user need.

**Held opening stage gap:** OBS02/OBS03 pilot scopes consequence, so a held opening G with no stage/provenance is an expected **coverage gap**, not automatically corruption. Candidate later expansion only if a human debugging scenario warrants it.

**OBS00-B general production entitlement:** remains Blocked and must have true independent current platform/account policy sources before default worker live launch. Do not call local Story-mode proof OBS00-B.

## 6. Multi-session evidence and return path

Create/update only these **execution evidence** files when Cursor actually runs:
- `docs/observability/evaluations/2026-11-15--post-trial-safety/CHECKPOINT.md` (single restart cursor);
- `.../RUN-LOG.md` (small actual commands/ID/budget/negative results);
- `.../FINAL-HANDOFF.md` (conclusions and one next recommended Change).

At the start of each Cursor session: `git status --short; git rev-parse HEAD; pnpm repo:brief`, then read checkpoint + **one** selected Change. At end: update source SHA/actual test evidence/next exact action; commit/push; don't ask the owner to operate Docker or Playwright manually. For new source differences from a concurrent Cursor push, reconcile before editing; do not overwrite owner work.

**No automatic "the model will work in the background":** work happens during each actual Cursor turn and resumes from files. The final Cursor message to owner should contain the GitHub FINAL-HANDOFF path, commit SHA, actual external requests/cost, and request for ChatGPT to review. Do not copy private model/user text or credentials into committed evidence.

**Recommended first authorization:** OBS00-L **provider-free**. It removes a real source-level stop/restart risk and makes the subsequent genuine local Story trial financially enforceable, without confusing it with production entitlements.
