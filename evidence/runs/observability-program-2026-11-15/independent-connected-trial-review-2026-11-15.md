# Independent review | Connected forensic trial, source vs evidence vs inference

**Status: ChatGPT source/document review, 2026-11-15. NOT a second runtime execution.** Baseline `main@b88356feebebd47fbe2094189851af553a43a335`, [Cursor final report](../evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md), [run log](../evaluations/2026-11-15--connected-forensic-trial/RUN-LOG.md), [campaign identities](../evaluations/2026-11-15--connected-forensic-trial/S1-CAMPAIGN-IDS.json), [consequence ledger](../evaluations/2026-11-15--connected-forensic-trial/S2-LEDGER.json), [fault matrix](../evaluations/2026-11-15--connected-forensic-trial/S3-FAULT-MATRIX.json), [OBS06](obs06-case-scoped-situation-read-2026-11-15.md) and [OBS07](obs07-support-situation-ui-2026-11-15.md). **All evaluation numbers are Cursor-reported, not independently rerun by this review.**

## 1. Executive outcome

The trial substantially validates the **provider-free** business workflow and first forensic capture slices. Two synthetic Chamber stories persisted their actual passage/choice data and one ran a Temporal timed default across a closed browser. A **separate** scripted consequence generated a real G, seven database OBS02 stage rows and an OBS03 prompt-provenance sidecar, then published a passage. OBS06/07's protected Support view works **in a disposable synthetic permission context**. This is valuable.

It **does not prove** an end-to-end player campaign whose real external model read context, generated an answer, was validated, published, and later recalled information. That most important real-agentic trajectory was **never exercised**. The statement “F1–F5 passed” also spans different evidence strengths: F4 was a pure fixture/operation-trace stale-publication demonstration, F5 used mocked accounting, not a live disputed provider charge.

The strongest *new source contradiction* is in S5: the **ordinary worker** has no `dispatchAuthority`, but `tools/chamber/src/main.ts`, when `storyMode=true`, explicitly passes `dispatchAuthority: () => storyAuthority.usagePolicy` along with `createOpenRouterProvider` to `startRuntime`. Thus “OBS00-B missing from config.ts means all local Story-mode live calls are blocked” **does not follow**. The local route is potentially dispatch-capable. However its policy is **computed at startup and reused**, not independently refreshed against evolving entitlement at each send, so **the intended production OBS00-B safety property is still unproven**.

Also, the local launcher currently upserts `storyteller_funding` with `ON CONFLICT (...) DO UPDATE SET stopped=false` and `storyteller_run` with `enabled=true`. Restart can thus clear a prior operator stop/disable without a named authorized recovery procedure. This is a **source-level safety regression**, not an observed charge or evidence of a live incident. [Local trial safety change](../../../changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md).

## 2. Evidence-quality table

| Trial statement | Actual evidence | Strongest supported claim | Important missing proof |
| --- | --- | --- | --- |
| **Story A** Chamber v5 | Story `768b7227-4032-4eab-b691-3910a1644341`; revision 2, item holder caretaker, `responseSource=player`, public event | Real persisted scripted game/application transaction; item transfer survived reload | No G/provider/agent; A/B were driven by headless `--forensic-campaigns`, with separate Chamber/Playwright smoke, not manually watched interactive A/B gameplay |
| **Story B** Chamber v4 | Story `93a23f44-8106-4f47-9992-0dfb131eba82`; revision 2→3, `responseSource=default`, Temporal due | Real scheduled default persisted without browser action | No external model, no full mechanic event ledger |
| **OBS02/OBS03 consequence** | Disposable G `3985fb72-69ae-45fd-b6c4-cb1bf922fecd`, O `a6d96226…`, seven stage rows with epoch key, one prompt sidecar, one resulting passage | Real application/SQL scripted consequence capture/publish/diagnostic metadata under the test fixture | This G belongs to a **different disposable story**, not Story A/B; no provider send, no actual memory-use proof, sandbox subsequently destroyed |
| **Held opening** | G `14275b91-51d5-43a0-9931-b578e8dc09ba` with reviewed packet, 0 stage rows and 0 sidecars | Expected **scope coverage gap**: held opening is not within consequence-only OBS02/03 instrumentation | No proof the same stage timeline exists for every opening/task purpose; absence isn't necessarily an implementation defect |
| **F1 CAS/interrupt** | ENG03-C1/C2 integrated disposable tests 5/5; lock proof | Tested source/transaction path for one capture family; no new success receipt on interruption | Does not prove every storyline/long-lock variant |
| **F2 rearm/lease** | OBS02-H disposable tests 3/3 | Epoch-qualified stage keys, stale-lease terminal denial and conflict behavior for tested path | Not universal cross-worker crash guarantee |
| **F3 worker restart** | One focused integration subtest | Actual persisted duplicate-delivery/one-effect test | Full Storyteller suite still red; other paths not covered |
| **F4 stale publication** | Operation-trace fixture test 3/3 | Deterministic **fixture** supports stale-refusal representation | **No connected DB publication race** observed in this trial. Do not label it a source-committed stale scene |
| **F5 uncertain/unsent** | Fake-provider lifecycle/accounting unit/integration tests | Existing logic distinguishes unsent/uncertain in controlled fixtures | No actual uncertain external transport; no charge reconciliation exercised |
| **OBS06/OBS07** | Disposable Admin auth/Nest/Next/Playwright tests, strict S1 DTO + sentinel and foreign-case denial | Source-grounded safe Support UI works with a **fixture-issued** exact trusted case/campaign grant | **No real production grant issuer**, no real Support staff onboarding, and a fictional ticket is not independent human usability research |
| **Operational metrics** | OBS06 27 queries, local p50 ≈27–32ms for small/large fixture | Bounded query count/row caps in measured disposable source cases | 27 is nontrivial per request; no concurrency, network/database scale, cross-region or production SLO proof |

## 3. The S5 gate needs *path-specific* reinspection

### Ordinary worker (source-proven blocked)

`apps/worker/src/bootstrap/main.ts` composes `readStorytellerWorkerOptions(process.env)`. `packages/application/src/storyteller/config.ts` returns a provider but **does not supply dispatchAuthority**. `execution.ts` uses `options.dispatchAuthority?.(...) ?? null` and `retainsCapturedAuthority(task,current)` to deny a paid send when current policy is absent. This is OBS00-B, a real unresolved production/general worker contract.

### Isolated local Story-mode launcher (separately wired)

`tools/chamber/src/main.ts`:
- `storyLiveAuthority()` reads private `.env.openrouter` and verifies OpenRouter credits/endpoint, model/route/prices at **startup**, deriving a `local-story-live.v1` effective policy;
- constructs local Story mode execution with fixed accountId/runId and per-operation ceiling by CLI;
- starts `startRuntime(...,{provider:createOpenRouterProvider(...),dispatchAuthority:()=>storyAuthority.usagePolicy,...})`;
- writes local response artifacts to ignored `data/story-local-evidence`, not general remote telemetry.

This is **not** the same as default worker `config.ts`. Since the returned policy is independent of an individual task object and matches what local admission captured, `retainsCapturedAuthority` could permit a local send **if all other funding and review gates pass**. But the callback returns a startup-pinned policy, without reloading current entitlement restrictions; it cannot be advertised as production-ready current-account policy enforcement. A separate local one-time experiment safety contract is required.

### Concrete safety concerns in local mode

1. **Restart revives stopped funding**: `ON CONFLICT SET stopped=false` / `enabled=true` in `tools/chamber/src/main.ts` can undo an explicit stop. The global uncertain-attempt check in `budget.reserve` may independently block some uncertain states, but that is not permission to silently revive a stopped account/run.
2. **Task-wide cap is not automatically enforced by local launcher**: current startup inserts account/run limits **1,000,000 microusd ($1)** and a run maximum **250 attempts**. The owner authorized **$0.25 and at most four outbound requests for the completed S0–S6 experiment**, not a blanket use of the launcher’s default ceilings. Future experiments need an explicit, **database-enforced** separate cap/attempt budget, not an agent promise to stop clicking.
3. **Reviewed-vs-sent proof missing**: `dispatch-review.ts` persists `inspection.packetSha256` before the provider attempt, and `openrouter.ts` uses the same `buildOpenRouterRequest` and `JSON.stringify` in inspection and actual fetch. This is promising, but no mock-transport equality proof for the **configured local Story-mode path** was recorded. OBS00-A fixes normal worker's lost argument; per-round repairs/memory need distinct actual packet assertions.
4. **If an application-local pre-send safety check fails after `budget.dispatch` marked “possibly sent”**, the accountant may record uncertainty despite no HTTP bytes. Design the guard **before** liability transition or preserve truthful stage distinctions; do not call a pre-send local failure a free retry under an uncertain state.
5. **Pricing and model availability** are external live facts. Current startup checks endpoint existence and route price. It may fail if configured model/price route is stale; no code should hardcode current provider pricing from this review.

**Disposition:** two small, provider-free code Changes in order: [OBS00-L local trial safety](../../../changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md) and [OBS00-C wire equality](../../../changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md). After both are proven, propose a **fresh one-operation explicit owner-approved paid trial** using the local dev lane. **Do not relabel OBS00-B Done.**

## 4. Test reliability is a separate problem

The full `pnpm test:focus -- storyteller` was **6 pass / 27 fail** in Cursor's report. Source `tools/api-integration/test/storyteller.integration.ts` contains `time.id: 'simulation-gameSeconds'` at multiple fixtures; the tightened lowercase identifier regex rejects its capital `S`. This is a **concrete candidate cause**, not proof it is the only failing assertion. The custom-calendar case also failed `0≠55` and needs a separate source/expectation check **after** unblocking fixture validation.

`pnpm test:focus -- story-resolution` was 7/8 with a cleanup FK on `storyteller_execution_stage_generation_id_fk`; likely test teardown ordering after new OBS02 table. The base game behavior assertion apparently passed. Neither failure should be silently ignored, nor should production runtime constraints be loosened to satisfy old fixtures.

[QA narrow repair packet](../../../changes/open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md): fix test contract IDs under the **current** source schema and clean up dependent stage rows in test-only teardown, then rerun full focused suites. No weakening expected 55-game-second winter behavior or bypassing FK in production.

## 5. Support is real in test but blocked by governance

OBS06/07 add genuinely useful, body-free S1 reads and a React Support situation panel. Security tests prove self-created foreign campaign links do not grant access and raw sentinel text isn't returned.

The `support-investigator` grant requires `scope.campaignIds` and `provenance.kind='steward-case-binding'` plus `authorizedCaseIds`. `adminCapabilityAssignment` has no public production issuer for that exact binding and no persisted expiry column; `support-operator` has case summary but no new investigation grant. Thus **the UI is not independently usable by real Support employees yet**. Creating a case or attaching a campaign UUID must not grant permission.

A separate [trusted grant-steward design](../technical/support-situation-and-why-v1.md) remains the next Admin access milestone; prioritize after local live trial safety if the owner seeks agentic play, or before it if the owner seeks immediate Support rollout. No automatic broadening of existing staff roles.

## 6. Ranking and actual next step

| Rank | Recommendation | Reason and scope |
| --- | --- | --- |
| **1** | OBS00-L → OBS00-C: harden/test local **provider-free** safeguards first | Highest value to finally validate a **real** external Storyteller turn, not another scripted simulation; removes stopped-account restart and packet uncertainty risks |
| **2** | One authorized, at-most-two-attempt **real local Story opening**, conditional on caps and exact source proof | Observe model packet/usage/validation and actual publication. Requires **new owner spend approval**, not inherited S0–S6 budget |
| **3** | Restore `storyteller` / `story-resolution` focused-suite health | 27 failures + FK cleanup reduce regression confidence; easy high-value source/test work |
| **4** | Trusted case/campaign grant-steward issuer for S1 Support | Real staff currently can't use otherwise demonstrated API/UI without fixture SQL; separate governance/approval Change |
| **5** | OBS04 E0 finite-action writer coverage and historic replay | Important eventual source quality, but its DB/lock/codec migration should be targeted by actual failure data, not preemptively rewrite entire engine |

**Alternate priority:** If the owner intends **production live hosted Storyteller**, OBS00-B independent dynamic entitlement resolver is the first release gate, not local developer story hardening. If the owner prioritizes real Support access over live AI evaluation, trusted case/grant issuance should move to rank 1. This is a ranking of *next value under the actual previous user request* to test an agentic story.

## 7. Handoff standard

Do not rerun S0–S6 from scratch and claim new evidence. The next executor should read [new narrow handoff](../handoff/post-trial-next-cursor-wave-2026-11-15.md), one selected Change at a time, perform actual provider-free mock/funding tests, record real commands and gate statuses in GitHub, then return a focused report. **The old 2026-11-15 S0–S6 evidence remains immutable**, with this review linking its limitations rather than rewriting it retroactively.
