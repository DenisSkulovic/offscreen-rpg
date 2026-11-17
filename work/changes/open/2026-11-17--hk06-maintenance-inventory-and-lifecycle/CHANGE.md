# HK06 | Tracked-artifact inventory and lifecycle integrity guard

**State: Ready (unselected; after HK02).** **Authority:** [repository maintenance target](../../../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md) and [Change standard](../../../../.agents/references/change-work-unit-standard.md). **Baseline:** inspected lean `4e42bd7`; compared GitHub `main@b876318` and current workflow/source; recheck HEAD and worktree before code. **One outcome:** an active documented object cannot be forgotten because it is missing from its owner router or stranded in the wrong lifecycle.

## Cursor first-screen brief

Reuse `scripts/repo-tools/wiki-core/model.mjs`, `paths.mjs`, `markdown.mjs`, `scripts/repo-tools/archive-changes.mjs::classifyChangeText`, `scripts/repo-tools/wiki-health.mjs`, `scripts/repo-tools/docs-health.mjs`, and `work/changes/README.md`. Do **not** introduce a second Markdown parser, status database, vector engine, or agent call. This is tooling/CI integrity, **not** a game feature. No gameplay package or provider changes.

## Observed failure mechanisms to cover

- Maintained-page graph scans open work but hard reachability only guards `docs/` canonical pages; an unindexed active design/Change can be invisible.
- `work/designs/open/legacy-initiatives-index/README.md` is not a row in `work/designs/README.md` in snapshot; many dated/canonical pages do reference its historical files, so its **disposition** requires care, not immediate deletion.
- `scripts/repo-tools/docs-health.mjs` uses `Done` regex and flags `**State: Done for A; B blocked.**` on OBS00 as a Done packet lacking a ledger. Fix/replace that parser by reusing the existing explicit Change classifier, then show a regression fixture.
- Old `work/README.md` P5 prose demonstrates that link validity alone does not enforce lifecycle truth.

## Intended code diff (one bounded unit)

1. Implement small `repo:maintenance` entrypoint and testable core in `scripts/repo-tools/`; derive tracked Markdown inventory from `git ls-files` on complete checkout. Define classes/root routes using existing path classifier or a narrow extension. Never mistake intentionally absent files in `repo:snapshot:chatgpt` lean output for GitHub deletions. Unknown tracked Markdown in governed surfaces must be classified or reported, **not silently excluded by a glob**.
2. Reuse parsed local links/graph edges to compute **per-lifecycle-root** discoverability: `docs/README.md` (already owned by wiki:health), `work/changes/README.md` (open CHANGE leaves), `work/designs/README.md` (open dossier entry), research/evidence collection routers where maintained, `.agents/README.md` for agent instructions and root status/source maps. Do not require each archived evidence file to have its own live link; prefer collection-level manifest/owner. Track indirect routed descendants within each dossier. Report `unclassified`, `missing-route`, `broken-owner` with exact file and suggested router.
3. Parse the **one** `Current change:` declaration; `none` passes; a selected link must resolve to a legitimate open CHANGE. Cross-check open/archive terminal state using `archive-changes.mjs::classifyChangeText` with an explicit *partial completion* test, not raw word matching. Whole Done/Cancelled in open is invalid; archived active state is invalid unless named exception is reviewed. Fallback unknown state should be reported as unclassified, never auto-archived.
4. Make the baseline run on full checkout and classify existing route defects; do not grandfather new violations. Introduce any exception as an explicit path + accountable owner + reason + review/expiry (bounded), never a wildcard `work/**`.
5. `repo:maintenance` outputs concise human findings and `--json` structured counts, exact SHA, scan completeness, affected paths, severity, fix suggestion. Support `--strict` that exits nonzero for high-confidence violations only, with no file rewrites/deletes. Put detailed generated artifacts under ignored `out/`. If no git or no complete checkout, clearly state that the integrity gate is **unavailable**, not green.
6. Add Node self-tests and root package scripts. Fix the existing `repo:docs-health` partial-Done false positive by importing or sharing its state classifier, not by making a wider regex.

## Acceptance / falsification

- **Normal:** complete checkout with all known indexed active docs, a valid `Current change: none`, partially Done OBS00 and routed historical research passes the high-confidence lifecycle tests, with remaining baseline candidates explicitly listed.
- **Negative 1:** new `work/changes/open/fixture/CHANGE.md` without an index route → strict failure; adding a valid queue link → pass. Invalid selected/archived target → strict failure.
- **Negative 2:** a new arbitrary-name top-level control doc without owner appears as unclassified; a new unrouted design dossier surfaces; an archived evidence file only linked from a collection manifest is **not** falsely treated as open orphan.
- **Negative 3:** terminal `State: Done` in open → failure, while `Done for A; B blocked` remains open and is not claimed as completed. Test the actual OBS00 string and fixture.
- **Negative 4:** a broken path in a monitored active leaf still fails via existing wiki/docs link engine; missing archives in lean export are reported as skipped/unknown, never used as full HEAD proof.
- Time, network and cost: filesystem/Git only; predictable command time, no provider, Docker, DB, downloads, external indexing or mutation.

## Exclusions

No Git date logic or source-dependency freshness yet (HK07); no CI/scheduled integration or status-wall refactor (HK08); no deletion, movement or rewriting of legacy dossiers in the detector Change; no change to product/technical semantics. HK02 remains responsible for existing docs workflow scope, not this derived inventory.

## Reconciliation ledger (fill during implementation)

| Affected authority | Intended target | Observed implementation & proof | Disposition |
| --- | --- | --- | --- |
| [maintenance target](../../../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md) | owned active routes + precise state | pending | pending |
| `wiki-core` / existing archive classifier | one graph/parser, no false terminal status | pending | pending |
| `work/changes/README.md` + `work/designs/README.md` | known routes, no unrelated queue selection | pending | pending |
| `docs/product/` + `docs/technical/` | no product behavior change | unchanged: repository diagnostic only | pending |

**Next Cursor action when selected:** inventory full HEAD and write normal/negative fixtures **before** changing docs. Implement one self-contained read-only guard, run tests, reconcile this ledger, then archive HK06. Do not select a Change merely because a scanner recommends work.
