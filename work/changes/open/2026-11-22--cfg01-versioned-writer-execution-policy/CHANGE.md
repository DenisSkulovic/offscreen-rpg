# CFG01 | Effective versioned Writer execution recipe, not hard-coded tier branches

**State: PROPOSED / PLANNER-BLOCKED. This is a durable design packet, not executable instructions.** Owner idea in [2026-11-22 minutes](../../../sessions/2026-11-22.md#6-strongly-configurable-runtime-policies-not-hard-coded-subscription-logic).

## Why

Game subscriptions/plans and future business-operated tuning need flexible **typed** controls for provider/model routes, sampling options (only when supported), context packing, input/output/reasoning budgets, tool calls, model rounds, optional research/repairs, queue/concurrency/deadlines, hard and soft spending ceilings and recovery. Storyteller development needs the **same** recipe abstraction so the Chamber can vary settings without modifying code.

Current source drift: `packages/story-engine/src/storyteller/writer-continuation.ts` fixes `maxModelRounds:4`, `maxInputTokens:8000`, `maxGeneratedTokens:2000`, `maxMicrousd:'250000'`, `deadlineMs:120000`. These are acceptable pinned defaults/fixtures, not permanent product-config owners. Reuse `packages/storyteller/src/tasks/policy.ts`, pricing/transport and `docs/technical/platform/spending-and-entitlements.md` rather than inventing a second billing system.

## Canonical separation to preserve

- **Platform safety policy:** absolute capability ceilings and forbidden actions, code-enforced and auditable.
- **Entitlement/grant:** versioned account/business permission to access a route/capability; not money.
- **Funding allowance + usage windows:** actual liable payer and account/run/story/platform reservations, existing SQL lock and dispatch authority; never overridden by creative preference.
- **Task recipe:** per-task purpose-specific permitted effort, model route, response schema, sampling settings, context/output/tool/round/deadline bounds.
- **Creative profile:** voice, pace, risk, canon invention; never grants billable tool/model permissions.
- **Effective policy snapshot:** typed deterministic intersection of applicable limits/allowlists, contributors and limiting reasons, frozen with version pins **before** mission reservation/dispatch.

Configurable numeric values, proportions and ratios may vary widely within schema/operational safety bounds. “Infinitely configurable” means extensible typed dimensions with strong validation, **not** arbitrary JSON code execution or bypass of transaction authorization. Missing/invalid required config fails closed; `0` means disabled, not unlimited. No `if (tier==='premium')` branches in Story Engine. No silent provider fallback, auto top-up or downgrade of required canon truth. Provider unsupported temperature/reasoning semantics must be rejected or explicitly adapted, not blindly passed to every model.

## Proposed architecture, subject to source reconciliation

One versioned, data-backed policy catalogue with lifecycle `draft→validated→published→active→retired`; snapshots live as immutable named revisions, actor/audit metadata and source provenance. A single pure resolver computes effective policy and a source/price hash. Admission persists **the exact resolved snapshot** with capture/attempt identity so an Admin edit changes *future* admission but never re-prices or reconfigures an in-flight provider request. Read-mostly runtime caching permitted only with version-keyed invalidation and SQL authoritative checks at dispatch. No raw arbitrary SQL or model secrets in configuration.

Soft conserve/warnings are diagnostic/optional effort policy; hard monetary ceilings enforced in existing money/reservation transaction. Respect fixed/rolling quota windows, owner funding, mission budget, token/bytes limits and provider maximum capacity separately. Consider explicit configuration scopes (platform, catalogue, account entitlement, campaign override, one disposable Chamber experiment), with documented deterministic precedence via intersections, **not object spreads**.

## Do not implement now

No production Admin CRUD in CFG01 (that is a later CFG02). No new subscription checkout, tier pricing, commercial pricing, public entitlement grants or live provider activation. No new budgeting ledger or duplicated settlement mechanism. No automatic migration of old missions to new policy. No hard-code-to-DB move before a tested resolver semantics.

## Future planner checklist

- Inspect actual B1/B2 resolver/usage-window code and Writer WR10/WR11 admission/price snapshot after integration.
- Decide schema and persistence owner/transaction boundary plus migration/version compatibility.
- Verify frozen capture equality, limit intersections, disabled/missing config, soft-vs-hard rules, version concurrency, rollback and no future policy bleed into replay.
- Prove three synthetic tiers with **free fake models**, exact capped contexts and active funding run; no paid call.
- Source-map the single WR11 SQL-capable legacy Worker admission seam (not just Game Authority), and ensure effective policy gets to **that** transaction without changing actor permissions.

**Gate:** planner must settle these contracts before dispatching Cursor; current status **PROPOSED**.
