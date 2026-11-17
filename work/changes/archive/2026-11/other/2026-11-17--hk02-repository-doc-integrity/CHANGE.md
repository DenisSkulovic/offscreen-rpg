# HK02 | Make repository knowledge edits visible to CI and honest about lifecycle

**State: Done (2026-11-18).** **Program:** [repository housekeeping](../../../../../designs/open/repository-housekeeping/README.md). **Order:** execute before HK01. **Source inspected:** lean `main@4e42bd7`, GitHub `main@f279b362` diff was docs-only. Reinspect on executor HEAD. **Outcome:** a malformed local Markdown reference in a newly edited open Change/design or maintained research router must be caught by a deterministic repo/CI check. This is a **code-bearing Change** because it modifies executable checker and workflow configuration, with README reconciliation as supporting work.

## Cursor first-screen brief

Read [audit F01/F03](../../../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md#findings-ranked-by-actionable-value), `.github/workflows/docs.yml`, `scripts/check_docs.py::iter_markdown_files`, `scripts/repo-tools/knowledge-health.mjs`, `work/README.md`, `work/designs/README.md`, and `work/changes/README.md`. Existing Python checker **is active in docs CI**; do not delete it. Existing wiki health/knowledge tools must not be cloned into an unneeded third checker.

**Problem:** docs workflow path filter omits routine `work/**` and `research/**` markdown; Python file traversal excludes Change packets. Thus docs-only Change edits can bypass checks, and stale open/historical labels survive.

## Accepted implementation envelope

1. Add appropriate path triggers for markdown under `work/changes/**`, `work/designs/**` and maintained `research/**` / `evidence/**` entrypoints to `.github/workflows/docs.yml`, using reviewed scopes to avoid costly false triggers.
2. Extend **existing** link checker to traverse active `work/changes/open` and relevant research/route files; do not blindly classify archived Changes or dated evidence as ratified truth. Validate normal local relative links and nested Next.js route-group paths. Preserve the existing checker self-tests, avoid traversing generated/exported `out`, node_modules or non-source files.
3. Add a targeted synthetic self-test for a broken open-Change link and one valid link into the archive (on a full checkout). Ensure a Change-only push actually runs the CI docs workflow.
4. **Baseline reinspection, not duplicate cleanup:** `work/README.md` P5/DOC01 wording and `work/designs/README.md` WIKI/HAR labels were corrected in documentation-only commits `3586e3d`/`e3ba5cf` on 2026-11-17. Verify these remain accurate; do not undo, reword gratuitously or count that pre-existing work as HK02 execution. If a newly discovered stale phrase is in-scope, reconcile it with exact owner and evidence. Any large restructuring is HK08.
5. Keep one concise authoritative map of where concluded experiment findings live (research register and archive). Do not rewrite `docs/product` or `docs/technical` to match old plans. If moving a historical folder is optional rather than needed for acceptance, defer it.

## Explicit exclusions

No link auto-fixer, no generated markdown rewrite, no archive deletion, no reimplementation of the wiki index/semantic search, no CI weakening to make a red suite appear green, no touching UI01–UI08/DIR01–03, no provider calls, no live DB.

## Acceptance (show commands and outputs, not assertions)

- **Normal:** full HEAD `python3 scripts/check_docs.py --self-test` and `python3 scripts/check_docs.py` pass after chosen scope; current `pnpm wiki:health` / `pnpm wiki:change-guard` results are recorded if the workstation can run them.
- **Negative:** a temporary broken relative link in an open `CHANGE.md` makes the checker exit nonzero; reverting that test fixture restores passing status. A valid archive link is accepted when archive exists.
- **CI:** a `work/changes/open/**/CHANGE.md`-only diff invokes the docs workflow based on the revised path filter, verified against actual GitHub event or a reproducible matching test; don't merely assert it from YAML reading.
- **Truth:** stale P5 language no longer presents cutover as pending, and concluded research is indexed without being called current authority. No extra duplicate docs registry created.
- **Missing archive in lean snapshots:** do not use a lean export as a full-repo CI oracle. Report excluded archive link errors separately instead of auto-rewriting correct links.

## Reconciliation ledger

Proof on dirty worktree based on `f3e3bfe35490932ee363c00aad0fb239893d825e`: `python scripts/check_docs.py --self-test` passed, including the temporary broken open-Change link and the valid archive link; `python scripts/check_docs.py` reported 336 Markdown files and 0 problems; `node --test scripts/repo-tools/docs-workflow-paths.test.mjs` passed. CI on GitHub still invokes `python3 scripts/check_docs.py`. No provider call and no database call.

Declared paths: `.github/workflows/docs.yml`, `evidence/README.md`, `scripts/check_docs.py`, `scripts/repo-tools/docs-workflow-paths.test.mjs`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`, `work/designs/open/repository-housekeeping/README.md`.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| documentation link gate covers an open Change packet | .github/workflows/docs.yml | changed: push and pull_request path filters now include work/changes, work/designs, research, and evidence | .github/workflows/docs.yml and scripts/repo-tools/docs-workflow-paths.test.mjs at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | fixture-tested | apps/web/src/features/play/view.tsx does not match the docs workflow filter | .github/workflows/docs.yml |
| open Change and collection-router link check | scripts/check_docs.py | changed: active traversal includes open Change packets plus research and evidence routers, and still skips archived packets | scripts/check_docs.py at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | fixture-tested | a temporary broken relative link in an open CHANGE.md fails, and a broken link that exists only under work/changes/archive is ignored | scripts/check_docs.py |
| evidence collection router | evidence/README.md | changed: the router no longer says a docs/programs tree remains until a P6 delete, because that tree is absent | evidence/README.md at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | source-observed | the checker accepts the snapshot link evidence/inspections/doc01-legacy-snapshot/MANIFEST.md | evidence/README.md |
| work queue and historical labels | work/changes/README.md | changed: the queue selects HK02 for this execution; P5 cutover prose and WIKI/HAR historical labels were already corrected in 3586e3d and e3ba5cf and were left in place | work/changes/README.md at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | source-observed | work/README.md still says no mirrored P5-era queue remains, and work/designs/README.md still labels the WIKI/HAR studies as historical | work/changes/README.md |
| product and technical behavior | docs/README.md | no product/technical behavior impacted: this is a repository link checker and workflow filter | scripts/check_docs.py at dirty f3e3bfe35490932ee363c00aad0fb239893d825e | source-observed | docs/product and docs/technical are absent from the diff | N/A |

**Successor HK06** owns repository-wide inventory/lifecycle integrity; HK07 owns dependency/age signals; HK08 owns scheduled/brief/status convergence. HK02 changes only the existing docs workflow/checker and its already named immediate stale prose, not a duplicate general crawler. A partially Done/blocked Change must never be auto-closed by this packet.

**Cursor permission:** accepted narrow repository-internal deterministic checker/workflow/README changes only after owner selects HK02; verify current HEAD and dirty files, perform one self-contained diff, no blanket cleanup.
