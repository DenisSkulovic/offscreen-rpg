# HAR01 | Machine-readable repository snapshot receipt

**State: Proposed; not selected.** Developer-tooling only. **Prerequisite:** WIKI07's current selected work is reconciled; source check on fresh main. **Approval:** planning only on 2026-11-17, not code authorization. No paid provider, network probe, gameplay or Storyteller edit.
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

## Reconciliation ledger

**Incomplete by design (Proposed).** Before Done, populate the standard affected-claim ledger from [.agents Change template](../../../../.agents/skills/change-workflow/assets/CHANGE.md). Expected selected-impact classification: `no product/technical behavior impacted`; support that claim with actual code diff/negative proofs, not a perfunctory checkbox.
