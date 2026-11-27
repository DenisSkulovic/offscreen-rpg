# Cursor model-budget policy

**Scope:** this policy applies only when the Cursor client is selected. It is not a universal model allowlist. Do not weaken the allowlist or rename executable model identifiers. Engineering roles, task readiness, acceptance and Git integration stay in [AGENTS.md](../AGENTS.md), the [task execution standard](../.agents/references/task-execution-standard.md) and [implementation coordination](../.agents/references/bounded-parent-orchestration.md).

**Status:** selected operational policy, not product architecture. Measure quality and billing before claiming savings. Owner direction 2026-11-19 superseded the earlier default-Grok routing. The approved model identifiers below are unchanged.

## What Cursor is responsible for

When Cursor is the implementation client, its coordinator and workers perform the implementation agent's work: the selected design, specified deterministic proof tools, focused unit and contract tests, changed-file quality checks, proportionate cheap local integration checks, and a coherent implementation receipt. Heavy acceptance stays with the acceptance lead and the owner: broad builds and suites, infrastructure lifecycle and fault recovery, multi-service, browser and end-to-end exercises, release upgrades, and long or costly probes. The planner specifies the exact commands, target, prerequisites, expected outcomes, timeouts, stop and cleanup, and evidence. The owner runs that authorized batch and the planner interprets it. No heavy acceptance in Cursor unless the owner explicitly delegates that named proof. Elapsed time is not a reason to skip an essential focused negative test.

The planner settles source, ownership, the edit and the negative test before dispatch. A Cursor worker does not invent that design or run a broad investigation. If novel reasoning is unavoidable, stop and return it to the planner before paying Cursor to explore. **No automatic upgrade.**

## Only permitted model variants

| Route | Explicit configured model | Decision |
| --- | --- | --- |
| **A UTILITY** | auto | Bounded low-reasoning utility mission used chiefly to keep mechanical or repetitive context out of the coordinator: Git reconnaissance, status and diff collection, deterministic file and link sweeps, repetitive pre-specified documentation edits, exact command sequences and factual receipt gathering. No architecture or product decisions and no ambiguous diagnosis. |
| **C DEFAULT** | composer-2.5[fast=false] | Implementation coordinator; substantive PATCH and INVESTIGATE; focused multi-file slices; source-grounded SQL, Temporal, auth and state edits **when a complete preapproved algorithm, constraint and test are supplied**. |
| **L EXCEPTION** | grok-4.6[effort=low,fast=false] | Owner explicitly authorizes one named bounded task **after** C failed for a documented reason, or the planner identified an irreducible, justified implementation uncertainty. |
| **M EXCEPTION** | grok-4.6[effort=medium,fast=false] | Owner explicitly authorizes a specified correctness-sensitive novel diagnosis or independent adversarial review after planner investigation, or C and L are demonstrably insufficient. Never the ordinary implementation default. |

**Composer 2.5 Standard is the normal coordinator and the normal substantive worker. Auto is only the A UTILITY route. Expensive Grok execution is an exceptional, explicitly owner-approved route.**

Never use Grok 4.7, Grok High or XHigh, Fast, Inherit, unlisted models, silent substitution or automatic effort escalation. Using Auto for substantive implementation, design or open-ended diagnosis is a policy violation. **Grok remains on the subagent allowlist because there are legitimate exceptions. The hook cannot confirm an owner approval from the fields it currently sees.** A successful guard invocation proves the model is on the allowlist, **not** that the policy justified it. A dispatch receipt must record the exception approval and the actual model, or it is a policy violation.

**The coordinator model is selected manually in Cursor.** Repository files and the subagentStart hook cannot change the parent model dropdown or constrain internal calls that do not invoke the hook. The coordinator must start as Composer 2.5 Standard where Cursor supports it. If that variant is unavailable, report the limitation before launching an expensive session. Built-in Explore is pinned to Composer 2.5 Standard or is not used. Built-in and custom agent routing must not silently circumvent this policy. Agents whose metadata says `inherit` must not be auto-routed onto an unknown profile.

## How this client dispatches

Follow the shared [dispatcher contract](../.agents/references/bounded-parent-orchestration.md#0a-budget-first-composer-dispatcher-contract-2026-11-21) and the portable [task card](../.agents/references/task-execution-standard.md#tasksmd-format). Cursor adds only the model choice:

- The coordinator is Composer 2.5 Standard, Fast off.
- The first substantive PATCH goes to the Composer implementer. A truly trivial, locally obvious edit may stay with the coordinator. Do not chain substantive direct implementations.
- A noisy mechanical chore goes to the Auto utility worker. The coordinator consumes the compact receipt.
- An evidence runner is optional. It is not a second mandatory agent for every patch.
- On a material mismatch, stop with one concrete file, symbol and error. The planner refreshes the packet. Do not pay Grok to rediscover a stale handoff.

Cursor dispatch metadata, kept beside the portable card and not inside it:

```text
MODEL=Composer 2.5 Standard
DEPTH=PATCH
```

Record the actual selected model and speed, or say they are unverified. Record Cursor tokens and charge only when the usage surface actually shows them. Do not fabricate costs. This policy and the hook test do not prove billing enforcement.

## Subagent roster (pin actual file metadata)

| Role | Normal model | Scope |
| --- | --- | --- |
| utility-worker | **Auto** | Cheap context-isolation worker for bounded deterministic chores. Stop on ambiguity. |
| economical-implementer | **Composer 2.5 Standard** | Default code patch, including a small contract, SQL or worker slice with an exact design and tests. |
| economical-researcher | **Composer 2.5 Standard** | Narrow lookup when an unresolved question really requires the live workspace. |
| evidence-runner | **Composer 2.5 Standard** | Run the exact authorized command and return a factual receipt. Do not fix by default. |
| documentation-integrator | **Composer 2.5 Standard** | Update ratified docs, links and the Change ledger with named owners. |
| failure-localizer | **Composer 2.5 Standard** | One failing stack or result, one root cause and a proposed correction. No code. |
| careful-engineer | Grok 4.6 Medium **exception only** | A named, owner-authorized high-risk implementation or diagnosis. |
| boundary-reviewer | Grok 4.6 Medium **exception only** | A named independent adversarial diff review. Not mandatory per Change. |

`design-challenger` and `test-strategist` use inherit and are **not approved for automatic invocation**. Do not use them until their model is explicitly pinned and the owner asks. Prefer an independent review context that already satisfies the shared review rule.

## Execution depth is not model price

- **VERIFY:** execute the exact named safe command or fixture and report pass, fail or NOT-RUN and side effects. Composer 2.5 Standard for normal and high-risk verification. An approved database and a clean test environment make a command safe. The model name does not.
- **PATCH:** follow a selected task with settled behavior and an explicit test. Composer 2.5 Standard for low-risk and complicated domains alike, when the task is actually bounded and precise.
- **INVESTIGATE:** only when the live environment can answer a narrow question the planner cannot inspect. Composer 2.5 Standard. If the question needs architecture reasoning, return it to the planner.

Model selection is not a proxy for safety. Precondition gates, resource authority, test-database scope and stop rules apply to every model.

## Guard, manual settings and what they do not prove

- [Guard](hooks/model-budget-guard.cjs) permits Auto for the A UTILITY route and Composer 2.5 Standard for normal substantive children. It permits Grok 4.6 Low and Medium Standard only when the hook process has `OFFSCREEN_CURSOR_ALLOW_GROK=owner-approved` after the owner approves a named exceptional task. That flag is an opt-in convenience, not cryptographic approval, and it cannot prove what the parent model picker or the billing system used. Never commit secrets or leave a blanket opt-in permanently enabled.
- The guard fails closed on an ambiguous model or speed. [Guard tests](hooks/model-budget-guard.test.cjs) validate input parsing. They do not prove Cursor billing or fallback behavior.
- Do not run the coordinator on Auto. The hook sees `subagentStart`, not every in-product model use. Inspect task cards and the usage dashboard for the billed variant.
- If a cheap attempt causes retries, extra context, missed tests or owner correction, report the total spend including rework.

**Owner command:** the planner spends the reasoning. Cursor spends the editing and test tokens on the models above. The cheapest durable result is the one that is correct and does not need to be written twice.
