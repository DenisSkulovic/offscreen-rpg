# Stories: draft → opening → Start | source map

**First look:** Draft edit uses viewer-keyed Query + React Hook Form (`mode: onTouched`, Zod form schema). Save freezes `{draftId, expectedRevision, content}` in `useMutation` (retry 0). RHF owns unsaved values; Query owns acknowledged `Draft`. **Start is a separate durable intent:** freeze full body/story UUID once, GET-by-story before replay.
**Start:** [new draft route](../../../app/(authenticated)/stories/new/page.tsx) / [saved draft route](../../../app/(authenticated)/stories/[id]/page.tsx) → [DraftEditor](draft-editor.tsx) → [preview route](../../../app/(authenticated)/stories/[id]/preview/page.tsx) → [OpeningPreviewPanel](opening-preview.tsx).
**Source basis:** post-W10 `main`; recheck symbols before editing.

## Where a question belongs

| Concern | Present source/symbol | Cross boundary only when needed |
| --- | --- | --- |
| Draft UUID / new route redirect | `app/stories/new/page.tsx` | Invalid/missing search `id` redirects with server-created UUID; existing saved draft redirects to edit route |
| Existing draft load | `app/stories/[id]/page.tsx` | GET `/api/drafts/:id`, 401 sign-in, 404 notFound, Zod `draftSchema` |
| Unsaved values, multi-step form, dirty guard | [DraftEditor](draft-editor.tsx) RHF + [draftEditorFormSchema](draft-content.ts); `isDirty` / beforeunload | Query must not auto-`reset` dirty values |
| Draft save and conflict | [useDraftSave](use-draft-save.ts) frozen PUT; 409 → keep edits; `resetDefaultValues` on success | `PUT /api/drafts/:id` + `expectedRevision`; explicit Load saved adopts server |
| Storyteller catalogue | [StorytellerSelect](storyteller-select.tsx) | GET `/api/storytellers` via client effect |
| Draft list, more pages | [DraftList](draft-list.tsx) + [draftsListInfiniteOptions](../../shared/api/drafts-list-query.ts) | Opaque `cursor`; `useInfiniteQuery` append/dedupe; SSR first-page hydrate |
| Live story list | [LiveStoryList](live-story-list.tsx) + [storiesListInfiniteOptions](../../shared/api/stories-list-query.ts) | UUID `before`; append/dedupe; SSR first-page hydrate; UX05 featured + Enter story; status is server string only |
| Stories library shell (UX05) | [stories/page.tsx](../../../app/(authenticated)/stories/page.tsx) + [stories-library.css](stories-library.css) | Drafts stay “Continue creation”; never invent Continuing from recency |
| Guided creation / opening (UX06) | [DraftEditor](draft-editor.tsx) steps + [OpeningPreviewPanel](opening-preview.tsx) excerpt | RHF/409/frozen Start unchanged; preview options disabled; Generate ≠ Start |
| Opening candidate load | preview page + [openingQueryOptions](../../shared/api/opening-query.ts) | SSR hydrate `queryKeys.draftOpening`; GET `/latest` polls while pending/running |
| Generation admission | [useOpeningGenerate](use-opening-generate.ts) | Frozen `PUT .../openings/:attemptId` **202**; no automatic paid retry |
| Start a reviewed candidate | [useStartStory](use-start-story.ts) + [start-intent-store](../../shared/api/start-intent-store.ts) | Freeze body once; sessionStorage 24h TTL; GET story before replay |

## Command identity matters more than component shape

```text
Draft: editor local text -> PUT /drafts/:id { expectedRevision, ...content }
       409 => preserve unsaved text, explicit current-server reconciliation

Opening: candidate preview -> PUT /drafts/:id/openings/:generationId
         202 => persisted generation admission; refresh via GET latest (Query)
         uncertain paid provider => do NOT automatically generate again

Start: preview succeeded/current -> PUT /stories/:storyId/start
       frozen {viewerId,draftId,storyId,candidateId,expectedDraftRevision,campaign}
       reload => GET /stories/:storyId first; never auto-PUT; explicit same-body retry only
       200 => existing saved story; link to /play/:storyId
```

**W09 closed the Start trap:** `storyId` and campaign body are captured together. Changed locked/pace after an uncertain Start cannot alter the frozen envelope. Missing/corrupt/foreign sessionStorage blocks unsafe retry.

## Tests, chosen standards and stop rule

- Selected architecture: [F5/F8/F11 target](../../../../../docs/engineering/targets/react-next.md) and [story lifecycle contract](../../../../../docs/technical/story-lifecycle.md). Read relevant **section**, not full file.
- Fast cases (`pnpm test:fast`): dirty survives 409; Start GET-first remount without auto-PUT; frozen pace survives retry; missing capture blocks; pending opening polls without generation PUT; story/draft infinite append + rapid-fetch guard; history story A→B isolation.
- Integrated proof if authorized: [draft browser](../../../../../tools/api-integration/test/drafts.browser.ts) and [Start integration](../../../../../tools/api-integration/test/story-start.integration.ts). [Integration warning](../../../../../tools/api-integration/README.md) explains disposable DB reset.
- Update this map only when a route, edit/command owner, wire shape or recovery lifecycle changes. Don't duplicate the normative technical contract or annotate every JSX file. No gameplay, visual redesign or live model work is authorized here.
