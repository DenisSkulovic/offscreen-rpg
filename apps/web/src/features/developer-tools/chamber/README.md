# Chamber / QA | source ownership map

**First look:** Chamber is a **local development/QA** surface, not the public Play product. Its React controller currently duplicates some Play snapshot/refresh rules, but inspection and QA run state are separate concerns. The target adopts Query for authorized server state while retaining the strict local/dev-only boot boundary.
**Start:** [useChamberPlay](use-chamber-play.ts) → [transport](transport.ts) → [Nest createApp](../../../../../api/src/app.ts). Do **not** add hosted RBAC because a controller lacks a role check: **normal API startup does not register Chamber/QA controllers**.
**Source inspected:** `470a5df`, 2026-11-12, no live test. **W12 is superseded** by the [Chamber CH01–CH16 program](../../../../../../docs/engineering/chamber-program.md); [CH11](../../../../../../docs/changes/2026-11-12--chamber-workbench/CHANGE.md) owns new UI composition and depends on W15 Query. W03/W05 remain relevant for safe story identity/poll policy. Current source code and QA view have not been rewritten.

**Current vs target:** existing component is scripted scene + point-in-time inspector + manual QA journal. The new laboratory will add valid semantic specimen setup, run/step engine, causal before/after diff, command palette, reproducible evidence and Lane-aware catalogue. Do not renovate the current screen before actual CH core exists.

## Actual component and boot paths

| Question | Source | Note |
| --- | --- | --- |
| Chamber page selection | [ChamberPage](../../../../app/chamber/page.tsx) | Optional validated `?id=storyUUID`, authorized SSR story when present |
| Main client wrapper | [Chamber](view.tsx) | `useChamberPlay` coordinates scenario, story, inspector, status |
| Scene and local scenario commands | [ChamberScene](scene.tsx) and `use-chamber-play.ts` | Uses real persistence and chamber responses; own ID/body refs |
| Inspector and status | [ChamberInspectorPanel](inspector.tsx) | Read-only projection from authenticated `GET /api/chamber-tools/stories/:id` |
| QA runs/evidence | [QaWorkspace](qa-workspace.tsx) | `localStorage` key `offscreen.qa-run-id` is a *hint*, not authorization |
| Browser API adapters | [Chamber transport](transport.ts) | Reexports shared story helpers and validates separate inspector/QA schemas |
| Local launcher | [tools/chamber main](../../../../../../tools/chamber/src/main.ts) | Calls `createApp` with `developerTools: !storyMode` and local fixture identity |
| Ordinary API | [normal Nest startup](../../../../../api/src/main.ts) | Does **not** enable developerTools; controllers absent |
| Registration gate | [createApp](../../../../../api/src/app.ts) | Includes `ChamberStoriesController`, `ChamberToolsController` and `QaJourneysController` **only if** flag is true |

## Security and lifecycle details the executor must preserve

- Conditional controller registration is **not the same as hiding a UI link**. In normal API mode the special routes are not mounted. The loopback harness intentionally has its own identity; don't delete it in the name of “auth hardening.”
- Even in developer mode, owner-scoped `storyId`/`runId` checks belong in Nest application operations. Browser `QA run ID` must be viewer-scoped and reauthorized.
- Share only correct pure story version acceptance/GET refresh policy with Play. Do **not** merge QA inspector/private DTOs or scenario shortcuts into public Play Query cache.
- Current `useChamberPlay` owns its own `setTimeout` polling and inspector requests; late updates must be fenced on route/viewer identity and cleaned up on unmount or story switch.
- A local, provider-free fixture is not a successful live Storyteller run or evidence of production permissions.

## Fast proofs and deeper routes

- **Unit/RTL:** old inspector GET arriving after story switch, QA-run ID after viewer change, Strict Mode cleanup, version ordering under wrong story. 
- **Connected boot-mode test:** ordinary Nest startup denies/misses Chamber endpoints, explicit local developer-mode startup mounts them and still owner-scopes data. Use disposable auth integration only with permission; [integration setup warning](../../../../../../tools/api-integration/README.md).
- **Architectural target:** [F13 developer isolation](../../../../../../../docs/engineering/targets/react-next.md); **API route map:** [Nest story and Chamber endpoints](../../../../../api/src/modules/stories/README.md).

**Maintenance:** update only on change of controller mount mode, inspector/QA query state owner, auth guarantee or significant module move. Do **not** introduce a `DEVELOPER_USER_IDS` hosted allowlist without a separate explicit product/deployment decision; preserve the existing `developerTools` Nest registration gate (W12 superseded by CH10–CH11).
