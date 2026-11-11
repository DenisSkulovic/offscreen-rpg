# Implementation changes and legacy initiative dossiers

**This is the coding-agent execution route, not a product-feature backlog.** A **Change** is one bounded, measurable outcome that requires an actual source/test/executable-configuration delta when implemented. A larger initiative, a design-only proposal, a playtest and documentation maintenance are **not** implementation Changes.

See the [independent work-unit standard](../../.agents/references/change-work-unit-standard.md), [full November 11 audit](AUDIT-2026-11-11.md) and [planning skill](../../.agents/skills/feature-workflow/SKILL.md). The folder name `features/` is **temporary legacy compatibility**: `pnpm repo:brief` currently requires its selected PLAN to live here. Do not change that script during a docs-only audit.

## Coding route

Current plan: [S3a continuity evidence report](2026-11-11--s3a-continuity-report/PLAN.md)

**Selected Change, not an instruction to start coding now:** [S3a report evidence](2026-11-11--s3a-continuity-report/CHANGE.md) is a proposed code-bearing unit split from the broader [Vvardenfell continuity initiative](2026-09-21--21-56--story-mode-vvardenfell-continuity/PLAN.md#s3a--make-the-causal-baseline-inspectable--nearest-slice). It targets the existing `scripts/repo-tools/story-session-report.mjs`, not the nonexistent old path under `tools/chamber/scripts/`. That command already summarizes some document and publication evidence; its source and missing fields need revalidation when implementation resumes.

**User instruction on November 11:** no code changes during this work-system audit. A historical September approval, an old implementation owner label or a link marked “Current” cannot authorize a coding agent, model bill, migration or deployment by itself. Before actual code editing, obtain a current owner go-ahead, check the source revision and use the bounded [Cursor handoff](../../.agents/skills/cursor-handoff/SKILL.md).

After the report Change, the parent S3 work has *separate* possible code units: provider-free return-fixture coverage, required document selection/final packing, durable dependency carriage, and progressive materialization. S4 is a **connected evaluation/human acceptance** stage, not by definition another source-code Change. Do not implement all of S3/S4 because an old PLAN lists them.

## Supporting unfinished work

These are **legacy umbrella dossiers**, not a set of ready implementation tickets. Their own “implemented” claims are dated and their unapproved future design remains conditional. Open only the topic/phase needed for the selected work; use permanent product/technical docs for authority.

| Dossier | Present disposition |
| --- | --- |
| [Vvardenfell Story mode](2026-09-21--21-56--story-mode-vvardenfell-continuity/FEATURE.md) | Parent initiative of selected S3a; S1/S2 historically done, S3/S4 pending |
| [Memory and situated recall](2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md) | Supporting memory/continuity initiative; very broad, not a single Change |
| [Canonical campaign storage](2026-09-19--18-49--canonical-campaign-storage/FEATURE.md) | C1 connected, C2 partial; future file/SQL ownership transfer needs separate small Changes |
| [Activities and world-defined progress](2026-09-18--16-48--activity-processes-and-progress/FEATURE.md) | Broad participation/lifecycle initiative; pending larger design decisions |
| [Bounded autonomy and re-entry](2026-09-19--00-26--bounded-autonomy-and-reentry/FEATURE.md) | Implemented quiet/chain foundation; later delegated fallbacks and notifications remain proposed |
| [Bounded Storyteller cost](2026-09-19--19-08--bounded-storyteller-cost/FEATURE.md) | Supporting safety-maintenance program, not an open-ended coding mandate |
| [Storyteller trace explorer](2026-09-18--17-27--storyteller-trace-explorer/FEATURE.md) | Deferred observability/tooling proposal; select one Change if later justified |
| [Inhabitable play and return](2026-09-19--00-26--inhabitable-play-and-return/FEATURE.md) | **Owner-review design proposal**, not a ready UI implementation ticket |

## Evaluation and retirement candidates

These contain useful historical evidence or optional future ideas, but should **not appear as implementation work** until one narrowly code-bearing delta is selected. The [audit](AUDIT-2026-11-11.md) identifies the permanent documents to verify before retiring their legacy folders.

| Dossier | Actual next kind of work |
| --- | --- |
| [Conservative live-model evaluation](2026-09-18--17-27--conservative-live-model-evaluation/FEATURE.md) | Developer/QA evaluation and cost authorization, not automatically code |
| [Storyteller agency and taste](2026-09-19--00-26--storyteller-agency-and-taste/FEATURE.md) | Human quality acceptance; further tuning only after diagnosed need |
| [Bounded memory exploration](2026-09-21--10-55--storyteller-memory-exploration/FEATURE.md) | Connected retrieval/packing evaluation; X1/X2 were implemented historically |
| [Creative exploration](2026-09-21--14-13--storyteller-creative-exploration/FEATURE.md) | Optional adaptive design and connected quality proof, only if actual gap arises |

**No dossiers were deleted in this audit.** Their unique decisions and incoming links have not all been certified migrated. Keep Git history for provenance, but retire a folder only after its remaining requirements/evidence are discoverable from permanent owners.

## Deliberately dormant dossiers

[Configurable canon invention policy](2026-09-24--01-30--canon-invention-policy/FEATURE.md) is **explicitly retained by the owner**. It is a prepared cross-cutting initiative, not a ready code Change. The activation condition remains before the approved sustained 30–50-turn private-world evaluation. No provider spend or new implementation is authorized by its presence here.

## Acceptance owners

[Progress](../progress.md#orientation) owns current demonstrated coverage and the next outcome. [Connected proof](../engineering/connected-poc-proof.md) owns dated live-model evidence. [Solo integration](../technical/solo-gameplay-contract.md) and [canonical files](../technical/canonical-files.md) own technical constraints. [QA journeys](../engineering/qa-journeys.md) and [gold session](../technical/playthroughs/harbor-session.md) distinguish evaluation plans from actual exercised acceptance.

**New work classification:** if no executable/code delta is planned, resolve it as investigation, design, documentation/harness maintenance or evaluation, **not** a `CHANGE.md` ticket. If code is needed, create a small `CHANGE.md` with one measurable outcome, owner, source revalidation, negative proof and exclusions; maintain `PLAN.md` when the selected compatibility route or multiple slices requires it.
