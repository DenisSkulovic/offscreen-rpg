# Standalone Task template | copy into open/YYYY-MM-DD--slug/TASK.md

**This is a template, not an active Task.** Remove examples and fill real fields. Do not create a Task to document every Composer Txx within a Change.

```md
# TASK-<local short ID> | <one observable operation>

**State:** Proposed
**Kind:** verification | maintenance | migration-apply | experiment-run | operational
**Requested by / selected by:** <owner; proposed is not selected>
**Linked Change/Design (optional):** <exact owner link, never duplicate the Change>
**Source SHA / fixture:** <exact version and relevant known hashes, or NOT-YET-KNOWN>
**Evidence destination:** evidence/runs/<dated run>/... (actual path on execution)

## Outcome and boundary
<What action is performed and what constitutes completion? No new product feature or implementation diff.>

## Environment / preconditions / permission
- <Exact environment, owner, disposable/production distinction, namespace and resource identity>
- <Explicit authorization needed for migrations, provider spend, cluster destruction, secrets or external side effects>
- <Forbid unsafe fallback, auto-upgrade, broad glob or hidden environment reset>

## Procedure
1. <Read-only preflight and matching exact source/target>
2. <Named existing command, cwd and bounded arguments; dry-run where available>
3. <Observe and reconcile authoritative state after the command>

## Acceptance and diagnostic negative
- Positive: <exact observable outcome; don't infer PASS from command exit alone>
- Negative: <failure or forbidden behavior that would falsify this run>
- Stop: <unsafe mismatch/timeout/changed target; no speculative retry>
- NOT-RUN criteria: <unmet gate recorded as such>

## Receipt and closure
<Commands, start/finish, source SHA/dirty state, actor, environment, exit code, IDs/hashes, tests/counts, negative observation, evidence links and follow-ups.>
<Done means executed and reconciled; Cancelled explains why; failures remain visible with evidence.>
```

One execution Task is normally a short `TASK.md`, not a nested `TASKS.md`, a source-map dossier, or an additional code Change. When a Task discovers a missing script, algorithm or contract, stop and propose a **separate Change**, then resume this Task after prerequisites are met. 
