# WORK01 | First-class operational Tasks and one work selector

**State:** Done (2026-11-20). First-class Tasks and one `work/QUEUE.md` selector are landed. `pnpm repo:maintenance:test` **27/27 PASS**; `brief.mjs --self-test` PASS; `pnpm repo:maintenance --strict` **0 errors**. Product and technical game canon unchanged.
**Kind:** implementation (repository tooling and substantive operating documentation)
**Selection:** Not selected; this file records the owner-authorized taxonomy implementation and remaining local verification.
**Authority:** [work taxonomy](../../../../../WORK-TAXONOMY.md), [single queue](../../../../../QUEUE.md), [Task catalog](../../../../../tasks/README.md), [Change standard](../../../../../../.agents/references/change-work-unit-standard.md).
**Baseline:** Prior Change-only selection from `work/changes/README.md`, `scripts/repo-tools/{maintenance-core,brief}.mjs`; source observed on 2026-11-20. No product mechanics, Storyteller provider or infrastructure state was altered.

## Bounded implemented delta

- Define Initiative, Design, Investigation, Change, standalone Task, Experiment, Evidence and subordinate Composer `Txx` precisely; preserve canonical product/technical ownership and the prior open Change backlog.
- Add `work/tasks/{README,TEMPLATE,open/README,archive/README}.md` as the sole standalone Task lifecycle; **no artificial active Task created**.
- Move the primary `Current work` selection to `work/QUEUE.md`. The existing Change catalog remains a catalog, never a competing selector. A selection can point to one open `CHANGE.md` or `TASK.md`, or `none`. Archived, design and `TASKS.md` pointers are forbidden.
- `scripts/repo-tools/work-selection.mjs` provides strict shared parsing. `maintenance-core.mjs` checks missing/ambiguous selection, orphaned open Change/Task folders, unindexed Task packets, terminal state in open and nonterminal in archive. `brief.mjs` reports either type with `repo.brief.v2`.
- Reconcile agent routing and task-workflow skill. Update existing docs and source indexes without making any previously Proposed Change executable.

## Verification and diagnostic negatives

**T01/T02/T03 (2026-11-20):** `pnpm repo:maintenance:test` **27/27 PASS** (duplicate `orphan-open-folder` removed; planner/catalog/infra/app Markdown classified). `node scripts/repo-tools/brief.mjs --self-test` PASS. `pnpm repo:maintenance --strict` **0 errors**. STORY03 TURN03 link depth repaired. `distributed-turn-poc` indexed from `work/designs/README.md`. `pnpm repo:docs-health` ran (historical archived-packet advisory; `knowledge-health: ok`). `pnpm wiki:health` **FAIL** on two owners outside this Change: K8S10 `SOURCE-MAP.md` points at a missing `docs/technical/observability/README.md`; `docs/technical/platform/execution-and-delivery.md` contract table `#commands-and-durable-delivery` self-link. Those are not WORK01 taxonomy defects.

Expected: `pnpm repo:maintenance:test`, `node scripts/repo-tools/brief.mjs --self-test`, `pnpm repo:maintenance --strict`, `pnpm repo:docs-health` and `pnpm wiki:health` as available in an authorized full checkout. One selected Change, one selected Task and none should all be valid. Diagnostics must reject a second selector, archived path, orphan `PLAN.md`, orphan Task, unindexed Task, terminal packet left in open and unknown link. All links must stay intact.

**Strict negative:** do not convert existing 24 Change-owned `TASKS.md` files to standalone Tasks; do not grant runtime environment permissions through a Task; do not archive an actually incomplete Change to manufacture a neat queue.

## Evidence / reconciliation

No product or technical game behavior changed. Negative: Change-owned `TASKS.md` files were not converted into standalone Tasks; `Current work: none` remains valid; a second selector, archived selection, and orphan open folder still fail closed.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| work/QUEUE.md | related | changed: sole Current work selector (`none` / one open CHANGE.md / one open TASK.md) | scripts/repo-tools/work-selection.mjs; work/QUEUE.md | fixture-tested | archived path, double Current work line, and TASKS.md fragment are invalid-selection | work/changes/README.md remains a catalog |
| work/WORK-TAXONOMY.md | related | changed: standalone Task is distinct from Change-owned T-IDs | work/tasks/{README,TEMPLATE,open,archive} | reviewed | existing Change TASKS.md files were not converted to standalone Tasks | work/tasks/README.md |
| docs/product | product | unchanged because no player or time rule moved | no source behavior changed | reviewed | no product page edit | N/A |
| docs/technical | technical | unchanged because no engine, Storyteller, or platform contract moved | no game source edited for this packet | reviewed | wiki:health remaining failures are K8S10 SOURCE-MAP and execution-and-delivery contract row, not this selector | N/A |
| scripts/repo-tools/maintenance-core.mjs | code | changed: one orphan-open-folder scan; CHATGPT.md, work/changes companions, infra and app Markdown classified | pnpm repo:maintenance:test 27/27; --strict 0 | fixture-tested | unclassified TODO.md still errors; duplicate orphan path is not emitted twice | scripts/repo-tools/wiki-core/paths.mjs |
