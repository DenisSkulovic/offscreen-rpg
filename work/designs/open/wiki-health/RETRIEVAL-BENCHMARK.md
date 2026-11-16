# Wiki retrieval and agent benchmarks

**State:** WIKI02 implements the zero-provider static bench (`pnpm wiki:bench:static`). Its first run is blocked by remaining graph hard errors and does not meet the pilot Recall/MRR/Hopper figures; those figures are not gates. Agent runs are **opt-in with explicit resource/paid-provider authorization** and are not part of this design.

## 1. Three independent retrieval tests

| Track | How it works | Does it use a model? | What it proves |
| --- | --- | --- | --- |
| **W0: Gold-route topology** | For each fixed user query, check a manually verified gold `page#heading` is reachable from entrypoints via real Markdown edges in ≤N hops | **No** | The graph *permits* discovery; does not prove a reader understands the question |
| **W0b: Wiki Hopper** | Seeded simulated visitor chooses among *visible* Markdown links using query/label/title similarity; no access to answer key when navigating | **No** | Whether a plausible reader can discover the correct page, not merely whether an oracle shortest path exists |
| **W1: Lexical retriever** | Build a local word/heading index over maintained wiki pages, run the same user questions, rank pages using BM25/FTS5 or a deterministic lexical ranker, score gold owners | **No** | Reproducible search visibility, headings, vocabulary and query-term mismatch |
| **W2: Fresh-agent navigation** | New isolated model session per question in fixed read-only repository snapshot; record actual reads, tool calls, timing, token usage and final cited answer | **Yes, explicitly authorized** | A real agent can navigate, understand, stop and not confuse desired versus implemented |
| **W3: Code-grounded truth** | A W2 implementation-status question is checked against source/test/runs at the **same Git SHA**, not old docs or an LLM's confidence | May use W2 agent, but oracle is source/tests/human | Whether wiki claims survive source inspection; discrepancy and evidence-tier correctness |

W0 and W1 should be routinely cheap. W2/W3 are experimental and can cost real model credits. An agent that reports “I was confused” is anecdotal; **the authoritative measures are the tool trace, answer and independently reviewed expected claims**.

Information-retrieval metrics `MRR`, `Recall@k` and `nDCG@k` are standard, useful because they measure where truly relevant pages rank rather than how many terms happen to match. See [NIST TREC](https://trec.nist.gov/pubs/trec20/papers/WEB.OVERVIEW.pdf) and [NVIDIA retrieval metrics](https://docs.nvidia.com/nemo/microservices/25.12.0/evaluate/flows/retrieval.html).

## 2. Gold question set: 30 meaningful tasks, with withheld answers

Initial **public example categories** (not the hidden test answers):

| Set | Count | Question type | What a wrong answer looks like |
| --- | ---: | --- | --- |
| P | 7 | Accepted product mechanics (time, items, world-neutrality, Storyteller creative constitution) | Reads old program or invents default action |
| T | 7 | Selected technical invariants (ENG03 CAS, publication, prompt controller, evidence) | Treats model prose as game truth |
| S | 6 | Current source status (SSE, Chamber lanes, Admin grants, S3 cutover, Storyteller loops) | Confuses planned with implemented/tested/live |
| D | 4 | Explicit unresolved design and Change-selection authority | Treats a parked essay or terminal packet as permission |
| A | 6 | Adversarial or counterexample queries; stale historical excerpts can be injected | Follows a plausible but superseded authority |
| **Total** | **30** | | |

**Gold records are NOT in the agent-visible working tree.** Keep them in a separate benchmark-runner-controlled directory or protected local store, not `work/designs/open/wiki-health/` or the model's repo. Only public task wording can be in a checked-in sample. The exact source owner, accepted and prohibited claims, source symbol and test evidence are withheld during the run.

Example gold record schema:

```json
{
  "id": "S-SSE-01",
  "question": "Is authenticated story SSE invalidation implemented, or only a design?",
  "entrypoint": "AGENTS.md",
  "track": "source-verification",
  "goldOwnerHeadings": [
    "docs/technical/client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture"
  ],
  "requiredAssertions": [
    "Client EventSource and Query invalidation are source-observed",
    "GET is authoritative",
    "Production hosting/proxy replay is not proven by source presence"
  ],
  "criticalProhibitedAssertions": [
    "SSE client is absent",
    "All production transport failure lanes are proven"
  ],
  "codeChecks": [
    "apps/web/src/features/play/use-story-live-updates.ts",
    "apps/web/src/shared/api/story-update-stream.ts"
  ],
  "validForSha": "exact-inspected-git-sha",
  "grader": "deterministic assertions plus blinded human review"
}
```

Do not promote illustrative questions into “validated gold” before checking every expected statement at the actual benchmark SHA. When an architecture legitimately changes, update gold assertions with review, retaining the old dataset/version for reproducibility. Use a held-out subset not authored or viewed by the implementing agent.

## 3. W0 / W1, free and deterministic

For W0, check directed BFS route `wiki entry -> gold owner`, and report mean, median, p95 and failures for the 30 gold questions. A technically reachable page may still be disguised by bad link text: keep that distinction for W2.

For W1, index titles, H1–H3 headings and body text from canonical pages; separately index open-design and evidence pages with **non-authoritative labels**. Do not include archive/parked essays as current answer candidates. A simple SQLite FTS5 index or small Node lexical ranker suffices; avoid embeddings/API calls for this first experiment. Run exact fixed natural-language prompts. Report:
- **Recall@5:** fraction of required owner pages that appear among the first five results.
- **MRR:** `mean(1 / rank_of_first_relevant_page)`, 0 if no gold owner retrieved.
- **nDCG@5:** graded relevance if questions have multiple acceptable supporting pages (e.g., product rule plus technical companion).
- **Wrong-authority@5:** how often the top five would include an archive, draft or evidence as if it answered the *accepted* norm.
- **Per-category scores**, rather than hiding poor Source/Adversarial cases in a high average.

A lexical search may rank the wrong page because of vocabulary mismatch, which is precisely a useful diagnostic. It is not permission to insert unnatural keyword soup into the canon.

## 4. Isolated W2 / W3 runs

**Never answer question 2 in the same chat that answered question 1.** A subagent counts as fresh only if its model context, transcript/session ID, tool state and benchmark answers are isolated. Safer default: a completely new **OS process and thread for every `(question, repetition, variant)`**, pointed at an identical read-only Git snapshot.

Controlled setup:
- Exact Git commit, clean checkout (or disposable read-only worktree), same model version, reasoning/effort, prompt, tool restrictions, context preloads, retrieval permissions and max duration.
- Agent may inspect `AGENTS.md`, `docs/`, source and tests as permitted. Ground truth/expected headings must be outside its accessible working directory. Disable memory/session resume, implicit proprietary search caches if they would leak between trials, network outside permitted repo/model provider, and auto-implementation.
- **No writes**, no provider calls from repo code, no deployments, no secret reading, no side effects. The only potentially paid service is the explicitly authorized *benchmark model invocation*.
- Shuffle question order and run at least two independent repetitions for important comparisons; keep all attempts, not just the prettiest. If agents expose seed or cache flags, fix/report them. Separate semantic-memory contamination from filesystem OS caching.

Three evaluation **variants**:
1. **Wiki-first:** normal AGENTS and current wiki navigation.
2. **Ablation:** same code and question, but with wiki map/canonical pages hidden or replaced by a minimal stub in a disposable **separate** snapshot; measure what the wiki actually adds. This is a controlled study, not the default workflow.
3. **Candidate-vs-baseline:** compare two Git document revisions while holding code snapshot, agent version and oracle fixed where possible. If code changed, do not attribute all improvement to docs.

Do not do expensive 30×N comparisons by default. Start with a **12-question pilot** (one attempt per arm plus perhaps a repeat = 24–48 runs); only advance to a full 30-question ×2 repetitions ×2 arms study with explicit owner-approved cap. The pilot number is a planning option, not a spend authorization.

**CLI adapter feasibility:** Codex offers `codex exec --json --ephemeral --sandbox read-only` for non-interactive JSONL traces; Claude Code offers `claude -p --output-format stream-json`; Cursor CLI supports `agent --print --output-format stream-json`. See [Codex CLI](https://learn.chatgpt.com/docs/non-interactive-mode), [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/cli-usage), and [Cursor CLI](https://docs.cursor.com/en/cli/reference/output-format). **Verify locally installed versions/permissions first.** A model prompt saying “do not edit” is not a sandbox; enforce isolation and filesystem permissions in the runner. Implement one adapter first, not three incompatible trace pipelines at once.

## 5. Instrument the host, not the model's introspection

Capture monotonic host wall time and actual structured CLI event streams. Normalize both model and tool invocations into one versioned trace format. OpenTelemetry's GenAI conventions have agent/tool operation and tool-call-count definitions that can inform the schema; do not require deploying OTEL collectors just for this local benchmark. [Agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md), [tool calls metric](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-metrics.md).

Recommended per-trial record:

```json
{
  "schema": "wiki.agent-trial.v1",
  "trialId": "uuid",
  "questionId": "S-SSE-01",
  "repoSha": "exact-sha",
  "model": "actual-provider-model-and-version",
  "adapter": "codex|claude|cursor",
  "arm": "wiki-first",
  "repetition": 1,
  "elapsedMs": null,
  "firstGoldPageOpenMs": null,
  "firstEvidenceOpenMs": null,
  "toolCalls": {"total": null, "read": null, "search": null, "shell": null},
  "fileReads": {"total": null, "distinct": null, "irrelevant": null,
                "historicalDetours": null, "reopens": null},
  "tokens": {"input": null, "cachedInput": null, "output": null,
             "providerReported": false},
  "usageCostUsd": null,
  "result": {"status": "completed|timeout|tool-error|refusal",
             "citedOwnerPaths": [], "answerFile": "local-private-path"},
  "judgment": {"requiredClaimsCorrect": 0, "requiredClaimsTotal": 0,
               "criticalViolation": false, "statusClassCorrect": false,
               "humanReviewed": false},
  "telemetryLimitations": []
}
```

Use **null** when a CLI does not report a measure; never put `0` for unknown usage or silently infer tokens from file bytes. A shell tool that runs a large `rg` command is one tool call but may inspect thousands of files: track command type, file-read events when available and search scope separately. If actual file reads are inaccessible, report **visible tool actions** and instrumented coverage, not an invented “only 2 files read” result.

Do **not** log model inputs, repository secrets, user content or complete private prompt texts by default. Tool names, timestamps, normalized path metadata, counts and a separately protected final answer suffice for most scores. OpenTelemetry warns that full model prompts and outputs can be sensitive and expensive to retain; capture only after deliberate opt-in. [GenAI span privacy](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md).

## 6. Answer and navigation scores

| Score | Definition / purpose |
| --- | --- |
| **Task success** | Required accepted facts, meaningful negative case, correct status/proof tier and citation(s) all correct. Critical false permission/authority assertion means task fails regardless of speed |
| **Authority accuracy** | Cited canonical owner matches gold; historical or open design may be evidence, never the current normative source |
| **Code fidelity** | W3 independent source/test review agrees with the answer at same SHA; count mismatches with severity |
| **First-right-source latency** | Host milliseconds until first correct owner/evidence file actually opened; not model-reported “thinking time” |
| **Wall time** | Host milliseconds from launch through final answer/error/timeout |
| **Tool calls** | Actual traced calls by type, plus failures and repeated/redundant actions |
| **Distinct relevant files** | Number of files opened with a gold reason; minimize wrong detours, not necessarily all file reads |
| **Context/cost efficiency** | Report provider input/output/cache tokens, USD, tokens/successful task; never optimize speed if errors increase |
| **Wrong-turn rate** | Irrelevant file reads, visits to archived/parked pages as authority, search→dead link loops, re-open cycles, and abandoned paths; observational, not psychological mind-reading |
| **Abstention correctness** | When the source genuinely lacks implementation proof or policy approval, agent says “not demonstrated/undecided” instead of inventing |
| **Doc-to-code discrepancy** | Fraction of code-verification tasks with an actual source contradiction in docs; also count “source present but no live test” misclassifications |

A successful agent can have more than one tool call. A model that gives a quick wrong answer is **worse** than one that spends 20 seconds verifying an uncertain implementation status. Report quality first, efficiency only among correct outcomes. Use medians and p90/p95 times for latency tails; 95% bootstrap confidence intervals for differences when the sample is large enough. A 12-task pilot is exploratory, not statistically conclusive.

## 7. Independent grading and hard negatives

Write crisp machine-checkable expectations for path citations, explicit rejected claims, selected/proposed status and known source-symbol presence. Semantic paraphrases and subtle code behavior cannot be fully evaluated by regex. Blind human review of sampled answers, or a separately authorized judge with constrained rubric, is necessary for high-stakes questions. **The agent must not grade its own answer.**

Adversarial tasks should specifically tempt:
- An obsolete “SSE not implemented” sentence from a prior technical page.
- A parked Experience README saying it is a “replacement product specification”.
- A dated ENG05 “no code authorized” banner, although source includes S3 adapter.
- An OBS07 synthetic Support screenshot presented as production privileges.
- A proposal for GM07 delegated fallback mistaken for default gameplay behavior.
- A conclusion from a completed Change packet mistaken for the *current* code at a newer SHA.

Gold cases must be reviewed and refreshed when implementation or approval legitimately changes. Otherwise the benchmark punishes truthful answers.

## 8. Evidence report and safe cadence

After a trial batch, produce a compact summary with the full measured denominators, per-category success, time/tool/token distributions, failures, wrong routes, confidence limits and instrumented gaps. Keep private JSONL traces and raw answers **gitignored** by default; optionally commit a compact redacted run manifest with SHA and scoring method for meaningful release milestones.

Suggested cadence:
- Every documentation edit: free **graph+link** tests.
- After significant product/technical changes: free **W0/W1 golden query** regression.
- After DOC04 or major wiki redesign: explicitly approved **W2/W3 isolated pilot**, with no required paid GitHub Actions or hidden service.
- Before claiming large retrieval improvements: paired **same-model/same-code** baseline vs candidate and held-out adversarial test suite.

**Never call a route map or an LLM-authored summary a completed benchmark.** A complete benchmark is an observable trial with frozen input, recorded actions, a hidden independently checked answer key and a reproducible scorer.
