# TESTLAB01 | Positive and adversarial acceptance

Evidence at planning time: source inspection only. **No command, live SQL insert or provider call executed.**

| Invariant | Required positive proof | Discriminating negative |
| --- | --- | --- |
| Production schema preserved | existing grant model and admission unchanged | no-grant admission fails without gen/outbox |
| Finite reusable test entitlement | valid owner has finite 24-hour 250000 microUSD grant | missing/expired grant refuses, no implicit first-user grant |
| Atomicity | 3 linked records created in one SQL transaction | inject failure at third insert, 0 new rows |
| Idempotency | second ensure of same owner/suite returns same IDs, unchanged counts | concurrent ensure cannot create 2 eligible grants |
| Grant compatibility | matching profile and current owner reused | incompatible, foreign, exhausted, duplicate eligible grants refuse |
| Account safety | separate disposable suite owner has distinct account/run | unrelated signed-in owner never granted implicitly |
| Zero provider cost | offline adapter/tripwire 0 attempted external LLM calls | provider-authorized mode, real credential or pin cause preflight refusal |
| Target safety | exact disposable DB or explicitly pinned local kind with verified DB identity | foreign kubecontext, unknown DB, wrong release namespace or no operator approval: zero writes |
| Repeatability | multiple provider-free scenarios use same committed harness without manual INSERTs | old failed operation cannot secretly replenish account or create duplicate wake |
| Truthful scope | unit vs real Postgres vs live kind status distinguished | no live kind claim from local fixture test |
| TURN03 compatibility | explicit future signed-in lab grant procedure documented | no automatic provision/replay of the two existing stranded operations |

Exact existing fixtures to preserve: `tools/api-integration/test/longform-acceptance/launch-grant.mjs::seedLaunchGrant`; `tools/api-integration/test/turn03-distributed-poc-fixture.integration.ts`; `packages/story-engine/src/storyteller/launch-admission.ts::admitLaunchWriterMission`; `apps/game-authority/src/writer-round-lab-policy.ts::readWriterRoundBootstrapMode`.

The production-like `kind-offscreen-lab` is **not a disposable test database by assertion**: manual explicit approval is required to write a funding grant there, even after code becomes reusable. Do not recycle stale snapshots or test against shared local database without knowing its owner. A $0.25 virtual allowance is not a $0 paid-provider guarantee. All actual provider calls forbidden.

Ready handoff is scoped to source patching and disposable tests. Live environment grant creation remains unauthorized, and TURN03 can remain BLOCKED until separate approval and a captured retry succeed.
