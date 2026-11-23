# Play feature map

**Entry:** [`PlayScene`](view.tsx) — one viewer/story TanStack Query snapshot (`playStorySnapshotQueryOptions`), live hints via [`useStoryLiveUpdates`](use-story-live-updates.ts) (SSE → scoped invalidate → GET), frozen choice/control mutations (retry 0), sessionStorage resolution recovery, and composition into [`StoryFrame`](ui/story-frame.tsx).

## Layout

| Area | Role |
| --- | --- |
| **Top-level** | `view.tsx`, `play-query-boundary.tsx`, command hooks (`use-resolution-command`, `use-control-command`), `resolution-recovery.tsx`, `campaign-settings.tsx`, `history.tsx`, `play-command-intent.ts` |
| [`api/`](api) | Campaign transport — [`use-campaign-command.ts`](api/use-campaign-command.ts), [`campaign-command.ts`](api/campaign-command.ts) |
| [`model/`](model) | Pure projections and labels — `play-status`, `campaign-projections`, `pace-options`, `live-presentation`, `use-offer-path` |
| [`presentation/`](presentation) | Appearance directive resolve/parse (live path: `model/live-presentation.ts` → `presentation/resolve.ts`) |
| [`ui/`](ui) | Book shell (`story-frame`, book surface/contents), campaign panels, journey timing, intention/narrative/scene-media |

**Route:** [`app/(authenticated)/play/[id]/page.tsx`](../../../app/(authenticated)/play/[id]/page.tsx) seeds Query; Play does not Nest-read inside `prefetchQuery` queryFn.

## Data and commands (stay in owners)

- Snapshot merge: [`story-snapshot-query`](../../shared/api/story-snapshot-query.ts) + `writeStorySnapshot`; live stream in `use-story-live-updates`.
- Choice envelope + receipt GET: `use-resolution-command` + `resolution-intent-store`; never auto-POST on remount.
- Timed wait: `use-control-command`; [`JourneyTimingNotice`](ui/journey-timing-notice.tsx) is presentation + callback only.
- Campaign UX: [`CampaignPlay`](ui/campaign-play.tsx) + `api/use-campaign-command`; offer path in `model/use-offer-path` + `ui/campaign-offer`.
- Stage status strings: `model/play-status` (`resolutionMessage`, `stageStatusLabel`); `PlayScene` displays only.

## `PlayScene` render order

1. Missing snapshot — route recovery or loading placeholder
2. `SessionRefresh` + `StoryFrame` (passage, legacy intentions, presentation)
3. `playJournalSection` — journal leaf
4. `playStageExtras` — journey control, frozen retries, status line, snapshot refresh notice, resolution recovery, campaign surface
5. `playFrameDetails` — settings + technical disclosure

## Fast checks

`pnpm test:fast` — scene choice, SSE/poll, recovery, offer path, story-frame book tests under `ui/`. Update this map when moving owners or recovery contracts.