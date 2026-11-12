# Stories: draft → opening → Start | source map

**First look:** Current creation uses server-loaded draft/catalogue, a local `DraftEditor` edit buffer, a `202` opening-generation request, then a separate `200` Start. The selected React target uses viewer/draft-scoped Query and RHF, **not yet implemented**. **Start is a separate durable intent, not a draft save or a Storyteller retry.**
**Start:** [new draft route](../../../app/stories/new/page.tsx) / [saved draft route](../../../app/stories/[id]/page.tsx) → [DraftEditor](../../../../../draft-editor.tsx) → [preview route](../../../app/stories/[id]/preview/page.tsx) → [OpeningPreviewPanel](../../../../../opening-preview.tsx).
**Source basis:** baseline `470a5df` read 2026-11-12, no tests executed. **Do not mistake proposed TanStack/RHF code for current source.** W08/W09/W10 packets own the actual migration.

## Where a question belongs

| Concern | Present source/symbol | Cross boundary only when needed |
| --- | --- | --- |
| Draft UUID / new route redirect | `app/stories/new/page.tsx` | Invalid/missing search `id` redirects with server-created UUID; existing saved draft redirects to edit route |
| Existing draft load | `app/stories/[id]/page.tsx` | GET `/api/drafts/:id`, 401 sign-in, 404 notFound, Zod `draftSchema` |
| Unsaved values, multi-step form, dirty guard | [DraftEditor](../../../../../draft-editor.tsx): `content`, `dirty`, `beforeunload` | [draft schemas](../../../../../packages/contracts/src/drafts.ts), `saveDraftSchema` |
| Draft save and conflict | `DraftEditor.save` / `loadSaved` | `PUT /api/drafts/:id` expects `expectedRevision`; 409 preserves local edits; server has owner-scoped version fence |
| Storyteller catalogue | [StorytellerSelect](../../../../../storyteller-select.tsx) | GET `/api/storytellers` via client effect |
| Draft list, more pages | [DraftList](../../../../../draft-list.tsx) | GET `/api/drafts?cursor=opaque`; client append/dedupes |
| Live story list | [LiveStoryList](../../../../../live-story-list.tsx) | GET `/api/stories?before=UUID`; currently replaces page rather than appends |
| Opening candidate load | `app/stories/[id]/preview/page.tsx` | Parallel draft/latest/catalogue GET; parsed `latestOpeningSchema` |
| Generation admission and refresh | [OpeningPreviewPanel.generate/poll](../../../../../opening-preview.tsx) | `PUT /api/drafts/:id/openings/:attemptId` **202**, GET `/latest`; backend may still be pending or uncertain |
| Start a reviewed candidate | `OpeningPreviewPanel.startStory` | `PUT /api/stories/:storyId/start` **200**; see below |

## Command identity matters more than component shape

```text
Draft: editor local text -> PUT /drafts/:id { expectedRevision, ...content }
       409 => preserve unsaved text, explicit current-server reconciliation

Opening: candidate preview -> PUT /drafts/:id/openings/:generationId
         202 => persisted generation admission; refresh via GET latest
         uncertain paid provider => do NOT automatically generate again

Start: preview succeeded/current -> PUT /stories/:storyId/start
       { candidateId, expectedDraftRevision, campaign options }
       200 => existing saved story; link to /play/:storyId
```

**Actual risk identified:** `opening-preview.tsx` stores `storyId.current` and writes `?story=UUID`, but a later Start attempt builds the body from **current** `preview`/`locked`/`pace`. After unknown transport completion, the same story ID can be retried with a different request. W09 requires *capturing immutable body/ID together*, GET-first recovery and user-triggered exact replay. Do not confuse this with the W19 *resolution receipt* endpoint; Start already has GET-by-story as recovery anchor.

## Tests, chosen standards and stop rule

- Selected architecture: [F5/F8/F12 target](../../../../../docs/engineering/targets/react-next.md) and [story lifecycle contract](../../../../../docs/technical/story-lifecycle.md). Read relevant **section**, not full file.
- Fast cases: dirty form survives 409; delayed save does not clobber new edits; Start changed-pace under same UUID reuses exact captured body; generation 202 never means narration is published.
- Integrated proof if authorized: [draft browser](../../../../../tools/api-integration/test/drafts.browser.ts) and [Start integration](../../../../../tools/api-integration/test/story-start.integration.ts). [Integration warning](../../../../../tools/api-integration/README.md) explains disposable DB reset.
- Update this map only when a route, edit/command owner, wire shape or recovery lifecycle changes. Don't duplicate the normative technical contract or annotate every JSX file. No gameplay, visual redesign or live model work is authorized here.
