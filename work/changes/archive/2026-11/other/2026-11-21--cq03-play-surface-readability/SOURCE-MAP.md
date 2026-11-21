# CQ03 | source ownership
- `apps/web/src/features/play/view.tsx` 1–118: online subscription and `resolutionMessage`/`stageStatusLabel` pure presentation classification, then `PlayScene` begins ~119.
- `PlayScene` ~125–190 owns `useStoryLiveUpdates`, `useQuery(playStorySnapshotQueryOptions)`, `useResolutionCommand`, `useControlCommand`, snapshot cache `writeStorySnapshot` with allocated epoch, recovery and choice eligibility. **Do not relocate hooks or alter key/epoch semantics.**
- `PlayScene` ~200–310 renders `StoryFrame`, conditional legacy offer with `offer!`, waiting notice and control action. The timing block uses `waiting.remainingMs`, `dueAt`, `gameDurationMs`, `canControl`, `controlRevision` and `journeyAction(waiting)`; extract view-only rendering with a callback that captures the authoritative scene and control object in the parent.
- `PlayScene` ~310–415 owns recovery, CampaignPlay, history/settings, technical details. Keep them in view.tsx for this Change.
- `apps/web/src/features/play/view.test.tsx` uses MSW and Query harness: Journey/Journal, choice, loading/recovery and POST behavior. `apps/web/src/features/play/README.md` is source ownership guide.
- `@offscreen/contracts/stories:StorySnapshot` is validated server projection. Browser must not derive new mechanics.
