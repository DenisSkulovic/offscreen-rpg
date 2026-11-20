# HAR05 | Portable design-agent wiki snapshot

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Done (2026-11-18). Checkout verification completed at `dfb25d7255cc5f82a2142099033cfa6bedc3e94f`. The lean ZIP matches that commit, the portable index is included, and the source-only flag stays disabled.

## First-screen handoff

- **Outcome:** Make the ordinary-ChatGPT ZIP carry source-exact wiki navigation and explain missing historical links without bringing back all archived material.
- **Authority:** [runbook](../../../../../../docs/runbooks/chatgpt-design-snapshot.md), [developer-agent harness](../../../../../../.agents/HARNESS.md), and the prior [HAR04 source ZIP](../2026-11-17--har04-chatgpt-design-snapshot/CHANGE.md).
- **Source owners:** `scripts/repo-tools/chatgpt-snapshot.mjs`, `chatgpt-snapshot-knowledge.mjs`, `chatgpt-snapshot.test.mjs`; reuse `wiki-core/{route,markdown,paths}.mjs`. No second wiki parser.
- **Known trap:** the user's committed ZIP is not a live worktree. The existing AST parser requires local dev dependencies, while the consumed ZIP must not. Index the exact exported Git revision, not mutable Cursor files.

## Implemented scope

1. Exporter stages a temporary **committed-tree** tar using the same Git pathspecs as the ZIP and uses the existing wiki AST/section router to generate portable `WIKI-INDEX.json` when dependencies are available.
2. The index reports headings, anchors, exact line spans, section previews, authority class, link edges, known omitted historical targets, original SHA-pinned GitHub fallback URLs where safe, and links genuinely broken at the source revision.
3. Sensitive excluded targets never receive fallback links. No index or content produced from uncommitted files.
4. Manifest v2 preserves original revision fields and adds safe modified tracked paths (sensitive path names redacted), untracked count and `portableWiki` status. Dirty contents are not exported.
5. **Follow-up policy (2026-11-17): the shortest command requires the wiki index and fails loudly if it cannot be generated.** `--no-index` is the explicit source-only escape hatch; `--require-index` stays an unnecessary compatibility alias. No automatic install, external database, model call, new dependency, or default MCP tool.

## Follow-up: portfolio discoverability and recommended defaults

Owner requested that the documented engineering system be the **front door** to the portfolio, not a hidden agent feature. The public [Engineering System Tour](../../../../../../ENGINEERING.md), root [README](../../../../../../README.md), [AGENTS](../../../../../../AGENTS.md), and [CLAUDE adapter](../../../../../../CLAUDE.md) now route a fresh evaluator into the methodology. The wiki maintained-root classification includes `ENGINEERING.md` with a deterministic routing self-test. Agent instructions remain brief; the deep public explanation is **on demand**.

The plain `pnpm repo:snapshot:chatgpt` now requires `WIKI-INDEX.json` and fails on an indexing error. The explicit `--no-index` flag skips indexing and creates a source-only ZIP; `--require-index` remains a backward-compatible but unnecessary alias. The exporter fixture was updated to cover the new branch. The installed checkout ran that default and the source-only flag at `dfb25d72`.

## Evidence and required next verification

The installed checkout ran `pnpm repo:snapshot:chatgpt:test`, `pnpm wiki:find --self-test`, `pnpm wiki:health`, `pnpm repo:snapshot:chatgpt --strict`, and `pnpm repo:snapshot:chatgpt --no-index --strict`.

The indexed ZIP is `out/chatgpt-snapshots/offscreen-rpg-lean-dfb25d7255cc-20261118T184305940Z.zip`. `SNAPSHOT.json` and `WIKI-INDEX.json` both name commit `dfb25d7255cc5f82a2142099033cfa6bedc3e94f`. The worktree was clean. `portableWiki.status` is `ready`: 294 pages, 2112 sections, 0 broken links, 203 omitted historical links. Those omitted links carry a SHA-pinned GitHub URL. No omitted sensitive path carries one. The source-only ZIP reports `portableWiki.status` `disabled` and does not contain `WIKI-INDEX.json`.

One classifier repair landed in that same commit: a heading whose first sentence says this queue is a proposed experiment stays in the proposal lane. The book plan link now targets the archived BOOK01 packet. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/gameplay/time-and-autonomy.md#bounded-plans-for-absence | product | unchanged because the absence queue stays a proposed experiment | scripts/repo-tools/wiki-core/route.mjs at dfb25d7255cc5f82a2142099033cfa6bedc3e94f | source-observed | the portable index lane for that heading is proposal | the heading stayed in place |
| docs/runbooks/chatgpt-design-snapshot.md#quick-start | runbook | unchanged because the default export already requires the index and the clean ZIP matched that contract | scripts/repo-tools/chatgpt-snapshot.mjs at dfb25d7255cc5f82a2142099033cfa6bedc3e94f | source-observed | the source-only ZIP is disabled and has no wiki index | the heading stayed in place |
| scripts/repo-tools/wiki-core/route.mjs | code | changed: a sentence that says this queue is a proposed experiment stays in the proposal lane | scripts/repo-tools/wiki-core/route.mjs at dfb25d7255cc5f82a2142099033cfa6bedc3e94f | fixture-tested | the checked-in absence heading is not in the normative lane | the self-test covers that heading |

exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/README.md because the design index records that this verification is done
exception: work/designs/open/backlog-convergence-2026-11-18/README.md because the backlog audit records the checkout result
exception: work/designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md because the execution order now starts at the next packet
exception: work/designs/open/repository-agent-workbench/README.md because the workbench now points at the archived packet
exception: research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md because the experiment register records the checkout result

**Excluded:** game implementation, global MCP setup, embedding models, remote deployment, DB changes and model spend.
