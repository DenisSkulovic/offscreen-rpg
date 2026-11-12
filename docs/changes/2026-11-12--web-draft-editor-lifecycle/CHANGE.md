# Change W08: React Hook Form and Zod draft editing with revision-safe dirty state

> **Cursor first look (current source ≠ selected target):** [Draft editing map](../../../apps/web/src/features/stories/README.md) → the **one** owning symbol. **Primary contract:** [F8](../../engineering/targets/react-next.md#f8-creationforms-and-editing-consistency).  
> **Pre-investigated trap:** RHF future edit state must survive 409/background Query refresh; current draft code already preserves conflict text.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Closed 2026-11-12 after RTL/MSW 409 / late-response / Query-isolation proof. Architecture remains the owner-authorized [React/Next target](../../engineering/targets/react-next.md). **Source baseline at selection:** post-W05 `main` (`ddfcdd5`).

**Dependencies:** W01 W02 W15. Can proceed independently of Play work.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F3 F8 F11 F12**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G19 G28**.

## Code-bearing outcome and ownership

**Outcome:** React Hook Form and Zod draft editing with revision-safe dirty state.  
**Source starting points:** `apps/web/src/features/stories/draft-editor.tsx`; draft routes; `packages/contracts/src/drafts.ts`; API draft save (read).

## Binding implementation design

**Migrate draft editor to React Hook Form v7 + `zodResolver` using the existing strict draft-content Zod schema.** Use `mode:'onTouched'`, typed `defaultValues` per draft, meaningful `formState.isDirty`, accessible field errors and the existing multi-step form controls. Query owns saved `Draft`; RHF owns local unsaved values. On Save freeze `{draftId,expectedRevision,content}` once and run typed `useMutation`. On 409 keep user's edits and show latest server revision with explicit adopt/discard action. On success advance baseline with saved response while preserving edits typed after request (use supported RHF `resetDefaultValues` or safe equivalent). Key edit-session identity by draft not by server revision. Preserve beforeunload and deliberate in-app leave confirmation without router monkey-patching. No autosave.

## Bounded implementation sequence

1. Migrate field registration, dynamic fields if any, error mapping and dirty-state calculation to RHF; remove duplicate manual JSON.stringify field comparison.
2. Route draft reads through viewer-key Query, save through typed mutation with frozen payload/revision and conflict GET reconciliation.
3. Add 409, two-tab stale, delayed response versus newer keystrokes, route A→B, reload and keyboard focus tests.

## Falsifiable acceptance

- **Normal scenario:** Create/edit/save/reopen draft with identical fields and current appearance; field errors focus correctly and successful revision becomes saved baseline.
- **Adversarial negative scenario:** A changed draft revision or late response cannot overwrite dirty values or another draft; background Query refetch never blindly calls RHF reset.
- **Verification/evidence:** RHF/RTL+MSW tests and existing provider-free draft browser suite when authorized.
- **Explicit exclusions:** No gameplay work, form layout redesign, local private draft storage, autosave, new content features.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
