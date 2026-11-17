# HK08 | Make hygiene visible on every repository transition

**State: Ready after HK06 and HK07 (unselected).** **Authority:** [repository maintenance target](../../../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md) and [Change standard](../../../../.agents/references/change-work-unit-standard.md). **One outcome:** objective maintenance violations cannot slip through an ordinary push or Change close, and active status stays concise and discoverable rather than becoming a second history archive.

## Cursor first-screen brief

Review `.github/workflows/docs.yml`, `.github/workflows/code.yml`, `scripts/repo-tools/ci-change-scope.mjs`, `scripts/repo-tools/brief.mjs`, `work/changes/README.md`, `work/changes/archive/README.md`, `work/changes/ledger/`, `work/designs/README.md`, `work/README.md`, `STATUS.md`, HK06/07 scripts/tests. Existing HK02 must have fixed the docs-only path-filter gap. **Do not overwrite the new UI/DIR/BOOK status or force `Current change` to a housekeeping packet.**

## Bounded executable/config changes

1. CI: add a **cheap, provider-free** repository maintenance job triggered on pushes/PRs that can affect docs, Changes, source maps, status, research, scripts, and source dependencies. A weekly `schedule` plus `workflow_dispatch` performs full age/impact review; use Node/pnpm already configured and ensure full checkout history only when freshness requires it. Do **not** turn every docs-only push into TypeScript build/DB/Chamber integration. Publish machine JSON and concise job summary.
2. Enforce HK06 high-confidence failures in CI (new unindexed active documents, invalid selected target, terminal open Change, missing active owner, expired explicitly tracked exception). After source-backed baseline, ratchet existing low-confidence legacy candidates into scheduled review with named disposition, not forever-muted warnings.
3. Add `pnpm repo:brief --health` (or short default summary if demonstrably cheap) that shows only **top three** unresolved findings, their exact paths, priority and next command. A fresh Cursor session thus sees hygiene debt at L0/L1 **without** needing a 1 MB graph dump. Keep existing `repo:brief --json` receipt contract stable/additive.
4. On Change close, reuse `wiki:change-guard --mode close` and lifecycle strict report; verify the packet was reconciled and, if terminal, archived with route updates. No broader “fix any docs” instruction, and no self-closing PR bot.
5. Reconcile outdated status surfaces: make `STATUS.md` a bounded view of **currently demonstrated** capabilities and gaps with links to dated evidence, not an accumulating narrative of every HAR/WIKI run. Make `work/changes/README.md` a small actionable open queue with archive/ledger pointers, not an exhaustive Done diary. Reconcile stale labels under `work/designs/README.md`, `work/README.md`; the retained `legacy-initiatives-index` must be routed as historical or moved after inbound-link inventory, never purged on age. Do not create competing permanent status files or clone selected product/technical contracts.
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

| Owner | Target | Code/CI proof | Documentation |
| --- | --- | --- | --- |
| GitHub workflows | coverage + scheduled full review, bounded cost | pending | pending |
| `scripts/repo-tools/brief.mjs` | top-3 actionable hygiene surfacing | pending | pending |
| `STATUS.md` / `work/changes/README.md` | compact non-duplicated active status | pending | pending |
| `work/designs/README.md` / legacy dossier | true lifecycle and audited links | pending | pending |
| Accepted product/technical | no game behavior change | unchanged: harness/status hygiene only | pending |

**Execution:** after HK06/HK07 verified, implement CI + brief + status convergence as one linked operational feedback loop. No blanket set-to-Done. Archive only after full-head tests, negative fixtures and reconciliation evidence.
