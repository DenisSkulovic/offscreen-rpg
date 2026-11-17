# HAR10 | Retire unadopted retrieval and fake-agent experiment code

**State: Ready, open, not current (owner decision 2026-11-17).** BOOK01 is the current Change. This cleanup stays open and is not started. **Executor: Cursor.** **Purpose:** aggressively remove experimental source that did not earn adoption, retain useful wiki/harness fundamentals, and preserve the experiment's conclusion as first-class searchable historical research. **Research authority:** [results register](../../../../research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md), [Cognee evaluation](../../../../research/agent-practice/COGNEE-EVALUATION-2026-11-17.md). **Previous HAR09:** [closed, not adopted](../../archive/2026-11/other/2026-11-17--har09-architectural-memory-pilot/CHANGE.md).

## First screen

Start with fresh `git rev-parse HEAD` / `git status --short`, root AGENTS, the current selection, this Change, current `package.json` scripts, `.agents/README.md`, `ENGINEERING.md`, `docs/runbooks/agent-native-harness-evaluation.md`, the source import graph and both research reports. **Baseline checked via GitHub:** `aece39b388877d6c3eaa850737be46e527bf6770`; reconcile newer HEAD and concurrent user work before deleting. Do not touch unrelated Living Book/BOOK01/BOOK02, gameplay, Storyteller, Admin or other features.

**Explicit decision:** code/test scripts created only to replay HAR02, HAR03, HAR06, HAR07, WIKI03 fake sessions and HAR08 preflight have not demonstrated practical value as permanent tooling. Remove them from the *current HEAD* after proving no retained script imports them. **Do not remove** wiki navigation, source receipts, metadata guardrails, deterministic wiki health/static QA or snapshot machinery.

## Delete this bounded executable island, subject to dependency audit

- `scripts/repo-tools/retrieval-compare.mjs`
- `scripts/repo-tools/semantic-pilot.mjs`, `semantic-pilot-cases.mjs`, `semantic-pilot-self-test.mjs`
- `scripts/repo-tools/retrieval-funnel-run.mjs`, `retrieval-funnel-oracle.mjs`, `retrieval-funnel-self-test.mjs`
- `scripts/repo-tools/wiki-core/retrieval-compare.mjs`, `retrieval-compare-self-test.mjs`, `retrieval-funnel.mjs`, `source-route.mjs`
- `scripts/repo-tools/wiki-bench-agent.mjs`
- `scripts/repo-tools/wiki-core/agent-harness.mjs`, `agent-trace.mjs`, `agent-score.mjs`, `agent-self-test.mjs`, `agent-native-preflight.mjs`, `agent-fixtures/har08-tasks.mjs`

The list is based on a static import audit of a 5fc89564 committed source ZIP: these 18 files form a mostly isolated executable cluster. **Recheck against latest main**, including dynamic imports, scripts, CI/PowerShell/docs readers and protected current tooling. If some function has genuine external consumers, extract only that small reusable function into its correct owner and prove usage, rather than preserving the abandoned benchmark framework.

Remove from `package.json`: `repo:retrieval-compare`, `repo:semantic-pilot`, `wiki:bench:agent`. Avoid replacing them with new wrappers. Update `.agents/README.md`, `ENGINEERING.md`, `STATUS.md`, workbench docs, command lists and any *active* docs that advertise deleted scripts; archived Changes retain their historical command lines and must not be silently rewritten. Change `docs/runbooks/agent-native-harness-evaluation.md` into a clearly **historical protocol** or relocate it to research with a safe redirect; never leave nonfunctional commands presented as runnable.

**Retain:** `scripts/repo-tools/brief.mjs`, `chatgpt-snapshot*.mjs`, `wiki-find.mjs`, `wiki-read.mjs`, `wiki-health.mjs`, `wiki-change-guard.mjs`, `wiki-content-health.mjs`, `wiki-bench-static.mjs` and their required `wiki-core/{route,model,markdown,paths,bench,health}` dependencies; `repo:docs-health`, docs checks, relevant repo root instructions. **HAR05 stays Verifying**, not subsumed. `bench.mjs` is used by static wiki QA; do not accidentally remove it with `retrieval-compare.mjs`. Source receipts and snapshot exporter are **retained improvements**, not failed search tools.

## Local Cognee disposal (audit first)

No Cognee integration is tracked in project source; removal is on Cursor's **local workstation**, not a Git commit. Inspect ownership and exact paths of `out/architecture-memory/venv`, local scratch graphs/SQLite/datasets/sidecars and `out/architecture-memory/models`. Inspect potential user/global Python/Hugging Face cache locations for **experiment-specific** downloads. Delete *only* demonstrably owned, disposable Cognee artifacts after recording a sanitized inventory; preserve unrelated user caches, settings and projects. Check no global Cursor/Claude MCP plugin/hook/service was installed. Report any unverified leftovers explicitly. An archived conclusion cannot certify a local deletion.

## Preserve research without runtime bloat

Already added first-class [register](../../../../research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md) and [Cognee results](../../../../research/agent-practice/COGNEE-EVALUATION-2026-11-17.md). They are reachable via `research/README.md`, `research/agent-practice/README.md` and the documentation index; `wiki:find --include-historic` should discover them. Audit source links and keep exact original SHA/counts/limitations, especially the false `SSE uses Redis` edges and unapproved model downloads. No gameplay/technical product specs should be changed to match a rejected vendor experiment.

Retain archived HAR01–HAR09 and WIKI01–WIKI08 Change dossiers as **dated observations and rationale**, not active code dependencies. Git history already preserves removed source implementations. Do not publish or regenerate HAR08's author-written answer key as “secure” after removal from HEAD: it remains in Git history and exported earlier ZIPs. Any future live-agent comparison needs **new, truly private** independently reviewed gold tasks.

## Actual verification, no fake green

Run in a **clean checkout** after removing files:

```bash
pnpm repo:brief --json
pnpm wiki:find --self-test
pnpm wiki:read --self-test
pnpm wiki:health
pnpm wiki:change-guard --mode close
pnpm wiki:content-health --self-test
pnpm wiki:bench:static --self-test
pnpm repo:snapshot:chatgpt:test
python scripts/check_docs.py
```

If a command syntax differs, inspect `--help` or the existing script before running and record the exact supported command (do not invent test success). Check `pnpm repo:docs-health` as applicable and a targeted import/rg sweep for deleted modules/scripts. **No new external provider, model download, indexing daemon, Docker, DB, game Storyteller or paid trial.** No vendor results are regraded because their runner was removed. Distinguish passed, skipped and blocked, including local Node/pnpm prereqs.

## Reconciliation and Done gate

Complete [Change reconciliation](../../../../.agents/references/change-work-unit-standard.md). Update active command/navigation docs, `work/changes/README.md`, monthly ledger and `STATUS.md`, archive HAR10 only after all affected import/link checks and actual relevant tests pass. If the local Cognee caches cannot be inspected, do not claim them deleted: record a separate explicit leftover/blocker and finish code-only proof honestly.

| Owner | Target delta | Source revision + proof | Negative case | Documentation |
| --- | --- | --- | --- | --- |
| Abandoned HAR/agent trial scripts | removed from active scripts/code without orphaned imports | **pending Cursor** | no dangling dynamic imports / CI references | tool lists + historical research |
| Wiki and source-receipt tools | retained behavior and CLI | **pending tests** | source exactness and authority still work | .agents/README + docs router |
| Local Cognee artifacts | only owned disposable files cleaned | **pending machine audit** | shared caches not destroyed | research + verification receipt |
| Product/technical game contracts | unchanged | N/A | no game runtime changes | N/A |
