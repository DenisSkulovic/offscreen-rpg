# Admin product charter | the internal operating system

**Status:** Proposed, 2026-11-14; owner review required. **Owns:** product purpose, principles, boundaries and target outcomes. Read [the map](README.md) for deeper owners. This is not a technical design or statement of deployed behavior.

## The product we are designing

Offscreen Control is the operating environment through which the Offscreen RPG organization **understands, supports, governs, improves and protects** its live player experience and the business providing it. The vision assumes a future service with many thousands of free and paying accounts, concurrent persistent campaigns, real spending on model providers and several employees with overlapping responsibilities. Any illustrative user counts are scenarios, not adoption claims or scaling benchmarks.

One company operates one set of player accounts, campaigns, executions, subscriptions, support cases and incidents. Its employees should not need incompatible shadow databases or departments' competing truths to answer basic questions.

**One platform does not mean one giant screen, one security role or one homegrown replacement for every specialized third-party service.**

## Jobs the Admin must make possible

1. **Locate and understand a subject:** find a player, campaign, transaction, execution, case, incident or release, and follow grounded links between them.
2. **Explain an outcome:** tell the difference between an account restriction, exhausted allowance, delayed operation, model failure, game-rule decision and display bug.
3. **Help without corrupting:** preview the player's effective experience, open an investigation, propose a bounded remedy and, where permitted, execute it safely.
4. **Operate the live game:** know which rules/storyteller configurations affect which campaigns; detect regressions; control rollouts and response to emergencies.
5. **Control commercial exposure:** understand feature access, subscriptions, usage grants, provider costs, refunds and gross margin.
6. **Steward trust:** control access to private data, address abuse and privacy requests, review privileged actions and recover from staff mistakes.
7. **Learn as a product organization:** connect activation, player retention, narrative quality, reliability and economics without pretending every metric is real-time or causally conclusive.

## Enduring product principles

| Principle | Experience-level obligation |
| --- | --- |
| Capability-based, not title-based | An employee may combine Support, Engineering and Commercial abilities without receiving unrelated authority. |
| Separate staff and player identity | An operator does not become a more powerful player. Viewing or acting on behalf of a player is an explicit, attributable mode. |
| Inspect before modifying | Most diagnoses should not require a production write or unfiltered story-content access. |
| Context follows the object | Related accounts, campaigns, executions, payments, cases, grants and actions are navigable without repeated manual detective work. |
| One operator action, one understandable effect | UI explains subject, planned effect, cost/risk, prerequisites, outcome and available reversal or remedy. |
| Proportionate friction | Routine permitted reads stay quick; private data, high-value financial changes and production-wide actions deserve additional checks. |
| Explainability of authority | Staff can understand why an action is permitted, denied or waiting for approval. |
| Purpose-bound access | Sensitive content and bulk exports are not implied by a generic ability to inspect an account. |
| Honest operational states | A request is not success; a queued intervention is not a completed repair; an estimated cost is not a final invoice. |
| Shared responsibility with boundaries | Staff collaborate across workspaces, but each workflow and consequence has a defined authority and record. |
| Cost and gameplay truth | Fictional time/inventory, commercial allowance and provider spend are different domains, even if all use numeric counters. |
| Long-term first, staged delivery | Specify a credible mature product independently of the current vibecoded baseline; implement only justified, testable slices later. |

## Product boundary

**Within Admin:** unified records, permission-aware internal search, workflows, approvals, diagnostics, interventions, case context, operational visibility, governance and business reports.

**Not the Admin's responsibility:** acting as the player's ordinary gameplay UI, authoring arbitrary code or SQL against live data, becoming a payment processor or email delivery provider, providing unbounded infra root access, or silently inventing gameplay truth that the engine has not committed.

Specialized services may handle payments, support ticket ingestion, messaging, monitoring or analytics. The Admin owns the **operator experience and business consequences** of these integrations, including visibility into source, stale/failed states and staff authority. Integration versus native build remains a technical/commercial decision.

## Expected design qualities

- **Discoverable:** an unfamiliar authorized employee can find the right account, relevant issue and permitted next action.
- **Consistent:** the same campaign/execution identifiers and relevant status mean the same thing across workspaces.
- **Auditable:** significant administrative access and intervention can be reconstructed by a reviewer.
- **Safe to delegate:** a trusted employee can receive precisely the authority needed, with scope, limits and expiry.
- **Operationally useful:** Support can resolve an ordinary problem without Engineering, while an exceptional engine failure can be escalated with evidence attached.
- **Measurable without theater:** dashboards show provenance, freshness and definitions; no fabricated player counts, success rates or AI-quality scores.

## Failure cases this vision must survive

- An employee has two capability packages with different scopes; effective authority must remain understandable and cannot silently widen to all accounts.
- A Support agent can see subscription status but cannot read private narrative content; the account view must remain useful.
- A high-value adjustment is pending approval when the requesting employee leaves; it must not execute implicitly.
- An operator retries a failed action after a timeout; the player must not receive duplicate credits or two separate state repairs.
- A player resumes a game while staff investigate it; a diagnostic experiment must not alter the live story.
- A production incident prompts an urgent rollback; the operator needs truthful impact and an emergency path, not an all-powerful unsafe shortcut.

## Product success signals (targets, not claimed metrics)

Success means shorter time to explain/resolve player problems, fewer unsafe manual interventions, bounded privileged access, high-quality incident handoffs, faster identification of expensive AI regressions, transparent grants/refunds and a reliable connection between game quality and business health.

Do **not** freeze invented SLA percentages or cost thresholds before actual operational evidence exists. Product instrumentation can be designed later around these outcomes.

## Relationship to the game promise

See [game vision](../vision.md): player intention, committed time and persistent consequences are authoritative. Offscreen Control observes and may safely intervene in that world; it must not replace engine rules with administrator prose. The operator environment is a separate shell as already established in [platform ecosystem](../experience/platform-ecosystem.md).
