# Real coding-agent harness evaluation | controlled read-only protocol

**Status:** experiment runbook, **not authorization to run models**. **Design:** [agent-native decision](../../work/designs/open/repository-agent-workbench/AGENT-NATIVE-EVALUATION.md); [selected HAR08](../../work/changes/open/2026-11-17--har08-agent-native-harness-evaluation/CHANGE.md). Scope: development agents reading this repository, not its Storyteller or game runtime.

## The specific claim we intend to test

Does a **short explicit instruction to use the repository's knowledge architecture** improve an actual coding agent's independently judged answers, compared with that same coding agent's normal behavior? Both see the original AGENTS/CLAUDE rules, documentation and code. This tests a *prompted navigation cue*, not the entire causal value of maintaining the wiki.

**No semantic-search tool, model runner, reranker, subagent or new package is needed for this trial.** Normal agent-native Git/grep, local files and wiki commands are sufficient.

## Host-only preflight, no model calls

1. Inspect actual clean full Git SHA and worktree. Stage one **sanitized, immutable, read-only source snapshot** for both arms. Do not expose private home directories, credentials, gold or previous trial outputs. A repository root as cwd is **not** OS filesystem isolation, especially on Windows.
2. Select one installed client with one exact model, context/effort setting and allowed tool set. Prove fresh process+session, no resume or old memory, and enforce read-only permissions. Test a private canary outside the sandbox and prove the agent cannot read it. If isolation is unproven, **refuse to launch**.
3. Prepare six candidate *unseen* questions in a **host-only ignored folder** outside the agent's accessible source/index. Include implementation-enforcement, selected-vs-realized, missing feature/permission, and historical/cross-domain reasoning. These are categories, **not** gold paths. Independently adjudicate source answers on the pinned SHA and record required assertions, alternative valid source roles and the most tempting wrong inference. If not independently reviewed, mark `unreviewed`.
4. Choose three varied questions and freeze exact text. Record a randomized A/B sequence (seed, case order, arm order). Each session receives the exact same question, code, docs, native tools, time/call caps and neutral response format. The only difference is the extra B navigation cue.
5. No session may start until the owner names and approves **client, exact model, six-session maximum, allowed tools, maximum attempts, enforceable time/tool caps and usage policy**. Suggested proposal: 3 cases × 2 arms × one run, 8 minutes and 20 tool calls each, sequential. These are **not approved defaults**. Subscription allowance is not a guaranteed USD limit. No background agent/automation.

Run only provider-free WIKI03 checks during HAR08 preparation:

    pnpm wiki:bench:agent --self-test
    pnpm wiki:bench:agent --dry-run
    pnpm repo:brief --json

The existing `wiki:bench:agent` entrypoint intentionally refuses real launches. Do not bypass or disable that guard to make a benchmark run.

## Agent-visible prompt contract

These are **templates**, not permission to execute. The host inserts the identical question in A and B and does **not** insert oracle names, links, expected symbols or answer text.

**Common instruction to both arms:**

> Read-only investigation of the supplied Offscreen RPG source snapshot. Do not modify files, invoke other agents, start providers or services, browse the network, or run mutating commands. Answer the question using the repository's current source and documents. Cite exact paths, headings or symbols you actually inspected. Distinguish selected design from implemented/tested behavior; state uncertainty and a meaningful negative case. Stop when the evidence is sufficient.

**Arm A:** append only the held-out question.

**Arm B:** append the identical held-out question, followed by this *additional* cue:

> For unfamiliar topics, navigate through the repository's product/technical owner headings using `wiki:find` and bounded `wiki:read` or direct source-map links. Follow only relevant referenced implementation files and tests; check `STATUS.md` when current realization matters. Verify the strongest negative or disqualifying case. Do not keep reading after the answer can be supported by a few exact citations.

**Both arms return:** one succinct answer, evidence citations (path#heading or file:symbol/line), selected-versus-realized classification, strongest counterexample/negative, unresolved uncertainty. The format and response-length ceiling are identical.

## Recording and review

Each host-only record needs: full SHA, dirty/snapshot state, trial/case ID, independent gold review state, arm, client/model/version, exact question hash, prompt treatment hash, session identity, fresh-context and sandbox proof, seed/order, invoked tool calls, actual file reads, wrong detours, elapsed time, client-reported tokens/cache (or `null`), cost (or `null`), terminal status and source-grounded final answer. Preserve raw receipts under gitignored `out/agent-evaluation/<sha>/`; redact secrets and do not commit real private session logs.

**Reviewer worksheet** (reviewer must not see the arm label before judging):

| Check | Values |
| --- | --- |
| Required selected product/technical claim | supported / wrong / missing / not applicable |
| Current implementation/status tier | correct / falsely claimed live / insufficient evidence |
| Required code/heading roles and alternative owners | complete / partial / wrong |
| Strongest negative or absent-feature case | handled / missed / invented |
| Proposal/archive used as current permission | critical error / no error |
| Cited source actually opened in tool trace | all / partial / unobservable |
| Overall | source-supported correct / partial / incorrect / abstained |
| Reviewer and adjudication state | independently reviewed / unreviewed / disputed |

**Report primary:** independent correctness and critical authority errors. **Secondary:** source trace validity, avoidable reads, latency and tool usage **among correct answers**. Missing token reporting stays unknown; code-path string matches do **not** replace semantic review. Six sessions, even if successful, are a feasibility pilot rather than a credible productivity multiplier.

## Abort / stop / decide

Abort without launching if the sandbox, private canary, host oracle isolation, exact session/model cap or required permission cannot be demonstrated. Stop a session on host-enforced time/call/attempt limit, unsafe tool behavior, unexpected write/network access or an unverifiable stale source. Preserve partial results and mark them incomparable when needed.

If native A already performs as well as B, favor a lean AGENTS and optional wiki tools. If B improves correctness with bounded cost, consider a small opt-in investigation skill. If both struggle with conceptual historical evidence, **propose** a separate semantic history-discovery experiment (not TypeScript embeddings by default). Do not turn this runbook into a mandatory model workflow or quietly select another Change.
