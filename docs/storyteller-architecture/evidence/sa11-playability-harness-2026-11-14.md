# SA11 evidence | provider-free playability harness

**Date:** 2026-11-14. **Change:** [SA11](../../changes/2026-11-14--sa11-playability-harness/CHANGE.md). **Provider spend:** none. **DB:** none.

## What landed

- `playability-run.v1` trajectory manifest with explicit `proposalOrigin: scripted-fixture` and `providerTransportPerformed: false`
- 13-stage Greywake life arc covering L1 work/interrupt, L4 gift recall, L5 attributed rumor, L6 quiet zero-spend, L7 nonhuman, L8 dual profiles, L3 failed persuasion, L11 uncertain outage, L13 low-drama
- Human rubric fields always `unobserved` until real review
- Memory corpus scene counts 200/2000 + fork isolation declared (retrieval optional; not claimed executed by default)
- `pnpm storyteller:playability` writes JSON/Markdown run artifacts

## Proof

`playability-harness.test.mjs` 2/2 · `pnpm storyteller:playability` (13 stages, objective pass, $0) · replay canonical sha stable across run ids · `memory-index-benchmark 200` (generationNotRun 13/13; providerCalls 0)

| Assertion class | Result |
| --- | --- |
| Quiet stage | no task packet / no publication / $0 |
| Dual profiles | different guidance fingerprints, identical mechanics |
| Failed gift as success | rejected by materialization gate |
| Uncertain vs unsent | uncertain no auto-retry; unsent retryable |
| Human taste | unobserved on every stage |

## Untested / deferred

- Real model prose quality and owner desire-to-continue (SA12 + human)
- Full 2000-scene indexed retrieval wall-clock (200 run captured; use `pnpm memory:index-benchmark 2000`)
- L9/L14 full GM SQL authority paths (listed as outstanding gaps)
