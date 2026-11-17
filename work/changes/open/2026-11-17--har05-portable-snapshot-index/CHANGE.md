# HAR05 | Portable design-agent wiki snapshot

**State: Verifying (source and tests committed; user checkout run not observed).** Owner authorized direct implementation on 2026-11-17. Developer-harness tooling only; does **not** select an active coding Change, alter game behavior, launch a paid model, or interfere with HAR03.

## First-screen handoff

- **Outcome:** Make the ordinary-ChatGPT ZIP carry source-exact wiki navigation and explain missing historical links without bringing back all archived material.
- **Authority:** [runbook](../../../../docs/runbooks/chatgpt-design-snapshot.md), [developer-agent harness](../../../../.agents/HARNESS.md), and the prior [HAR04 source ZIP](../../archive/2026-11/other/2026-11-17--har04-chatgpt-design-snapshot/CHANGE.md).
- **Source owners:** `scripts/repo-tools/chatgpt-snapshot.mjs`, `chatgpt-snapshot-knowledge.mjs`, `chatgpt-snapshot.test.mjs`; reuse `wiki-core/{route,markdown,paths}.mjs`. No second wiki parser.
- **Known trap:** the user's committed ZIP is not a live worktree. The existing AST parser requires local dev dependencies, while the consumed ZIP must not. Index the exact exported Git revision, not mutable Cursor files.

## Implemented scope

1. Exporter stages a temporary **committed-tree** tar using the same Git pathspecs as the ZIP and uses the existing wiki AST/section router to generate portable `WIKI-INDEX.json` when dependencies are available.
2. The index reports headings, anchors, exact line spans, section previews, authority class, link edges, known omitted historical targets, original SHA-pinned GitHub fallback URLs where safe, and links genuinely broken at the source revision.
3. Sensitive excluded targets never receive fallback links. No index or content produced from uncommitted files.
4. Manifest v2 preserves original revision fields and adds safe modified tracked paths (sensitive path names redacted), untracked count and `portableWiki` status. Dirty contents are not exported.
5. **Follow-up policy (2026-11-17): the shortest command requires the wiki index and fails loudly if it cannot be generated.** `--no-index` is the explicit source-only escape hatch; `--require-index` stays an unnecessary compatibility alias. No automatic install, external database, model call, new dependency, or default MCP tool.

## Follow-up: portfolio discoverability and recommended defaults

Owner requested that the documented engineering system be the **front door** to the portfolio, not a hidden agent feature. The public [Engineering System Tour](../../../../ENGINEERING.md), root [README](../../../../README.md), [AGENTS](../../../../AGENTS.md), and [CLAUDE adapter](../../../../CLAUDE.md) now route a fresh evaluator into the methodology. The wiki maintained-root classification includes `ENGINEERING.md` with a deterministic routing self-test. Agent instructions remain brief; the deep public explanation is **on demand**.

The plain `pnpm repo:snapshot:chatgpt` now requires `WIKI-INDEX.json` and fails on an indexing error. The explicit `--no-index` flag skips indexing and creates a source-only ZIP; `--require-index` remains a backward-compatible but unnecessary alias. The exporter fixture was updated to cover the new branch. **The source/test changes are committed, not yet executed here against the installed checkout.**

## Evidence and required next verification

**Not yet independently executed in the user's repository:** `pnpm repo:snapshot:chatgpt:test`, **the new default** `pnpm repo:snapshot:chatgpt`, `pnpm wiki:find --self-test`, `pnpm wiki:health`, archive inspection and the CLI negative `--no-index` path. The ChatGPT execution environment contains the uploaded source ZIP but not the repository's Node dependencies or live `.git` directory. **Do not mark Done or claim green integration until those commands actually run.**

Fixtures are included for (a) exact-HEAD source isolation, (b) omitted versus broken path classification, (c) no GitHub fallback for sensitive paths, (d) verified archive metadata and SHA, (e) index absent/fail-closed mode and (f) dirty-path provenance. Run them in Cursor's real checkout, inspect defects, and record actual negative results.

**Next action:** Once HAR03's ongoing work is not disrupted, run the narrow tests and one true lean export under the installed pnpm workspace. Open the ZIP and verify that `SNAPSHOT.json.portableWiki.status === "ready"` and `WIKI-INDEX.json.source.commit` equals the export SHA. Confirm the reported omitted targets and unexplained broken paths, plus that the ZIP's embedded index does not leak ignored/sensitive material. Repair only HAR05 scope, reconcile ledger, then archive this packet.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged: a developer-only export/index does not alter game contracts or provider behavior | exporter/helper/tests at latest HAR05 commit; full checkout verification pending | source-observed; **not run** | intentionally excluded historical links distinct from false links; no dirty source contents or sensitive fallback | `docs/runbooks/chatgpt-design-snapshot.md`, `.agents/HARNESS.md`, workbench entry |

**Excluded:** game implementation, developer's active HAR03 experiments, global MCP setup, embedding models, remote deployment, DB changes and provider spend.
