# Product documentation — Offscreen RPG

Updated: 2026-09-17. Product definition is baselined for technical design (D061); no implementation is claimed.

A persistent, primarily text-based, single-player character life with an LLM storyteller. Ordinary activities run under explicit rules; the storyteller invents compatible incidents, people and connections. Only consequential world detail needs individual state. Established identities and consequences persist.

The player can observe, act, delegate or pause. Running delegated life continues through ordinary nonresponse; manual pause freezes the campaign. Quiet routines and unfolding stories are equally important. D&D remains the mechanical foundation, with a bounded first supported subset and explicit extensions.

The primary purpose is a credible senior fullstack engineering portfolio. The first playable build should expose the mechanics, storyteller context and constrained tools to experimentation. It is a development checkpoint, not a claim that portfolio release quality is already achieved.

## Continue development

1. Read [project instructions](../AGENTS.md) and [TASKS](TASKS.md).
2. Read [vision](product/PRODUCT_VISION.md) and [v0.01 release boundary](product/foundations/scope-and-release-plan.md).
3. Resolve the short design-gate list in TASKS, write compact technical contracts, then implement a connected playable slice. Do not restart broad product brainstorming.

## Authority and navigation

- [Release scope](product/foundations/scope-and-release-plan.md) owns build boundaries, completion evidence and exclusions.
- [World events](product/worlds/world-events-and-causality.md), [world detail](product/worlds/world-detail-and-simulation-boundaries.md), [time](product/experience/time-presence-and-autonomy.md), [intervention](product/notifications/event-intervention-and-timeouts.md) and [AI budgets](product/ai-experience/cost-budgets-and-degraded-play.md) own their detailed contracts.
- [Scenarios](product/validation/reference-campaigns-and-journeys.md) are unexecuted acceptance fixtures, not a catalogue of required content.
- [Decisions](decisions.md) preserve accepted direction and supersession history.
- [Index](DOCUMENTATION_TREE.md) routes to supporting topics; uncreated topics are not prerequisites.

“Baseline v0.01” means a coherent foundation for the next phase, not approval of every draft option, final balance or universal world support. Specific draft defaults remain labeled. The user-facing vision is stable; bounded implementation choices and playtest-driven revisions remain expected.

The public GitHub repository is established; database, model, channel, hosting provider and paid budget remain unselected. Fishing, mining, space creatures and microscopic travel are illustrations, not mandatory launch content. Follow [WORKFLOW](WORKFLOW.md); preserve one authoritative versioning workflow when code begins.
