# SA12 | Dry-run live comparison tooling (2026-11-14)

**Change:** [SA12 controlled live evaluation](../../../../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa12-controlled-live-evaluation/CHANGE.md)
**Provider spend:** zero.

## What landed

- `live-comparison-trial.v1` + human-review worksheet contracts
- `dryRunLiveComparison` fail-closed runner (one variable only; `allowPaid` rejected)
- CLI `pnpm storyteller:live-comparison` (defaults dry-run; `--paid` exits 2)

## Commands

```text
pnpm --filter @offscreen/contracts build
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test test/live-comparison.test.mjs
pnpm storyteller:live-comparison
```

## Results

| Check | Result |
| --- | --- |
| Unit: one-variable promptVersion dry-run | pass |
| Unit: allowPaid / multi-variable / cash-cap negatives | pass |
| CLI dry-run emits trial + worksheet; spend=$0 | pass |

## Still separately authorized

Actual OpenRouter/paid comparison runs, disposable DB connected POC, and owner human scoring of live outputs. Completing this tooling does **not** mean a connected POC passed.
