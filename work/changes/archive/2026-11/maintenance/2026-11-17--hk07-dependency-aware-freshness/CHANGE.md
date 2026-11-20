# HK07 | Git-backed dependency freshness and actionable review candidates

**State: Done (2026-11-18).** **Authority:** [repository maintenance target](../../../../../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md). **Baseline:** use HK06's full tracked inventory and parsed graph; no invented age/proof metrics. **One outcome:** when code or a cited document changes, maintainers get a bounded review candidate showing which owner may need revalidation, without pretending a timestamp can determine truth.

## Cursor first-screen brief

Read `scripts/repo-tools/wiki-core/model.mjs`, `content-health.mjs`, `wiki-content-health.mjs`, HK06's new inventory/JSON schema and relevant `git` support in `brief.mjs`. Extend **that** maintenance report, not a separate scanner. Reinspect HEAD before editing.

## Exact code scope

1. Add Git provenance for tracked **active** pages plus directly cited source files: `lastChangedSha`, `lastChangedAt`, `relativeCommit`/changed-after-owner relationship, full `scanSha` and `dirty` indicator. Use bounded `git log`/diff operations, not one Git process per possible historical archived page. A shallow/missing-history checkout reports `unavailable` distinctly; a dirty path invalidates freshness claims for that path.
2. Use existing Markdown references and conservative recognized backtick paths to create a **reverse impact list**: changed implementation source (or moved owner) → live docs/source README that cite it → heading/edge receipt. Prefer explicit file paths to fuzzy mentions. Do not introduce a model, semantic index, grep-every-word algorithm or external network.
3. Candidate classifications: `needs-revalidation` (dependent source changed later), `inactive-open-work` (active Change/design with no recent activity), `suspected-stale-instruction` (existing `wiki:content-health` hit), `unknown-provenance`. Include ages as factual fields; report 14/30/60/90-day cohorts as configurable review thresholds **only**. A months-old but stable technical contract with no impacted source is not automatically wrong.
4. Rank by near-term risk: active selected work, status/control owner, touched public source boundary or transition, uncategorized ownership, then recency/age. Return concise top 3 for human and agent cold starts; full JSON has all candidates and explanations.
5. Let a completed Change's existing Reconciliation ledger record `unchanged because …` or exact updated owner. Avoid introducing a second durable acknowledgment registry. Where an unreviewed candidate cannot be mechanically cleared, mark `review needed`; **do not manufacture a reviewed status from the fact that CI passed**.
6. Preserve accepted product/technical target vs source realization semantics. A changed source file cannot silently rewrite or “invalidate” product canon by timestamp.

## Acceptance: real diagnostics, not a stale-file score

- **Normal:** a source-map that explicitly cites a file edited later emits `needs-revalidation` with both SHAs/paths; a subsequent documented review can record current owner/proof without rewriting unchanged product truth.
- **Negative 1:** 120-day-old product contract with stable cited source and no contradictory selected decision is **not** a hard-failure stale claim. Age is displayed only.
- **Negative 2:** a brand-new source change with **no explicit doc dependency** is reported as no known route (possible blind spot), not falsely attributed to every technical page.
- **Negative 3:** a source path renamed, missing, or dirty becomes a separately labelled path/unknown-provenance concern, never a “fresh” assertion.
- **Negative 4:** shallow clone and lack of Git history produce `unknown`, not a zero-age timestamp. Fixed-clock fixture tests avoid flaky day-boundary thresholds.
- **Performance:** use a small deterministic repository fixture and full-head timing receipt; no provider/DB, no rewriting docs, no noisy gigantic CLI stdout.

## Exclusions

No CI schedule/workflow changes (HK08), no code reorganization, no auto-close or archive, no permanent “freshness score”, no automatic GitHub issue creation, no assertion that citation timestamps alone certify source correctness.

## Reconciliation ledger

Proof on dirty worktree based on `f3e3bfe35490932ee363c00aad0fb239893d825e`: `node --test scripts/repo-tools/maintenance.test.mjs` passed 10 tests. `pnpm repo:maintenance --strict` exited 0 in about 10 seconds, with strict 0. The top warnings were review candidates, including NOTICE.md, ROADMAP.md, and AGENTS.md citing a later file. Those warnings do not fail the gate and do not rewrite product text. No provider call and no database call.

HK07 paths: `scripts/repo-tools/maintenance-core.mjs`, `scripts/repo-tools/maintenance.mjs`, `scripts/repo-tools/maintenance.test.mjs`, `work/changes/README.md`.

exception: .github/workflows/docs.yml because HK02 already changed the docs workflow filter in this worktree
exception: evidence/README.md because HK02 already corrected the evidence router in this worktree
exception: package.json because HK06 already added the maintenance command in this worktree
exception: scripts/check_docs.py because HK02 already extended the link checker in this worktree
exception: scripts/repo-tools/archive-changes.mjs because HK06 already shared the Change state parser in this worktree
exception: scripts/repo-tools/archive-changes.test.mjs because HK06 already added the partial Done regression in this worktree
exception: scripts/repo-tools/docs-health.mjs because HK06 already switched the ledger scan in this worktree
exception: scripts/repo-tools/docs-workflow-paths.test.mjs because HK02 already added the path-filter fixture in this worktree
exception: work/changes/archive/2026-11/README.md because earlier housekeeping packets already indexed their archive rows
exception: work/changes/archive/2026-11/other/2026-11-17--hk02-repository-doc-integrity/CHANGE.md because HK02 already archived that packet in this worktree
exception: work/changes/archive/2026-11/other/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md because HK06 already archived that packet in this worktree
exception: work/changes/ledger/2026-11.md because earlier housekeeping packets already appended ledger rows
exception: work/changes/open/2026-11-17--hk02-repository-doc-integrity/CHANGE.md because HK02 moved that packet and the old path remains in the diff
exception: work/designs/open/repository-housekeeping/README.md because earlier housekeeping packets already retargeted its links

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Git freshness candidates | work/designs/open/repository-housekeeping/PREVENTION-SYSTEM.md | changed: the maintenance report now ranks review candidates from commit order and does not treat age as a false contract | scripts/repo-tools/maintenance-core.mjs and scripts/repo-tools/maintenance.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | fixture-tested | a 120-day page whose cited source is older is not needs-revalidation and is not a strict error | scripts/repo-tools/maintenance.test.mjs |
| existing content health | scripts/repo-tools/wiki-core/content-health.mjs | unchanged: suspected-stale-instruction reuses scanDocuments and does not add a second prose parser | scripts/repo-tools/maintenance-core.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | fixture-tested | an uncited source is one no-known-route candidate and is not copied onto every technical page | scripts/repo-tools/wiki-core/content-health.mjs |
| Change ledger clearance | work/changes/README.md | changed: an unchanged-because line that names the owner and the source clears that candidate | scripts/repo-tools/maintenance.test.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | fixture-tested | a passing strict command does not mark the candidate reviewed by itself | work/changes/README.md |
| product and technical behavior | docs/README.md | no product/technical behavior impacted: timestamps do not rewrite the game contract | scripts/repo-tools/maintenance.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | source-observed | docs/product and docs/technical rules were not edited by this packet | N/A |
