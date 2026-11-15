# GM06 evidence | per-viewer visit opening checkpoint

**Date:** 2026-11-15. **Change:** [GM06](../../changes/2026-11-13--gm-viewer-read-position/CHANGE.md). **Provider spend:** none.

## What landed

- Additive tables: `story_viewer_visit`, `story_viewer_visit_open`, `story_viewer_visit_ack` (migration `0007`).
- `GET /api/stories/:id/visit` — previous/frontier/window/visitToken; no mutation of checkpoint.
- `PUT /api/stories/:id/visit/acks/:ackId` — idempotent MAX cursor; frontier must match open token.
- Client ACK gate helper refuses hidden/prefetch paths; digest copy distinguishes Recent vs Since last opened.

## Proof

| Command | Result |
| --- | --- |
| `node --test packages/application/test/gm06-visit-checkpoint.live.test.mjs` | 2/2 pass |
| `pnpm --filter @offscreen/web exec vitest run src/features/play/visit-checkpoint.test.ts` | 4/4 pass |

## Not in this slice

Full Play Journal UI wiring that renders the digest and Continue button remains a composition follow-up; server contract and ACK policy are Done.
