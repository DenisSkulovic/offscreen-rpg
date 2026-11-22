# CFG03 | Safe re-admission after long pauses, changed plans and future story portability

**State: PROPOSED / product-and-security decisions remain open.** This is a **runtime eligibility and execution semantics** Change, *not* an Admin view. Keep separate from [CFG01 effective policy resolver](../2026-11-22--cfg01-versioned-writer-execution-policy/CHANGE.md), [ADI03 historical inspector](../../experience-admin/2026-11-22--adi03-effective-policy-history-explorer/CHANGE.md), and [CFG02 Admin editor](../2026-11-22--cfg02-admin-policy-management/CHANGE.md).

## User-origin concern

A story might resume six months after its last scene, after model retirement, pricing changes, expired subscription, different service tier or an unavailable provider. User preferences may also change mid-story. The platform must remain predictable, authorized and financially safe. In a possible future **export/import/ownership transfer** feature, the receiving player must never inherit the previous owner's spending entitlements, account credentials, provider grants or private documents simply because the fictional story was copied.

**Transfer is a design stress test, NOT a feature authorized by this Change.** Existing single-owner model remains authoritative until separately redesigned.

## Selected invariant and decision boundaries

Distinguish at least these lifetimes:
1. **Committed fictional truth:** canonical past scenes, checkpointed world, earned time and published history are durable; model/tier changes do not rewrite them.
2. **Already admitted mission / possibly sent attempt:** immutable captured model, price, payer and operation/attempt identity; no repricing, silent rerouting or repeat send across restart. An unavailable provider during uncertain dispatch is held/reconciled using original liability.
3. **New task admitted after resumption:** resolve current verified player/beneficiary authorization, active entitlement, payer/funding/usage windows, allowed provider capabilities and published recipe intersection. Choose a currently permitted model route within applicable financial ceilings. If none is eligible, show a safe actionable hold rather than attempting retired/expensive routes.
4. **Player preference:** creative and user-facing choice carried forward only if still valid under the new effective policy; never implicitly converts a narrative preference into authority to spend.
5. **Possible future transfer:** imported world/canon provenance and ownership/visibility decisions must be explicitly re-established for the recipient; payer, private prompts, subscription benefits and staff grants **do not transfer** by default.

Model-routing changes are not automatically semantic changes to already-published scenes. A retired model affects **new** admission, not exact historical inspection. If an in-flight mission has become impossible to resume safely, the system should expose a held/recovery path and any pending liability, not relabel that same attempt with a new route. A new authorized mission may deliberately choose the fallback model under a **fresh** capture/operation and pricing policy, not silently impersonate the previous request.

## Bounded scope and acceptance

Expected source owners after promotion: CFG01 effective policy intersection, Writer new-mission admission and existing GA/SQL budget/attempt fence, current Story Engine story/owner source and safe player hold status. Do not create a provider alias service or a generalized story-transfer data model until actual product cases justify it. Public model-quality labels may remain stable while internal chosen providers change; avoid promising that a “Smart” tier means a particular permanent model.

Use **fake** two-model catalogue snapshots and synthetic time-dependent entitlements to verify: old scene remains attributed to original provider/policy; after six-month jump the **new** scene uses a newly authorized model or holds; expired entitlement, revoked funding, missing price or route denial fail closed; retry of old possibly-dispatched attempt never changes provider or double charges. For hypothetical ownership transfer, document the denied inheritance of old account grants, not code the transfer feature now.

## Planner promotion

Requires accepted CFG01 versioned resolver, WR11/WR12 source and player resume semantics, actual provider/attempt settlement state machine and a product decision about which preferences persist. Commercial transfer and export remain separate future Changes **if explicitly selected**. No paid model requests, new billing, transfer feature, deployment or protected data mutation authorized.
