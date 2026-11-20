# HAR01 | Machine-readable repository snapshot receipt

**State: Done.** Selected and closed on 2026-11-17 after WIKI08. Developer-tooling only. No paid provider, network probe, gameplay or Storyteller edit.
**Design:** [agent workbench target](../../../designs/open/repository-agent-workbench/TARGET.md). **Existing tool owner:** `scripts/repo-tools/brief.mjs` and root `package.json` (`pnpm repo:brief`).

## First-screen Cursor brief

**Goal:** Add an opt-in machine-readable source receipt to the *existing* `repo:brief` command. Not a new server or automatic context loader.
**Current source:** `scripts/repo-tools/brief.mjs` already reports branch, dirty status and three commits, plus selected Change; inspect its current SHA and CLI before any edit.
**Known trap:** a GitHub API reader cannot observe a local dirty worktree; local `main` can diverge from remote. Do not claim either is clean from a remote ref.
**Scope:** one small script/fixtures update and minimal usage documentation; no new dependencies unless strictly necessary.

## Outcome and exact code-bearing delta

- Support `pnpm repo:brief --json` emitting stable JSON to stdout with `schema: repo.brief.v1`, local full HEAD SHA, branch, local dirty boolean and modified/untracked path list (bounded, properly escaped), selected Change path or null, and `environment: local-checkout`. Existing human output and `--checkpoint` continue to work.
- The JSON output MUST NOT contain secrets, complete file content, raw environment variables, provider tokens or unbounded Git diffs. If Git is unavailable or commands fail, explicit error, not guessed clean/HEAD.
- Do not fetch remote origin, infer GitHub connector state, run `git pull` or read all docs. Capture only local checkout state. A ChatGPT connector handoff must still state its own separately fetched remote SHA and `worktree: unavailable`.
- Recommend a small exit-status test set around clean, dirty, untracked, detached HEAD, non-Git/failed invocation, Current change none, and `--json --checkpoint`; no fake test success in the receipt.

## Acceptance and negative proof

- A clean local fixture outputs the actual 40-character SHA, selected work path and `dirty=false` in valid JSON. Existing textual output is byte-stable except intentional help copy.
- A dirty checkout reports changed paths, and a detached HEAD or unavailable Git is distinguished honestly. A remote-only assistant never substitutes this receipt for observation.
- `pnpm repo:brief --json` and targeted tests run locally with no model/network/database; report exact commands, outputs, diff and current SHA. Do not run the full monorepo build for this script.

## Handoff / readiness

**Next permitted step:** owner chooses HAR01 after WIKI07; re-read latest `brief.mjs`, agree on minimal JSON shape and implement only then. `Current change` stays WIKI07 until intentionally advanced. Do not include this Proposed packet in an executor's active work.

Close updates STATUS.md, work/changes/README.md, work/changes/ledger/2026-11.md, work/designs/open/repository-agent-workbench/README.md, and work/designs/open/repository-agent-workbench/TARGET.md. The tool files are scripts/repo-tools/brief.mjs and scripts/repo-tools/brief-self-test.mjs. Usage lines are .agents/README.md, .agents/rules/documentation.md, and docs/runbooks/local-development.md.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged: the receipt reads the local checkout and does not change gameplay, Storyteller, or provider rules | scripts/repo-tools/brief.mjs | fixture-tested | a missing Git directory throws, and the JSON does not contain file contents or an environment variable | N/A |
| .agents/README.md | evidence | changed: the command list names --json as a local SHA and dirty-path receipt | scripts/repo-tools/brief.mjs | fixture-tested | the human brief stays the same text except the working tree lines that Git itself changed | .agents/README.md |
| STATUS.md#orientation | evidence | changed: orientation names the receipt as Done and does not claim a remote was fetched | STATUS.md | source-observed | a GitHub view of this repository is not this JSON receipt | STATUS.md |
