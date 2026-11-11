# Change execution plan (only if needed)

Change: link to CHANGE.md.
State: Proposed / Ready / Implementing / Verifying / Blocked / Done / Cancelled.
Execution scope and code-bearing outcome: [one approved result, not an initiative].
Implementation owner and independent review: [assigned roles if necessary].
Permission: [current human approval; provider/DB/deploy actions separately authorized].

## Phases

For each **bounded code/test/configuration slice**:
- Intended outcome and dependency.
- Real source owner(s), or a required reinspection gate.
- What behavior and contract must remain unchanged.
- Exact implementation delta (no unrelated architecture rewrite).
- A focused success/negative test, verification cost and safety constraints.
- Completion evidence and status.

Detail only the next ready slice. **Evaluation-only, design-only and documentation-only tasks belong in their own owners**, not as pretend coding phases. For a small task, CHANGE.md alone is normally enough, unless selected `pnpm repo:brief` compatibility requires this file.

## Current checkpoint

- Current phase and exact next permitted action:
- Inspected source revision, changed files and meaningful worktree state:
- Actual checks/results at that revision; unexecuted checks:
- Unresolved decision or blocker and who owns it:
- Provider/DB/deployment side effects and certainty:

Rewrite this checkpoint instead of appending chronological tool output. Close the packet after evidence reconciliation and remove it from the active route; keep important accepted decisions in permanent specifications.
