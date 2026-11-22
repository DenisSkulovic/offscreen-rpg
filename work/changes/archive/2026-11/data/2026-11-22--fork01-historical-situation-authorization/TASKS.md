# FORK01 | Cursor bounded execution

**T01 (PATCH-S):** Read `packages/story-engine/src/stories/{fork-reconstruct,scene-checkpoint-v2}.ts` and existing nearest fork test. Import `projectHistoricalSituationAuthorization` into fork-reconstruct and use in `v2ForkRowPlan` for `campaign.situationAuthorization`. No other runtime edits. Scope unit test to direct projection if existing integrated fixture is too complex, but **do not call Change Done without actual fork reconstruction evidence**.

**T02 (PATCH-M):** Add focused positive+negative integration coverage using existing fork test harness. Selected-access captured checkpoint -> fork has live selected access and prepared plans, original checkpoint unchanged; null/none case still works; malformed wrapped payload and mutated checkpoint hash reject without child rows; identical request idempotent. Test `assertReconstructedV2Matches`, not only helper output. Preserve parent/fork future isolation checks.

**T03 (VERIFY+INTEGRATE):** Run nearest package tests/typecheck and a focused fork integration test, record receipts. Recheck concurrent undertaking HEAD, integrate/squash into `undertaking/storyteller-workshop`, reconcile archive/ledger. Tell TURN03 chat exact integrated SHA and instruct reattempt of same pending fork id/request once Tilt source sync is confirmed. Do NOT mutate live kind or attempt recovery-matrix faults under this Change.

**Stop:** any mismatch of existing helper's live schema, different expected saved SQL form, source ownership collision, failed hash invariant or extra cluster mutation. Return exact file/function/test evidence to ChatGPT. One parent, one small task at a time, no subagent architecture investigation.
