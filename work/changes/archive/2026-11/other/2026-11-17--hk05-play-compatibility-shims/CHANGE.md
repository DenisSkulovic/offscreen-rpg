# HK05 | Remove two transitional Play import shims after UI composition settles

**State: Done (2026-11-18).** UI03 is Done. Rechecked `main@dca79183`. Both one-line reexports were still present, and this change removes them. **Program:** [housekeeping audit](../../../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md). **Outcome:** Play source consumers import the actual owner modules rather than two obsolete one-line compatibility surfaces.

## Concrete evidence

- `apps/web/src/features/play/campaign-play.tsx` explicitly says “Compatibility entry: real composer lives in ui/campaign-play” and only reexports `CampaignPlay`. Actual `view.tsx` and view/recovery tests currently import or mock that intermediary.
- `apps/web/src/features/play/use-campaign-command.ts` only reexports the hook from `api/use-campaign-command.ts`; `campaign-settings.tsx` still uses the old path.
- The real campaign composer is `apps/web/src/features/play/ui/campaign-play.tsx`; the real API hook is `apps/web/src/features/play/api/use-campaign-command.ts`. Do not confuse these with `apps/web/src/features/developer-tools/chamber/history.tsx` which deliberately shares a Play history component, or `createSeededDraw` which still has Bench callers.

## Cursor implementation envelope

1. Recheck current import graph and source tests on HEAD. **Wait for UI03** (and any active implementation touching Play composition) to finish; if UI03 already removes these wrappers, close HK05 as superseded with an evidence receipt rather than re-create work.
2. Point `view.tsx` and `campaign-settings.tsx` at canonical modules and update import-path-sensitive mocks/test fixtures. Search all imports and exact path references before removing the two wrapper files.
3. Delete only those two wrapper files once no consumer remains. Avoid a global file rename, React state redesign, transport refactor, shared component redesign or unrelated Chamber changes.
4. Update `apps/web/src/features/play/README.md` if its current navigation references the old route. Preserve client/server boundaries and exact command reuse/frozen-envelope behavior.

## Falsifiable acceptance

- **Normal:** Play scene, Campaign settings, view tests and campaign component tests import and render/submit using canonical modules. No double-submit/retry or Query boundary regression; UI03 book composition unaffected.
- **Negative:** test mocks still intercept the actual module import (not an orphaned shim); code search finds zero imports of removed paths. An attempted duplicate command remains fenced.
- **Proof:** scoped web tests and `pnpm lint:web`/typecheck if available. Do not claim checks ran from this design audit or use real providers. Run a mechanical final search for old symbols, paths and broken docs.
- **Review:** a small deletion-only structural simplification plus needed imports/tests; if it expands into presentation redesign, stop and separate scope.

**Selected 2026-11-18.** UI03 was already reconciled. The import recheck found both shims, and this change removes them.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/play-and-decisions.md#choosing keeps the same choice and command rules | docs/product/experience/play-and-decisions.md#main-view | Import cleanup is not a new play rule |
| Technical | unchanged because docs/technical/client/architecture.md#3-command-error-and-recovery-contract keeps the frozen envelope and the no-automatic-replay rule | apps/web/src/features/play/api/use-campaign-command.ts | The hook file stays the command owner |
| Code | changed: apps/web/src/features/play/view.tsx and apps/web/src/features/play/campaign-settings.tsx import the owner modules. Negative: a mock of the removed shim must not be what intercepts PlayScene | apps/web/src/features/play/ui/campaign-play.tsx | A duplicate click stays one operation |
| Related | changed: work/designs/open/repository-housekeeping/README.md records this removal after the two files are gone | apps/web/src/features/play/README.md | The Play map already names the owner modules |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/play-and-decisions.md#choosing | product | unchanged because the choice and command rules were not edited | apps/web/src/features/play/view.tsx dirty against dca79183da969ddbd53ddf8b4209343ce327dc10 | source-observed | the choosing section does not gain a new action | the heading stayed in place |
| docs/technical/client/architecture.md#3-command-error-and-recovery-contract | technical | unchanged because the frozen envelope and the no-automatic-replay rule were not edited | apps/web/src/features/play/api/use-campaign-command.ts at dca79183da969ddbd53ddf8b4209343ce327dc10 | source-observed | the command hook file was not replaced | the heading stayed in place |
| apps/web/src/features/play/view.tsx | code | changed: PlayScene imports the composer from the ui module, and the one-line reexport is removed | apps/web/src/features/play/view.tsx dirty against dca79183da969ddbd53ddf8b4209343ce327dc10 | fixture-tested | the scene tests mock the ui module; a search finds no import of the removed reexport | the Play map already names the ui module |
| apps/web/src/features/play/campaign-settings.tsx | code | changed: settings import the command hook from the api module, and the one-line reexport is removed | apps/web/src/features/play/campaign-settings.tsx dirty against dca79183da969ddbd53ddf8b4209343ce327dc10 | fixture-tested | the frozen preset retry still sends the saved body | the Play map already names the api hook |
| apps/web/src/features/play/README.md | related | unchanged because the map already names the owner modules | apps/web/src/features/play/README.md at dca79183da969ddbd53ddf8b4209343ce327dc10 | source-observed | the map does not send readers through the removed reexports | no heading moved |
| work/designs/open/repository-housekeeping/README.md | related | changed: the cleanup map records that the two reexports are gone | apps/web/src/features/play/view.tsx dirty against dca79183da969ddbd53ddf8b4209343ce327dc10 | source-observed | HK01, HK03, and HK04 stay gated | the audit row records the same removal |

exception: work/changes/README.md because the queue line is the selection route for this packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/README.md because the design index records that this cleanup packet is done
exception: work/designs/open/repository-housekeeping/AUDIT-2026-11-17.md because the audit finding records that the two reexports are gone

## Receipt

Scoped Play tests, 5 files and 23 tests, include the double-click fence and the frozen preset retry. The retargeted mocks are apps/web/src/features/play/view.test.tsx, apps/web/src/features/play/play-initial-recovery.test.tsx, and apps/web/src/features/play/resolution-double-submit.test.tsx. `pnpm lint:web` stops on an existing image warning in apps/web/src/features/play/ui/scene-media.tsx. The files this change edited have no lint findings. `pnpm --filter @offscreen/web typecheck` reported no type errors. No model call.

This packet does not start HK01, HK03, or HK04.
