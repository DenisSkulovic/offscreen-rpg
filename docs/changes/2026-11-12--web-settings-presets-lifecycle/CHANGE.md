# Change W11: RHF/Zod campaign settings, presets and versioned edit sessions

> **Cursor first look (current source ≠ selected target):** [Settings owner map](../../../apps/web/src/features/play/README.md) → the **one** owning symbol. **Primary contract:** [F8](../../engineering/targets/react-next.md#f8-creationforms-and-editing-consistency).  
> **Pre-investigated trap:** Current parent `key={settings.revision}` may discard unsaved creative settings; future RHF edit session keyed by story.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Owner authorized via continue after W07. All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**. **Audited source:** post-W07 `main` (`631f788`).

**Depends on:** W01 W15 W04; W08 RHF conventions can be reused, no independent form framework.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F3 F5 F8 F11**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G22 G28 G16**.

## Code outcome and owners

**Measurable code/test/config change:** RHF/Zod campaign settings, presets and versioned edit sessions.  
**Start at:** `apps/web/src/features/play/campaign-settings.tsx`; `apps/web/src/features/play/view.tsx`; `use-campaign-command.ts`; `packages/contracts/src/campaign.ts`; Nest settings/preset routes (read).

## Binding technical design

**React Hook Form v7 + Zod resolver** owns creative settings and private-preset edit forms, with `useFieldArray` for dynamic tags/guidance. TanStack Query owns saved current settings, preset catalogue/owned presets and settings history; no duplicate catalogue arrays in useState. Key RHF form by viewer+story/edit session, **not by settings revision**. When a new server revision arrives while dirty, show a stale/conflict banner and require deliberate reload/adopt/rebase: never silently reset fields or save with new revision. Immutable typed `useMutation` envelopes for settings and private preset, preserve exact UUID/body on uncertain retry. Separate history query and preset mutation statuses; leave form visuals unchanged. Field-level accessible errors and first-invalid focus required.

## Bounded implementation steps

1. RHF migration with strict creative schema, safe dynamic array keys and explicit saved revision vs draft values.
2. Query reads/invalidations for preset/catalogue/history; typed frozen settings/preset mutations with distinct API status taxonomy.
3. Test external revision while dirty, 409, locked settings, changed preset body before retry, late history after story switch, focus/error and session expiry.

## Acceptance and verification

- **Normal outcome:** Edit tags/guidance, save versioned creative settings, load preset and inspect history without losing edits on background refresh.
- **Discriminating negative case:** External revision cannot erase dirty form; retry under prior UUID cannot submit newly typed preset; another story's settings/history cannot enter current query.
- **Safe proof and evidence:** RHF+MSW component tests and existing provider-free settings API integration when safe.
- **Must preserve / exclude:** No new game mechanics or creative options, no autosave, no design-system/theme swap.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
