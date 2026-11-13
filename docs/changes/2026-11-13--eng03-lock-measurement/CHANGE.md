# ENG03-M | Measure whether immutable DocumentStore I/O holds the story write lock

**State: design-complete, executable once owner authorizes disposable tests (2026-11-13).** Not current/active; **no code/test permission by saving this file**. **Parent:** [ENG03 selected measurement/capture contract](../../engine-architecture/decisions/eng03-measurement-and-capture-contract.md). Existing full [ENG03](../2026-11-13--eng-short-lock-context/CHANGE.md) remains conditional and not Ready.

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

**Executor next step:** owner selects ENG03-M, confirms test environment consent, sets it Ready/current under repository policy; Cursor implements/records measurements and returns. Full ENG03 remains a separate code Change with a conditional capture DTO and compatibility gate; do not implement it as an “easy follow-on” in the same execution.
