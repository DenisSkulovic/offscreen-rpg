# Change W09: Query-driven preview generation and immutable Start story intent

> **Cursor first look (current source ≠ selected target):** [Opening/Start map](../../../apps/web/src/features/stories/README.md) → the **one** owning symbol. **Primary contract:** [F5](../../engineering/targets/react-next.md#f5-one-recoverable-mutation-model).  
> **Pre-investigated trap:** `storyId.current` survives retry but Start body is reconstructed; freeze full body/ID, GET-by-story before replay.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Owner authorized via continue after W08. Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. **Source baseline:** post-W08 `main` (`370bf3f`).

**Dependencies:** W01 W02 W15. W19 is not needed for Start's GET-by-story recovery.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F3 F5 F8 F11**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G11 G19 G28**.

## Code-bearing outcome and ownership

**Outcome:** Query-driven preview generation and immutable Start story intent.  
**Source starting points:** `apps/web/src/features/stories/opening-preview.tsx`; preview route; `packages/contracts/src/openings.ts`, `stories.ts`; Nest openings and Start (read).

## Binding implementation design

Move latest opening GET into viewer/draft-keyed **`useQuery`**, polling while pending/running with bounded policy; use typed **`useMutation`** for generation (202) and **separate** Start (200). Capture Start envelope **once**: `{viewerId,draftId,storyId,candidateId,expectedDraftRevision,campaign:{mechanics,locked,pace,startPackage}}`. Persist only minimal versioned nonsecret envelope in sessionStorage with a **24-hour TTL** keyed by viewer and story plus existing `?story=UUID` anchor; on reload GET `/api/stories/:storyId` first, never automatically PUT Start. Current settings changes cannot alter an uncertain captured request. Repeat exactly original frozen body only after explicit user recovery; if different viewer, corrupted capture or ambiguous persisted record, block unsafe retry. Generation provider uncertainty never triggers automatic paid retry. Keep appearance/player flow unchanged.

## Bounded implementation sequence

1. Define strict generation/Start DTOs, typed Query key and separate mutation state machines.
2. Implement immutable start envelope, GET-first reload reconciliation, same-key manual retry and cleanup on logout/terminal outcome.
3. Remove manual preview timer loops where Query lifecycle covers them; preserve bounded pending/recovery semantics.
4. Controlled tests: lost ACK after commit, speed/locked changed then retry, invalid or missing sessionStorage, 409 candidate, different viewer, pending generation and no POST on mount.

## Falsifiable acceptance

- **Normal scenario:** Reviewed opening starts the correct candidate; reloading a committed story recovers it from its original UUID with zero additional generation.
- **Adversarial negative scenario:** Changed start settings under uncertain outcome cannot change previously submitted body or double-start story; provider-uncertain state never fires a new generation automatically.
- **Verification/evidence:** RTL+MSW defer/reload and real provider-free Start integration; no live model runs.
- **Explicit exclusions:** No new Start backend endpoint, no UI redesign, no local prose cache, no generic persisted mutation queue.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
