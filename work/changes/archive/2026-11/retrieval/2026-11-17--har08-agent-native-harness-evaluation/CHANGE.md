# HAR08 | Agent-native harness effectiveness preflight

**State: Done (2026-11-17).** **Executor:** Cursor. Preparation is verified. The live trial is not authorized. **Authority:** [agent-native evaluation decision](../../../../../designs/open/repository-agent-workbench/AGENT-NATIVE-EVALUATION.md). Developer-harness-only work. **No live agent/model runs were performed.**

## Cursor first screen

**Outcome:** Prepare a genuinely fair **A: native agent investigation versus B: same agent with explicit harness-navigation cue** experiment, with actual source/cost receipts and independently adjudicated answers. Reuse existing [WIKI03](../2026-11-16--wiki03-isolated-agent-evaluation/CHANGE.md) fake-only harness. This is not HAR08 “improve deterministic search frontiers”; that earlier idea was rejected.

**Start:** fresh full SHA + dirty status, root AGENTS, this Change, design decision, `scripts/repo-tools/wiki-bench-agent.mjs`, `wiki-core/agent-harness.mjs`, `agent-trace.mjs`, `agent-score.mjs`, `agent-self-test.mjs`, context-economics and the relevant source maps. **Inspected design baseline:** `9f0d2dac68ab26b4ea7c47bb64879181411cba91`; recheck live main before writing.

**No automatic agent session, provider, subagent, API/paid CLI, vendor install, Docker, production/DB test, code search index, model download, or game/product code change.** No new default search tool. HAR05 stays independent Verifying.

## One bounded implementation outcome

1. **Review and complete the already drafted read-only trial runbook** at `docs/runbooks/agent-native-harness-evaluation.md`: exact A/B prompt difference, six candidate task categories, three-case pilot sampling, identical client/model/settings, context reset, pinned SHA, isolation, independently reviewed oracle, answer template, blinded grader worksheet, stop rules, costs/unknowns. Do not include expected source names in agent-visible question prompts.
2. **Reuse WIKI03, not rebuild it.** Extend its fake trace normalizer/refusal checks only if required for A/B pairing, SHA, session freshness, permission violations or evidence completeness. If existing fake harness already supplies something, **document reuse** rather than implementing the same capability again. Use gitignored `out/agent-evaluation/` for host-only gold and receipts. No new package unless a missing bounded test genuinely requires it.
3. **Prepare six new tasks**, previously unseen by the existing HAR gold suites, including implementation, authority/realization, history/cross-domain and absent-feature negatives. Independently check oracle source at the pinned SHA; if no independent reviewer is available, label **unreviewed** and disallow verified score claims. Do not publish oracle or gold paths to the agent's accessible snapshot/index. If public documentation of the procedure would disclose cases, keep the private task texts under ignored `out/`.
4. **No-model preflight and negative fixtures:** prove that mismatched SHA, resumed session ID, inaccessible real gold/canary, unsafe write access, unknown client, missing exact model, missing usage policy, and missing enforced session/time/tool caps fail closed. Ensure missing reported tokens are **null**, not zero, and no normal `pnpm` command probes/spawns the installed model CLI.
5. **Readiness report:** give actual client/model/version information *only if safely inspected and permitted*, number of candidate and independently reviewed cases, what the host can enforce, sandbox/canary result, exact tests run/skipped, unresolved blockers, source SHA, and one clear later authorization request. A partial result with `sandbox: unproven` is more correct than a fake “ready”.

## Trial contract, for later owner authorization only

- At most **3 held-out cases × 2 arms = 6 fresh read-only sessions**, sequential, one client/model. Same unmodified source snapshot, tools, default instructions and prompts except one compact B cue. Record ordering seed and any unobservable client cache.
- Suggested caps to confirm: 8 min + 20 tool calls per trial, host-enforced or launch prohibited. Max attempts explicitly specified, and budget/usage policy matched to the client. A subscription's opaque usage bar is not a guaranteed dollar cap.
- Primary grading: independent completeness, appropriate authority/realization, no permission hallucinations and right negatives. Secondary: verified citations and actual file opens, elapsed, wrong detours, tool calls, measured model tokens if exposed. Correctness must not be traded for speed.
- **Do not invoke a model under HAR08.** If the approved run eventually happens, keep it as a separately authorized, exact-session act with its own receipt; no new always-on service.

## Acceptance and hard negatives

- A and B exposure differs **only** by the short navigation cue. Existing AGENTS/CLAUDE remain active in both, so this measures marginal explicit use, **not total wiki causality**.
- A/B manifest shows same full SHA, client/model, source set, permissions, fresh-session identities, task wording, cap and recorded trial ordering; no leaked previous trial results.
- Missing CLI sandbox, allowed writes or access to canary/gold causes refusal; no “but the prompt says read-only” exception. Negative fixture required.
- Unreviewed author-written oracle remains diagnostic; a script string match cannot certify semantic answers, and an uncited/unread file cannot be silently treated as observed source.
- Usage and cache tokens not reported are **null**. Existing WIKI03 fake self-tests still complete. No model CLI is invoked.
- HAR03/HAR06/HAR07 archives and source/game docs remain untouched. HAR05 remains separate.
- **Done** for this packet = verified experimental preparation, **not** model performance or adoption.

## Test and closure

```bash
pnpm wiki:bench:agent --self-test
pnpm wiki:bench:agent --dry-run
pnpm repo:brief --json
pnpm wiki:find --self-test
python scripts/check_docs.py
```

Any additional small preflight test must remain provider-free. Do not automatically run a live CLI. Log exact commands, results, skipped checks and their reasons.

Complete the reconciliation ledger, update docs/runbooks/README.md and .agents/README.md if new workflow is documented, reconcile STATUS and the workbench map, then archive under `work/changes/archive/2026-11/other/` only when the preflight really passes. If blocked, leave HAR08 open and name the blocker.

## Preparation result

Commands completed on the dirty preflight tree, then the self-test is re-run after this close so the host oracle matches the close SHA: `pnpm wiki:bench:agent --self-test`, `pnpm wiki:bench:agent --dry-run`, `pnpm repo:brief --json`, `pnpm wiki:find --self-test`, and `python scripts/check_docs.py`. Dry-run kept `cliProbed: false` and `realLaunch: refused`. No model was called.

WIKI03's fake trace, score, snapshot and launch refusal are reused. The new gate refuses a SHA mismatch, a resumed or reused session, a prompt that contains a gold path, a writable sandbox, a readable canary, an unknown client, a missing model, a missing usage policy, or a missing time/tool/attempt cap. A filled-in gate still refuses, because this packet does not authorize a launch. Unreported token counts stay null; a reported zero stays zero. Six candidate tasks are host-only, distinct from the older wiki and funnel questions, and `review: unreviewed`. `verifiedCount` is 0.

Installed binaries, version flags only: Cursor `3.30.14` and Claude Code `2.1.322`. Neither command named a model. No model is selected. `sandbox: unproven`. The snapshot reader cannot open `out/agent-evaluation/` or a canary outside its directory. This Windows process can still read a file in the user temp directory, so that check is not an OS sandbox.

Files named for the close check: `scripts/repo-tools/wiki-core/agent-native-preflight.mjs`, `scripts/repo-tools/wiki-core/agent-fixtures/har08-tasks.mjs`, `scripts/repo-tools/wiki-core/agent-harness.mjs`, `scripts/repo-tools/wiki-core/agent-trace.mjs`, `scripts/repo-tools/wiki-core/agent-self-test.mjs`, `docs/runbooks/agent-native-harness-evaluation.md`, `.agents/README.md`, `STATUS.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`, and `work/designs/open/repository-agent-workbench/README.md`, `work/designs/open/repository-agent-workbench/AGENT-NATIVE-EVALUATION.md`, and `work/designs/open/repository-agent-workbench/EVALUATION.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product or technical game behavior impacted | none | unchanged: the preflight records a future comparison and does not change gameplay or Storyteller rules | scripts/repo-tools/wiki-core/agent-native-preflight.mjs | fixture-tested | a complete gate still refuses a launch | N/A |
| docs/runbooks/agent-native-harness-evaluation.md | evidence | changed: the runbook records the A/B gate, the unreviewed host oracle, and the unproven Windows sandbox | docs/runbooks/agent-native-harness-evaluation.md | source-observed | gold paths stay out of the agent-visible prompt | docs/runbooks/README.md |
| .agents/README.md | evidence | changed: the command list says the self-test checks the gate and does not probe a model CLI | scripts/repo-tools/wiki-bench-agent.mjs | fixture-tested | dry-run reports cliProbed false | .agents/README.md |
| STATUS.md#orientation | evidence | changed: orientation records a verified preflight and does not claim a model trial | STATUS.md | source-observed | zero tasks are independently reviewed and the sandbox is unproven | STATUS.md |

**Next separate gate:** name one client, the exact model, the attempt count, enforceable time and tool caps, a usage policy, and an OS sandbox that cannot read a canary outside the snapshot. Suggested size remains 3 cases times 2 arms, 8 minutes and 20 tool calls, and it is not approved. A subscription meter is not a dollar cap.
