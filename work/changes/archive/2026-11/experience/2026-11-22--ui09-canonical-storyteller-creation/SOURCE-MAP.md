# UI09 source map | verified Web creation mismatch

**Inspected product/source snapshot:** `bc562b77663472c8cccdd1bb68f79a00bddb619a`.  
**Remote undertaking verification:** `undertaking/storyteller-workshop` at `e7ebb1d8c31c5462edc8626776b9b4530d51d471`; compare `bc562b7...e7ebb1d8` showed **no changes** in the relevant Web Story Launch routes/form/home, Story Launch contract, or selected product/client authority files. Recheck current local undertaking HEAD before execution because the owner may have newer unpushed joins.

## Selected authority vs current implementation

| Concern | Selected authority | Current source reality | UI09 action |
| --- | --- | --- | --- |
| New story IA | `entry-and-onboarding.md`: prepared Play or one Story Prompt | `/stories/new` creates UUID and renders `DraftEditor` | make `/stories/new` canonical Launch page |
| Custom story | no title/character/profile required | `DraftEditor` has Foundation → Your role → Storyteller → Review and validates role/premise setup | remove DraftEditor from new-story route; keep saved draft compatibility |
| Prepared experience | Play first; Customize optional | `StoryLaunchForm` accepts optional `presets`, but route passes `[]`; current select UI is not Play-first | render supplied presets as Play-first cards + optional Customize |
| Durable launch | one operation; recover after reload/ambiguity | `useStoryLaunch` already freezes request, stores operation pointer, PUTs once, GETs after ambiguity | preserve hook semantics |
| Route status | one canonical creation path | `/stories/launch` is feature-gated and `/stories/new` is legacy default | remove Web gate; `/stories/launch` redirects `/stories/new` |
| Home | obvious create action | primary `/stories/new` plus conditional `/stories/launch` duplicate | keep one canonical CTA |

## Exact source anchors

### New story route

`apps/web/app/(authenticated)/stories/new/page.tsx`

Current behavior:

1. `requireViewer()`
2. parse `?id=` as draft UUID; if absent/invalid, redirect to a newly generated `/stories/new?id=<uuid>`
3. probe `/api/drafts/:id`
4. fetch `/api/drafts/:id/openings/catalogue`
5. render `<DraftEditor ... preparedStarts={catalogue.entries} />`

This route is the mismatch. UI09 removes new-draft allocation/catalogue loading from this route and renders the canonical Launch surface after authentication.

### Alternate Launch route

`apps/web/app/(authenticated)/stories/launch/page.tsx`

Current behavior checks `isStoryLaunchEnabled()` and redirects to `/stories/new` if false, otherwise renders `StoryLaunchForm viewerId presets={[]}`. UI09 makes `/stories/new` own this content and converts `/stories/launch` to a compatibility redirect.

### Feature gate

`apps/web/src/server/story-launch-capability.ts`

`isStoryLaunchEnabled()` returns true only for exact `STORY_LAUNCH_ENABLED === 'true'`. `stories/page.tsx`, `stories/launch/page.tsx`, and tests consume it. After UI09 canonicalizes Launch, this gate has no creation-routing purpose and should be removed if latest-head grep confirms no unrelated owner.

### Home

`apps/web/app/(authenticated)/stories/page.tsx` and `apps/web/src/features/stories/stories-home-actions.tsx`

Current UI exposes both “Create story” → `/stories/new` and conditional “Play from a prompt” → `/stories/launch`. UI09 collapses these to one canonical `/stories/new` action.

### Launch form / state owner

`apps/web/src/features/stories/story-launch-form.tsx`

Current form already avoids title/character, but:

- uses a dropdown labelled Prepared start rather than Play-first prepared cards;
- always marks Story Prompt textarea `required`, even though the contract/hook allow a preset with no custom prompt;
- exposes the World select as a normal mandatory-looking field rather than optional Customize;
- generic `Launch` copy does not distinguish prepared Play from custom Story Prompt creation.

`apps/web/src/features/stories/use-story-launch.ts`

**Preserve.** `beginLaunch` already supports:

- prompt source when no preset;
- preset source with exact `presetId` + `presetRootHash` and optional `customPrompt`;
- optional `storytellerProfile` / `worldInvention` hints;
- UUID operation identity;
- request hashing and pointer persistence without raw prompt;
- one PUT, then GET after ambiguous network result;
- polling and ready link behavior.

UI09 should not redesign this hook unless a focused test proves a local UI integration defect.

### Launch contract

`packages/contracts/src/story-launch.ts`

**Read-only for UI09.** `StoryLaunchRequest.source` is `prompt` or `preset`; preset has `presetId`, SHA-256 `presetRootHash`, optional `customPrompt`. Hints are optional. Status carries pending/preparing/composing/ready/held/failed/uncertain. No UI09 contract edit is required.

### Saved-draft compatibility

`apps/web/app/(authenticated)/stories/[id]/page.tsx` → `DraftEditor`.

UI09 does not alter this route. Existing drafts remain editable. The legacy editor can therefore survive without remaining the default creation funnel.

## Prepared-experience limitation, explicitly settled

There is **no inspected authoritative player-facing catalogue** that currently returns `StoryLaunchPreset { presetId, presetRootHash }` values for `/stories/new`.

The legacy drafts catalogue (`GET /api/drafts/:id/openings/catalogue`, `mechanicalContentCatalogueSchema`) returns mechanical setup IDs/names/descriptions and optional start-package metadata. Those are not the same contract as a launchable Library `presetRootHash` and must not be reinterpreted.

The checked-in Seyda Neen start package contains world/rule roots, but those are likewise not automatically a Story Launch Library root. UI09 therefore implements honest Play-first rendering **when authoritative presets are supplied** and does not fabricate a production catalogue. Publishing real prepared catalogue data is a separate backend/content concern if none exists after current-head recheck.

## Test anchors

- `apps/web/src/features/stories/story-launch-form.test.tsx`
- `apps/web/src/features/stories/use-story-launch.test.tsx`
- `apps/web/src/features/stories/stories-home-actions.test.tsx`
- `apps/web/src/server/story-launch-capability.test.ts` (expected retirement if gate has no remaining caller)
- `apps/web/src/features/stories/draft-editor.test.tsx` (compatibility guard; do not rewrite its semantics)
