# CQ03 | normal and negative proof
| Case | Must hold |
| --- | --- |
| Read normal/uncertain/failed/blocked snapshot | exact prior status and accessibility text |
| Legacy noncampaign offer | same option order, description/risk support, revision and interaction id on click |
| Offer absent or campaign character present | no legacy options and **no** forced non-null access |
| Journey active/paused | identical due/remaining text and Pause/Resume actions |
| Control pending/frozen | button stays disabled; no duplicate command |
| Journal/initial render | no extra POST or lost focus navigation |
| Background offline/refetch error | same recovery and no automatic command |

Run `pnpm --filter @offscreen/web test -- src/features/play/view.test.tsx` (or exact Vitest `pnpm --filter @offscreen/web exec vitest run src/features/play/view.test.tsx`), `pnpm --filter @offscreen/web typecheck`, changed TS/TSX Prettier + quality lint. No browser live payment/provider. Use existing `view.test.tsx` and new `model/play-status.test.ts` only; avoid broad snapshots and trivial formatting churn.
