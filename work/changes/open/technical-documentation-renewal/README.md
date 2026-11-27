# Technical Documentation Renewal | current-sprint planning group

Repository `DenisSkulovic/offscreen-rpg`. Accepted E1 [Design](../../../designs/open/technical-documentation-renewal/README.md), independently DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`. Main refreshed at `a28693dcefe80a3242a870ed03a6c144b47f1ac7`; prior reviewed SHA unchanged in authority. Planned integration target `implementation/technical-documentation-renewal`; no branch created, queue selected, or work commissioned. All partitions are current planning scope, not backlog. Group owns operational register; only linked leaves actually exist. Candidate partition count may change with source investigation; do not execute a row without a prepared packet and readiness/commission.

## Change register

| ID | Outcome | Prerequisite / coordination | Standing |
| --- | --- | --- | --- |
| [TD01](2026-11-27--td01-developer-platform/CHANGE.md) | Developer platform (5 pages) | None; active ownership fence | Proposed — detailed first-batch packet authored; readiness pending |
| TD02 | Topology/deployment (3 pages) | None; active ownership fence | Planning outstanding — no packet or dispatch |
| [TD03](2026-11-27--td03-persistence-primitives/CHANGE.md) | Persistence/reusable primitives (3 pages) | None; M04 | Proposed — second-batch packet authored; readiness pending |
| [TD04](2026-11-27--td04-game-engine/CHANGE.md) | Engine (8 pages) | PD02 transfer facts frozen before dispatch; M01 | Proposed — second-batch packet authored; readiness pending |
| [TD05](2026-11-27--td05-storyteller-architecture/CHANGE.md) | Storyteller (9 pages) | PD01/PD02/PD05 transfer facts frozen before dispatch | Proposed — second-batch packet authored; readiness pending |
| TD06 | Client/API (10 pages) | PD04 transfer facts frozen before dispatch | Planning outstanding — no packet or dispatch |
| TD07 | Admin/trust/spend (7 pages) | PD06 transfer facts frozen before dispatch; M04 | Planning outstanding — no packet or dispatch |
| TD08 | Application evidence/lab (7 pages) | Other transfer facts frozen before dispatch | Planning outstanding — no packet or dispatch |
| TD10 | Technical integration (index, shared maps, STATUS) | TD01–TD08; M02/M03; transfer completeness | Planning outstanding — no packet or dispatch |

TD09 is a protected NO-OP disposition for seven active foundation/native pages, not an executable Change.

## Coordination and joint acceptance

Separate Change worktrees join only their design branch using target lock; archive each leaf before reporting completion when its gate passes. Parallel preparation of both groups and disjoint domain edits permitted after commission. Shared source/contract owners and actual in-flight writes protected; recheck on dispatch. Technical group owns root README, docs router, architecture/shared source maps and STATUS at TD10; product group owns product index at PD07. Product removal of unique implementation facts requires a technical/source successor on actual main, not just another branch; preserve original until successor exists. Freeze transfer mappings during planning. Technical final integration first, then product final integration; no circular dependency. Joint acceptance NOT RUN. No live permission, runtime edits or new proof.

## Frozen transfer subset (batches 1–2)

All source headings are in the corresponding existing product domain. Technical destinations retain exact scope and provenance. PD07 verifies each destination on actual main before removing its source paragraph; TD10 verifies technical survivors. Other UI/staff/scenario transfers remain to be frozen in subsequent planning. Do not remove unmatched unique facts.

| Source Change | Source page / heading | Receiver | Technical destination / heading | Fact set |
| --- | --- | --- | --- | --- | --- |
| PD01 | concepts.md / Execution and storage concepts | TD05 | operation-and-controller.md / Current prototype runtime (canonical transfer); generation-and-publication.md links it | result.scene, story_passage, dual-publication example, scoped legacy realization |
| PD02 | rules.md / Authority split; First rules subset (POC); Implemented entry and honest limits; Resumption, hidden rolls and private fact transitions | TD04 | mechanics-and-capabilities.md / Supported mechanisms and the future kernel; Persistence and known limits | fixture worlds; D&D subset; clock-wait.v1; item.create.v1/item.transfer.v1; fact.set.v1; private offer/path; exclusions |
| PD02 | rules.md / Executable library shape | TD05 | prompts-and-tools.md / Selected compilation and tool contract | adapter identity and version, topic metadata, deterministic recipes, bounded reads and license scope |
| PD02 | time-and-autonomy.md / Existing narrative rehearsal adapter | TD04 | ticks-and-tags.md / Fixed real-second scheduling and fictional time | 20 real seconds, injected wait, immediate conversation zero, mechanical-clock exclusion |
| PD02 | continuity.md / Places, scenes and cinematic presentation; Context and cost | TD04 / TD05 | mechanics-and-capabilities.md / Opportunity boundary; context-selection-and-recall.md / Storyteller-facing memory tools | scene-frame.v1 candidate; optional provider-gated ask_memory/read_memory, snippet lead, no generic agent |
| PD05 | profiles-and-settings.md / Current implementation boundary | TD05 | versioned-settings.md / Current adapters | editor counts, revision projection, lock/pause, offline limitations and missing policy controls |

## Planning checkpoint

Eight packets authored: PD01/02/03/05 and TD01/03/04/05. Remaining PD04/06/07 and TD02/06/07/08/10 need exact investigation and integration proof; TD09 remains no-op. No Ready or dispatch; no new Design review for unchanged scope.
