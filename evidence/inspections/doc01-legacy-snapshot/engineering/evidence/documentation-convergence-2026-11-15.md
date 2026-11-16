# Documentation convergence ledger | 2026-11-15

**Program:** permanent-authority reconciliation after Nov 12–15 implementation waves.  
**Method:** [documentation-reconciliation](../../../.agents/skills/documentation-reconciliation/SKILL.md).  
**Ground truth for landed slices during this pass:** [work/changes/README.md](../../../work/changes/README.md).  
**Process gate:** Change-close **Reconciliation ledger** now mandatory (harness updated same day).  
**ChatGPT residuals:** [handoff](documentation-convergence-chatgpt-handoff-2026-11-15.md).  
**Minutes:** [2026-11-15](../../history/minutes/2026-11-15.md).

## Classes

1. `outdated status/navigation` — hub/program still says Proposed / not implemented  
2. `missing technical contract` — landed slice not recorded on permanent technical owner  
3. `implementation deviation` — code vs accepted authority (escalate; do not weaken authority)  
4. `future-target-ok` — keep as target; clarify designed vs implemented  

## Inventory

| Workstream | Permanent owner | Stale claim | Contradicted by | Class | Action | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Cross-cutting | `docs/progress.md` | Finish workflow before code; no Change ready | changes/README Nov Done waves | outdated status | Rewrite priority + boundary table | **closed** |
| Admin | `docs/programs/admin/README.md` | No Admin code; AD01–AD08 Proposed | admin evidence AD01–AD08 Done | outdated status | Rewrite first screen | **closed** |
| Admin | `docs/programs/admin/technical/README.md` | Packets remain Proposed | implementation-program Done | outdated status | Align Done + synthetic OBS06/07 | **closed** |
| Admin | `docs/programs/admin/technical/source-baseline-2026-11-14.md` | No `/api/admin` | AD01–AD08 + OBS06 route | missing technical contract | Post-AD appendix | **closed** |
| Admin | `docs/programs/admin/technical/architecture-review-2026-11-14.md` | Enforcement not implemented | AD Done receipts | outdated status | Disposition rows | **closed** |
| Admin | `docs/programs/admin/technical/read-models-and-privacy.md` | No DTO implemented | AD03/05/06/OBS01/06 | missing technical contract | Status → first-wave landed | **closed** |
| Engine | `docs/programs/engine/README.md` | ENG01 awaiting auth | postwave Done ENG rows | outdated status | Postwave banner | **closed** |
| Engine | `docs/programs/engine/implementation-program.md` | Table ENG05/06 Proposed vs Done | changes/README | outdated status | Align table + ENG08/09 | **closed** |
| Forensic | `docs/programs/observability/README.md` | Wave-4 footer OBS06/07 Proposed | obs06/07 evidence | outdated status | Fix footer; OBS00-L/C | **closed** |
| Forensic | `docs/programs/observability/design-program.md` | Post-trial NOT RUN; OBS06/07 Proposed | post-trial FINAL-HANDOFF | outdated status | Align post-trial + OBS | **closed** |
| Forensic | `docs/programs/observability/technical/context-provenance.md` | No code authorized | OBS00-A/L/C, OBS03 | missing technical contract | Landed vs blocked split | **closed** |
| Forensic | `docs/technical/provider-dispatch-review.md` | Pre-OBS00-C/L framing | OBS00-C/L Done | future-target-ok | Confirm OBS00-L/B notes | **closed** |
| React | `docs/engineering/targets/react-next.md` | Implementation not authorized | W01–W22 Done | outdated status | Implementation-status layer | **closed** |
| Storyteller | `docs/programs/storyteller/README.md` | Owner review before code | SA01–12 Done | outdated status | Packets Done vs quality unproved | **closed** |
| Storyteller | `docs/programs/storyteller/implementation-program.md` | Future program / not active | SA Done | outdated status | Header + table Done marks | **closed** |
| Experience | `docs/programs/experience/README.md` | No UI source authorized | UX Done; gm06 evidence | outdated status | Headers + human-validation caveat | **closed** |
| Experience | `docs/programs/experience/implementation-program.md` | NOT CODE AUTHORIZATION / Proposed | UX Done | outdated status | Align program table | **closed** |
| Experience | `docs/programs/experience/decisions/gm06-viewer-open-baseline-v1.md` | No code approved | GM06 Done + evidence | outdated status | Point at implemented subset | **closed** |
| Experience | `docs/programs/experience/mechanics-evolution-program.md` | No runtime authorized | GM Done rows | outdated status | Header Done/Proposed | **closed** |
| Runtime | `docs/technical/storyteller-runtime.md` / `context-and-cost.md` | Missing OBS00-C/L + settle note | OBS00-C; QA-SF01 | missing technical contract | Custody + known defect notes | **closed** |
| Runtime | QA-SF01 remainders | storyteller 27/33; settle continue; clock.now; 0≠55 | qa-sf01 receipt | implementation deviation | Deferred runtime Change | **recorded** (open for code) |

## Escalations (product / no silent rewrite)

None opened. Known runtime defects stay as `implementation deviation`.

## Wave completion log

| Wave | Result | Notes |
| --- | --- | --- |
| Process gate | **Done** | change-workflow, work-unit, CHANGE/PLAN templates, documentation-reconciliation trigger, AGENTS, documentation.md, working-agreement, docs-health advisory |
| A Forensic | **Done** | README, design-program, context-provenance, provider-dispatch-review |
| B Admin | **Done** | README, technical README, architecture-review, post-AD appendix, read-models status |
| C Engine | **Done** | README + implementation-program table |
| D React + Experience | **Done** | react-next status layer; experience/UX/GM/gm06 |
| E Storyteller | **Done** | headers + SA table; runtime/cost known defects |
| F progress + minutes | **Done** | progress.md; minutes 2026-11-15; ChatGPT handoff |
