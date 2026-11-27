> **Terminal owner disposition (2026-11-27): Superseded.** Dated audit and implementation ladder retired following TURN03 cancellation, DIST03 and DISTURN supersession, and monorepo/Agent Core redesign. All former dispatch instructions, repair cards, source anchors, packet counts and scripted acceptance below are historical, not current authority. Preserve progressive verification and financial/safety gates; no new PASS, no source changes, no live permission. [Verification capabilities](../../../../infra/verification/CAPABILITIES.md) · [Original complete dossier](https://github.com/DenisSkulovic/offscreen-rpg/tree/ec8a4665c4498af82b51252b2d5f334ea975ffa6/work/designs/open/first-campaign-readiness-2026-11-20).

# Cursor implementation schedule | vertical ladder and terminal outcomes

**Priority supersession:** [work/IMPLEMENTATION-ROADMAP.md](../../../IMPLEMENTATION-ROADMAP.md) now decides short-term next work. This document remains source-backed historical design; T07/T08/T09 may already be landed. QUEUE alone selects work.

**Read this, not 19 folders.** Source baseline `3992437`. Parent+child Composer Standard. Use existing Change `TASKS.md` T-IDs, 2–5 named source anchors and exactly one write owner. This file is a temporary integration **schedule**, not an independent Change, product specification or approval for money/destructive operations.

## Morning dispatch

Suggested user prompt: "Read `work/designs/open/first-campaign-readiness-2026-11-20/README.md` and `CURSOR-EXECUTION.md`. In `work/QUEUE.md` select the next explicitly authorized existing Change, starting with STORY03 T07. Execute only the named finite T-ID with its positive and negative tests, update real evidence/status/docs, commit, and stop/report. Continue to the next T-ID only after integration checkpoint; don't spend on providers or mutate an unowned cluster."

**Important:** existing `work/QUEUE.md` remains `none` until the morning owner instruction. One selected Change; T-ID stays internal. Never assign all proposed Changes as a batch. Finish a bounded 2–5 task wave, then one integration/commit/reconciliation checkpoint. No Grok handoff by default. For an actual contradiction return source+observed failure to ChatGPT.

## Wave 0 | baseline, zero mutation

- Confirm HEAD and no concurrent dirty work; Node24/pnpm11 and disposable `offscreen_auth_test` availability. Review prior HK03 archived proof; do not resurrect the deprecated shared-session profiled test as a universal blocker.
- Re-run only targeted Storyteller tests needed for the selected seam, with `STORYTELLER_LIVE_ENABLED=false` and no provider key. Source/target prerequisite tests are in STORY03 T06 and existing scripts. If services are absent, record NOT-RUN; never mislabel skipped tests PASS.
- Record baseline from four classes: pure, disposable-Postgres, two-process, browser/cluster. A single green count does not absorb missing classes.

## Wave 1 | STORY03 routing and authority, in TWO small existing-packet tasks

**T07: control-side publication delegates only to private GA.** Exact source: `apps/worker/src/activities/storyteller-distributed-control.ts`, `runtime/control.ts`, `bootstrap/control-main.ts`, `apps/game-authority/src/{application,server}.ts`. Existing GA control publish endpoint is already present. Remove control worker's direct database/adoption/publication path **after** swapping it for authenticated control-token HTTP call; GA is sole publisher. No new SQL schema or second publication algorithm. Positive saved scripted result → HTTP publish → exact one committed passage. Negatives GA down, wrong role, duplicate after ACK crash, control worker with no DB credentials. Do not add fallback to legacy local runtime.

**T08: freeze topic across all admission/retry/wake paths.** Exact source: `packages/application/src/storyteller/{records,admission,capture-materialization,recovery,openings}.ts` and `campaign/follow-up-intents.ts`; dispatcher `apps/worker/src/outbox/dispatch.ts`. Enumerate durable notice writers, distinguish new work from retrying an already committed generation; do NOT switch a historical generation to distributed because env flipped. Existing `outbox` rows retain `topic` and `deliveredAt`. Decide whether persisted notice history suffices to resolve selector for later wakes, and fail closed on inconsistent histories. Positive initial+replayed notice picks same workflow type/id; negative flag flip with pending old notice, duplicate retry ID and cross-mode collision. See specific T08 card in STORY03; no environment-at-delivery selection.

**Join after T07/T08:** focused unit + disposable DB + actual GA HTTP tests. Output only the source-backed failure/result for each T-ID; don't claim first playable campaign. One GA server/auth writer; one application outbox owner; no parallel writes to those files.

## Wave 2 | small connected process harness BEFORE Kubernetes

Use existing STORY03 T09 and TURN03 T01/T02/T03 proof sources, not a second test framework. One disposable `offscreen_auth_test` and explicit shared document store. Boot Nest, GA, Temporal legacy relay/control/executor as *separate processes*. Drive a real source-backed signed-in request path: draft + admissible candidate → GA start scene1 → supported offered option → API PUT resolution → SQL outbox → distributed Temporal queue → real executor HTTP custody → GA HTTP publication → API GET scene2. Track one ID through every hop. Never seed a succeeded generation or manually call `runtime.complete` in the FINAL integration path.

Use existing `tools/api-integration/test/turn03-distributed-poc-fixture.integration.ts` as a **lower-tier behavior fixture** and `apps/worker/test/story03-distributed-handoff.live.test.ts` as **lower-tier workflow evidence**; neither is this new acceptance because the former short-circuits the worker and the latter seeds a generation/starts the workflow by hand. Port their successful pins/assertions into a single *real-process* runner with bounded timeouts and guaranteed cleanup (separate Stop failures from assertion failures). One golden scripted result, zero model calls.

**Exit for local M1:** scene1 visible and choice accepted, scene2 persisted and reread after worker restart; one result/attempt/commit, authoritative own-root and no double-send. Add wrong-owner, duplicate-command, GA unavailable, executor unavailable, corrupt-root negatives. If this wave exposes a contract flaw, create a *new small repair* only for observed cause; no expanding old umbrella.

## Wave 3 | remaining actual gameplay boundaries

- BOOT03: verify full authenticated start, remote GA fail-closed, exact source pin and stable scene1 checkpoint. If original Goal is fully proved, finish reconciliation and archive; otherwise retain one explicit last failure.
- STORY02: verify executor role custody across separate processes and replay of saved result; close once its own private claim/result Goal is established, even if STORY03 multi-process release remains open.
- DIST03: audit all **selected POC story writes**. Snapshot/start/resolution are GA seams; fork, historical read, control, documents and some other routes still use `this.stories` in Nest. For TURN03 historical fork/continuation, route only necessary mutating writes through GA with actor/role checks; leave unrelated app routes as separately documented exclusions, not a silently false "exclusive single-writer" claim.
- DATA04/DATA06: prove scene checkpoint and fork under authentic remote root, no parent-future reads. Do not invent alternate schema or generic semantic-memory infrastructure.
- Add a third and fourth supported choice only after the *same* two-scene loop is green. Assert stable passage/option IDs, exactly one new scene per action, unchanged historical prose, and no half-state after restart.

## Wave 4 | real Kubernetes release, single operator

TURN02 T03–T06: production Next image, tested real API/GA images, pinned rules S3 root, migration job, real app deployment + secrets, correct bind and explicit memory budget. K8S11 T03: authenticated same-origin route, SSR, SSE stream plus GET, private GA inaccessible publicly. TURN03 T03/T04: cold fresh kind scenario with complete scorecard; then worker loss after result save and after publish. Verify actual image digests; don't substitute skeleton placeholder readiness for app readiness. **No destructive operation on an unowned cluster**; require disposable kind ownership.

## Wave 5 | separate, opt-in actual Storyteller

M1/M2 scripted PASS do **not** imply a real model. OBS00/TURN04 remain gated until the owner explicitly grants a bounded spend and a durable dispatch authority design is implemented. Current distributed executor rejects provider mode. A paid model result must traverse identical validated publication boundary, with no uncertain-attempt retry; never enable live by accident.

## Evidence and lifecycle after EACH wave

Receipt: `{baselineSha, taskId, ownedPaths, commands+cwd+env class, actual tests/pass/fail/skip, positive, diagnostic negative, source delta, docs delta, remaining gap, evidenceTier}`. Do not turn NOT-RUN into PASS. Update canonical product/technical docs **where actual behavior changed**, STATUS only with evidence, Change reconciliation and ledger. Then close/archive exact achieved Changes, not the umbrella initiative.

**Work packaging correction:** if an open Change requires independent cluster/paid/model/optional follow-ons after a completed local slice, close the achieved bounded Change only through a truthful scope decision; retain the unachieved original outcome as a named new, smaller authorized Change if still desired. Never relabel absence as Done, and do not leave every tiny completed T-ID trapped forever under a cross-month umbrella.