# WORK01 | Composer verification and reconciliation microtasks

**Change:** [CHANGE.md](CHANGE.md) (Implementing; not selected). **Default model:** Composer 2.5 Standard, no Grok. All planned code edits in the Change have been committed; a proof receipt, not another taxonomy debate, is outstanding.

## T01 | Execute exact tests and classify failures | READY FOR OWNER SELECTION, VERIFY

**Read:** `scripts/repo-tools/{work-selection,maintenance-core,maintenance.test,brief,brief-self-test}.mjs` and [Current queue](../../../QUEUE.md). **No database, cluster, provider or financial operations.**

**Commands (repo root, Node 24 and pnpm 11):**
1. `pnpm repo:maintenance:test`
2. `node scripts/repo-tools/brief.mjs --self-test`
3. `pnpm repo:maintenance --strict`
4. `pnpm repo:docs-health` and `pnpm wiki:health` if full doc graph is present.

**Positive:** none/Change/Task selections work; work packet routes, canonical doc links and existing Change archive still pass. **Negative:** stale current-change selector, double current-work lines, selected archive/microtask, orphan open folder, missing Task front door, unindexed Task and terminal Task in open are rejected. **Stop:** incomplete lean checkout or older Node is NOT-RUN, not an excuse to weaken validations. **Return:** exact SHA, command/cwd/exit code, test counts and one negative receipt.

## T02 | Repair one demonstrated compatibility error | CONDITIONAL, PATCH

If T01 identifies an exact failing source symbol, return the stack/assertion to ChatGPT for a precise 1–3 file Composer patch, rerun the targeted and full maintenance suite, update tests. Do not redesign work taxonomy and do not open a generic refactor.

## T03 | Reconcile and archive | AFTER PASS

Record the actual proof, update the [work taxonomy](../../../WORK-TAXONOMY.md) only if implementation changed, reconcile the [Change catalog](../../README.md), clear selection if selected, and archive WORK01 after all mandatory tests succeed. `TASKS.md` steps are not independently selectable from work/QUEUE.md.
