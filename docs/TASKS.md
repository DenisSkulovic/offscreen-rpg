# Simplify story progression before technical design

Updated: 2026-09-17. D064 reopens the v0.01 mechanical boundary at the owner's request. This is a focused product revision, not a chosen schema or an invitation to expand the library. Git remains authoritative; no game code or paid experiment is introduced by this revision.

Read [story progression](product/experience/story-progression.md) and [release scope](product/foundations/scope-and-release-plan.md). The proposed direction is one narrative continuation flow with a small consistency layer, rather than dedicated work, travel, eating, sleep and trading systems.

## Short design-gate list

| Choice | Recommendation to discuss | Owner |
| --- | --- | --- |
| Adjudication boundary | Storyteller judges situations/durations/outcomes; application preserves facts, clock, limits and single-resolution changes. No per-verb implementation requirement. | DOC-STORY-PROGRESSION |
| Character and checks | Small explicit abilities/skills/check contract; separate action success from story pacing/event luck. Exact D&D subset and disclosure unselected. | RULES-F01/F02 |
| Fictional versus real time | Choose a consistent pace or explicitly accept narrative waiting independent of duration; the model cannot supply contradictory conversions under one claimed speed. | TIME-F01 |
| Possessions and exchange | Preserve significant identities and exact quantities only where a choice needs them; model-adjudicated prices/barter, generic recorded transfer. Compare with deliberately coarse means. | INV-F01 |
| Pending story and costs | Prepare only a short selected continuation, cancel incompatible futures, retain actual history. Define what happens when no new model call fits. | STORY-001–006, AI-COST-001–008 |

The prior mandatory grid, wage and supported-activity definition gates are removed. This is a recommendation for lighter scope, not owner approval of every default. Free text versus choices/hybrid, phone channel/access and exact budgets remain real choices for the subsequent technical design; retain their existing owners rather than generating more documents now.

## Next practical comparison

Walk [SCN-019](product/validation/reference-campaigns-and-journeys.md#scn-019--generic-story-progression-and-contextual-exchange): an intention, quiet passage, pending interruption, changed plan and contextual bargain. Evaluate whether the minimal facts/checks preserve meaningful consequences. Older detailed economic/movement fixtures are optional later references, not requirements to implement payroll or pathfinding.

Discuss this boundary, then derive compact architecture, state/time and AI contracts and implement one connected loop. Preserve the senior fullstack portfolio bar: reliable scheduling, coherent current state/history, bounded inference, meaningful agency, polished scenes and measured evidence. Do not substitute an unbounded prompt transcript for those responsibilities.
