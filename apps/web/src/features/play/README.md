# Play | source ownership and lifecycle map

**First look:** `PlayScene` reads one viewer/story-keyed TanStack Query snapshot (`playStorySnapshotQueryOptions`: SSE-aware pending `refetchInterval`, hidden-tab pause, W03 write gate) and submits **frozen** Play intents through `useMutation` (retry 0). Live committed-view hints arrive via `useStoryLiveUpdates` (one EventSource per viewed story → scoped `invalidateQueries` only). Campaign UI is composed under `model/` (pure pace + projections), `api/` (commands), and `ui/` (status/activity/offer/history/records). Resolution recovery uses sessionStorage + W19 receipt GET; never auto-POSTs on mount. Background GET failure shows Refresh, never a command.
**Start:** [PlayScene](view.tsx) → [useStoryLiveUpdates](use-story-live-updates.ts) + [useResolutionCommand](use-resolution-command.ts) / [useControlCommand](use-control-command.ts) → [writeStorySnapshot](../../shared/api/story-snapshot-write.ts) → Nest stories endpoints. **Do not infer game mechanics or provider success in React.**
**Source basis:** post-W17 `main`; recheck symbols before editing. **Execution:** selected W07/W11 Change governs future edits; this README is a code-navigation map, not permission.

## Owner map: question → actual symbol

| When changing… | Current source owner | Follow only if needed |
| --- | --- | --- |
| Play route, authenticated initial HTML | [server PlayPage](../../../app/(authenticated)/play/[id]/page.tsx) | per-request QueryClient prefetch + `HydrationBoundary`; [PlayScene](view.tsx) reads `useQuery` |
| Scene selection and status | [PlayScene](view.tsx): `resolutionMessage` and display JSX | [story snapshot schema](../../../../../packages/contracts/src/stories.ts) distinguishes `revision`, `viewVersion`, `resolution.version` |
| Current snapshot refresh/merge | [playStorySnapshotQueryOptions](../../shared/api/story-snapshot-query.ts) + [storyNeedsPendingRefresh](../../shared/api/story-pending-refresh.ts) → `writeStorySnapshot` | [useStoryLiveUpdates](use-story-live-updates.ts) + [openStoryUpdateStream](../../shared/api/story-update-stream.ts): hint → invalidate → GET; 30s safety / 2s fallback |
| Live SSE invalidation | [useStoryLiveUpdates](use-story-live-updates.ts) | Same-origin `/api/stories/:id/updates`; never writes hint fields as Query state |
| Single choice / resolution recovery | [useResolutionCommand](use-resolution-command.ts) + [intent reducer](play-command-intent.ts) + [session envelope](../../shared/api/resolution-intent-store.ts) | Nest `PUT .../resolutions/:operationId` **202**; `GET .../receipt` (W19) before user retry |
| Timed-wait control | [useControlCommand](use-control-command.ts) | Nest `PUT /:id/controls/:operationId` **200** |
| Campaign commands | [api/use-campaign-command](api/use-campaign-command.ts): frozen URL/body `useMutation` | [ui/CampaignPlay](ui/campaign-play.tsx); statuses vary |
| Shared pace catalogue | [model/pace-options](model/pace-options.ts) | Opening Start imports this pure module, not Play UI |
| Offer path local navigation | [model/use-offer-path](model/use-offer-path.ts) + [ui/campaign-offer](ui/campaign-offer.tsx) | Resets on offer id change; must not clear command retry |
| Character, holds, receipts | [ui/campaign-status](ui/campaign-status.tsx) / [activity](ui/campaign-activity.tsx) / [records](ui/campaign-records.tsx) | Pure projections in [model/campaign-projections](model/campaign-projections.ts) |
| Storyteller refresh/retry | [ResolutionRecovery](resolution-recovery.tsx) | Distinct from Play choice envelope; no automatic charged retry |
| Storyteller settings, presets, history | [CampaignSettingsEditor](campaign-settings.tsx) | Later RHF/Query (W11) |
| Read-only chronology | [StoryHistoryView](history.tsx) | GET `/:id/history?before=number` |

## One useful command path

```text
URL /play/:id
  -> PlayPage prefetch + HydrationBoundary
  -> PlayScene useQuery + useResolutionCommand
  -> user chooses -> freeze envelope (UUID/body/digest) in sessionStorage
  -> useMutation PUT /resolutions/:operationId (retry:0); writeStorySnapshot on 202
  -> reload: load envelope -> GET receipt + story first; user may retry same frozen body only
  -> useStoryLiveUpdates EventSource → invalidate scoped snapshot on open/hint (GET only)
  -> Query pending refetchInterval (30s if SSE healthy, else 2s; not while hidden) → writeStorySnapshot until settlement
  -> clear envelope when resolution leaves snapshot
```

## Tests and exit gates

- **Fast proof:** `pnpm test:fast` — scene choice, stale poll, settlement/hide stop, 503 refresh-without-PUT, lost-ACK remount without auto-POST, SSE hint GET + foreign/dupe negatives, offer path staging, offer-change keeps command retry, preview pace import isolation.
- **Real Nest receipt/idempotency:** W19 `pnpm test:focus -- story-resolution` when authorized; not an inner-loop check.
- **Extend context only for:** client/identity contract; application story owner map for exactly-once; playbook for CI/perf.

**Maintenance trigger:** if Change moves source owners, API status, snapshot identity/ordering or command recovery, update this map in that Change.
