# WORK01 | First-class operational Tasks and one work selector

**State:** Implementing (2026-11-20). T02 removed duplicate `orphan-open-folder` findings; `pnpm repo:maintenance:test` **26/26 PASS**; `brief.mjs --self-test` PASS. `pnpm repo:maintenance --strict` still FAIL (8 findings: unclassified Markdown, one STORY03 broken relative link, missing design route). Packet not Done.
**Kind:** implementation (repository tooling and substantive operating documentation)
**Selection:** Not selected; this file records the owner-authorized taxonomy implementation and remaining local verification.
**Authority:** [work taxonomy](../../../WORK-TAXONOMY.md), [single queue](../../../QUEUE.md), [Task catalog](../../../tasks/README.md), [Change standard](../../../../.agents/references/change-work-unit-standard.md).
**Baseline:** Prior Change-only selection from `work/changes/README.md`, `scripts/repo-tools/{maintenance-core,brief}.mjs`; source observed on 2026-11-20. No product mechanics, Storyteller provider or infrastructure state was altered.

## Bounded implemented delta

- Define Initiative, Design, Investigation, Change, standalone Task, Experiment, Evidence and subordinate Composer `Txx` precisely; preserve canonical product/technical ownership and the prior open Change backlog.
- Add `work/tasks/{README,TEMPLATE,open/README,archive/README}.md` as the sole standalone Task lifecycle; **no artificial active Task created**.
- Move the primary `Current work` selection to `work/QUEUE.md`. The existing Change catalog remains a catalog, never a competing selector. A selection can point to one open `CHANGE.md` or `TASK.md`, or `none`. Archived, design and `TASKS.md` pointers are forbidden.
- `scripts/repo-tools/work-selection.mjs` provides strict shared parsing. `maintenance-core.mjs` checks missing/ambiguous selection, orphaned open Change/Task folders, unindexed Task packets, terminal state in open and nonterminal in archive. `brief.mjs` reports either type with `repo.brief.v2`.
- Reconcile agent routing and task-workflow skill. Update existing docs and source indexes without making any previously Proposed Change executable.

## Verification and diagnostic negatives

**T01/T02 (2026-11-20, HEAD `447742f6` plus this patch):** `pnpm repo:maintenance:test` **26/26 PASS** after collapsing two identical `orphan-open-folder` emitters in `scripts/repo-tools/maintenance-core.mjs`. `node scripts/repo-tools/brief.mjs --self-test` PASS. **Remaining before Done:** `pnpm repo:maintenance --strict` (8 errors: unclassified `CHATGPT.md`, two lab READMEs, design-system inventory, two dated Change-catalog notes; STORY03 broken `../../` TURN03 link; `work/designs/open/distributed-turn-poc` missing from the design index). Do not archive while `--strict` is red.

Expected: `pnpm repo:maintenance:test`, `node scripts/repo-tools/brief.mjs --self-test`, `pnpm repo:maintenance --strict`, `pnpm repo:docs-health` and `pnpm wiki:health` as available in an authorized full checkout. One selected Change, one selected Task and none should all be valid. Diagnostics must reject a second selector, archived path, orphan `PLAN.md`, orphan Task, unindexed Task, terminal packet left in open and unknown link. All links must stay intact.

**Strict negative:** do not convert existing 24 Change-owned `TASKS.md` files to standalone Tasks; do not grant runtime environment permissions through a Task; do not archive an actually incomplete Change to manufacture a neat queue.

## Evidence / reconciliation

Edits committed directly to main in this work session. This is **source/document-level implementation**, not an observed green test run. Product/technical game canon, scripts for deploy/migrations/chaos and database schema remain unchanged. The maintenance release may need one narrow patch if local Node tests expose an existing integration assumption. If the evidence is green, update this packet with the exact source SHA and negative receipt, then archive it under `work/changes/archive/2026-11/other/` and reconcile indexes. Do not self-certify from design prose.
