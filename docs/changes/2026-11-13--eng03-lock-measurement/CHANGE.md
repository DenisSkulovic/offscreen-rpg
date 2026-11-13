# ENG03-M | Measure whether immutable DocumentStore I/O holds the story write lock

**State: Done (2026-11-14).** Measured disposable LocalDocumentStore delay under `preparePendingActionNarration` story lock. **Evidence:** [eng03-lock-measurement-2026-11-14](../../engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md). **Parent:** [ENG03 selected measurement/capture contract](../../engine-architecture/decisions/eng03-measurement-and-capture-contract.md). Full [ENG03](../2026-11-13--eng-short-lock-context/CHANGE.md) remains conditional; go/no-go from this run is `proceed-narrow-eng03-capture` (not auto-authorization of the full rewrite).

## Cursor first-screen

> **Outcome:** provider-free, reproducible timing traces show whether 0/250/2000ms canonical object reads inside `preparePendingActionNarration` extend same-story `FOR UPDATE` hold and delay a *legitimate* concurrent writer, giving a documented go/no-go rather than premature refactor.
>
> **Authority:** [ENG03 measurement matrix and threshold](../../engine-architecture/decisions/eng03-measurement-and-capture-contract.md#a-measurement-design-is-fully-chosen), [existing measure-first strategy](../../engine-architecture/decisions/eng03-instrument-before-refactor.md).
>
> **Read only:** `packages/application/src/campaign/actions.ts::createCampaignActions`; `campaign/narration.ts::preparePendingActionNarration`; `storyteller/context.ts::loadStorytellerContext`; `stories/persistence.ts::lockOwnedStory`; existing disposable application SQL test runner and DocumentStore test adapter.
>
> **Do not:** move context reads outside tx, change generation/task schema, add Cloud/S3 production config, provider calls, new auth/model capabilities or broad source read rewrite.

## Exact code-bearing delta

1. Add local test-only timed `DocumentStore` wrapper (not production global behavior) that delays only canonical immutable reads during context preparation by 0ms, 250ms, 2000ms. Keep actual API/worker adapters unchanged.
2. Add non-sensitive timing spans (monotonic) to a disposable test harness for transaction lock-acquire→COMMIT, object read segment, other SQL context read time, competing same-story writer lock-wait and unrelated story/read controls. Record with opaque story/operation IDs and grouped spans, no private prose/content, credentials or provider prompts.
3. Exercise **short** and **~40-active-passage** source with 5 repeats per delay after warmup, enough controlled concurrency to show lock time; expose raw observations and median/range, not meaningless uncalibrated p95. Record local DB mode, S3-mock/local adapter, machine and pool settings.
4. Prove a competing legitimate same-story writer actually reaches the lock and reports *wait time* separately from later expected business conflict. Separate unrelated story write/read control to avoid false claims.
5. Include missing/corrupt canonical object, overlong context and preparation failure scenarios to record rollback/hold outcomes. No real LLM, no paid task dispatch or live S3 service.
6. Generate a concise Markdown evidence receipt under `docs/engine-architecture/evidence/` **from real results** and recommend **proceed narrow / prefer cheap source-prefetch / no refactor** using the exact thresholds in the decision doc. Do not prewrite success.

## Normal / negative acceptance

**Normal:** at 2000ms injected I/O, measure whether median story lock hold increases ~1500ms+ and legitimate competing writer waits ~1000ms+ above 0ms; 250ms delay provides slope/correlation evidence. If no such propagation, report honest non-go. A measured outcome justifies *considering* full ENG03 but does not itself authorize production code.

**Negative:** unrelated reads don't automatically inherit writer lock delay; a rejected competing *game action* is distinguished from SQL lock wait; no instrumentation logs source/prompt; missing object never returns fabricated content; no real provider dispatched; no destructive shared DB reset. Measurement code can be removed without changing game semantics.

**Proof:** targeted test-only harness + existing `pnpm --filter @offscreen/application` test command(s) from current repo, against **explicitly approved disposable PostgreSQL/local S3 mock only**. Return raw span rows, exact command/environment and actual negative outcomes, plus one go/no-go decision.

## Permissions and closure

**Only user-authorized disposable test DB**; no production/staging DB with user data, paid provider, cloud credentials, data migration, deployment or broad CI. If no disposable test database is available, leave the Change unexecuted and report environment blocker; don't invent green measurements.

**Proof (2026-11-14):** `pnpm --filter @offscreen/application exec node --test test/eng03-lock-measurement.live.test.mjs` on disposable sandbox Postgres. Medians: 0ms hold ~54ms / wait ~51ms; 2000ms hold ~8072ms / wait ~8072ms; holdΔ≈8018ms, waitΔ≈8021ms → **`proceed-narrow-eng03-capture`**. Unrelated story locks stayed ~3ms. Provider spend: none. ~40-passage matrix not required for this decisive short-source result.

**Next action:** none for ENG03-M. Full ENG03 still needs an explicit Ready packet with capture DTO mapping before code rewrite. Queue continues with GM05 / PW01.
