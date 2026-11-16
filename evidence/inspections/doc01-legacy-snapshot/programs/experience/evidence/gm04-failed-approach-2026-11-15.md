# GM04 evidence | failed reassurance changes next approach

**Date:** 2026-11-15. **Change:** [GM04](../../../../work/changes/archive/2026-11/experience/2026-11-13--gm-offer-distinctness/CHANGE.md). **Provider spend:** none.

## What landed

- Seed `pineapple-mechanics.v4` includes `gary-reassurance-tried=false`.
- Failed `calm-gary` sets that fact true; plan requires it false before another reassurance.
- After failure, scripted consequence offers `take-cover` + `observe-from-doorway` (no `calm-gary`).
- Atlas [SB-02](../../../technical/playthroughs/spongebob.md#sb-02-a-failed-reassurance--current-gm04) updated to match.

## Proof

`pnpm --filter @offscreen/storyteller test` — full suite green, including `GM04: failed reassurance removes calm-gary and offers a distinct next approach`.
