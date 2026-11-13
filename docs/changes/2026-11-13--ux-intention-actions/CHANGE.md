# UX03 | a coherent grammar for choices and commitments

**State:** Done (2026-11-13). **Approval and owner:** Owner authorized continuing the UX sequence; Cursor landed UX03.  
**Kind:** player interaction refactor + state/behavior tests.  
**Parent:** [Program](../../experience/implementation-program.md) M1. **Dependency:** UX01, UX02 (Done).

## Cursor first-screen brief

> **Current-source map:** [Play source map](../../../apps/web/src/features/play/README.md), particularly `ui/campaign-offer.tsx`, `model/use-offer-path.ts`, `use-resolution-command.ts` and `api/use-campaign-command.ts`.  
> **Governing target:** [Four control meanings](../../experience/patterns/interaction-grammar.md#four-different-things-a-control-can-do), [scene action area](../../experience/patterns/interaction-grammar.md#scene-action-area) and [confirmations](../../experience/patterns/interaction-grammar.md#confirmations-only-where-stakes-warrant-them).  
> **Known trap:** a menu choice, accepted action, ongoing work and a paid retry cannot share one “Continue” button. Captured offer identity and frozen submission must not be silently regenerated after an SSE update.  
> **Scope/permission:** **Authorized for UX03.** Only **currently admitted pre-generated options** are in scope. **Do not implement free-text gameplay** under this packet.

## Desired behavior independent of old widgets

A player sees meaningful, verb-led intentions attached to current fiction, with known time and risk **where relevant**. Exploration of a choice subgroup is explicitly time-free. A real attempt/commitment uses the already selected idempotent command path. An ordinary finite dialogue response does not need an exhausting confirmation screen; a long irreversible commitment may benefit from a compact review of known stakes.

This is not a set of three equal-sized “Choose option” form buttons. Layout may vary with scene and number of options, but visual semantics for explore/attempt/commit/control remain distinct.

## Source-bound behavior and technical authority

- Product: [range of available actions](../../game-rules.md#the-range-of-available-actions), [prepared local life](../../gameplay.md#prepared-local-life-while-the-storyteller-is-dormant).
- Design: [interaction grammar](../../experience/patterns/interaction-grammar.md), [future custom intents explicitly excluded](../../experience/patterns/free-intent-future.md).
- Engine and frontend: [Play command lifecycle](../../engineering/targets/react-next.md#3-command-error-and-recovery-contract); [Play source map](../../../apps/web/src/features/play/README.md).
- Baseline: GitHub main `8c91618` (2026-11-13) with `useResolutionCommand` immutable payload, retry 0, `sessionStorage` durable identity, GET receipt before replay. Treat current source as a reinspection requirement, not proof of UI comprehension.

## Complete code result

A contextual `IntentionList`/`IntentionChoice`-type composition (naming may differ) that:
- Properly renders offer path, one choice, many grouped choices, disabled with reason and no-choice state.
- Distinguishes **explore menu** from **commit action** in visual copy, focus behavior and click handlers.
- Shows admitted known stakes (fictional duration, conditional real wait, known costs/risk) without leaking hidden DC, future outcomes or guarantees.
- Captures a selected action once using the **existing** frozen intent path; in-flight state prevents duplicate click while retaining understandable context.
- If a high-stakes confirmation is justified, it is accessible, short and does not itself spend fictional time.
- Shows truthful stale/conflicted/rejected/uncertain states and safe recovery. Exact retry rules follow existing commands.

## Exclusions

No freeform text composer, no new rules/admission API, no automatic “eat item” inferred from inventory, no arbitrary new offer generation, no chance manipulation, no unapproved rate limits, no paid-model retries, no redefining input ownership between players. **UX12 separately owns** editing/reviewing bounded accepted multi-step plans; UX03 must not add a per-option “Add as a later activity” job-planning interface while redesigning ordinary choices.

## Acceptance and negative cases

**Normal:** J2 scene with two genuinely distinct intents; J3 long repair commitment with clear review; nested menu returned by Back costs no time; 12 prepared local options grouped without a wall of giant cards; one action resolved and next scene renders without forced chapter boundary.

**Negative:** second rapid click creates no second command; a background new offer invalidates stale choice; browser Back from menu does not mutate fiction; a failed roll remains failed and cannot be resubmitted as new attempt by recovery; a secret encounter is not spoiled by an option subtitle; an existing ongoing work can't be cancelled implicitly by mere inspection; unknown ACK uses receipt GET and not a new command.

**Evidence:** deterministic RTL tests including double submit, offer-change, back navigation, stale server snapshot and lost-ACK reload; Storybook states; actual keyboard/wide/mobile browser review. Only provider-free test lanes by default.

## Handoff

Revalidate exact owner symbols and negative case before Ready. Cursor should prefer small semantic components and existing React/Query mutations. If a new action type requires server/contract changes, **stop, write a separate domain packet**. Completion means actual behavior plus visual proof, not merely fewer form fields.
