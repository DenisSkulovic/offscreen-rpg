# SA12 | Paid Gate-1 Seyda opening (Luna) — 2026-11-14

**Change:** [SA12 controlled live evaluation](../../../../work/changes/archive/2026-11/storyteller/2026-11-14--sa12-controlled-live-evaluation/CHANGE.md)  
**Mode:** `chamber` `--evaluation-run` (existing Gate-1 path). Not the dry-run comparison CLI.

## Owner cash policy for this session

| Limit | Value |
| --- | --- |
| Session hard cash cap | **$0.05 USD** (50,000 µUSD) |
| Operation `maxMicrousd` | 50,000 µUSD |
| Max primary dispatches | 1 |
| Repair / automatic retry | forbidden |
| Model / endpoint | `openai/gpt-5.6-luna` via OpenAI/`openai` |
| Case | `seyda-neen-opening` @ `1` |

Worst-case reservation from the held packet was **27,458 µUSD** (~$0.027), under the hard cap.

## Result

| Field | Value |
| --- | --- |
| Evaluation id | `4976b203-442d-4099-a6ff-1f9bbbca395d` |
| Generation id | `41879474-3416-410b-a180-ded2a065522a` |
| Attempt state | `settled` |
| Generation state | `failed` (`invalid_output`) |
| Diagnostic stage | `task-output` — `storyteller_policy` / `Invalid opening plan: invalid-shape` |
| Request bytes | 41,519 (held packet ~40,752) |
| Prompt / completion / cache-write tokens | 7000 / 990 / 6997 |
| Charged µUSD | **2938** ($0.002938) |
| Calculated µUSD | 2938 |
| Reconciliation | **matched** |
| Duration | 12,349 ms |
| OpenRouter `/credits` delta | unchanged in the ~17s window (lag; same pattern as 2026-11-13) |

**Spend:** $0.002938 against a $0.05 hard cap. No second dispatch.

## Commands actually run

```text
pnpm infra:up
# OPENROUTER_API_KEY from ignored .env.openrouter (not dotenv-loaded by chamber)
pnpm --filter @offscreen/{api,application,storyteller,chamber,...} build  # web full build was red from unrelated TS; chamber started from package start
pnpm --filter @offscreen/chamber start -- --evaluation-run --config=tmp/sa12-gate1-evaluation.json --authorize=<evaluation-id> --reset-database
```

Local disposable DB: `offscreen_chamber` reset. Temp report path (not committed): `%TEMP%\offscreen-rpg-packet-review\evaluation-report-41879474-*.json`.

## Negatives observed

- Recipe `maxInputTokens: 12000` rejected admission with `context_too_large` before any provider call (serialized Seyda+canonical packet needs ~41k UTF-8 bytes; evaluation authority maps token ceiling to serialized-byte ceiling 1:1).
- Root `pnpm chamber:evaluation-run` turbo filter currently fails `@offscreen/web` typecheck; paid run used built API/chamber packages directly.
- Luna returned HTTP 200 structured JSON that failed opening-plan validation; run stopped without repair (correct for Gate-1 one-shot).

## Still not done

Paid SA12 **two-variant comparison** harness, owner human scoring of live prose, and a multi-turn connected POC remain separately authorized.
