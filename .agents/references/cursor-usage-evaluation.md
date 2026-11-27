# Cursor usage and integrated-outcome measurement | lightweight protocol

**Selected November 20, 2026.** This is a measured experiment adjunct to [bounded parent orchestration](bounded-parent-orchestration.md) and [Cursor model policy](../../.cursor/MODEL-POLICY.md), not another queue, mandatory reporting system, or permission to change models. Hold the current model policy stable while evaluating the new compact child-return pattern.

## One comparable trial

Pick **one authorized Change**, approximately 2–5 small T-IDs or one cross-service join, with no competing active Cursor conversations if practical. Record in the parent batch receipt: start/end in timezone-aware ISO format, starting and final SHA, parent/children actual model variants when observable, T-IDs attempted and accepted, repeated failures, joins performed, final proof tier (pure / DB / multi-process / browser / kind), commits and Change disposition. If T-IDs remain open, report the exact acceptance still missing. Do not log private prompts, credentials, model responses, or full transcripts to public Git.

After the batch, export a Cursor usage CSV locally. Run:

```bash
pnpm repo:cursor-usage /path/to/usage-events.csv --from 2026-11-19T22:45:00Z --to 2026-11-20T00:45:00Z
pnpm repo:cursor-usage:test
```

The timestamps are an **example** for the older November 20 parallel run, not the next session's dates. Bounds are **inclusive start, exclusive end**. You can use explicit local offsets such as `+02:00`; never use ambiguous local times. The script has no network dependency or provider calls and returns JSON to stdout. Put optional local exports under the already ignored `out/` directory. Raw usage CSVs and Cursor chat transcripts should stay **out of the public repo**.

## What the CSV can prove

The November 20, 00:45–02:45 Europe/Vilnius export window contained 268 events, 267 with measured tokens, 216,416,309 reported tokens of which 199,928,320 were cache reads; 150 Composer Standard, 115 Grok 4.6 Medium, and 3 Composer Fast events; **zero** populated Cloud Agent IDs. Those totals were reproduced with the offline script. **One event had no token columns**, so missing does not mean zero. The entire uploaded 725-event export contained six such rows.

`Cost` contained text labels such as `Included` and `Free`, not numeric monetary charges. **Dollar/euro cost is unknown.** Without agent identifiers, the window cannot identify which model acted as parent, which as child, or which events produced a successful T-ID. If other conversations overlap, the window isn't even exclusive session usage.

## What to compare

For each trial, evaluate **accepted integrated outcomes and real negative proof**, not the number of agents kept running or tests listed in child notifications. Compare similar Change scope and proof tier across at least three bounded batches before asserting improvement. Track rework/false-green/owner intervention, elapsed wall time, parent recap frequency, and whether a child completion was repeated verbatim. If an actual billed monetary amount and a reliable session/task identifier become available, record them distinctly; do not backfill estimates from cache-read totals.

**Experimental change:** shorten ordinary child replies to the existing six-line protocol and stop parent repetition after notifications. Keep concurrency, model policy, and proof requirements otherwise constant. If proof quality deteriorates, restore the needed detailed failing context instead of blindly enforcing line limits.

This protocol requires **no new Change packet**, no automatic polling/monitoring, no additional hooks, and no raw private dataset in git. A single normal batch receipt remains the canonical outcome record.
