# ENG09 | Item-holder invalidation must produce one recoverable controlling consequence

**State: Design selected / implementation-ready for explicit owner authorization (2026-11-13).** Not selected as current Change; no code or paid test authorized by this document. **Decision owner:** [interrupted-action contract](../../engine-architecture/decisions/eng09-interrupted-action-consequence.md). **Evidence:** [confirmed dead-end probe](../../engine-architecture/evidence/eng09-interruption-playability-probe-2026-11-13.md). **Parent:** [engine program](../../engine-architecture/implementation-program.md).

## Cursor first-screen handoff

> **GOAL:** An admitted `item.transfer.v1` whose required item holder changes before its due boundary commits one factual interruption and gets one *normal controlling consequence follow-up*, not an abandoned campaign with null offer and empty holds.
>
> **AUTHORITY:** [selected exact ENG09 transition](../../engine-architecture/decisions/eng09-interrupted-action-consequence.md#authoritative-transition), [idempotency / cost and hold rules](../../engine-architecture/decisions/eng09-interrupted-action-consequence.md#cost-hold-failure-and-recovery-rules); existing time/hold/game authority.
>
> **SOURCE ENTRY:** `packages/application/src/campaign/action-executions.ts::settleActionExecution`; `campaign/narration.ts::consequenceReceiptSchema/createConsequenceNarration`; `campaign/holds.ts::holdCampaignForStorytellerIntent`; `storyteller/publication.ts::publishStorytellerResult`; `test/eng01-item-transfer.live.test.mjs`. Inspect `campaign/follow-up-intents.ts` and public reads only if actual execution scope requires.
>
> **BOUNDARY:** One `action-interrupted` consequence keyed by the existing execution ID, same transaction as interrupted terminal event, with story hold and idempotent outbox; task/hold/publication reuse, not a second recovery subsystem. No new player command.

## Exact code-bearing outcome

1. **Classification:** distinguish item-holder mismatch at target from controlling world-obligation interruption; only former creates `action-interrupted` controlling consequence when no other controlling owner exists.
2. **Atomic source:** keep existing terminal execution event, elapsed fictional time and no roll/no successful receipt/no transferred item. Add strict receipt discriminant carrying original `executionId`, terminal revision/event, game-second, `cause='required-item-holder-changed'`, offer/action identity and safe factual text. Persist `campaignConsequence.operationId=execution.operationId`; add `storyteller-intent` hold and enqueue durable preparation in same transaction; viewVersion updated correctly once for that commit.
3. **Follow-up worker:** `createConsequenceNarration` recognizes one new consequence kind; verifies terminal execution/event, absence of successful receipt, story/source version, one generation per consequence. Build existing `consequence` storyteller task (no new task family) with no-roll/no-effect fact, and transition existing intent → generation hold.
4. **Publication:** existing consequence path validates current context, saves new passage/offer + new authorized plans, and transitions generation hold → decision. Old offer never reappears. Do not grant or expose hidden current item holder merely because the engine learned it.
5. **Failure:** provider/funding/preparation/CAS failure retains interrupted source and visible controlling hold. Use existing same-generation retry and operator/usage uncertainty semantics. No unbounded new spend or automatic paid replay. If currently no public reason for pre-admission failure, expose narrow truthful read state, not a fake actionable choice.
6. **Compatibility:** existing ordinary ENG01 transfer, world obligations, scripted histories and already admitted tasks continue unchanged. **Verify** that item transfers have no speculative `pendingResolution/preparationGenerationId`; if false, reconcile the source before touching `story_resolution_base`.

## Must pass

**Positive:** disposable mid-flight SQL fixture: holder moves elsewhere; item stays there, action interrupted at correct frontier; no roll/success receipt; exactly one interrupt event, consequence, hold, later one new scene/offer via provider-free scripted generation. UI/authorized public snapshot never left with null offer **and** empty holds once the action is terminal.

**Negatives:** admission-time mismatch still rejects before time; duplicate worker runs do not create duplicate consequence, generation, funded attempt or fictional time; new offer does not permit the invalidated original transfer; world-obligation interrupt does not create second consequence; failure/uncertain funding retains source + hold, and no automatic paid retry; bad/missing CAS does not invent prose; wrong viewer cannot access; original successful transfer still settles once.

**Verification:** pure transition tests, focused existing `eng01-item-transfer.live.test.mjs` against **disposable SQL only with explicit owner permission**, existing narration/publication tests, contract/public-projection tests if touched. No live Storyteller, deployment, production DB, destructive migration or provider charges. Return SQL/public snapshot row evidence, exact test commands, diff and remaining unproven claims.

## Not ENG09

No generic recovery command, no UI Continue, GM05 feed, new actor framework, new NPC theft engine, model-generated item transfers, Storyteller provider change, unlimited retries, ENG03 transaction refactor, ENG06 production worker deployment.

**Next action:** owner explicitly selects/authorizes ENG09; Cursor rechecks current main/worktree and disposable environment, marks one active Change Ready under repository policy, implements this exact outcome, returns measured proof. **No implementation permission merely from this Change being design-complete.**
