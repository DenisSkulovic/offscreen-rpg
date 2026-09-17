---
id: DOC-RELEASE-SCOPE
layer: product
status: working-baseline
domains: [foundations]
tags: [offline-play, autonomy, dnd-rules, affordability]
updated: 2026-09-16
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
  - type: relates_to
    target: DOC-GAME-SYSTEMS
---

# First web release and later possibilities

Product baseline v0.01, consolidated under D061. This owns release scope; topic documents own behavior. The baseline consolidates accepted direction, not every unaccepted draft default. It is ready for technical design, not a claim that all implementation choices or tests are complete.

## First-release boundary

Build one coherent experience: create a supported character/world, configure ordinary life, leave it running, receive a storyteller development, intervene or let the character choose, and return to persistent consequences and a clear recap.

| Capability | v0.01 boundary |
| --- | --- |
| Generated opening | Natural-language premise becomes a small playable local world within supported mechanics. Validate linked places, actors, resources and a viable starting routine. Explain unsupported requests; no universal mechanics generator. |
| World representation | Simple square map remains selected starting representation (D037). Relevant places/sublocations, connections and actors only; no enumerated background population. Map presentation need not dominate the story UI. |
| Ordinary life | Configurable recurring supported activities, travel/work, resource accounting and inspectable possessions. One connected routine is a recommended initial implementation limit, not a mandatory profession. |
| Autonomous character | Personality and permitted choice can alter behavior. Plans are not guaranteed outcomes; outcome resolution remains rule-driven. Direct actions and explicit pause remain available. |
| Storyteller | Actual LLM authorship of bounded incidents and compatible content, not merely flavor around a fixed notification. Multi-stage continuation and persistent consequences belong in the demonstration; full combat is unnecessary. |
| Continuity | Reuse an established person/object/obligation after a gap. No per-NPC background processing. Invention fills unspecified detail, never rewrites binding facts. |
| Time and intervention | Running delegated life continues through ordinary unanswered invitations (D057). Timed intervention and an authorized personality/dice fallback; manual pause freezes progression and pending windows. Exact window/recovery settings are design gates. |
| Browser and phone | Compact story/current activity, contextual actions, possessions and recap. Timely phone contact while the browser/player computer is closed remains first-release direction. Select and validate one channel; no multi-provider integration requirement. |
| AI expense and reliability | Routine progression needs no inference. Bound generation/tool/repair work and expose actual costs. Reject stale/unsupported proposals; disclose degraded behavior. |
| Rules foundation | A defined D&D subset plus explicit extensions for included mechanics. Source/version selection is required before source-specific implementation claims. No full class/spell/combat catalogue. |

Organizations need only the identities/affiliations and concrete effects required by this loop, such as employment or access. Trade, production, food/rest meters and expenses are optional supporting mechanics when the chosen routine needs them, not separate mandatory subsystems. Storyteller styles are intended; exact preset count is unselected.

## Incremental development checkpoints

These are assistant-recommended build order, not separate product releases or a promise to finish in one day.

1. **Runnable core:** saved campaign, supported local state, an activity/routine, progression, interruption, resources, manual pause and factual history. Synthetic fixtures and a controlled clock are appropriate for tests.
2. **First playable storyteller loop:** bounded generation plus a live storyteller incident, legal actions/fallback, actual state changes, a continuation and retrieval of a prior connection. Make context, proposals, validation and usage inspectable for tuning. This is the first experiment target, not an invitation to build all mechanics before touching AI.
3. **Complete phone/life loop:** selected phone integration, browser/computer-closed operation, unanswered decisions, current-state return and recovery. A local build is useful for development but does not satisfy the finished remote-contact requirement.
4. **Portfolio-ready demonstration:** polish and measured evidence below. Tests and state correctness start in checkpoint 1; reproducibility and observability grow with the build rather than being postponed wholesale.

Do not label checkpoint 1 or a scripted mock as the complete MVP. Do not delay hands-on play until every portfolio presentation detail is polished.

## Completion checks

These are consolidated, unexecuted acceptance checks for the selected experience, not new setting/content requirements.

| Check | Observable evidence | Owning contract / scenarios |
| --- | --- | --- |
| Playable generation | A supported premise yields reachable activities and valid references; incompatible output is repaired within a limit or rejected clearly. | WORLD-START-005–007; SCN-010/011 |
| Real routine outcomes | Running work/travel produces actual progress and resources; interruption uses the selected terms; pause produces no progress. | DOC-EMPLOYMENT, DOC-TRAVEL, DOC-ROUTINES; SCN-001/002/010 |
| Story authorship | The model introduces a compatible incident and necessary participant without simulated prehistory; effects are admitted before presentation asserts them. | EVENT-006–008; SCN-011/012 |
| Continuing story | A choice/default leads to a consequence and a later stage; player actions can redirect it. Quiet life remains possible. | EVENT-009; SCN-015/018 |
| Optional participation | A timely response and a no-response fallback both work. Manual pause suspends pending progression; invalidated or late options cannot rewrite history. | INTERVENTION-001–008; SCN-014/018 |
| Durable continuity | A dormant entity/object returns with the same identity and correct custody/history; reject a known-dead character or destroyed item's contradictory reuse. | DETAIL-005–009; SCN-013 |
| Player initiative | Act or interrupt outside a storyteller invitation; distinguish stopping an activity from pausing the campaign. | PLAY-010–013; SCN-016 |
| Remote use and return | Close browser/computer, receive a phone update through the chosen route, then inspect current state and an accurate recap. Report failed delivery honestly. | DOC-INTERVENTION, RETURN-003/008/009; SCN-006/017 |
| Reliability | Retry a completion, race response/timeout, restart mid-activity, and deliver stale AI output: one coherent history, no duplicate rewards or rerolls. | INTERVENTION-005/006, AI-COST-006; SCN-009/011/014 |
| Budget and knowledge boundaries | Exhaust allowance, attempt unsupported effects and inspect secret-bearing context: limits hold, supported fallback is honest, and player/actor outputs do not leak hidden facts. | DOC-AI-BUDGET, DOC-KNOWLEDGE-BELIEFS; SCN-005/011/016 |

Run applicable checks against the selected effect set. Do not implement combat, family, teleportation, fishing or injuries just because a scenario illustrates them. Numeric fixture values are not balancing decisions. Scenario variations for unselected policies are not release gates.

## Portfolio release bar

D040's professional goal remains binding. A reviewer should be able to see:

- A polished responsive path from premise through routine, incident and recap, including loading, invalid output, interruption and unavailable-service states.
- Durable state/rule authority, explainable outcomes and automated checks for consequential invariants.
- A substantive AI workflow with relevant context, bounded tools/output, validation, failure examples and measured cost/latency—not just a model wrapper.
- Reproducible setup, tests/CI, useful diagnostics and a demonstrated restart/recovery case.
- A concise README, runnable or recorded demo, a small number of meaningful technical decisions and honest limitations.

Measure generation validity/repair, continuity failures, decision usefulness, real latency and all-in usage under stated conditions. Test different storyteller configurations without claiming one stochastic run proves a style. Inspect whether the story follows the chosen state and whether Denis wants to continue playing. No performance, fun or cost result is yet established.

## Definition still needed before implementation

[TASKS](../../TASKS.md#short-design-gate-list) owns the compact remaining queue. Resolve the source/profile, input/handoff, timing/recovery, risk/fallback, channel/access and budget choices during technical design before implementing their dependent paths. Routine parameters and map values are reversible experiments, not another world-design phase.

Do not confuse a product baseline with a fully specified executable ruleset. Selecting coherent defaults for the supported slice completes that bridge; unrelated future forks can stay open.

## Later candidates

Richer dialogue and free-form actions beyond the chosen input scope; more activities and D&D coverage; combat; richer relationships; multiple world/body profiles; additional maps/topologies; more timing/settings policies; more providers/channels. Initial input selection remains PLAY-F01—this list does not prejudge it.

## Parked ideas

Exhaustive populations and economies; strategic faction societies; all-to-all rumor networks; civilization-history generation; arbitrary cross-scale physics; runtime invention of executable rules; complete fictional-canon fidelity; images; broad Ironman/save-mode support; self-hosted GPU/KV optimization.

The ability to extend concepts across settings remains direction, not a demand to implement all bodies/scales now. Multiplayer, billing and enterprise/team functionality are not implied by SaaS-style delivery.

## Architectural value without expanding the game

The hard problems are relevant-state continuity, bounded authorship, authoritative transitions, background time, reliable intervention and observable cost. Neither a hundred tables nor a handful of unconstrained documents is selected. No service, database, agent framework or model earns a place merely to decorate the portfolio.

Earlier append-only scope refinements are consolidated here; their rationale remains in decisions D036–D061. No specific profession, incident catalogue, channel or numeric default has been silently accepted by this cleanup.
