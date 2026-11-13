# PX02 | Semantic passage and expressive intention treatments

**State: Done (2026-11-13).** **Approval:** Owner asked to implement the presentation design. Cursor landed `IntentionChoice` and `NarrativePassage` for legacy and campaign options. Parent: [presentation program](../../experience/presentation-implementation-program.md). Next: [PX03 media/motion](../2026-11-13--px-atmospheric-media/CHANGE.md) (landed in the same implementation).

## Cursor first-screen brief

> **Outcome:** both existing live choice rendering paths share one accessible *presentation-aware* intention treatment primitive while retaining distinct authorized command controllers. Option appearance can vary by exact verified offer/path, without affecting what a click does. Narrative passage responsibilities are separated enough for future illustrated insertions.
>
> **Authority:** [component boundaries](../../experience/system/presentation-runtime.md#component-architecture); [exact choice scope](../../experience/system/presentation-language.md#required-scope-context); [choice grammar](../../experience/patterns/choice-surface-decision-rules.md); [Living Stage](../../experience/spaces/living-stage-blueprint.md).
>
> **Source entry:** [Play map](../../../apps/web/src/features/play/README.md), then `ui/story-frame.tsx`, `ui/campaign-offer.tsx`, `ui/campaign-play.tsx`, `view.tsx` and existing offer-path tests. Check `model/use-offer-path.ts` only if needed.
>
> **Exclude:** changing command admission/retry semantics, arbitrary layout DSL, new engine offer data, media placements or event animation (PX03), broad source extraction beyond real consumers.

## Desired code-bearing result

The renderer owns the **appearance of a known option**, not the option. Extract a focused `IntentionChoice` UI component for labels, support text, action or menu-browse semantics, focus/disabled styling and bounded treatments. Build necessary adapters from existing legacy choice shape and nested campaign nodes.

The current campaign flow distinguishes path-browsing (no in-world commit), direct accepted actions and successor planning. Those are not interchangeable just because they look like buttons; preserve actual semantics. Do not move `command.send` or the frozen envelope into a presentational UI primitive.

A similarly focused `NarrativePassage` component should own verified passage title + paragraph DOM and reading measure. Its public content/identity stays derived from current story; future art slots may be added in PX03 without rewriting the passage into a single large switch statement. This is **not** permission to reinterpret game text into Markdown/HTML.

## Intended code delta

1. Add/complete choice treatment validation + exact matching in the presentation resolver. Match by `{kind:'legacy', interactionId, optionId}` or `{kind:'campaign', offerId, path[]}`. Require current scope. Invalid/duplicate/old targets are harmless; no matching by label, array index, partial path or raw `node.id`.
2. Introduce a compact accessible `IntentionChoice` with structured `quiet|outline|filled|luminous`, optional bounded accent/intensity and `none|glow-soft|pulse-soft` treatment. Keep current choice default parity. Use resolved roles/data variants, not raw per-button CSS from input. Interaction feedback/focus/system status overrides always take priority.
3. Adapt BOTH `StoryFrame` legacy options and `CampaignOfferPanel` campaign options to the primitive without merging action/preview/menu/path controllers. Keep `campaign-activity`, system Pause/Retry/Refresh and technical controls outside model-proposed decoration unless existing semantic styling requires a safe shared base.
4. Create a passage-only compositional unit used by StoryFrame. Preserve original published title and prose, DOM order, paragraph semantics and reading measure. Use real immutable passage ID where a transition identity is needed later; do not use title as canonical identity.
5. Thread optional **resolved** presentation to the actual campaign offer subtree, not only a Storybook-only StoryFrame mock. In real Play it remains absent, so it has no creative model source and no observable game behavior change.
6. Extend deterministic tests + Storybook: two visually distinct option treatments, legacy vs campaign, browse/Back vs commit, disabled/busy, stale offer path and repeated label across two options. Verify responsiveness and keyboard focus.

## Critical boundaries

- Authorized option identity, eligibility and active offer path come from current story/campaign data. Presentation cannot add/hide/reorder an offer or invent a command.
- `IntentionChoice` can render a semantic button or navigation/menu affordance only based on an **existing explicit behavioral prop**. It cannot infer behavior from surface treatment or color.
- No visual success state before a committed effect; selected/pending/uncertain response stays truthful. Error and recovery elements cannot be styled as fictional options.
- `ReactNode` extras in StoryFrame are not an invitation to flatten every subsystem into a universal component. Only refactor directly relevant consumers.

## Acceptance / negative proof

**Normal:** show an authorized campaign offer with two noticeably different styled actions plus a quiet browse option, and a legacy offer fixture using the same underlying option primitive. Clicking each produces the same original action/menu behavior with identical operation/offer/path/payload compared with baseline.

**Negative:** stale presentation for prior offer, duplicate treatment or invalid nested path cannot affect current offers; decoration cannot enable a disabled option, change selected path, remove retry protection, duplicate a POST or convert browse into commit. Two options with the same display label remain distinct by ID/path. Focus and disabled semantics remain visible for every accent.

**Proof:** targeted resolver identity tests + RTL/user-event for legacy and campaign actions with existing command mocks (including double-click/stale), Storybook color/treatment variants, `pnpm --filter @offscreen/web test:fast`, 375px/desktop keyboard and contrast inspection. Preserve the existing Play/Query tests and report any regressions honestly.

## Risk / exclusions / handoff

Do not modify Nest contracts, Redux/Query architecture, gameplay admission, planner mechanics, providers, database, generated images or CSS framework stack. Stop if the change would require rewriting `CampaignCommandApi` or contract shapes, and return a scoped blocker to the designer.

**Executor handoff:** after owner authorization and PX01 review, implement only this compositional unit; show real campaign-choice fixtures, command equivalence test receipts and screenshots; ask the designer to critique whether options are expressive without becoming arcade noise.
