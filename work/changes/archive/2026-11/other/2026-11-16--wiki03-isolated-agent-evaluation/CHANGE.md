# WIKI03 | Isolated fresh-agent evaluation harness

**State: Done (2026-11-16).** Fake harness only. No live agent benchmark was executed. Code-bearing benchmark harness. **Depends on WIKI01 and WIKI02 Done.** This packet authorizes implementation and **provider-free fake-adapter tests only**. **It does not authorize real model/CLI invocations or API spend.** A first real pilot requires a separate explicit owner choice specifying CLI/model, number of trials, cap and local sandbox scope.

**Design:** [Agent benchmark specification](../../../../../designs/open/wiki-health/RETRIEVAL-BENCHMARK.md) and [Implementation design](../../../../../designs/open/wiki-health/IMPLEMENTATION.md).

## Objective

Prove that the wiki helps a *fresh* coding agent correctly resolve user tasks while minimizing real investigation cost and source misunderstandings. Every independent case receives a new process/session, fixed Git revision and immutable question. A host runner measures actual events; the agent may not inspect its gold oracle, previous trials or benchmark instructions.

**Commands to implement:**

```text
pnpm wiki:bench:agent --self-test       # ALWAYS zero-model scripted fake event streams
pnpm wiki:bench:agent --dry-run         # list exact model, cases, exposure, sandbox and cap; NO model
pnpm wiki:bench:agent --case <id> --adapter <supported> --approve-model-usage ...
```

The last line is a *conditional future opt-in*, not a runnable authorization supplied by WIKI03. Implementer must choose actual flags based on the installed CLI version and document them truthfully. No implied retries or paid background scheduler.

## A. Real isolation, no context contamination

The runner (host) owns the **withheld oracle** and recorded answer rubric. It creates a separate disposable agent-visible tree for each case from the **same pinned Git commit**, excluding all wiki benchmark gold/runner/test files, this plan and any prompts containing expected answers. Use a source snapshot with explicit included app/package/docs areas; do not assume setting working directory restricts filesystem reads.

Require a **verified filesystem sandbox** (container/VM/restricted OS account or known CLI sandbox with equivalent proven access protection). Test a private canary outside the sandbox: the fake and real adapter must fail to read it. If secrets, unrelated Windows home folders, gold, previous-run traces, or a writable workspace are accessible to the agent, **refuse real model launch**. Separate process and *session ID* per question, no resume or shared conversation memory. If a CLI has hidden persistent context/cache, report/disable it before comparability claims. All repo tools allowed to agent must be read-only and deny arbitrary shell writes, deployments, repo tests touching DB or model calls from game code.

Use the same model/version, effort, context preloads, allowed tools, code snapshot and timeout for both benchmark arms. Randomize trial order from a recorded seed. No shared prompt history. A shell `rg` call can inspect many files: do not treat one shell event as one file read unless actual files are observable.

## B. One honest trace adapter, not three at once

Implement a **scripted fake CLI adapter first**, with deterministic JSONL fixture sessions for success, wrong path, missing source, denied access, timeout, malformed event, resumed-session leak, unknown token count and model error. Then implement **one** real adapter based on the tool actually installed locally (Codex, Claude Code or Cursor). Inspect current `--help` and version; do not invent flags. Require structured noninteractive event stream, fresh/ephemeral session and enforced read-only tools. Store adapter implementation and version in result.

Host-side event capture must record:
- unique trial/run id; Git SHA; dirty flag; question/corpus version; adapter/model/version; arm; seed/repetition;
- host monotonic start/end, elapsedMs, first gold-owner file-open time and first source/evidence inspection time **only if events demonstrate it**;
- tool invocation counts by type with duplicate start/complete events merged by tool-call ID; tools failed, reattempts, repeated paths, abandoned/wrong historical detours and status;
- distinct actually observed file opens and search commands with scope; if not visible, report `null`/coverage unknown, not an invented zero;
- provider-reported input/output/cache tokens, cost if reported, model/version and pricing observation time; missing tokens/spend remain `null`, not guessed from bytes;
- final answer with citations/path claims for independent offline grading. Redact secrets and never store complete model prompts/raw story data by default.

Trace schema `wiki.agent-trial.v1`, stable JSONL input→normalized trial JSON with tests. Use only fields actually exposed by selected CLI; recording a tool's final string is not proof a file was opened.

## C. Trial modes and authority grading

**Wiki-first:** normal AGENTS/current wiki; **minimal-wiki control:** disposable alternate snapshot of *same code* with navigation guides removed and an explicit minimal neutral stub, never the actual repo; **baseline-vs-candidate:** same code revision with two doc snapshots. Do not attribute a difference to docs if code, model or oracle changed.

For each case require independent source-of-truth review:
1. Correct approved product rule or selected technical contract, with a discriminating negative case;
2. Correct source/implementation proof tier at pinned revision (selected vs source-observed vs tested/connected/live vs absent);
3. No invented permission (GM07 defaults, raw production Admin grants, paid providers) and no treating parked/history as current authority;
4. Exact first owner heading/path and relevant code symbol or test evidence where question requires it;
5. Proper abstention when evidence is absent.

Use deterministic checks for known paths and prohibited claims; use **blind human review** for semantic correctness, ambiguity and source-level reliability. Model does not grade itself. A correct answer after ten file reads is a success; a fast wrong answer fails. Report accuracy and critical violations first; efficiency among correct answers second.

For W3 source truth, do not infer runtime behavior solely from file existence. Code/test assertions are a separate reviewed oracle at the *same Git SHA*. State `source-observed`, `provider-free tested`, `connected tested` and `live observed` distinctly. Automated file-path checks are only a partial source-fidelity instrument.

## D. Safety and budget gate

The default `--self-test` / `--dry-run` must **never invoke an LLM CLI**, a game provider, network service, Docker, test DB or any billable service. This includes discovery: local CLI help/version may be allowed only on explicit configuration step, not on a zero-cost default if it could launch session.

Real runs must fail closed unless the owner specifies model/provider, exact case count, repetition, concurrency, time per trial and budget/usage cap, with clear warning if the CLI does not expose reliable real-time cost. A run/attempt count cap is enforceable; **do not assert a dollar ceiling is guaranteed** if pricing/usage/cancellation cannot actually be enforced. Stop when the declared cap or trial timeout is reached and record partial attempts; no silent resumption.

**No real agent pilot is required to mark WIKI03 implementation Done**, only truthful safe dry-run and fake adapter proof. Mark “agent benchmark executed” only after explicit user authorization and actual trace results. Running an agent in read-only repo mode is not sufficient to prove gold/host privacy isolation on Windows.

## E. Reporting and boundaries

Under gitignored `out/wiki-health/<sha>/<run-id>/` write redacted `trial.json`, event trace, human grading worksheet, failed-case report and aggregate `wiki.agent-batch.v1`. No fabricated model tokens or elapsed measures. Optional compact evidence receipt only if actual significant trial happened. Add only the needed runner, one adapter, fake trace fixtures, package scripts, README/procedure. Do not build a web dashboard or OTEL collector; local JSONL is enough.

**Forbidden:** game runtime edits, paid/test provider invocation under this packet, extra GitHub Actions, production deployment, unapproved owner policy, opening unrelated filesystem, overwriting DOC04 or full completed Change archive.

## Measured result

`pnpm wiki:bench:agent --self-test` passed. `pnpm wiki:bench:agent --dry-run` exited 0 and refused a launch: model null, CLI not probed, cap null. `pnpm wiki:bench:agent --approve-model-usage --case P02` exited 2 and did not start a process. Evidence class on every fixture is `fake-harness-only`. No model, provider, Docker, or database call.

This proves the harness, not that an agent can use the wiki.

## Reconciliation ledger

| Boundary | Completion | State |
| --- | --- | --- |
| Host and sandbox | Separate run/process + hidden-oracle canary rejection | updated `scripts/repo-tools/wiki-core/agent-harness.mjs`. Snapshot manifest excludes gold and these packets. Canary read throws |
| Fake adapter | Structured normal/errors/leak/unknown-usage test suite | updated `scripts/repo-tools/wiki-core/agent-trace.mjs` and `agent-self-test.mjs` |
| Real CLI adapter | Correct installed-CLI version/stream mapping; no real invocation | no CLI was probed or launched. Dry-run records `cliProbed: false` |
| Scoring | Independent rubric, tier/authority false-claim failures | updated `scripts/repo-tools/wiki-core/agent-score.mjs` |
| Reporting and safety | Dry-run output, zero provider, redacted result schema | `wiki.agent-dry-run.v1` and `wiki.agent-trial.v1`. Tokens stay null |
| Product pages | No canon edits to help a future agent | unchanged |

**See [verification](VERIFICATION.md).** No “agent trial passed” claim based on a simulated JSONL trace. A scripted fake proves the **harness**, not the wiki's usefulness to models.
