# Web: Next.js player interface

`@offscreen/web` owns presentation, forms and interaction with **published server projections**. It is not a second gameplay engine, clock, dice roller or provider-billing authority. Before changing the player experience, read [product UI intent](../../docs/player-experience.md); [client and identity](../../docs/technical/client-and-identity.md) owns intended browser/session boundaries.

## Find the screen or interaction

| Player task | Start here | Follow only if needed |
| --- | --- | --- |
| Public introduction and login | [app/page.tsx](app/page.tsx), [app/sign-in/page.tsx](app/sign-in/page.tsx) | Session utilities under [src/lib/](src/lib/) |
| List stories, create/edit drafts | [app/stories/page.tsx](app/stories/page.tsx), [app/stories/new/page.tsx](app/stories/new/page.tsx), [draft-editor.tsx](src/features/stories/draft-editor.tsx) | [API drafts](../api/src/modules/drafts/controller.ts) |
| Review an opening before Start | [app/stories/[id]/page.tsx](app/stories/[id]/page.tsx), [opening-preview.tsx](src/features/stories/opening-preview.tsx) | Draft/opening public contract |
| Play: scene, choices, status, recovery | [app/play/[id]/page.tsx](app/play/[id]/page.tsx), [play/view.tsx](src/features/play/view.tsx) | [campaign-play.tsx](src/features/play/campaign-play.tsx), [resolution-recovery.tsx](src/features/play/resolution-recovery.tsx) |
| History and settings | [history.tsx](src/features/play/history.tsx), [campaign-settings.tsx](src/features/play/campaign-settings.tsx) | Story snapshot and campaign settings contracts |
| Server session and request/snapshot handling | [viewer.ts](src/lib/viewer.ts), [story-transport.ts](src/lib/story-transport.ts) | `preferNewerSnapshot` avoids older view versions replacing newer ones |
| Local developer inspector | [app/chamber/page.tsx](app/chamber/page.tsx), [Chamber features](src/features/developer-tools/chamber/) | Debug UI is **not** the ordinary player experience |
| Authored visual prototype | [app/demo/page.tsx](app/demo/page.tsx) | Browser-only script, resets on refresh, **not** persistent gameplay |

## Authority and design traps

The server Play route validates `storySnapshotSchema` before rendering `PlayScene`; client commands request server-owned state transitions. Do not show a prepared action as a settled reward, treat an uncertain provider response as permission for another model call, or infer private mechanics from UI text. New interactive states must handle late/stale replies, loading, blocked, failed and uncertain separately.

For development-agent expertise, load [frontend-engineering](../../.agents/skills/frontend-engineering/SKILL.md) or [player-experience-design](../../.agents/skills/player-experience-design/SKILL.md) when the task warrants it; do not preload both for every CSS change.

The package manifest has `dev`, `build`, `start` and `typecheck`, **no local `test` script**. Browser/integration evidence lives under [tools/api-integration](../../tools/api-integration/). TypeScript compilation alone does not certify visual hierarchy or keyboard usability.
