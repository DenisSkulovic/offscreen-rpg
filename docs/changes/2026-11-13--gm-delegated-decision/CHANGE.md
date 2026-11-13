# GM07 | One consented safe response to an unanswered decision

**State:** Proposed, **not Ready**. **Approval and owner:** none for code, migration or provider spend. **Kind:** game time/decision authority contract, application state transition, tests and public provenance. **Parent:** [Mechanics evolution](../../experience/mechanics-evolution-program.md), [original-vision reconciliation](../../experience/foundations/vision-reconciliation.md). **Dependency:** explicitly selected [delegation policy](../../experience/patterns/decision-delegation.md), current supported finite-action admission and real deadline design. This is not GM03 standing routine.

## Cursor first-screen brief

> **Current-source map:** [Time/absence](../../../docs/time-and-autonomy.md#response-windows-and-absence), [committed-time decisions](../../../docs/technical/committed-time.md#decisions-with-deadlines), [application story operations](../../../packages/application/README.md). Inspect current campaign/decision ownership and typed offer/receipt path; do not infer behavior from a UI countdown.
> **Selected design target:** [Decision delegation](../../experience/patterns/decision-delegation.md#initial-policy-candidates-and-recommendation) and [four independent permissions](../../experience/patterns/decision-delegation.md#four-separable-questions).
> **Known trap:** a fallback selected at expiry may race with an actual player response, manual pause, offer revision, revoked consent or another player's action. Exactly one valid action may settle; no hidden AI outcome/purchase.
> **Scope:** **Proposed only; no code now.** One narrow deterministic safe-fallback offer in a solo fixture. No LLM personality agent or global unattended AI character control.

## One credible first behavior

A solo character has a *published* decision with two already-admitted choices. The player previously consented to using a specific safe fallback class if no response arrives by an explicit **real** deadline. On expiry, the server:

1. Checks the same current authorized viewer/character/offer and captured policy.
2. Verifies a permitted, still-eligible fallback.
3. Atomically fences any simultaneous player choice against the fallback.
4. Admits **one** ordinary action with one idempotent operation, rolls/effects/time as supported.
5. Publishes a factual provenance event saying this was the user's **preapproved** absence response.
6. Remains held when no eligible choice exists or another hold forbids execution.

This proves **permissioned nonresponse**, not a generic “AI personality chooses anything.” A later personality-guided ranking feature requires its own cost/evaluation decision.

## Why this is separate from GM03

GM03 is a standing **activity** policy such as repeat approved work until a horizon. GM07 is **decision authority** when a newly published scene asks something the player hasn't answered. A story may support one and not the other. Neither is enabled by merely selecting a creative Storyteller preset.

## Feasibility/baseline (reinspect before Ready)

The current first solo POC holds decisions indefinitely; [StorySnapshot.decision](../../../packages/contracts/src/stories.ts) can represent dueAt/defaultOptionId in some paths, but the presence of a field **does not establish that general autonomous response is implemented**. Authoritative expiration begins only when a playable decision is published, not during generation. Current main baseline inspected 2026-11-13; may move under Cursor.

Do not add a fallback button in React and presume it owns application time or actor control. UI may preview supported policy only after a typed backend contract exists.

## Code scope and exclusions

Potential owners: typed campaign or decision delegation policy, versioned captured grant, application expiration/selection admission, idempotent receipt, source-linked public action provenance, scheduler conflict tests and a minimal safe test fixture.

**Exclude:** automatically responding to any question, combat, financial trades, relationship commitments, controlling another player, new NPC agent, unbounded fallback refresh, generic world ticking, new cost tier, model interpretation on every deadline, publication of hidden plans.

## Acceptance and negative cases

**Normal:** published two-choice scene has a 20-minute real response window under selected policy; at expiry one preapproved withdrawal/decline action is accepted, settled exactly once, and shown as a delegated choice in chronology.

**Negative:**
- Player accepts the other offered option just before expiry: fallback does not also run.
- Manual pause/revoked future grant: no autonomous response bypasses it.
- Offer changes, expires or becomes ineligible: no stale fallback, stay held.
- Deadline not published because generation failed: no countdown begins.
- A hidden option must not appear in public grant preview.
- Duplicate scheduler delivery cannot repeat roll, item transfer, clock duration or provider cost.
- Creative Storyteller style is not a permission to delegate.
- Shared viewer cannot act for someone else's character.
- If narration fails after action settlement, fallback is **not** repeated.
- Muted notifications do not change accepted time/action policy.
- Consent was absent: retain indefinite hold.

**Evidence:** provider-free deterministic race tests and a safe public projection, then separately authorized connected DB/scheduler integration. No provider calls and no destructive database actions are authorized by this dossier.

## Ready gate and Cursor handoff

Requires owner approval of exact allowed fallback class, response deadline, consent persistence, pause priority, public event provenance and the no-fallback behavior. Reinspect the actual story/decision state path; if consent or time policy cannot be fenced at the application boundary, **do not ship a UI approximation**. Split engineering if a complete safe result cannot fit one Change.

**Expected human outcome:** someone returning after absence can say **“My character chose the safe retreat I allowed, because I didn't respond in time”**, and can inspect the real source and limits. The app must never imply they personally clicked or that the Storyteller chose arbitrarily.
