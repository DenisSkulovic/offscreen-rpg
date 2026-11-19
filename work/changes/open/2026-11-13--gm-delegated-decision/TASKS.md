# GM07 | Composer dispatch: consented published withdrawal

**Source baseline:** 584b594; **state:** Ready for one bounded withdrawal proposal, **not yet a durable integrated fallback**. **Model:** Composer Standard. Authoritative product choice: docs/product/gameplay/time-and-autonomy.md; technical: docs/technical/engine/chronology-and-activities.md.

**Source-backed distinction:** `packages/application/src/campaign/delegated-decision.ts:admitDelegatedDecision` is already a **pure reducer** with 20-real-minute `PREAPPROVED_WITHDRAWAL_WINDOW_MS`, exactly two published choices, consent version/revocation, idempotent settlement, refusal of combat/model work. Search at 584b594 found only an export in `stories/index.ts`, not a durable expiry scheduler or SQL integration. `packages/db/src/schema/stories.ts:storyPassage.decisionPlan/responseDueAt` is an older timing mechanism; it does **not** automatically persist new GM07 consent or provenance. `packages/contracts/src/stories.ts` exposing dueAt/defaultOptionId is a read projection, not proof of the GM07 scheduler. Don't substitute the old default-choice mechanics without policy.

## T01 | Prove already-landed pure reducer | PLANNER-READY, VERIFY
**Read:** `delegated-decision.ts`, `test/delegated-decision.test.mjs`. Run focused approved pure tests; verify player-before-expiry vs expiry collision ordering, revoked consent, wrong fallback kind, duplicated delivery, hidden combat/model request. **Negative:** no consent or stale/revoked version never chooses for player. **Stop:** pure tests fail; return assertion and source, don't redesign.

## T02 | Durable consent and published-offer fence | PLANNER-BLOCKED (not a cheap implementation yet)
**Architectural decision still required from ChatGPT/owner:** exact storage/actor policy for consent (at publication vs later grant), pause priority, scheduler ownership, and atomic comparison with current published offer. **Do not ask a Composer child to infer** whether existing `storyPassage.responseDueAt` and `decisionPlan` can lawfully implement this consent; pure reducer has no transaction. Once schema and owner are settled, split into: (a) strict consent DTO + tests; (b) SQL lock and same-offer CAS; (c) bounded wake/expiry; (d) event provenance and no-second-action integration. One writer each.

## T03 | Future proof | GATED
Use real disposable SQL: expired published offer+consent yields exactly one ordinary withdrawal command, while contemporaneous player click, pause, source revision or revocation wins appropriately; wait consumes zero fictional seconds. This is **not ready** without T02; no live provider call or general AI agency. **No Grok justification.**
