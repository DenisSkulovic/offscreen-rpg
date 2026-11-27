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

## What this client does not enforce

Claude Code's subagent `model` field selects an alias when the product honors it. This repository does not install a hook that rejects other models, and it does not observe billing. A frontmatter alias is policy, not proof that a session was billed at that alias. Parent model selection remains a manual session choice. Start a coordinator session on Sonnet.

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
