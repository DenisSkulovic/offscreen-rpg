# Change W06: Cohesive feature model/API/UI composition after Query and mutation migration

> **Cursor first look (current source ≠ selected target):** [Play composition map](../../../apps/web/src/features/play/README.md) → the **one** owning symbol. **Primary contract:** [F7](../../engineering/targets/react-next.md#f7-screen-and-component-responsibility).  
> **Pre-investigated trap:** `CampaignPlay` mixes rendering and command lifetimes; extract by reason-to-change, not line count or UI design.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Owner authorized via continue after W09. All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**. **Audited source:** post-W09 `main` (`a4e6541`).

**Depends on:** W15 W03 W04; avoid concurrently editing Play with W05/W11.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F3 F7 F14**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G21 G17**.

## Code outcome and owners

**Measurable code/test/config change:** Cohesive feature model/API/UI composition after Query and mutation migration.  
**Start at:** `apps/web/src/features/play/campaign-play.tsx`; `view.tsx`; `use-campaign-command.ts` (post migration); `apps/web/src/features/stories/opening-preview.tsx`; pure `@offscreen/game/calendar` imports.

## Binding technical design

Use feature-local **`api/` for typed Query/mutation options**, **`model/` for pure derived selectors/offer-path rules**, and **`ui/` for coherent scene, activity, time, receipt and action presentation**. This folder pattern is required for genuinely substantial migrated modules, not one-file trivial helpers. Keep Query as remote owner and RHF as edit owner; no new local canonical story state. Separate offer path local state from command intent, so new offer identity doesn't remount/cancel an uncertain operation. Extract neutral `paceOptions` and formatting utilities from large Client screen; preview must not import a whole Play Client component merely for a constant. Split a large view only by meaningful reason-to-change/test seams, not per-100-line policy. Preserve existing text, controls, fields and CSS class output barring accessible semantics.

## Bounded implementation steps

1. Draw current import/state responsibilities and define 3-5 coherent ownership groups, with a keep-as-is option for cohesive sections.
2. Extract pure projections/pace and focused child views; refactor props around explicit Query snapshot + command callbacks without prop-cascade abstractions.
3. Test offer navigation, successor path staging, held clock, ability/receipt rendering, pending generation and shared pace reference.

## Acceptance and verification

- **Normal outcome:** Same scene and campaign controls render from one Query snapshot while independent projections/offer path tests become straightforward.
- **Discriminating negative case:** Changing offer or story while an intent is uncertain does not lose retry identity; no frontend-only mechanical authority or accidental Play client chunk imported into preview.
- **Safe proof and evidence:** Pure selectors and RTL interaction regression, build/client bundle size comparison when measured.
- **Must preserve / exclude:** No new gameplay behavior, theme/CSS overhaul, speculative virtualization, generic reusable component framework.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
