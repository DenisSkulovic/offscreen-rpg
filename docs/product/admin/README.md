# Admin product

Admin is the staff-facing product intent: the jobs employees must be able to do for the live game and the business, and the limits on each job. Player experience and in-game Storyteller behavior are other product owners. Engine authority is technical.

## What this section establishes, and what it does not

Selected intent: staff work is organized by jobs and scoped, purpose-bound grants. A job name, a persona, a workspace or a case assignment never grants a capability. Metadata, private narrative, raw model context and secrets are separate disclosure classes.

Current realization: a narrow set of landed Admin slices exists (player-safe reads, case anchors, redacted diagnostic reads, audit). Those slices do not expand into the journeys written here. Production grant issuance for live Support workers is absent, and Situation UI in OBS06/07 is synthetic or disposable-grant proof only. Technical owners state what is realized and guaranteed ([admin technical](../../technical/admin/topology-and-authorization.md)).

Several pages below are **proposed operating policy**. They are written here so the proposal has one owner. They are not production grants and not a silent acceptance of refunds, raw-prompt access, or emergency world edits.

## Page map

| Question | Owner | Status |
| --- | --- | --- |
| Why does Admin exist, and who is it for? | [Charter and personas](charter-and-personas.md) | Direction, with conditional powers named in that file |
| What is a staff grant, and what are view, assist and sandbox? | [Authority and governance](authority-and-governance.md) | Proposed catalog |
| What if payer, participant and character differ? | [Player 360 and support](player-360-and-support.md) | Proposed model; production grants absent |
| What money and privacy actions are allowed? | [Commercial and trust](commercial-and-trust.md) | Conditional |
| How may future behavior change without rewriting history? | [Gameplay and liveops](gameplay-and-liveops.md) | Proposed |
| What may an investigator see of a model round? | [AI engineering and investigation](ai-engineering-and-investigation.md) | Conditional on access tiers |
| What does the landing view claim? | [Command center and insights](command-center-and-insights.md) | Direction |
| Which operator journeys are contracts? | [Operator workflows](operator-workflows.md) | Direction |

## Future historical game and configuration exploration (Proposed, 2026-11-22)

Staff will eventually need to inspect what a player's game looked like at a past point. That experience is **Proposed** and is owned by four bounded backlog Changes. It extends the existing Player 360, Gameplay & Worlds and AI & Engineering *jobs*. It does **not** introduce another Admin architecture or confer raw-content permissions.

| Proposed capability | Owning Change |
| --- | --- |
| Scene history and game state | [ADI01 scene history/game state](../../../work/changes/backlog/experience-admin/2026-11-22--adi01-scene-history-game-state-explorer/CHANGE.md) |
| Historical Library files and diffs | [ADI02 historical Library files/diffs](../../../work/changes/backlog/experience-admin/2026-11-22--adi02-historical-library-explorer/CHANGE.md) |
| Historical effective model, entitlement and configuration | [ADI03 historical effective model/entitlement/configuration](../../../work/changes/backlog/experience-admin/2026-11-22--adi03-effective-policy-history-explorer/CHANGE.md) |
| Safe re-admission after changed plans or retired models (**non-Admin runtime**) | [CFG03](../../../work/changes/backlog/policy-finance/2026-11-22--cfg03-resume-policy-eligibility-and-portability/CHANGE.md) |

Adjacent owners stay separate: [AI03](../../../work/changes/backlog/agent-runtime/2026-11-22--ai03-staff-agent-context-inspector/CHANGE.md) owns model-visible request/thread inspection, and [CFG02](../../../work/changes/backlog/policy-finance/2026-11-22--cfg02-admin-policy-management/CHANGE.md) owns future policy editing.

The scene is the chronological player-facing unit, not a chapter, not one Workflow, and not always one model request. Historical Library availability, exact model-visible context and actual effective mission policy are three distinct evidence surfaces. All are metadata-first and capability scoped. Product, Support, Engineering and Business roles require individually authorized projections, not universal access.

Technical companion: [admin technical](../../technical/admin/topology-and-authorization.md).
