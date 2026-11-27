---
name: implementation-handoff
description: Format one approved Change into a bounded implementation launch with exact authority, files, the assigned proof boundary and no implicit product decisions. No implementation.
---

# Implementation handoff

**Use:** format the launch for one source-grounded, reviewed Change. Do not implement it and do not commission it. Follow the [submission standard](../../references/planning-artifact-quality.md), [packet readiness](../../references/packet-readiness-review.md) and [implementation coordination](../../references/bounded-parent-orchestration.md). Missing decisions return to the planner or the contract owner. Verify the exact target, prerequisites, readiness and owner commission before recommending dispatch.

The canonical task card is client-neutral. The coordinator applies the selected client's model policy when it dispatches. Cursor: [.cursor/MODEL-POLICY.md](../../../.cursor/MODEL-POLICY.md). Claude Code: [.claude/MODEL-POLICY.md](../../../.claude/MODEL-POLICY.md).

## Source of truth

Use the selected Change, accepted canonical headings, exact source and contract sections, and the current baseline. No duplicate summary, no legacy FEATURE or PLAN authority, and no pasted investigation. Root instructions always apply. Avoid a redundant preload when they are already loaded. Each Change has one accountable coordinator; a named batch session may hold distinct coordinator responsibilities for several Changes under the shared [batch-dispatch rule](../../references/bounded-parent-orchestration.md#named-multi-change-dispatch). A worker owns one bounded T-ID. Do not turn a multi-Change launch into one full autonomous subagent per Change by default. Heavy acceptance belongs to the acceptance lead and the owner unless a named proof is specifically delegated.

## Deliver this bounded packet

```text
CHANGE: <ID/path, kind, selected outcome>
TARGET/BASE: <branch, SHA, worktree/guard>
COMMISSION: <actual authorized scope and prerequisites>
FIRST: <T-ID or exact eligible wave; task-specific contract/anchors>
BOUNDARIES: <write/resource owners, excluded/forbidden actions>
CHECKS: <assigned command/cwd, or none — source gate and downstream proof owner>
ACCEPTANCE: <acceptance lead, remaining proof, stop/closure>
RETURN: <committed SHA, actual results, precise blocker or handoff>
```

Do not copy every card to a worker. Use the [canonical T-ID format](../../references/task-execution-standard.md#tasksmd-format). For VERIFY, specify the command, target and working directory, prerequisites, exact permission, safe stop and factual receipt. For a documentation-only change, state the exact heading and links, the preserved selected claims, the semantic negative, and that code is unchanged. For frontend work, use [frontend engineering](../frontend-engineering/SKILL.md) only where it is relevant.

Readiness is not commission. Ordinary frozen dependency gates need verified postconditions, not a repeated planner approval. The implementation agent may diagnose a specific local failure and make a scoped mechanical edit. It may not choose architecture, broaden permissions or silently upgrade models. If the necessary worker context or scope exceeds the submission budget, repair or repartition before launch. The coordinator follows the [execution procedure](../../references/bounded-parent-orchestration.md), commits the assigned implementation and cheap proof, and either hands off heavy proof or closes an accepted outcome. No successor selection.
