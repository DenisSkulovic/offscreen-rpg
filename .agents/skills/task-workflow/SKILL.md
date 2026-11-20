---
name: task-workflow
description: Prepare, execute or reconcile one independently tracked operational Task (verification, migration application, maintenance or bounded experiment) without turning it into a code Change.
---

# Standalone Task workflow

**Start:** [work taxonomy](../../../work/WORK-TAXONOMY.md) → [single selection queue](../../../work/QUEUE.md) → [Task catalog/template](../../../work/tasks/README.md). This procedure is for one **independently tracked operational run** with no intended lasting source or normative-document diff. A Change's internal Composer `TASKS.md#Txx` stays in that Change, not here.

## 1. Classify and prepare

Use a standalone Task when running an existing test/command, approved migration, bounded chaos experiment or maintenance operation merits its own selection, environment guard, reproducible result or dated evidence. Do not create a folder for every test during a Change. Do not invent a new Task if an existing selected Change already owns the exact verification step.

Create `work/tasks/open/YYYY-MM-DD--slug/TASK.md` from [TEMPLATE.md](../../../work/tasks/TEMPLATE.md), link it from `work/tasks/open/README.md` and set its state to Proposed/Ready/Blocked as supported. The packet specifies exact source SHA and recipe, target actor/environment, inputs and harmless/billable/destructive classification, permission, positive plus meaningful negative, stop rule and evidence destination. **Only [work/QUEUE.md](../../../work/QUEUE.md) can select it**. A Ready Task is not automatically selected or permitted.

## 2. Execute with bounded context

The default Cursor coordinator and normal subagent are Composer Standard. Provide this one `TASK.md` and 2–5 needed source/command anchors. Reverify exact target identity and resource permission before a mutating command, use a dry-run/read-only preflight when available, and stop rather than guess if its contract is stale. No provider spend, valuable DB reset, Pod deletion, cloud mutation or unapproved migration merely because a Task says to run one.

When a Task reveals a required source change, **stop and propose a Change** in `work/changes/`; it is not a license to implement the fix in the operational Task. Do not retry an ambiguous irreversible operation without a documented idempotency/reconciliation rule.

## 3. Prove and retire

Record exact commands/cwd, Git SHA/dirty status, start/end, actor, resource and version identifiers, normal/negative observations, failures and NOT-RUN gates in the authoritative [evidence](../../../evidence/README.md) collection. An exit code zero does not prove a story scene was published, a migration was applied safely, or a chaos run preserved state.

After a verified terminal outcome, set `Done` or `Cancelled` with reason and evidence link; move Task packet to `work/tasks/archive/YYYY-MM/<leaf>/TASK.md`; update open/archive indexes and clear its selection in `work/QUEUE.md` (only if selected). Preserve evidence, negative results and original links. **Failed/Blocked work stays open** with exact next action, rather than being renamed into a “Completed” folder.

**Repository guard:** `pnpm repo:maintenance --strict` checks Task routing, selector identity, orphan packets and terminal/open placement; `pnpm repo:brief` reports the one selected Change or Task. Maintain source-specific runbooks if an operation has special recovery requirements. No duplicate queue, no second product truth.
