# Change W19: Read-only Nest receipt endpoint for durable resolution intent recovery

**State: Specified / Proposed.** Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. This packet remains **unselected for code execution** until the owner instructs Cursor to perform it. **Source baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source inspection only; recheck current branch/worktree at execution).

**Dependencies:** W02; must be completed before W04 claims cross-reload resolution recovery.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F2 F5 F11**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G31 G12**.

## Code-bearing outcome and ownership

**Outcome:** Read-only Nest receipt endpoint for durable resolution intent recovery.  
**Source starting points:** `apps/api/src/modules/stories/controller.ts`; `packages/application/src/stories/resolution.ts`, `reads.ts`, `index.ts`; `packages/contracts/src/stories.ts`; existing persisted `story_resolution` and generation state.

## Binding implementation design

Add **GET /api/stories/:id/resolutions/:operationId/receipt**, returning a Zod-defined **minimal, owner-authorized** projection of persisted operation identity, matching story ID, admission/processing/settlement state, visible version when known and safe reason/recovery; never internal provider payloads, prompts, private documents, other owner identities or billing secrets. An unknown operation for an authorized story is 404, with no leakage about another owner's operation. Use existing durable resolution row and status fields; no new operation queue or game mechanics. The endpoint is read-only: **never** re-dispatches generation, reenqueues resolution or retries provider calls. Backend same-operation/different-submission conflict remains enforced; test actual persisted dedup. If the original input fingerprint cannot be exposed, expose a stable server-side fingerprint/`matchesRequest` check without private content. Bind receipt to owner/story/operation so frontend can distinguish 'not observed' from 'confirmed admitted'.

## Bounded implementation sequence

1. Define strict receipt DTO/error schema from current persistence and permission scope.
2. Add application read-only operation lookup and Nest GET route, minimizing SQL and joining only required committed fields.
3. Add provider-free real DB integration for owner, other owner, absent operation, accepted then completed, duplicate replay and changed payload conflict.
4. Document that 404 before in-flight commit does not prove no effect will arrive; client does **not** auto-start a new operation.

## Falsifiable acceptance

- **Normal scenario:** Previously accepted resolution with lost HTTP ACK is found by its original UUID and publicly safe pending/completed state, without another write.
- **Adversarial negative scenario:** Other owner/anonymous cannot inspect receipt; GET never charges/retries; retry with identical UUID but different payload conflicts, and an unobserved operation is not falsely declared failed.
- **Verification/evidence:** Focused real application/Nest integration using explicitly disposable database, fake provider; no live Storyteller, migrations or gameplay changes.
- **Explicit exclusions:** No replacement workflow engine, new SQL table unless truly required, provider retry, unrelated Nest refactor or new gameplay.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
