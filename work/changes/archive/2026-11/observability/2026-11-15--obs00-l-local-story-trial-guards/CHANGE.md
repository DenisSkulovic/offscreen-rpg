# OBS00-L | Local Story-mode spending stop, restart and finite-trial budget guard

**State: Done (2026-11-15, provider-free, disposable DB).** Evidence: [obs00-l receipt](../../../../../../docs/programs/observability/evidence/obs00-l-local-story-trial-guards-2026-11-15.md). Original packet text follows. One developer-lab code outcome: **a local Story-mode run cannot silently re-enable stopped funding and can enforce an explicitly configured *total* microusd and provider-attempt limit across its ordinary API/Temporal/worker path**. **Provider-free mock/disposable tests only in this Change.** Nothing here authorizes a real OpenRouter send or production entitlements. Evidence owner: [independent connected-trial review](../../../../../../docs/programs/observability/evidence/independent-connected-trial-review-2026-11-15.md), old [Cursor S0–S6](../../../../../../docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md), [provider trial policy](../../../../../../docs/programs/observability/technical/capture-transaction-protocol.md).

## Cursor first screen

> **Confirmed source:** `tools/chamber/src/main.ts` has an *independent local Story-mode worker composition*: `storyLiveAuthority()` checks account/route at startup, and `startRuntime` gets `{provider:createOpenRouterProvider(...),dispatchAuthority:()=>storyAuthority.usagePolicy}`. This is **not** the ordinary `apps/worker/bootstrap/main.ts` path; the latter remains missing OBS00-B.
>
> **Also confirmed:** Story-mode funding bootstrap does `ON CONFLICT ... SET stopped=false` and run `enabled=true`, while existing accounts/runs use $1 (=1,000,000 microusd) and a 250-attempt maximum. A restart can undo a prior stop. A developer’s task-specific **$0.25/4-attempt** cap is not automatically enforced by the launcher’s default $1/250 limits.
>
> **One goal:** after a normal local restart, an explicit stop/revocation, uncertain liability or exceeded trial cap cannot be silently cleared; a capped local trial has a **real database-enforced** total budget/attempt ceiling. No production broader permission.

## Source to inspect before editing

`tools/chamber/src/main.ts` selected ranges around `storyLiveAuthority`, local funding `INSERT/UPSERT` and `startRuntime` composition; `packages/application/src/storyteller/budget.ts::{reserve,dispatch,uncertain,stop}`, `db/schema/storyteller.ts` account/run/attempt; `tools/chamber/src/modes/cli-flags.ts` and focused existing launcher/provider-free tests. Explicitly preserve `local story vs chamber dry-run vs separately authorized memory evaluation` boundaries.

## Intended minimal code delta

### A. Never resurrect a stopped account or disabled run

- **New** local funding account/run initial setup may be enabled under the explicit launch policy.
- **Existing** `storytellerFunding.stopped=true` or `storytellerRun.enabled=false` is **not automatically changed to permissive** by restarting the launcher. Default is deny with a safe message. Any operator recovery is a distinct audited and explicitly authorized procedure, **outside this Change**.
- Preserve any actual `uncertain` dispatched attempts. Existing `budget.reserve` globally rejects uncertainty; do not use `stopped=false` reset to make the next provider call work.
- Do not lower settled/reserved ledger amounts, delete attempts, reset counters, reassign G or recreate a command. Funding state is financial evidence.
- Maintain current start-time external account/model/route preflight; local Story mode still uses only loopback and its named local DB. Do not mix with generic default worker.

### B. Enforce a **separate bounded trial** at DB admission

Introduce a locally explicit, source-recorded trial allowance with **maximum total spend and maximum number of provider *attempts*** that can be used on one experimental session, not an agent convention. Example limits for the next proposed trial: **250,000 microusd ($0.25)** and **4 attempts** across openings, repairs, consequences and memory rounds, while keeping the stricter default **10,000 microusd ($0.01) per operation** or another lower approved cap. Any existing account's lower remaining capacity also wins.

Implementation choices:
- Prefer a distinct **local trial Run ID** with the configured cap, linked to the local account, rather than mutating historical `storyRunId` or raising the global account's limit. Persist/record the trial Run ID so crash/restart doesn't mint fresh budget for the same trial without owner authorization.
- Alternatively, prove an additive non-increasing cap on the existing run, including previous settled+reserved values and already-admitted attempts; **never** simply overwrite `maxAttempts=250` or `limitMicrousd=1000000` for a trial.
- The CLI may add a narrow pair of flags (illustrative `--story-trial-max-microusd=250000 --story-trial-max-attempts=4`) with strict parsing and explicit activation; **do not use those flags as production entitlement declarations**. They record the approved cap in ignored `data/story-agent/server.json` without secrets.
- `budget.reserve` must be the final real admissibility gate. Stop if worst-case reservation would exceed remaining trial funds or request cap; no new transport started.
- When a provider attempt is **possibly dispatched/uncertain**, its reserved liability remains in budget; restart cannot turn it into free spend. A completed operation must settle existing source without duplicate charge.

### C. Truthful authority classification

The local `dispatchAuthority:()=>storyAuthority.usagePolicy` is **startup-pinned server-owned input**, independent of individual task, **not** a per-dispatch re-read of mutable entitlement. This separate local-dev authorization may be legitimate for a tightly bounded test *only under an explicit owner-approved scope*; it is **not** completing OBS00-B and cannot be used to enable general worker paid traffic. Add a provider-free test proving a mismatched captured task policy is denied and a stopped account remains denied even when the static local policy equals the captured one.

**Do not** make `retainsCapturedAuthority` always true or echo task.`resources.authority.policy` as the current grant. Do not remove `budget.dispatch` or invent an account/entitlement source.

## Tests Cursor must actually execute (no live provider)

| Case | Required observation |
| --- | --- |
| Fresh dedicated local trial Run ID, max 250,000 microusd and four attempts | First safe mock reservation/dispatch accepted only under saved trial cap |
| Fifth attempt, even if all previous requests settled cheaply | Denied by **attempt count**, no mock transport |
| Next reservation would exceed remaining total cap | Denied with original source/budget unchanged |
| Prior ledger account `stopped=true`; launcher restart | Still stopped, **zero** new provider calls, no auto repair |
| Prior Run `enabled=false`; launcher restart | Still disabled; no active trial granted |
| Uncertain dispatched attempt then restart | Liability preserved; no new send/retry |
| Explicit local stronger model would exceed price/route or microusd policy | Fails before transport, no fallback |
| Approved task capture vs independently pinned local policy differs | Denied by `retainsCapturedAuthority`, not forced to match |
| Previous stopped account with unchanged captured policy | `budget.dispatch` also denies; no task-source bypass |
| Two concurrent worker attempts on same Run | DB serializes attempt cap/reservation, no fifth dispatch |
| Restart with same saved trial ID | Does not grant a second 4-attempt/$0.25 budget |
| Generic `apps/worker` without OBS00-B | Remains denied, no local flag leaks into production worker |
| Auth/cookie/API secret in log/report | No raw key or provider body emitted |

**Proof:** current SHA, exact command/test names, source account/run/attempt IDs (synthetic), counters and before/after `stopped/enabled/settled/reserved` values, **zero external HTTP**, mock transport call count, negative restart, no raw credentials. Use a new guarded disposable DB or local test fixture; never mutate owner's actual persistent `offscreen_story_local` account to simulate stop/restart.

## Hard boundaries and Ready

No paid request; no production OBS00-B entitlement store/SSO/subscription, no arbitrary new account privileges, no raw prompt archive, no new Storyteller feature, no engine clocks/rolls, no auto restart clearing uncertain state. [OBS00-C](../../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md) independently owns actual reviewed-vs-sent body proof; neither packet alone authorizes live trials.

**Ready only after** owner selects this exact bounded code Change, latest source/launcher modes are checked and the disposable test fixture for funding re-start is safe. **Done** requires an actual stopped/restart denial and a four-attempt cap enforced in SQL, not merely an in-memory CLI counter.
