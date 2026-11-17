# HK05 | Remove two transitional Play import shims after UI composition settles

**State: Ready after UI03 (unselected).** **Source:** inspected `main@4e42bd7`; no code changes in the one intervening commit `f279b362`. **Program:** [housekeeping audit](../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md). **Outcome:** Play source consumers import the actual owner modules rather than two obsolete one-line compatibility surfaces.

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

## Reconciliation ledger

| Owner | Preserved behavior | Proof | Docs/status |
| --- | --- | --- | --- |
| Play view and settings | direct canonical imports; no state change | pending | pending |
| Mock/test imports | same observed action and recovery behavior | pending | pending |
| UI03 and Play source map | no conflicting migration | pending | pending |

**No automatic current selection.** Select HK05 only after UI03 is reconciled and its imports rechecked.
