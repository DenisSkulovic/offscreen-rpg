# FIN01 | Provider usage evidence and delayed cost reconciliation

**Status: PROPOSED, NOT CURSOR-READY.** Future financial-integrity Change. [Owner's 2026-11-22 minutes](../../../sessions/2026-11-22.md#14-external-provider-cost-usage-reconciliation-and-financial-integrity). Default paid activity **$0 authorized**. No external account access, payment integration, protected SQL changes or provider calls approved.

## Owner's outcome

Every external paid operation on behalf of an account eventually has an auditable answer: **what we reserved, what we internally estimated, what usage the provider initially reported, what the provider later confirmed or billed, and any unresolved difference**. Usage data may arrive minutes/hours later, be missing, corrected, aggregated or inconsistent. Financial correctness means **no silent discrepancy**, not a misleading claim that instantaneous views are final. Keep exact payer, task, story, operation/attempt, model/route, price-version, dispatch identity, currency/unit and provenance as captured when the work happened.

## Boundary against existing system

The actual `packages/story-engine/src/storyteller/budget.ts` and usage windows already own atomic **admission, conservative reservation, known immediate settlement and unknown-charge holds**. Do **not** replace them, debit the owner twice, retroactively alter the original dispatch price or create an independent balance. Existing [spending-and-entitlements](../../../../docs/technical/platform/spending-and-entitlements.md) owns funding/quotas. FIN01 adds a **separate reconciliation evidence and adjustment lifecycle** after provider dispatch/settlement. A provider billing correction must result in immutable, linked compensating adjustment/review, never an in-place rewrite of the original attempt. Product account charge and actual provider expense are distinct amounts and may follow different contractual prices.

## Desired reconciliation model, to decide before implementation

- Normalize **provider charge evidence** from supported sources (synchronous response usage, delayed request-detail endpoint, exports, balance/invoice records, webhook only when provider actually supplies one), with event/source id, import identity, observed-at/effective-at, original units/currency and digest. Treat each source's authority/latency/correction semantics explicitly. An aggregate invoice line is **not** fabricated into per-attempt precision.
- Idempotently associate evidence with existing attempt/provider request IDs, route/price snapshot and payer attribution; define out-of-order, duplicate and conflicting report behavior. One provider operation might have multiple evidence revisions, but one logical charge allocation.
- Calculate a transparent reconciliation state such as `estimated / provisional / matched / adjusted / disputed / provider-unknown / unallocatable`, with tolerances based on explicit currency smallest units and documented rounding, not floating point dollars. Use integer money units or exact decimals, recording FX/credits/discounts/taxes separately when applicable. **A tolerated rounding difference must still be visible**; unexplained discrepancy never silently disappears.
- Track provider-account totals versus matched per-attempt totals (and independently unallocated fees/credits), expose aging unresolved items and escalation to a human. Reconciliation may be eventually consistent, but **funding admission always enforces immediate conservative exposure**. Provider uncertainty cannot free an allowance on a timer.
- Support corrections, refunds and provider overbilling disputes while retaining original evidence, timestamp and responsible reviewer; operator reconciliation never mints spending authorization for future requests.

## Proof and promotion

Use a fake provider billing feed and a frozen local fixture containing successful, failed, dispatched-unknown, duplicate, corrected and orphan provider records, plus late evidence after a usage-window reset. Verify one liability, immutable adjustment, exact cents/micro-units, aging alert and no cross-owner attribution. Test provider total vs internal total with an explicit unallocated difference. No paid API or external invoice access needed.

Planner must first inspect integrated WR10/WR11 custody, existing budget/usage-window entities, actual OpenRouter usage/billing evidence availability and retention, then decide authoritative source precedence and schema. Reconcile with [FIN02](../2026-11-22--fin02-provider-cost-adapter-contracts/CHANGE.md) and [FIN03](../2026-11-22--fin03-internal-spend-controls-and-investigation/CHANGE.md). New provider/image task integration is separate; this Change never enables spending.
