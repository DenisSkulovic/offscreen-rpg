# Play | source ownership and lifecycle map

**First look:** The current `PlayScene` stores a `StorySnapshot` in React state, polls and sends commands; campaign subviews render that snapshot. The **selected target** replaces this with one viewer/story-keyed TanStack Query projection and frozen command intents. **The target is not yet implemented.**
**Start:** [PlayScene](view.tsx) → [snapshot transport](../../lib/story-transport.ts) → [Nest stories endpoints](../../../../api/src/modules/stories/controller.ts). **Do not infer game mechanics or provider success in React.**
**Source basis:** GitHub application baseline `470a5df`, inspected 2026-11-12, no local run. **Execution:** selected W03/W04/W05/W06/W07/W11 Change governs future edits; this README is a code-navigation map, not permission or a second technical spec.

## Owner map: question → actual symbol

| When changing… | Current source owner | Follow only if needed |
| --- | --- | --- |
| Play route, authenticated initial HTML | [server PlayPage](../../../app/(authenticated)/play/[id]/page.tsx) | [requireViewer](../../server/viewer.ts) + [readNestJson](../../server/nest-reader.ts); Zod `storySnapshotSchema` |
| Scene selection and status | [PlayScene](view.tsx): `resolutionMessage` and display JSX | [story snapshot schema](../../../../../packages/contracts/src/stories.ts) distinguishes `revision`, `viewVersion`, `resolution.version` |
| Current snapshot refresh/merge | `view.tsx`: `acceptSnapshot`, polling `useEffect` | [preferNewerSnapshot](../../lib/story-transport.ts); **no viewer/story identity check in comparator** today |
| Single choice and timed-wait control | `view.tsx`: `respond` / `control` with UUID refs | Nest `PUT /stories/:id/resolutions/:operationId` **202**, `PUT /:id/controls/:operationId` **200** |
| Campaign commands | [useCampaignCommand](use-campaign-command.ts): `send` | [CampaignPlay](campaign-play.tsx) uses it for activity/time/action controls; statuses vary |
| Resolution refresh/retry | [ResolutionRecovery](resolution-recovery.tsx) | Storyteller state not always settled; no automatic charged retry |
| Character, offers, holds, receipts | [CampaignPlay](campaign-play.tsx) | [CampaignView](../../../../../packages/contracts/src/campaign.ts) and `@offscreen/game/calendar` pure formatting |
| Storyteller settings, presets, history | [CampaignSettingsEditor](campaign-settings.tsx) | Current parent `key={settings.revision}` risks remounting dirty editor; later RHF/Query |
| Read-only chronology | [StoryHistoryView](history.tsx) | GET `/:id/history?before=number`, separate page state and race handling |

## One useful command path

```text
URL /play/:id
  -> (authenticated) PlayPage -> requireViewer() -> readNestJson /api/stories/:id -> storySnapshotSchema
  -> PlayScene -> user chooses -> PUT /resolutions/:operationId (same UUID/body on retry)
  -> Nest admits (202), returns current public snapshot
  -> browser reads/polls until authoritative version/settlement
  -> view renders committed story and server-owned receipt (not an optimistic roll)
```

**Current limitations to remember:** retry refs survive a component render but not a full reload; source comparator orders versions without story/user identity; Play polling ignores GET errors; `CampaignPlay` is large but its line count is **not** itself a defect. These issues are assessed against [selected F3–F7 target](../../../../../docs/engineering/targets/react-next.md), not excuses to change the UI.

## Tests and exit gates

- **Fast proof (W01 landed):** provider-free Vitest/RTL/MSW under `view.test.tsx`, `resolution-recovery.test.tsx`, and `src/lib/story-transport.test.ts` (run `pnpm --filter @offscreen/web test:fast`). Covers scene render + choice, deferred refresh, stale poll rejection, unmount poll cleanup, and pure `preferNewerSnapshot` ordering. Does **not** prove Nest ownership, SSR privacy, wrong-story identity (still W03), or reload-frozen UUID (W04).
- **Real integration when explicitly authorized:** [browser story scenarios](../../../../../tools/api-integration/test/stories-browser.integration.ts), [resolution integration](../../../../../tools/api-integration/test/story-resolution.integration.ts) and [destructive-test warning](../../../../../tools/api-integration/README.md). The focused integration runner resets disposable `offscreen_auth_test`; not an inner-loop check.
- **Extend context only for:** authorization/HTTP error semantics → [client and identity](../../../../../docs/technical/client-and-identity.md); persistent exactly-once effects → [application story owner map](../../../../../packages/application/src/stories/README.md); performance/CI work → [tooling playbook](../../../../../docs/engineering/frontend-execution-playbook.md) at its relevant heading.

**Maintenance trigger:** if Change moves source owners, changes API status, snapshot identity/ordering or command recovery, update this *map* in that Change. Do not paste architecture contracts into it. For plain JSX refactoring with unchanged ownership, no README update is required.
