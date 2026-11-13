# UX12 | Plan a little ahead, without operating a workflow engine

**State:** Done (2026-11-13). **Approval:** Owner authorized continuing the UX sequence; Cursor landed UX12 Plan ahead presentation for existing finite successors. **Kind:** frontend interaction/composition and focused tests. **Parent:** [Experience implementation program](../../experience/implementation-program.md), M1/M2. **Dependencies:** UX03 and UX04 (Done). **Current engine:** bounded accepted successor plans already exist; a general standing routine does **not**.

## Cursor first-screen brief

> **Current-source map:** [Play owner map](../../../apps/web/src/features/play/README.md); inspect `ui/campaign-offer.tsx`, `model/use-offer-path.ts`, `ui/campaign-activity.tsx`, `api/use-campaign-command.ts`, `packages/contracts/src/campaign.ts` and accepted-plan controls. Check current source because Cursor was modifying the repo during design.
> **Primary target:** [Offscreen handoff](../../experience/flows/offscreen-handoff.md#level-2--authorize-a-short-bounded-itinerary-near-term-where-engine-supports-it), [autonomy limits](../../experience/patterns/autonomy-and-absence.md) and [choice semantics](../../experience/patterns/choice-surface-decision-rules.md#p4-change-existing-accepted-commitment).
> **Known trap:** the current `CampaignOfferPanel` places “Add as a later activity” on each option and asks for “Successor horizon in fictional seconds.” An action with `successorPaths` is **one immutable accepted plan**, not separate guarantees that future steps will complete.
> **Scope:** **Authorized for UX12.** Recompose **currently supported** finite accepted plans. No new auto-agent, no plan-loop mechanic, no automatic character choices, no hidden permission changes, no model costs.

## Desired product behavior

A player who is **already in a quiet situation with valid opportunities** may deliberately choose **Plan a little ahead**. A focused experience translates technical successor arrays into a small human intention:

> “Secure the loose tools; then return to the beacon repair. Stop at the agreed time limit, or earlier if a decision is required.”

The planning flow is optional. One selected activity alone is still a direct choice; leaving the tab after its acceptance shouldn't need a second confirmation. Planning cannot become a compulsory chore in every scene.

## Independent alternative and why rejected

**Alternative:** keep the existing inline Add as later activity and horizon input, polish them with better CSS. It is easy to implement and exposes technical flexibility, but makes ordinary fiction read like an admin scheduler. It also encourages players to think a successor is guaranteed and to add unrelated activities to dramatic decisions.

**Chosen:** a separate, bounded **Plan ahead** task surfaced when useful, with concise readable steps, a visible stop condition and one explicit final acceptance. On mobile it can be a dedicated sheet/subview. On desktop it may be a focused layer, not a permanent queue sidebar.

## User flow

1. **Eligibility and entry.** A quiet/current situation has an authored selection of compatible plans/actions. Show “Plan a little ahead” once if actual public data and current rules support it. Do **not** show it universally or during a controlling unresolved encounter.
2. **Choose first action.** E.g., “Secure tools.” It has not started merely because it is highlighted.
3. **Add next intentions.** Select up to the supported finite maximum of valid successor paths, in order. These are *conditional future attempts*, not completed tasks or reservation of every resource.
4. **Choose a human-readable limit.** Present duration/stop options using the campaign's actual world-time definitions and admitted horizon. It may be “For up to 4 in-world hours” or a content-defined cycle, not a raw number input in fictional seconds. Never invent Earth time/calendar for a nonhuman world.
5. **Review the plan.** Show first/current task, ordered following intentions, limit, known risks and resources, how later eligibility is rechecked, what happens at interruption, and exactly which action can be changed/canceled after acceptance.
6. **Accept once.** One frozen `actionCommand` with `offerId/path/successorPaths/horizonGameSeconds`, expected story revision and normal idempotent command lifecycle. Disable competing submission while pending without erasing the review.
7. **During progression.** Now shows the actually running step, its earned progress, then the next step as *conditional*. No extra “Continue” click between already admitted eligible legs.
8. **On interruption.** Decision takes precedence. Current work is stopped as applicable, future steps remain pending/blocked; no invisible default action.
9. **On return.** Show completed actual steps, still-active one, blocked/canceled pending steps, and clear reason for stop.
10. **Cancel future steps.** “Cancel remaining steps” affects only the supported pending successors. Explain whether current activity continues. Do not call this “Abandon job.”

## Proposed schematic

```text
PLAN A LITTLE AHEAD

1. Begin with
   [Secure the loose tools ▾]

2. Then, if still possible
   [Resume beacon repair · 3/9 already earned ▾]
   [+ Add another step]  (only when admitted/current max not hit)

Stop after
   [A supported in-world time limit ▾]
   (Future steps are rechecked when their turn arrives.)

If something needs a decision
   The plan stops and waits for you.
   (Only if that is the actual accepted policy.)

[Back to the landing]         [Begin this plan]
```

This is an **experience sketch**, not a request to add arbitrary new plan policy fields. If the backend only supports one fixed pause/decision behavior, describe the fixed behavior instead of rendering fake selectors.

## Reality check against inspected DTO

At inspected main 2026-11-13:
- `actionCommandSchema` has `expectedRevision`, `offerId`, current `path`, optional up to five `successorPaths` and a required positive `horizonGameSeconds` when successorPaths exist (max 10,080 fictional seconds in that contract). The UI cannot exceed it.
- `acceptedActivityPlanViewSchema` exposes finite entries with states pending/running/complete/blocked/cancelled and a horizon. These can provide **true** plan status.
- `accepted-plan-controls` includes a cancel-pending capability (verify current syntax before Ready). That does not equal abandoning active work.
- The selected frontend architecture already freezes command payload and uses TanStack Query + server snapshots.

The implementation should translate **actual semantics**, not add a second queue store in React. If the desired stop policy cannot be expressed by current backend, narrow the UI copy or request a separate domain Change.

## Scope and exclusions

**Likely source owners:** `apps/web/src/features/play/ui/campaign-offer.tsx`, `model/use-offer-path.ts`, `ui/campaign-activity.tsx`, targeted presentational components/Storybook fixtures, Play tests; no broad route rewrite.

**Keep:** current version-fenced offer identity, immutable command/retry rules, accepted plan event/clock semantics, real action eligibility, server-side decision holds, correct cancellation of pending entries.

**Exclude:** GM03 standing-life, arbitrary repeat-until rules, auto-LLM planning, open text instructions for autopilot, NPC scheduling, new server time formulas, auto-spend, multiplayer group plans, editable accepted future tasks without a domain command.

## Acceptance and negative proof

**Normal:**
- A valid quiet harbor can compose **B → same saved A**, preserving 3/9 repair progress.
- A finite limit is displayed in the correct *world-relative* units; final payload retains exact admitted fictional seconds.
- First action begins only after final acceptance; future steps are marked conditional.
- Eligible next step can start without a meaningless “Continue report” click.
- A plan interruption presents the new scene; previously earned work remains.
- An existing plan has an understandable “Current / Next / Stops when” summary in Now.
- Canceling pending stops only future steps where the current supported command defines that meaning.

**Negative:**
- Clicking “Add another step” never advances fictional time.
- Plan never starts from an expired/stale offer or a mere browser navigation.
- An invalid successor cannot be silently skipped or marked complete.
- A lost ACK cannot create a second plan or swap selected successor identities.
- No planned step may claim its projected pay/item/travel position as already achieved.
- “Cancel remaining” must not abandon the current action or erase completed work.
- Unavailable support for standing routines, arbitrary fallback responses or cross-world calendar units cannot be faked by the UI.
- A current danger/decision hold does not expose an incompatible plan editor.
- Changing pace cannot retroactively award work or modify a frozen command during uncertain ACK.

**Evidence:** mock/Storybook first, tests for path selection, reversion, command identity and plan status, then browser proof in narrow/wide with a real admitted fixture where authorized. Never call paid Storyteller or reset non-disposable data by default.

## Readiness gate

Before calling UX12 Ready, Cursor rechecks current accepted plan operations and exact public DTO. Product owner accepts the “Plan a little ahead” interaction and authorizes one code-bearing slice. If the backend currently cannot accept the intended natural stop condition, do not implement the condition as frontend-only logic. Use a supported simple horizon and record a separate mechanics gap.

**Definition of success:** a new player can answer “What will my character do while I'm away, when will it stop, and which steps aren't guaranteed?” without ever seeing the words **successor**, **cursor** or **fictional seconds**.
