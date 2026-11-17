# HK02 | Make repository knowledge edits visible to CI and honest about lifecycle

**State: Ready (unselected).** **Program:** [repository housekeeping](../../../designs/open/repository-housekeeping/README.md). **Order:** execute before HK01. **Source inspected:** lean `main@4e42bd7`, GitHub `main@f279b362` diff was docs-only. Reinspect on executor HEAD. **Outcome:** a malformed local Markdown reference in a newly edited open Change/design or maintained research router must be caught by a deterministic repo/CI check. This is a **code-bearing Change** because it modifies executable checker and workflow configuration, with README reconciliation as supporting work.

## Cursor first-screen brief

Read [audit F01/F03](../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md#findings-ranked-by-actionable-value), `.github/workflows/docs.yml`, `scripts/check_docs.py::iter_markdown_files`, `scripts/repo-tools/knowledge-health.mjs`, `work/README.md`, `work/designs/README.md`, and `work/changes/README.md`. Existing Python checker **is active in docs CI**; do not delete it. Existing wiki health/knowledge tools must not be cloned into an unneeded third checker.

**Problem:** docs workflow path filter omits routine `work/**` and `research/**` markdown; Python file traversal excludes Change packets. Thus docs-only Change edits can bypass checks, and stale open/historical labels survive.

## Accepted implementation envelope

1. Add appropriate path triggers for markdown under `work/changes/**`, `work/designs/**` and maintained `research/**` / `evidence/**` entrypoints to `.github/workflows/docs.yml`, using reviewed scopes to avoid costly false triggers.
2. Extend **existing** link checker to traverse active `work/changes/open` and relevant research/route files; do not blindly classify archived Changes or dated evidence as ratified truth. Validate normal local relative links and nested Next.js route-group paths. Preserve the existing checker self-tests, avoid traversing generated/exported `out`, node_modules or non-source files.
3. Add a targeted synthetic self-test for a broken open-Change link and one valid link into the archive (on a full checkout). Ensure a Change-only push actually runs the CI docs workflow.
4. Correct clearly obsolete lifecycle phrases: `work/README.md` “Until P5 cutover” / “DOC01 target”; `work/designs/README.md` sections that label completed WIKI/HAR studies proposed/unselected. Distinguish a concluded *experiment program* from a still-open future question; do not mass-move folders if backlink and ownership analysis is incomplete.
5. Keep one concise authoritative map of where concluded experiment findings live (research register and archive). Do not rewrite `docs/product` or `docs/technical` to match old plans. If moving a historical folder is optional rather than needed for acceptance, defer it.

## Explicit exclusions

No link auto-fixer, no generated markdown rewrite, no archive deletion, no reimplementation of the wiki index/semantic search, no CI weakening to make a red suite appear green, no touching UI01–UI08/DIR01–03, no paid providers, no live DB.

## Acceptance (show commands and outputs, not assertions)

- **Normal:** full HEAD `python3 scripts/check_docs.py --self-test` and `python3 scripts/check_docs.py` pass after chosen scope; current `pnpm wiki:health` / `pnpm wiki:change-guard` results are recorded if the workstation can run them.
- **Negative:** a temporary broken relative link in an open `CHANGE.md` makes the checker exit nonzero; reverting that test fixture restores passing status. A valid archive link is accepted when archive exists.
- **CI:** a `work/changes/open/**/CHANGE.md`-only diff invokes the docs workflow based on the revised path filter, verified against actual GitHub event or a reproducible matching test; don't merely assert it from YAML reading.
- **Truth:** stale P5 language no longer presents cutover as pending, and concluded research is indexed without being called current authority. No extra duplicate docs registry created.
- **Missing archive in lean snapshots:** do not use a lean export as a full-repo CI oracle. Report excluded archive link errors separately instead of auto-rewriting correct links.

## Reconciliation ledger (fill at execution)

| Authority/source | Desired or observed invariant | Source/test evidence after change | Documentation disposition |
| --- | --- | --- | --- |
| `.github/workflows/docs.yml` | Work Changes trigger link gate | pending | pending |
| `scripts/check_docs.py` | Actual open Change coverage + negative fixture | pending | pending |
| `work/README.md` / `work/designs/README.md` | No obsolete migration or fake-open status | pending | pending |
| `work/changes/README.md` | HK02 Done/archived only after proof | pending | pending |

**Cursor permission:** accepted narrow repository-internal deterministic checker/workflow/README changes only after owner selects HK02; verify current HEAD and dirty files, perform one self-contained diff, no blanket cleanup.
