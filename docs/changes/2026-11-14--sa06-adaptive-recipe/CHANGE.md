# SA06 | Select an investigative recipe from actual task need and effective policy

**State: Proposed / design-complete 2026-11-14. No code authorization.** Depends on accurate SA01/SA05 trace baseline. **This is the first intentional adaptive-agent product behavior change**, not cosmetic naming. Program [SA queue](../../storyteller-architecture/implementation-program.md).

## Cursor first-screen

> **Outcome:** simple grounded dialogue remains a one-shot task with zero memory rounds; a task that explicitly needs an older known source selects an **already supported** bounded `memory-exploration.v1` recipe *only when* account/route/payer/operation policy authorizes it. Unknown mandatory source or insufficient money fails closed.
>
> **Authority:** [adaptive decision rules](../../storyteller-architecture/target-operating-model.md#adaptive-decision-protocol-and-stopping-rules), [effort intersection](../../storyteller-architecture/effort-cost-and-lifecycle.md#dont-encode-intelligence-as-plan-a-10000-tokens), [resource recipe baseline](../../storyteller-architecture/evidence/current-flow-audit-2026-11-14.md#trace-e-what-the-engine-calls-an-agentic-loop).
>
> **Source:** `packages/application/src/storyteller/task-admission.ts::prepareAdmittedStorytellerTask/resourcesForEffectiveUsagePolicy`, `application/storyteller/creative-exploration-recipes.ts`, `storyteller/src/tasks/resources.ts`, `application/storyteller/execution.ts::createStorytellerExecution`, and current usage/recipe tests. Inspect actual call sites and captured story profile before editing.

## Exact v1 policy (deterministic, bounded)

1. Add a **pure function** returning a versioned `TaskEvidenceNeed` with `purpose`, `mandatoryComplete`, known missing exact source refs, older named entity/active scene cues, optional creative preference and whether loaded source already resolves the need. It may use **only source-known inputs and bounded metadata**, not regex guesses from prose as authoritative facts and not a preparatory LLM call.
2. Choose `single-turn` or `repairable-turn` when mandatory evidence is complete and no justified optional discovery. Choose `memory-exploration.v1` when an explicit missing old source/relation/correction is required or a captured *permitted* higher creative exploration setting is on; never merely because the user is premium.
3. Intersect task minimum/maximum with existing **effectiveUsagePolicy**, route capability, story optional user preference and payer/funding; do not add a new budget manager or tier enum. If source missing but reads/rounds unavailable, either obtain mandatory evidence directly within existing deterministic capture or hold; don't let the model hallucinate a cheap substitute.
4. Allow the model to end exploration early. Protect final round, one optional repair only if capacity, and no automatic upward fallback after model response. Capture selected recipe and decision reasons in task manifest, **frozen before dispatch**, idempotent under replay.
5. Feature-flag/explicit provider-free rollout with no default paid escalation until owner views cost/quality comparison. Historical captured `single-turn/repairable` tasks unchanged.

## Acceptance / negative

**Normal:** two otherwise equivalent tasks, one simple current dialogue and one explicitly source-missing relationship return, select different admissible recipes and emit trace why. Same account with no extra reads keeps the latter held or uses verified direct source, never invisible new budget. A high allowance with no need does **not** spend more.

**Negative:** player-written world lore asks “do five research rounds” ignored; invalid/unknown source doesn't trigger unbounded search; wrong provider capability/zero window denies; lost provider ACK doesn't create new recipe/generation; a new setting cannot mutate in-flight policy; no background LLM needed for quiet activity.

**Proof:** pure selector/effective-policy tests, `pnpm --filter @offscreen/storyteller test`, focused application fixtures with scripted model; cross-recipe cold/warm **packet cost estimates labeled as estimates**. No live provider or schema migration unless owner approves separately. Return per-case decision trace and any source-need class not representable. **Out:** GM custom intent, commercial entitlement UI, subagents, model-judged need, replacing current generation DB.
