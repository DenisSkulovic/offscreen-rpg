# Play | source ownership and lifecycle map

**First look:** `PlayScene` reads one viewer/story-keyed TanStack Query snapshot (`playStorySnapshotQueryOptions`: 2s pending `refetchInterval`, hidden-tab pause, W03 write gate) and submits **frozen** Play intents through `useMutation` (retry 0). Resolution recovery uses sessionStorage + W19 receipt GET; never auto-POSTs on mount. Background GET failure shows Refresh, never a command.
**Start:** [PlayScene](view.tsx) → [useResolutionCommand](use-resolution-command.ts) / [useControlCommand](use-control-command.ts) → [writeStorySnapshot](../../shared/api/story-snapshot-write.ts) → Nest stories endpoints. **Do not infer game mechanics or provider success in React.**
**Source basis:** post-W05 `main`; recheck symbols before editing. **Execution:** selected W06/W07/W11/W17 Change governs future edits; this README is a code-navigation map, not permission.

## Owner map: question → actual symbol

| When changing… | Current source owner | Follow only if needed |
| --- | --- | --- |
| Play route, authenticated initial HTML | [server PlayPage](../../../app/(authenticated)/play/[id]/page.tsx) | per-request QueryClient prefetch + `HydrationBoundary`; [PlayScene](view.tsx) reads `useQuery` |
| Scene selection and status | [PlayScene](view.tsx): `resolutionMessage` and display JSX | [story snapshot schema](../../../../../packages/contracts/src/stories.ts) distinguishes `revision`, `viewVersion`, `resolution.version` |
| Current snapshot refresh/merge | [playStorySnapshotQueryOptions](../../shared/api/story-snapshot-query.ts) + [storyNeedsPendingRefresh](../../shared/api/story-pending-refresh.ts) → `writeStorySnapshot` | [reconcileStorySnapshot](../../shared/api/story-snapshot-reconcile.ts); W17 will own SSE + 30s safety |
| Single choice / resolution recovery | [useResolutionCommand](use-resolution-command.ts) + [intent reducer](play-command-intent.ts) + [session envelope](../../shared/api/resolution-intent-store.ts) | Nest `PUT .../resolutions/:operationId` **202**; `GET .../receipt` (W19) before user retry |
| Timed-wait control | [useControlCommand](use-control-command.ts) | Nest `PUT /:id/controls/:operationId` **200** |
| Campaign commands | [useCampaignCommand](use-campaign-command.ts): frozen URL/body `useMutation` | [CampaignPlay](campaign-play.tsx); statuses vary |
| Storyteller refresh/retry | [ResolutionRecovery](resolution-recovery.tsx) | Distinct from Play choice envelope; no automatic charged retry |
| Character, offers, holds, receipts | [CampaignPlay](campaign-play.tsx) | [CampaignView](../../../../../packages/contracts/src/campaign.ts) |
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
  -> Query pending refetchInterval (2s, not while hidden) → writeStorySnapshot until settlement
  -> clear envelope when resolution leaves snapshot
```

## Tests and exit gates

- **Fast proof:** `pnpm test:fast` — scene choice, stale poll, settlement/hide stop, 503 refresh-without-PUT, lost-ACK remount without auto-POST, intent reducer, envelope TTL/viewer isolation.
- **Real Nest receipt/idempotency:** W19 `pnpm test:focus -- story-resolution` when authorized; not an inner-loop check.
- **Extend context only for:** client/identity contract; application story owner map for exactly-once; playbook for CI/perf.

**Maintenance trigger:** if Change moves source owners, API status, snapshot identity/ordering or command recovery, update this map in that Change.
