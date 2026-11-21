# CFG01 | Versioned effective Writer configuration, not hard-coded mission policy

**State: PROPOSED / PLANNER-BLOCKED / not commissioned for code.** Owner motivation, [2026-11-22 minutes](../../../sessions/2026-11-22.md#6-strongly-configurable-runtime-policies-not-hard-coded-subscription-logic). This lightweight packet records the desired product and execution boundary; ChatGPT must inspect integrated WR10/WR11 and the existing quota resolver before promoting it.

## Owner direction

Storyteller models, sampling controls, maximum effective input/context/output size, rounds, tool calls, retrieval/repair/research quotas, timeouts, soft conserve thresholds, hard stops and spend caps should be **versioned externally managed data**, not a growing lattice of hard-coded values in Writer functions. Business/product/Admin will eventually publish policies for multiple commercial tiers; Chamber will trial draft configurations. Values and ranges can evolve independently without editing agent implementation. Typed, highly configurable does **not** mean arbitrary executable JSON or freedom to bypass security, funding, canon, rights or transactional safety.

## Existing foundations and gap

- [Spending and entitlements](../../../../docs/technical/platform/spending-and-entitlements.md) already distinguishes **entitlement profile, usage window, funding allowance, task recipe and creative profile**. These must stay independent. It selects server-side intersection of versioned platform ceilings, user/story restrictions, payer funding, task purpose and provider capability, followed by fail-closed cross-field validation.
- `packages/storyteller/src/tasks/policy.ts` has `modelPolicySchema`, execution policies, price and token calculations; `packages/story-engine/src/storyteller/budget.ts` has durable financial reservation/settlement. Preserve these owners; this Change must not invent a second quota ledger.
- `packages/story-engine/src/storyteller/writer-continuation.ts` currently hard-codes `maxModelRounds:4`, `maxInputTokens:8000`, `maxGeneratedTokens:2000`, `maxMicrousd:'250000'`, `deadlineMs:120000`. Those are acceptable frozen defaults for an existing fixture but not long-term commercial policy. Source must be reconciled with WR11's new admission configuration.

## Selected direction for later design review

Persist **immutable recipe/profile revisions and explicit activation pointers**, never mutate a revision already captured in a mission. Resolve one effective configuration **at admission** from versioned platform ceilings, entitlement, funding/payer, account/story limits, task recipe and verified route capability; record contributing revision IDs and which constraints were limiting. Numeric ceilings take the strictest value, allowlists intersect, disabled remains disabled, stale/unavailable price metadata blocks paid send. Scope and approval of model provider/temperature/top-p/reasoning/etc is capability-validated per route. Unsupported controls are rejected or explicitly omitted per selected transport contract, not blindly forwarded. Soft warnings may reduce optional work but hard ceilings, essential story facts and billing are never relaxed.

Current dispatch grant and funding ledger remain independent of published configuration. A recipe or an Admin edit cannot mint money. Resolved policy is pinned to source/mission and enforced again at possible-send under existing SQL custody. Config changes apply to future missions; uncertain/in-flight attempts keep original provider/price/account and no automatic retry. Do not encode `if free/premium` branches into game or model loop. No implicit fallback to more expensive models.

## Suggested low-cost proof, after source design

Use **synthetic** free/limited/high-capability profiles and two model capability mocks: resolver returns deterministic effective limits with cited narrowing reasons; unchanged mission replay ignores a later policy update; unknown/mismatched price, no owner grant, exhausted run or unsupported temperature all fail closed. Preserve current scripted capture and budget behavior. No paid provider call, no schema migration without later packet/source review.

## Planner blockers / promotion gate

1. Read merged WR10/WR11 actual admission/GA dispatch interfaces; identify one true resolver and the right policy-data owner, not a new generic config framework.
2. Audit existing DB policy/grant/window tables and any versioned recipe/profile records, including seeds, active pointer, provenance and rollback behavior; select minimum additive schema only if needed.
3. Decide precise validated parameter inventory, scopes, precedence and safe defaults with named product owner; avoid over-engineering unneeded knobs.
4. Decide how Chamber draft recipes preview against the same resolver without granting production money; coordinate [CH01](../2026-11-22--ch01-chamber-experiment-workbench/CHANGE.md).
5. Prepare small source-grounded tasks and transaction/financial negatives. Keep [CFG02](../2026-11-22--cfg02-admin-policy-management/CHANGE.md) separate and deferred until this resolver is proven.

**No code edits, no migrations, no live model runs authorized.** State remains Proposed; the user's concept is recorded for later promotion.
