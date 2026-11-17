# HK07 | Git-backed dependency freshness and actionable review candidates

**State: Ready after HK06 (unselected).** **Authority:** [repository maintenance target](../../../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md). **Baseline:** use HK06's full tracked inventory and parsed graph; no invented age/proof metrics. **One outcome:** when code or a cited document changes, maintainers get a bounded review candidate showing which owner may need revalidation, without pretending a timestamp can determine truth.

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

| Owner | Target | Source/test proof | Docs |
| --- | --- | --- | --- |
| Maintenance report and Git provenance | causal candidates, not truth verdict | pending | pending |
| Existing wiki graph/content health | reuse current parsing and semantic warnings | pending | pending |
| Change ledger | reviews captured through existing owner | pending | pending |
| Product/technical docs | target unchanged | unchanged: no game contract modification | pending |

**Next Cursor action after HK06 is Done:** implement and validate one Git freshness overlay; compare report with HEAD and explicitly list false positives/unknowns before calling it Ready for a CI gate.
