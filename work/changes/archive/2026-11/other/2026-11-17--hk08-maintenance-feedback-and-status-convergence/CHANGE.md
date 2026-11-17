# HK08 | Make hygiene visible on every repository transition

**State: Done (2026-11-18).** **Authority:** [repository maintenance target](../../../../../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md) and [Change standard](../../../../../../.agents/references/change-work-unit-standard.md). **One outcome:** objective maintenance violations cannot slip through an ordinary push or Change close, and active status stays concise and discoverable rather than becoming a second history archive.

## Cursor first-screen brief

Review `.github/workflows/docs.yml`, `.github/workflows/code.yml`, `scripts/repo-tools/ci-change-scope.mjs`, `scripts/repo-tools/brief.mjs`, `work/changes/README.md`, `work/changes/archive/README.md`, `work/changes/ledger/`, `work/designs/README.md`, `work/README.md`, `STATUS.md`, HK06/07 scripts/tests. Existing HK02 must have fixed the docs-only path-filter gap. **Do not overwrite the new UI/DIR/BOOK status or force `Current change` to a housekeeping packet.**

## Bounded executable/config changes

1. CI: add a **cheap, provider-free** repository maintenance job triggered on pushes/PRs that can affect docs, Changes, source maps, status, research, scripts, and source dependencies. A weekly `schedule` plus `workflow_dispatch` performs full age/impact review; use Node/pnpm already configured and ensure full checkout history only when freshness requires it. Do **not** turn every docs-only push into TypeScript build/DB/Chamber integration. Publish machine JSON and concise job summary.
2. Enforce HK06 high-confidence failures in CI (new unindexed active documents, invalid selected target, terminal open Change, missing active owner, expired explicitly tracked exception). After source-backed baseline, ratchet existing low-confidence legacy candidates into scheduled review with named disposition, not forever-muted warnings.
3. Add `pnpm repo:brief --health` (or short default summary if demonstrably cheap) that shows only **top three** unresolved findings, their exact paths, priority and next command. A fresh Cursor session thus sees hygiene debt at L0/L1 **without** needing a 1 MB graph dump. Keep existing `repo:brief --json` receipt contract stable/additive.
4. On Change close, reuse `wiki:change-guard --mode close` and lifecycle strict report; verify the packet was reconciled and, if terminal, archived with route updates. No broader “fix any docs” instruction, and no self-closing PR bot.
5. Reconcile outdated status surfaces: `work/README.md` P5 cutover prose, `work/designs/README.md` stale WIKI/HAR labels, and the missing retained legacy-index route were **already repaired** in docs-only commits `3586e3d`/`e3ba5cf` on 2026-11-17. Verify, do not reapply. Make `STATUS.md` a bounded view of **currently demonstrated** capabilities and gaps with links to dated evidence, not an accumulating narrative of every HAR/WIKI run. Make `work/changes/README.md` a small actionable open queue with archive/ledger pointers, not an exhaustive Done diary. Reconcile stale labels under `work/designs/README.md`, `work/README.md`; the retained `legacy-initiatives-index` must be routed as historical or moved after inbound-link inventory, never purged on age. Do not create competing permanent status files or clone selected product/technical contracts.
6. Ensure a warning is actionable: review candidates have owner/reason/last-seen and a disposition (repaired, intentionally retained with review date, superseded, deleted with proof). A scheduled report with 200 warnings and no follow-up is not a maintenance system. Choose the smallest bounded follow-up mechanism consistent with existing Change/issue process; avoid GitHub issue spam or hidden external writes.
7. Provide a safe operator command/reference (one page under existing `.agents/` or `scripts/repo-tools/` map) describing `repo:maintenance`/strict/freshness and why warning != permission to alter product docs. CI must remain read-only aside from build artifacts.

## Acceptance and safeguards

- A Change-only Markdown commit causes the maintenance workflow and HK02 documentation checks to run; demonstrate with path-filter fixture or test event. Existing docs-only code classifier still avoids expensive code/integration jobs.
- In a controlled test branch, newly orphaned active CHANGE and terminal open CHANGE **fail** CI. A deliberately old **unchanged, correctly owned** product document remains advisory, not a failure.
- Scheduled workflow reports any due review candidate and is visible via workflow summary/artifact; a quiet result is due to a scanned clean set, not a missing history or suppressed collector.
- `pnpm repo:brief --health` output is brief and stable; `repo:brief --json` still emits current SHA, branch, dirty paths and selected Change.
- After status convergence, `STATUS.md` remains accurate and useful, with real current source/absent proofs. Neither root status nor Change queue reproduces whole archive histories. Archive/ledger links and inbound references remain valid.
- Existing `pnpm wiki:health`, `pnpm wiki:content-health`, `pnpm wiki:change-guard`, docs checker, Change archive tests and new fixture tests are run and recorded (or skipped explicitly). No model spend, DB reset, live probes or deployment.

## Exclusions

No semantic AI linter, no deleting old studies without retained evidence, no rewriting product authority to agree with code, no automatic code changes, no auto-archiving by age, no new status database, no forced nightly provider work, no wholesale script directory reorg.

## Reconciliation ledger

Proof on dirty worktree based on `f3e3bfe35490932ee363c00aad0fb239893d825e`. `node --test scripts/repo-tools/ci-change-scope.test.mjs scripts/repo-tools/docs-workflow-paths.test.mjs` passed. `pnpm repo:brief --self-test` passed. `pnpm repo:brief --json` kept the receipt keys and omitted health. `pnpm repo:maintenance --strict` exited 0. `python scripts/check_docs.py` reported 0 problems. `pnpm wiki:health` reported 81 reachable canonical pages and 0 broken paths. `pnpm wiki:content-health --self-test` passed. Archive-change and maintenance fixtures passed. No provider call and no database call.

HK08 paths: `.agents/README.md`, `.agents/references/repository-maintenance.md`, `.github/workflows/maintenance.yml`, `STATUS.md`, `scripts/repo-tools/brief.mjs`, `scripts/repo-tools/brief-self-test.mjs`, `scripts/repo-tools/ci-change-scope.mjs`, `scripts/repo-tools/ci-change-scope.test.mjs`, `scripts/repo-tools/docs-workflow-paths.test.mjs`, `work/changes/README.md`.

exception: .github/workflows/docs.yml because HK02 already widened the docs workflow filter in this worktree
exception: evidence/README.md because HK02 already corrected the evidence router in this worktree
exception: package.json because HK06 already added the maintenance command in this worktree
exception: scripts/check_docs.py because HK02 already extended the link checker in this worktree
exception: scripts/repo-tools/archive-changes.mjs because HK06 already shared the Change state parser in this worktree
exception: scripts/repo-tools/archive-changes.test.mjs because HK06 already added the partial Done regression in this worktree
exception: scripts/repo-tools/docs-health.mjs because HK06 already switched the ledger scan in this worktree
exception: scripts/repo-tools/maintenance-core.mjs because HK06 and HK07 already added the inventory and freshness report
exception: scripts/repo-tools/maintenance.mjs because HK06 and HK07 already added the maintenance command
exception: scripts/repo-tools/maintenance.test.mjs because HK06 and HK07 already added the lifecycle and freshness fixtures
exception: work/changes/archive/2026-11/README.md because earlier housekeeping packets already indexed their archive rows
exception: work/changes/archive/2026-11/other/2026-11-17--hk02-repository-doc-integrity/CHANGE.md because HK02 already archived that packet in this worktree
exception: work/changes/archive/2026-11/other/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md because HK06 already archived that packet in this worktree
exception: work/changes/archive/2026-11/other/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md because HK07 already archived that packet in this worktree
exception: work/changes/ledger/2026-11.md because earlier housekeeping packets already appended ledger rows
exception: work/changes/open/2026-11-17--hk02-repository-doc-integrity/CHANGE.md because HK02 moved that packet and the old path remains in the diff
exception: work/changes/open/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md because HK07 moved that packet and the old path remains in the diff
exception: work/designs/open/repository-housekeeping/README.md because earlier housekeeping packets already retargeted its links

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| maintenance CI coverage | .github/workflows/maintenance.yml | changed: push and pull request path filters run the strict lifecycle gate, and the weekly job uses full history | .github/workflows/maintenance.yml and scripts/repo-tools/docs-workflow-paths.test.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | fixture-tested | a Change-only push is docs-only, so runCode and runIntegration stay false | scripts/repo-tools/ci-change-scope.test.mjs |
| brief health summary | scripts/repo-tools/brief.mjs | changed: --health prints three candidates and --json stays additive | scripts/repo-tools/brief.mjs and scripts/repo-tools/brief-self-test.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | fixture-tested | repo:brief --json omits the health field unless --health is also passed | .agents/references/repository-maintenance.md |
| living status | STATUS.md | changed: the priority line points at the queue, archive, and research register instead of repeating every HAR and WIKI run | STATUS.md and work/changes/README.md at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | source-observed | the capability table and the Living Book boundary remain in STATUS.md | work/changes/README.md |
| legacy design index | work/designs/README.md | unchanged: the legacy-initiatives-index row already calls that dossier retained history, and this packet does not delete it | work/designs/README.md at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | source-observed | the dossier directory remains under work/designs/open | work/designs/README.md |
| product and technical behavior | docs/README.md | no product/technical behavior impacted: this is harness feedback and status hygiene | scripts/repo-tools/ci-change-scope.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | source-observed | docs/product and docs/technical rules were not edited by this packet | N/A |
