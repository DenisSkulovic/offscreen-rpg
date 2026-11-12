# Stories: draft → opening → Start | source map

**First look:** Draft edit uses viewer-keyed Query + React Hook Form (`mode: onTouched`, Zod form schema). Save freezes `{draftId, expectedRevision, content}` in `useMutation` (retry 0). RHF owns unsaved values; Query owns acknowledged `Draft`. **Start remains a separate durable intent (W09), not a draft save.**
**Start:** [new draft route](../../../app/(authenticated)/stories/new/page.tsx) / [saved draft route](../../../app/(authenticated)/stories/[id]/page.tsx) → [DraftEditor](draft-editor.tsx) → [preview route](../../../app/(authenticated)/stories/[id]/preview/page.tsx) → [OpeningPreviewPanel](opening-preview.tsx).
**Source basis:** post-W08 `main`; recheck symbols before editing. W09/W10 own opening Start and list paging.

## Where a question belongs

| Concern | Present source/symbol | Cross boundary only when needed |
| --- | --- | --- |
| Draft UUID / new route redirect | `app/stories/new/page.tsx` | Invalid/missing search `id` redirects with server-created UUID; existing saved draft redirects to edit route |
| Existing draft load | `app/stories/[id]/page.tsx` | GET `/api/drafts/:id`, 401 sign-in, 404 notFound, Zod `draftSchema` |
| Unsaved values, multi-step form, dirty guard | [DraftEditor](draft-editor.tsx) RHF + [draftEditorFormSchema](draft-content.ts); `isDirty` / beforeunload | Query must not auto-`reset` dirty values |
| Draft save and conflict | [useDraftSave](use-draft-save.ts) frozen PUT; 409 → keep edits; `resetDefaultValues` on success | `PUT /api/drafts/:id` + `expectedRevision`; explicit Load saved adopts server |
| Storyteller catalogue | [StorytellerSelect](storyteller-select.tsx) | GET `/api/storytellers` via client effect |
| Draft list, more pages | [DraftList](draft-list.tsx) | GET `/api/drafts?cursor=opaque`; client append/dedupes |
| Live story list | [LiveStoryList](live-story-list.tsx) | GET `/api/stories?before=UUID`; currently replaces page rather than appends |
| Opening candidate load | `app/stories/[id]/preview/page.tsx` | Parallel draft/latest/catalogue GET; parsed `latestOpeningSchema` |
| Generation admission and refresh | [OpeningPreviewPanel.generate/poll](opening-preview.tsx) | `PUT /api/drafts/:id/openings/:attemptId` **202**, GET `/latest`; backend may still be pending or uncertain |
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
- Fast cases (`pnpm test:fast`): dirty survives 409; delayed save does not clobber newer keystrokes; background Query set does not reset RHF; Start/opening recovery remains W09.
- Integrated proof if authorized: [draft browser](../../../../../tools/api-integration/test/drafts.browser.ts) and [Start integration](../../../../../tools/api-integration/test/story-start.integration.ts). [Integration warning](../../../../../tools/api-integration/README.md) explains disposable DB reset.
- Update this map only when a route, edit/command owner, wire shape or recovery lifecycle changes. Don't duplicate the normative technical contract or annotate every JSX file. No gameplay, visual redesign or live model work is authorized here.
