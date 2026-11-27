# Temporary work

**No loose handoff/roadmap dumping:** `changes/`, `designs/`, `tasks/` and `undertakings/` roots are catalogs, not storage for dated audit or execution-plan files. Put a live multi-Change schedule in its Undertaking, unresolved architecture in a Design, unique historical facts in curated evidence, and retired transient plans in Git history with repaired links.

**Temporary by design:** [Repository structure](../REPOSITORY-STRUCTURE.md#4-work-is-temporary-coordination-not-product-truth) states each work folder's admission, expected lifetime, promotion and retirement. Every open dossier needs an owner, unresolved outcome and exit; catalogs must not become perpetual archives.

**First:** [How we work](../WORKFLOW.md) explains this folder's work-unit taxonomy, lifecycles, decisions, dependency/parallel execution and retirement in one diagram-led guide. This index remains the directory router, not a second workflow policy.

**Owns:** one [Current work selector](QUEUE.md), open Changes, standalone operational Tasks, unaccepted design investigations and short-lived session notes. This is **not** the product/technical bible, source evidence store, or agent rule owner.

| Path | Question |
| --- | --- |
| [undertakings/](undertakings/README.md) | Which named transformation owns the integration branch and final landing? |
| [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md) | **Current priority order and release gates**, not a second selected work pointer. |
| [QUEUE.md](QUEUE.md) | **Only selected work item** (Change, standalone Task or none); no duplicate selectors. |
| [WORK-TAXONOMY.md](WORK-TAXONOMY.md) | Definitions and routing for Initiative, Design, Investigation, Change, Task, Experiment and Evidence. |
| [changes/](changes/README.md) | Which lasting implementation/documentation Change packets are open or archived? Composer Txx remain subordinate. |
| [tasks/](tasks/README.md) | Which independent verification, operation or experiment runs are open or archived? |
| [designs/](designs/README.md) | Which design investigations are still open, dormant, or retained as historical reference? |
| [sessions/](sessions/README.md) | Short rolling continuity, not a second status or implementation authority. |

**Single-owner routing:** [STATUS.md](../STATUS.md) owns demonstrated implementation/proof; [ROADMAP.md](../ROADMAP.md) owns strategy; [docs/](../docs/README.md) owns ratified product and technical targets; [research/](../research/README.md) owns concluded studies; [evidence/](../evidence/README.md) owns dated proof. `work/QUEUE.md` is the **only current-work selection authority**; Changes and Tasks each have catalog indexes, not competing selectors. No mirrored P5-era queue remains.

**Maintenance:** [repository housekeeping and prevention design](designs/open/repository-housekeeping/README.md) explains how active documents should be routed and retired without deleting unique evidence.

**Change lifecycle (owner decision 2026-11-27):** Open is the current sprint/execution horizon, including every owner-intended current Change (proposed, planner-blocked, dependency-gated, Ready, commissioned, in progress or acceptance-pending). It is not limited to the next dispatch, and there is no arbitrary sprint-size cap. Backlog is genuinely deferred work outside that horizon, potentially revisited in weeks or months. Move work to open when it becomes current, before readiness or commission if necessary; do not move current blockers to backlog. Placement, readiness, selection, commission and live permissions are separate. [Open Changes](changes/open/README.md) · [Deferred backlog](changes/backlog/README.md).

**Design lifecycle (owner decision 2026-11-27):** `work/designs/open/` holds active investigations with a named owner, unresolved decision and review trigger; `work/designs/backlog/` holds deferred worthwhile investigations with a reason and reactivation trigger; `work/designs/archive/` holds terminal accepted, completed, rejected, cancelled or superseded dossiers as a browsable review cache. Placement never authorizes implementation, live mutation or spending. Accepted decisions must be promoted to canonical owners; implementation and acceptance remain with their Changes. Record disposition, exact original full SHA/path, canonical successor, unique evidence and repaired references in the design ledger. Review archive retention after seven days by default; preserve unique evidence and require explicit authorized pruning, never age-only removal. Git remains permanent recovery; archive is not canon or a shadow queue.
