# Claude Code execution and model policy

**Scope:** this file applies only when Claude Code is the selected client. It does not redefine engineering roles, acceptance, architectural authority or repository safety. Those stay in [AGENTS.md](../AGENTS.md). Shared dispatch and task cards stay in [implementation coordination](../.agents/references/bounded-parent-orchestration.md) and the [task execution standard](../.agents/references/task-execution-standard.md).

**Status:** owner-directed defaults for this client, recorded 2026-11-27. These are routing preferences, not measured costs and not a comparison of model quality. Claude Code 2.1.332 help and the local binary accept the stable aliases `haiku`, `sonnet`, `opus` and `fable` (plus a full model id). This policy uses `haiku`, `sonnet` and `opus` only.

## Model routing

| Responsibility | Alias | When |
| --- | --- | --- |
| Implementation coordinator | `sonnet` | One commissioned Change: sequencing, diff review, receipts, closure. |
| Substantive implementation worker | `sonnet` | One bounded PATCH with a settled algorithm and tests. |
| Mechanical utility worker | `haiku` | Deterministic chores: status, link sweeps, pre-specified edits, exact command sequences. Stop on ambiguity. |
| Focused evidence runner | `haiku` | Run an exact authorized command and report the factual result. If judging the result needs interpretation beyond the card, the Sonnet coordinator does that judgment. |
| Narrow failure localization | `sonnet` | One failing command or assertion. Read-only. No patch. |
| Documentation integration | `haiku` or `sonnet` | Haiku for a mechanical link or wording edit that is already specified. Sonnet when the edit changes a technical claim. Use the utility worker or the implementer. There is no separate documentation agent. |
| Exceptional advanced reasoning | `opus` | One named task the owner explicitly approves. Never the default. |

Do not silently substitute `fable`, a full dated model id, or an inherited parent model for the rows above. If the selected alias is unavailable in the running Claude Code build, stop and report the limitation. Do not guess a replacement.

## Next-run implementation experiment (2026-11-27)

Use a fresh Sonnet terminal session for a named implementation batch. The main session owns sequencing, shared factual preflight if useful, diff acceptance, and Git/closure; follow [named multi-Change dispatch](../.agents/references/bounded-parent-orchestration.md#named-multi-change-dispatch). Use the existing native `implementer` for one bounded substantive T-ID, `utility-worker` for nontrivial deterministic chores and `evidence-runner` for assigned factual checks. Do trivial commands/edits directly. Do not use `general-purpose`, `Explore`, teams or a second supervisor as the routine implementation route; choose an exception only for a concrete task whose needs the named agents cannot meet and explain it before dispatch. Do not silently substitute a different model, or delegate the whole Change packet to a worker. If a named agent is unavailable, report it and use permitted bounded direct work or stop the affected assignment.

For this experiment, use the following session-local launch from the repository root (Claude Code v2.1.217 or later; confirm the installed version and loaded agent roster). The three-slot limit is a ceiling, not a dispatch target. Start with one representative task for a repeated pattern, use one or two workers for a small batch, and expand to three only for useful independent tasks. No nesting. Avoid queuing more workers behind the cap or spawning replacements for routine receipts.

```bash
CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=3 \
CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1 \
claude --model sonnet
```

These documented environment variables constrain ordinary Agent-tool spawning, not total session tokens, spending, resumed workers or other sessions. Do not enable agent teams or bypass permission controls for this experiment. Do not change global settings, add hooks or use arbitrary token/time cutoffs to skip required proof. If the batch uses existing worktrees created before this policy revision, read the updated policy in the primary checkout, apply its execution guidance to the existing authorized branches, and do not merge or copy policy files into those branches merely to refresh instructions.

For this opt-in comparison, capture `/usage` before and after the assignment and include the actual model/agent types, number of launches and repair passes, accepted outcomes, elapsed time and unavailable measurements in the ordinary final receipt or chat. Do not create a metrics file or another review gate. Compare similar accepted work and distinguish five-hour/weekly allowance from API-equivalent estimates. One smaller follow-up is not a controlled A/B benchmark. Revisit the experiment after observing actual quality and usage; the cap does not establish savings.

## What this client does not enforce

Claude Code's subagent `model` field selects an alias when the product honors it. This repository does not install a hook that rejects other models, and it does not observe billing. A frontmatter alias is policy, not proof that a session was billed at that alias. Parent model selection remains a manual session choice. Start a coordinator session on Sonnet; an owner may explicitly select Opus for exceptional advanced reasoning. The temporary session-local spawn limits above do not enforce a token budget.

Official subagent notes warn that a parent in an automatic or bypass permission mode can override a subagent's `permissionMode`. Tool allowlists are the control this repository actually sets. No agent here uses `bypassPermissions`.

## Native agents

| Agent | Model | Tools | Writes |
| --- | --- | --- | --- |
| `implementer` | sonnet | Read, Grep, Glob, Edit, Write, Bash | Commissioned paths and focused tests only. |
| `utility-worker` | haiku | Read, Grep, Glob, Edit, Write, Bash | Pre-specified mechanical edits only. |
| `evidence-runner` | haiku | Read, Grep, Glob, Bash | No file edits. |
| `failure-localizer` | sonnet | Read, Grep, Glob, Bash | No file edits. |
| `design-challenger` | sonnet | Read, Glob, Grep | No. Explicit request only. |
| `test-strategist` | sonnet | Read, Glob, Grep | No. Explicit request only. |

Workers do not commission more work, merge branches, run heavy acceptance, read secrets, authorize paid application calls, or perform destructive operations. A client limitation is not permission to skip ownership, correctness or safety gates. Independent review still needs an independent context when the shared procedure requires one.

Direct execution by the coordinator is the right path for a trivial edit. Do not spawn a worker to satisfy a ritual.
