# S5 | Conditional real paid Storyteller / bounded agentic memory trial

**The owner wants real trials, not mock theatre.** This phase asks Cursor to **attempt an authorized real provider experiment** when eligible, *not* to remove safety fences to make it happen. [S4 checkpoint](CHECKPOINT.md), [provider authority blocker](../../evidence/live-worker-dispatch-preflight-2026-11-15.md), [provider/usage source](../../../technical/provider-dispatch-review.md), and [documented Story mode](../../../development.md#local-live-story-mode-without-oauth) are the relevant reading. No raw secret or private prompt in Git.

## 1. Hard, independent gates before **any** paid request

Every item below must be **positively proven**, not assumed:

1. Owner's **Cursor kickoff explicitly authorizes paid execution** with this exact hard cap. Merely telling the agent “run tests” does not. **Maximum:** total possible billable spend **USD $0.25**, at most **4 outbound provider HTTP requests**, and at most **USD $0.10 per operation**, including repairs and memory rounds. Respect any stricter app/account/provider cap (the local Story launcher has its own $1 run cap, which **does not raise** our $0.25 task cap).
2. Only local loopback Story/Chamber, known synthetic content and source-owned test account. **No hosted/production database or user identity**. Existing private API credentials may be read **only by the existing local launcher/provider environment**, never printed/copy-pasted/committed. If no valid key in private runtime, mark `BLOCKED: credentials unavailable`; do not ask the owner to manually perform a playthrough.
3. **OBS00-B independent current `dispatchAuthority`** must be implemented *and* verified from server-owned account/entitlement/usage policy. Current baseline `main@18158402` has **no resolver**. Do **not** pass captured task policy or hardcode `() => true`. This phase **does not authorize implementing OBS00-B**; if still missing, the actual paid send is blocked, but continue the rest of this phase's provider-free evidence.
4. **Actual reviewed packet === actual last HTTP-body serialization** for the same G/attempt/round has passed a **mock transport boundary test**, including repair/memory per-round override and maxGeneratedTokens/outputProtocol. OBS00-A only forwards `(task,dispatch)`; it doesn't by itself certify byte equality. If not proven, `BLOCKED: OBS00-C transport custody`.
5. Exact current OpenRouter/provider route, model ID, published pricing/service tier, account/run funding, route effective policy and reservation ceiling are verified *immediately before send*. No old cost estimate may be used as entitlement. If projected worst-case cost of any pending operation exceeds the remaining $0.25 task cap, don't send.
6. No in-flight `uncertain`/possibly dispatched attempt that would make retry/settlement unsafe. If any attempt becomes uncertain, **stop ALL additional paid calls**, preserve source G/attempt and report possible charge, even if an aggregate CLI says 0.
7. No hidden automatic loops, judges, repair storms, background activity or arbitrary self-chosen provider-model fallback; explicitly verify chosen recipe's **maximum total rounds** and repair capacity fit the cap. Use no new model for “assessing the answer.”

If **any** gate fails, **do not bypass**. Record the precise failing gate, source symbol/result and *why* the experiment was not sent. That is honest, valuable forensic evidence. A conditional requirement is not permission to skip the normal paid boundary.

## 2. Provider-free preflight you must perform even if blocked

Real task/packet preparation with **zero provider** should still be executed:

~~~sh
pnpm chamber:packet
pnpm chamber:memory-comparison-packets
pnpm storyteller:packet-audit
pnpm storyteller:live-comparison
~~~

`storyteller:live-comparison` is explicitly **dry-run-only**; do not pass `--paid` because the script forbids it. Inspect actual manifests, real source root hashes, token/byte estimates, route/policy identity, expected allowed rounds, selected/omitted note coverage and output schema. **Do not claim these prove live semantic recall or provider receipt.**

If a verified, source-pinned `evaluation-packet.v1` config already exists privately and is safe, run:

~~~text
pnpm chamber:evaluation-packet -- --config=<reviewed-local-config.json>
pnpm chamber:memory-evaluation-packet -- --config=<reviewed-local-config.json>
~~~

Only after confirming the current configs' actual distinct schemas/requirements. These **hold** packets, don't release/charge. Don't fabricate an outdated route or dollar price just to satisfy the parser. A missing config is a recorded preflight limit, not permission to invent account funding.

**Optional mock transport:** run existing tests with a fake provider to prove different per-round packet request SHA (normal vs repair vs memory final) and `OBS00-A` passthrough, without a live key. Report count of mock sends and source IDs.

## 3. If gates pass, drive a genuine local player Story (small, supervised by the agent)

Use the documented headless Story mode on its **dedicated loopback `offscreen_story_local` database**, which must not be reset or overwritten. The launcher pins model/account caps and writes private `data/story-agent/*` trajectories. It **may verify account and route at startup without inference**.

~~~text
pnpm story:server
# separate Cursor terminal, after server readiness:
pnpm story:play server
pnpm story:play profiles
pnpm story:play starts
pnpm story:play new --profile driven-adventure --character ForensicPilot --confirm-live
pnpm story:play show <story-id>
pnpm story:play history <story-id>
~~~

**Every** `new/choose/retry` can dispatch paid work and must use the explicit per-invocation `--confirm-live` **only after** checking remaining cap and current source. Never put `--confirm-live` in a blind loop. Use one prepared world (e.g. `seyda-neen-arrival.v1`) and one profile already in current catalogue. The first billable action is opening. If that and one intended consequence would exceed $0.25 worst-case, stop after opening. Avoid activating fast timing or long activity that unexpectedly causes multiple provider turns.

**Conditional next single action** (only if budget and task permit):
~~~text
pnpm story:play choose <story-id> <exact-listed-option-id-or-campaign-path> --confirm-live
pnpm story:play wait <story-id>
pnpm story:inspect <story-id>
~~~

The option must be the **actual offer** in the current snapshot, not a guessed ID or mechanically impossible action. `story:inspect` can include private diagnostic/source content: capture its output locally under ignored `data/`, then create a sanitized source/usage summary for Git. Do not paste raw text.

### Agentic memory variant, only after same safety gates

If permitted extra budget remains, use the real documented **bounded two-round/one-read** memory evaluation runner with an independently verified config and explicit `evaluationId` authorization:

~~~text
pnpm chamber:memory-evaluation-run -- --config=<reviewed-memory-config.json> --authorize=<evaluation-id>
~~~

This is a **separate live evaluation** with specific route/billing limits. It may or may not traverse the default worker `dispatchAuthority`; do not substitute it as proof that the ordinary player live mode works. Follow its own packet→review→funding→reconcile gates and still enforce the **combined $0.25 total and 4 HTTP request cap**. If its pricing/round limits cannot be bound within those caps, **skip** rather than enlarge.

## 4. Record real evidence at each billable boundary

For every **actual** external attempt, log in private evidence and a sanitized Git summary:
- local `storyId, G, attemptId, roundId/recipe, stage/source build`;
- exact route/model + verified price version and allowed output/input ceilings (no secret);
- captured model-neutral SHA, reviewed OpenRouter packet SHA and measured outbound-body SHA **if verified**; otherwise don't make “provider saw this” claim;
- number of actual attempted HTTP requests and provider response status/finish reason;
- reported input/output/cache token usage and actual **settled** microusd, plus reserved and `uncertain` separately;
- original provider-visible model output/visible tool requests **locally retained only**, with safe summary/claim provenance in Git;
- which source ID/section was eligible, loaded, final-included and cited in **that exact round**, separating observed from inference;
- output validation and actual publication source status, passage revision/clock/receipt effects and no duplicate earned mechanic.

**Trial report must distinguish:** `not executed`, `prepared/held`, `possibly dispatched`, `provider responded`, `validated` and `published`. An HTTP 200 doesn't prove the published story was valid or the model meaningfully remembered an NPC.

**Taste/quality** can be judged with a bounded qualitative rubric (scene initiative, profile adherence, choice diversity, grounded use of accepted mechanical outcome, correct time/hold, actual memory recall). Quote at most a tiny safe synthetic excerpt in a **private local file**; Git report uses scores and source observations only.

## 5. Explicit stop / fallback conditions

If no credentials, no OBS00-B resolver, no outbound packet equality, route price stale, potentially billable uncertain attempt, missing budget reservation or planned call cap exceeded: **stop paid execution**. Keep provider-free story and forensic proof already collected. Report the exact gate and what Cursor would need **from implementation/design**, not a blanket "user should run it manually".

**Never attempt to obtain paid success by**:
- changing `retainsCapturedAuthority` to return true;
- assigning the captured task policy as current policy;
- retrying uncertain send with a new operation ID;
- removing `--confirm-live` guards;
- inventing `OPENROUTER_API_KEY`, rotating models or pricing without explicit source;
- jumping to a provider test runner with weaker billing controls;
- changing local/dev/production env flags silently.

## 6. Exit S5

Mark `RUN-LOG.md` live mode `PASS/PARTIAL/BLOCKED` with total attempted external requests (integer), **total settled USD**, possible unresolved charge, model/route, exact observed use/status, campaign/G IDs, source coverage and cap proof. If no call was made, state **0 actual calls / $0 settled because gate X** and do not portray mock results as live quality.

Push `CHECKPOINT.md` and sanitized evidence.

**Next:** [S6 final comparison and handoff](06-FINAL-FORENSIC-HANDOFF.md).
