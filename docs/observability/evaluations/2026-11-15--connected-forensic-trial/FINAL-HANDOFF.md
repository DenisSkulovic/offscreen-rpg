# Cursor → ChatGPT forensic evidence handoff

**Status: EXECUTED 2026-11-15.** Provider-free S0–S4 complete; S5 live paid send **BLOCKED** on OBS00-B (and transport-custody not independently proven). No fabricated live results.

## Executive conclusion

Local Compose + Nest/Next/Temporal Connected paths work for scripted chamber campaigns: letter transfer and timed Temporal default both persisted in `offscreen_chamber` with correct `response_source` and public events, zero provider attempts. Storyteller OBS02/03/02-H fault matrix (F1–F5) passed on disposable sandboxes. OBS06/OBS07 shipped on `main` with steward-bound case/campaign grants, privacy 404s, sentinel-free S1 JSON/UI, and a connected Playwright Support situation proof — but **no production grant issuer** exists, so real Support staff still cannot open Situation without SQL/fixture binding. Paid live Storyteller was correctly refused: `config.ts` still does not supply `dispatchAuthority` (OBS00-B). Top recommendation: implement OBS00-B entitlement-backed `dispatchAuthority` plus a trusted Support grant-steward workflow before any capped live trial or production Support rollout.

## Source, environment and authority

- Repository source SHA / branch: final handoff commit on `main` (see appendix); baseline kickoff `fa4fef80`
- OS / Node / pnpm / Docker / API / worker / web: Windows 10; Node v24.19.0; pnpm 11.19.0; Compose postgres/redis/s3mock/temporal healthy; chamber Nest:3001 Next:3100
- Local database(s) touched and whether disposable: `offscreen_chamber` (persistent local lab); `offscreen_auth_test` + disposable sandboxes (reset/destroyed); never production
- Owner kickoff permission and any paid budget: S0–S6; OBS06→OBS07 if gates; live ≤$0.25 / 4 req / $0.10 op **only after gates**
- Provider requests actually attempted: **0**
- Settled cost / possibly charged uncertain amount: **$0 / none**
- Current active Change and Git commit: `Current change: none`; OBS06 `26f4d322`; OBS07 `8f509c63`

## Phase outcomes

| Phase | DONE / PARTIAL / FAILED / BLOCKED | Exact executed checks + outcome | Real evidence |
| --- | --- | --- | --- |
| S0 Infra/baseline | PARTIAL | Compose healthy; admin-diagnostics pass; storyteller focus 6/33 fail `time.id` Zod; OBS unit/live supplemental pass | RUN-LOG S0; commit `f44b0b33` |
| S1 Connected story play | DONE | stories-browser 4/4; chamber smoke; `--forensic-campaigns` A/B; packet + memory-comparison + fixture audit | S1-CAMPAIGN-IDS.json; `24aef3dd` |
| S2 SQL/AI causal capture | DONE | Chamber SQL A/B; disposable consequence G with 7 stages + OBS03 provenance; held chamber G stages=0 | S2-LEDGER.json; `b866cef0` |
| S3 Fault/recovery | DONE | F1–F5 PASS (ENG03, OBS02-H, worker restart, stale-publication fixture, uncertain/unsent gates) | S3-FAULT-MATRIX.json; `7a7ee811` |
| S4 Admin S1/UI | DONE (synthetic) | OBS06 situation API + OBS07 UI; admin-situation 3/3; web test:fast; admin-control-ssr incl. Playwright | obs06/obs07 evidence receipts; `26f4d322` / `8f509c63` |
| S5 Conditional live | BLOCKED | Preflight packets/live-comparison dry-run OK; **OBS00-B missing**; OBS00-C byte custody not proven; no paid send | RUN-LOG S5; config.ts comment |
| S6 Reconciliation | DONE | This handoff | FINAL-HANDOFF.md |

## Original actual campaigns and chronology

**Story A** `768b7227-4032-4eab-b691-3910a1644341` chamber.v5: rev/view 2; passage seq2 player; item `sealed-letter`→`caretaker`; public event passage-published; **no G**; attempts=0.

**Story B** `93a23f44-8106-4f47-9992-0dfb131eba82` chamber.v4: rev 2→3 while browser closed; seq3 `response_source=default`; dueAt `2026-11-15T18:05:54.620Z`; two public events; **no G**; attempts=0.

**Held opening (not A/B)** G `14275b91-51d5-43a0-9931-b578e8dc09ba` awaiting-review; packetSha256 `9a9259ca…`; **0** OBS02 stages in chamber.

**Disposable consequence (S2)** G `3985fb72-69ae-45fd-b6c4-cb1bf922fecd` O `a6d96226-…`: stages cause→materialize→task→skipped→validation→publication; provenance task/compiled SHAs recorded; sandbox destroyed after capture.

## One actual normal trace and one failure trace

**Normal (scripted consequence G):** O→receipt.generationId=G (Recorded) → 7 stage rows with epoch-qualified materialization key `e0:a1` → OBS03 sidecar present → publication-decided → passage seq2 `source_generation_id=G`. Provider stages absent by scripted `stage-skipped/not-run` (source-proven). Transport hash equality: **not-verified**.

**Failure/gap (held chamber opening):** G exists `running`/`awaiting-review` with local packet artifact, but chamber DB has **zero** `storyteller_execution_stage` and **zero** provenance — stage order for Support diagnosis **unanswerable** from SQL alone.

## Support and Developer investigation

- OBS06 Done synthetic/disposable: `forensics.campaign.situation.read` + `support-investigator` v1; steward-case-binding provenance; support-operator unchanged; self-created case+link denied.
- OBS07 Done: Support Cases “Open situation” panel; RTL/MSW + Playwright connected proof; sentinel absent; human-utility fixture answered from UI (mechanic settled; model attempt none-recorded ≠ proof no provider; no new scene / passage #23).
- Production Support still blocked without grant steward issuer.
- Developer Context Inspector / raw prompt: deliberately out of S1; not expanded.

## Cost, latency, storage and privacy

- Provider: 0 requests, $0 settled, no uncertain attempts.
- OBS06 situation GET: ~27 queries, ~30 ms p50; caps 8 events / 12 stages independent of 2k passages.
- ENG03 lock proof sample: stage1≈30 ms vs materialize≈2136 ms under 500 ms CAS delay.
- Privacy: no prompt/narrative bodies committed; temp packet paths under Local\Temp; chamber stories remain local DB only.

## Findings ranked by evidence and urgency

| Rank | Observation | Source proof | Meaning | Specific smallest next Change |
| --- | --- | --- | --- | --- |
| 1 | OBS00-B `dispatchAuthority` absent | `packages/application/src/storyteller/config.ts` | Paid send correctly blocked | OBS00-B entitlement-backed dispatch authority |
| 2 | No production Support grant steward | OBS06/07 receipts; SQL fixture only | UI/API green but unreachable for real staff | Trusted case+campaign grant issuance workflow |
| 3 | storyteller focus suite broken on `time.id` | S0 27 failures Zod calendar | Broad integration health noise | Fixture calendar ID fix Change |
| 4 | Held opening lacks OBS02 stages in chamber | S2 SQL 0 rows for held G | Support cannot reconstruct stage order for hold-review | Instrument hold/review path stages or document coverage gap |
| 5 | story-resolution cleanup FK after OBS02 stages | S1 AggregateError on generation delete | Test harness debt after OBS02 | Include stage cleanup in app-integration release |

## What remains unproved

- Complete long-history mechanical replay (requires E0 / OBS04): **unproved**
- Exact per-round provider transport vs reviewed packet (OBS00-C): **unproved**
- Raw private archive retention/erasure and S3 Developer body authorization: **unproved**
- Live paid model quality: **blocked** (OBS00-B)
- Production OTel/Grafana/SLO: **design-only**
- Production Support grant path: **unimplemented**

## Appendix: evidence and reproduction pointers

- Git SHAs: baseline `fa4fef80`; S0 `f44b0b33`; S1 `24aef3dd`; S2 `b866cef0`; S3 `7a7ee811`; OBS06 `26f4d322`; OBS07 `8f509c63`; this handoff (push SHA)
- Artifacts: [S1-CAMPAIGN-IDS.json](S1-CAMPAIGN-IDS.json), [S2-LEDGER.json](S2-LEDGER.json), [S3-FAULT-MATRIX.json](S3-FAULT-MATRIX.json), [RUN-LOG.md](RUN-LOG.md), [CHECKPOINT.md](CHECKPOINT.md)
- Evidence receipts: [OBS06](../../evidence/obs06-case-scoped-situation-read-2026-11-15.md), [OBS07](../../evidence/obs07-support-situation-ui-2026-11-15.md)
- Local ignored private evidence: `%TEMP%\offscreen-rpg-packet-review\`, `%TEMP%\offscreen-rpg-live-comparison\`, `%TEMP%\offscreen-rpg-request-audit\`
- Suggested exact next ChatGPT question: Design/authorize OBS00-B dispatchAuthority + Support grant-steward issuance without expanding support-operator, then re-open a ≤$0.25 live gate only after OBS00-C mock transport byte equality.

**Finalized after executing S0–S5 as far as safety allowed; live paid path explicitly blocked, not skipped silently.**
