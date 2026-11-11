# Playbook: one UI feature, several specialized roles

**Example only, not a mandatory ten-stage process.** This playbook shows how a human with ChatGPT UI, Claude Code, Cursor and a limited budget can separate responsibilities while preserving coherent product intent and technical truth. Use [role orchestration](../README.md) and [assignment contract](../assignments.md).

## Example objective

"A returning player should understand current situation and pending work without a wall of telemetry, and recover safely from a failed narration request." This is **illustrative**, not an approved implementation task or new product requirement. The real goal must be approved against [player experience](../../../docs/player-experience.md) and [client/identity technical contract](../../../docs/technical/client-and-identity.md).

| Gate | Role(s) and best-fit context | Artifact / decision | Work can proceed when... |
| --- | --- | --- | --- |
| 0. Desired experience | Product strategist + UX designer, ChatGPT UI | Prioritized journey, states, non-goals; user decides | Player-visible outcome is coherent and agreed |
| 1. Current feasibility | Source investigator, read-only Claude/Explore (optional) | Real routes, server/client ownership, 3–8 source anchors, contradictions | Unknown current behavior is resolved; no code edits |
| 2. Visual proposal | Visual designer, ChatGPT UI + on-demand `ui-art-direction` and interface craft manual | Layout hierarchy, responsive states, component design direction | Owner accepts design intent, not a fabricated screenshot claim |
| 3. Independent critique | UX/visual critic in fresh context, **only if consequential** | Alternative hierarchy, accessibility/edge critique, missing states | Specific issues reconciled or explicitly accepted |
| 4. Technical contract | Frontend architect, with backend/data owner only if boundary affected | Server/client contract, loading/retry/race semantics; relevant tech-doc edits | The approved technical owner is known |
| 5. Test design | Test strategist + optional E2E designer, separate read-only context | Acceptance matrix: loading, stale reply, duplicate click, failure, a11y/viewport | Negative cases are falsifiable before code |
| 6. Implementation | Cursor fast executor, via `cursor-handoff` | One bounded UI diff + honest focused-check receipt | Contract is implemented or clear blocker returned |
| 7. Independent verification | Frontend reviewer + test executor, preferably different context | Diff findings + actual browser/test output, no false "looks good" | Important issues fixed; tests/screenshot/human review identified |
| 8. Converge | Coordinator + owner | Accepted design/technical docs, checkpoint, remaining limits | No unresolved critical contradiction or fabricated evidence |

For separate, read-only execution the installed `design-challenger` and `test-strategist` native subagents are optional. Start them only when the role assignment and tool allowance justify the extra context; do not run both merely because this example mentions them.

**Not all roles need a new process.** The product strategist and UX designer can be one ChatGPT chat; source investigator can be Cursor's built-in Explore; visual critic can be a second ChatGPT conversation; test strategist can be a separate read-only Claude subagent; Cursor implements. One tool may hold several sequential roles if independence is not at risk.

## Useful independence and parallelism

Before code: **visual critique** and **technical-source investigation** can run independently once the same UX objective is frozen; they should not change the approved objective. Then a coordinator integrates their findings into the technical contract. Unit/E2E test strategy can be prepared in parallel *after* acceptance is settled, but test code should not be written against an undecided API/UI interface.

After code: frontend reviewer can inspect the changed implementation while a **different, authorized test executor** runs tests. Both report to the integrator; neither edits the same checkout simultaneously. Human screenshot/interaction acceptance comes after actual rendering, not after reading TSX.

## Economical variants

- **Small CSS/wording change:** one design/implementation role, no independent agent; direct review in diff.
- **Ordinary UI feature:** ChatGPT UX/spec → targeted source context if needed → Cursor implementation → one focused reviewer. Add test design if complex state transitions.
- **Major UX redesign across API and UI:** product/UX + independent critique → separate frontend/backend/data feasibility → approved specs → scoped workstreams/worktrees → test design and independent verification. Owner resolves tradeoffs.

**Stop gates:** no code before approved product/technical intent; no "test pass" claim without executed check; no unapproved live provider call, browser login, DB reset, or extra subscription. If a phase uncovers a contradiction, return to its owning role; do not let Cursor silently redesign product or let an E2E runner weaken acceptance.

## Handoff illustration

```text
ROLE: Test strategist (read-only); NEXT CONSUMER: Cursor implementer
TASK: Turn the approved pending/failed Story UI contract into minimal deterministic cases.
AUTHORITY: docs/player-experience.md and docs/technical/client-and-identity.md
READ FIRST: apps/web/README.md, story-transport.ts, play/view.tsx
DELIVER: happy-path state transition, stale response ordering, duplicate submit,
         genuine uncertain-provider UI and keyboard/focus expected behavior.
NOT YOUR JOB: code edits, creating new endpoints, live provider calls, all-suite testing.
IF BLOCKED: cite the exact missing product/technical decision, then stop.
```

This packet is intentionally much cheaper than giving a coding agent the entire history of UX debates, screenshots, design alternatives and full technical documentation.
