# AD06 | Honest technical usage and exposure view (not subscriptions)

**State: Proposed, NOT Ready.** Code-bearing source-backed metering read. **Depends on:** AD03 + AD04; coordinate AI source ownership with AD05. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** an authorized operator sees the actually recorded technical funding window/attempt statuses, including reserved, dispatched, settled and uncertain exposure, and can distinguish company provider activity from a hypothetical customer plan.
>
> **Authority:** [Commercial/AI separation](../../admin/commercial-operations-product.md), [source-backed operations contract](../../admin/technical/operations-economics-and-releases.md), [redacted read rules](../../admin/technical/read-models-and-privacy.md), [V1 endpoints](../../admin/technical/core-v1-contracts.md).
>
> **Start/revalidate:** `packages/application/src/storyteller/{window-accounting,dispatch-authority,usage-policy}.ts`, `packages/db/src/schema/storyteller.ts`, `packages/contracts/src/usage-policy.ts` and existing Admin API/policy. Avoid broad scans of unrelated engine code.
>
> **Do not:** invent paid tiers/credits, add grants, mutate reservation history, create a new chargeable-unit rule, expose private provider input, implement stop/pause control or call a live provider.

## Intended code delta

1. Define strict `UsageStatusV1` projection keyed by permitted account/story/technical scope, with source IDs/measurement timestamps, usage-unit labels, window version and `reserved/dispatched/settled/uncertain` distinctions.
2. Implement a bounded read from actual technical storyteller usage allocation/funding sources; account scope must not become global usage authority. If an allocation lacks authoritative cost data, mark estimate/unknown rather than `0`.
3. Expose `GET /api/admin/usage/status` under specific `commercial.usage.read` or `platform.spend.read` grants, not blanket Player 360 read.
4. Show an honest operator component: source-backed account technical usage, unresolved exposure and missing commercial integration with `unsupported` status. Link from permitted operation and player account.
5. Add provider-free tests for reserved versus dispatched, unknown/lost acknowledgment, partial window coverage, user-scope privacy and no writes.

## Normal and discriminating negative

**Normal:** an authorized operator opens a seeded account's technical usage and can distinguish reservations, settled counts and uncertainty with valid units and observed time.

**Negative:** absent billing processor, stale source, unknown provider invoice or pending attempt is not displayed as `Free tier`, `0 cost`, `all settled` or `50 paid turns`. A Support summary-only staff actor cannot infer global spending or another player's usage via aggregate totals.

**Proof:** isolated projection test + disposable DB/Nest two-account/unknown allocation integration, browser evidence for truthful unknown states. No real provider calls.

## Excluded / risk

No payment or refund, subscription catalog, global sponsor stop, adjustable quotas, finance accounting claim, marketing targeting or chargeback flow. Do not add a worker dispatch dependency in a read-only packet.

**Ready gate:** existing AD03/04 staff boundaries verified and actual usage owners re-inspected; owner selects. **Return:** exact sources, definitions, privacy tests, measured read bounds and provider spend none.
