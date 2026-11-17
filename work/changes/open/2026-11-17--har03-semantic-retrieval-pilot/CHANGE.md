# HAR03 | Local semantic search trial for developer agents

**State: Proposed, not selected.** Purpose: a bounded, **opt-in**, provider-free experiment validating natural-language retrieval for code and Markdown. This is a **developer-harness tooling/test Change** if executed; it must alter only experiment scripts/fixtures/portable instructions, *not* product/game source, default dependency lists, global client configs, or the game `compose.yaml`.

**Authority:** [candidate selection](../../../designs/open/repository-agent-workbench/CANDIDATES.md), [pilot protocol](../../../designs/open/repository-agent-workbench/PILOT.md), [retrieval evaluation](../../../designs/open/repository-agent-workbench/EVALUATION.md), [developer harness](../../../../.agents/HARNESS.md). Read these **by task**, not all as mandatory context.

**Current baseline observed:** GitHub `main@5263bf5064ef39b472e6b6837a7bea9705d15676` (2026-11-17), WIKI07 active and recently improved section ranking. Reinspect HEAD and `git status --short` before any work; the developer's Cursor session is concurrently committing.

## Cursor first-screen brief

- **Goal:** Reproducibly answer whether a local semantic retrieval candidate locates the correct implementation or doc heading **and** saves agent effort, with honest negative controls.
- **Already available:** `pnpm wiki:find`, `pnpm wiki:read`, WIKI03/05 benchmark scaffolding, `rg`, Git, existing `scripts/repo-tools/wiki-core`.
- **Tool candidates:** Grepai + local Ollama code embedding; QMD for Markdown; SIFS is a fallback challenger. **Do not build our own embedding model, vector DB, or graph DB.**
- **Known trap:** Cursor's modern Instant Grep does not imply a vector index. A successful standalone semantic hit does **not** imply agents will use the result, and an indexed document may be stale or only proposed.
- **Scope/permission:** only after user selects HAR03 and agrees to optional local binary/model setup. Read-only experiment against disposable/checkpointed local checkout. No paid provider calls, cloud indexing, default MCP registration, auto-start or live game runtime.

## Specific bounded implementation outcome

Create only the **minimum** repo-controlled, provider-neutral experiment fixture/run instructions or small helper script under `scripts/repo-tools/` needed to replay the task set and capture comparable evidence. Use existing HAR02 result schema if present; do not wait for elaborate code if a small manual first pass produces honest comparative data. No newly published product feature.

1. **Baseline fingerprint:** committed full SHA, local dirty status, included corpus, Git ignored/excluded paths, OS/client/tool versions, vendor model version/hash and index refresh time; refuse misleading comparisons across different refs.
2. **Source-only measurement:** test 8 code queries: native `rg`/Cursor vs Grepai, optionally SIFS as challenger; test 8 doc queries: WIKI07 vs QMD. Require exact original path/line/heading/symbol proof and meaningful no-match cases, including a proposal-as-target decoy.
3. **Reindex and security negatives:** new commit; dirty-worktree-only line; deleted heading/symbol; refused secret/env/ignored content; missing Ollama/QMD; QMD native Windows failure handling; unavailable tool clean fallback.
4. **Results:** `owner@1/@3/@5`, source-evidence correctness, authority-class errors, false positives, output bytes, time (cold/warm), index/update time, tool/server RAM and maintenance burden. **Missing data = unknown**, not zero or passed.
5. **Agent-use test optional and separately permissioned:** fresh-client A/B/C as in [pilot](../../../designs/open/repository-agent-workbench/PILOT.md); record whether agent invoked and used results or redundantly reread. Never spawn a model from this Change without explicit spend/model/sandbox agreement.

## Safety and ergonomics

- Keep **all** optional installs in user-selected external tool directories or ignored per-user cache, with version pins; never edit global Claude Code or Cursor settings automatically.
- Do not do `curl|sh`/PowerShell remote-script execution without source/version inspection; verify binaries/checksums where vendor publishes them.
- No `.env`, token, credential, private prompt trace or benchmark gold indexing; no vendor cloud embedding unless explicitly authorized in a later Change.
- Windows x64 must be tested as the primary workstation; Mac portability is a secondary acceptance goal. If vendor setup is too brittle, report that and compare lighter SIFS or an existing tool rather than engineering around it in a large custom patch.
- CLI first. Consider a restricted read-only MCP interface **only after a standalone win**; a compact tool description must not be eagerly injected into every task by default.

## Acceptance and negative proofs

- **Success:** at least one recorded same-revision A/B comparison with independently verified owner hits and traceable timestamps, plus a rejected/missing-feature case and documented index freshness.
- **Negative:** results from a stale ref, proposal-only source, ignored secret path or wrong branch cannot pass as current/authorized truth.
- **Portable:** without any optional vendor installed, repo startup, `pnpm repo:brief`, `pnpm wiki:find`, and ordinary test/source navigation behave unchanged.
- **Honesty:** vendor self-reported benchmark numbers are not performance evidence here. Reports distinguish fixture-based from actual tool-run measurements and no-agent from agent-run experiments.

## Handoff / readiness gate

Do **not** interrupt the selected WIKI07 Change. On deliberate owner selection, prepare the pilot against fresh source in a disposable workspace. WIKI08's content repair is **not a hard blocker** for a code-retrieval experiment; do not let unresolved document claims count as correct.

Implement only a small executable scope, reconcile docs/STATUS when actually affected, and complete the existing Change ledger before declaring Done. If no code helper proves necessary, treat the trial as an **evaluation** instead and leave this code-bearing Change unselected or cancel it; do not invent executable code to satisfy a packet.

## Reconciliation ledger

**Open; required at implementation close** by `.agents/skills/change-workflow/assets/CHANGE.md`. Expected target classification is `no product/technical behavior impacted` with real source/test evidence.