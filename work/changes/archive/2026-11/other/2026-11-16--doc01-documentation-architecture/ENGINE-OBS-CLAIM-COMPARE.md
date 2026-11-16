# DOC01 | Engine + Observability technical dual-authority (C7)

## Engine: `docs/technical/*` vs `docs/programs/engine/*`

| Claim cluster | Current technical owner | Competing program source | P3 merge rule |
| --- | --- | --- | --- |
| Modular monolith + PG + Temporal topology | `technical/architecture.md` (implemented-oriented) | `programs/engine/target-engine.md` (**first-pass recommendation, not ratified**) | Keep one `docs/technical/platform/topology.md` + `engine/*`; mark unratified alternatives as ADR/rejected; do not demote shipped stack without owner |
| Gameplay authority / transitions | `rules-and-activities.md`, `solo-gameplay-contract.md` | `domain-authority.md`, world-and-rules, first-gameplay-slice | Reconcile invariants into `technical/engine/authority-and-transitions.md` + mechanics; preserve ENG08 provider-effect gate negatives |
| Time advance / activities | `committed-time.md`, `ticks-and-tags.md`, calendars | `time-and-execution.md`, prediction-dependency-fences | Product time-and-autonomy remains bible; technical chronology owns units/permission |
| Storyteller vs engine authority | `storyteller-runtime.md`, canonical-files | `storyteller-and-memory.md`, context-capture decisions | Engine owns mechanical truth; Storyteller owns proposal/generation contracts |
| Capture / short-lock (ENG03) | (partially in runtime + SA) | `decisions/eng03-*.md` — **C1/C2 stale banners** | Promote landed narrow/C1/C2 contracts with honest status; full ENG03 stays Proposed Change |
| CAS / Temporal compat | execution.md fragments | eng05/eng06 decisions | ADR + `platform/execution` / engine concurrency owners |
| Scale / rewrite temptation | architecture scale notes | `scale-and-load.md`, module-boundaries | Hypotheses → research or ADR; not product promises |

**Status hygiene (from C1/C2):** engine README final § and eng03-narrow “Implementation: not executed” are stale relative to archive Done packets — correct on promotion, after local source spot-check.

## Observability: program technical vs Staff/Engine/Storyteller

| Claim cluster | OBS technical doc(s) | Must not silently own | P3 owner |
| --- | --- | --- | --- |
| Evidence graph / no mega-blob | `evidence-model.md` (**target proposal**) | Game command authority (engine) | `technical/observability/` evidence identity |
| Capture at transition | committed-transition-capture, capture-transaction-protocol | Substituting for engine receipts | observability + link to engine transitions |
| Prompt/context provenance | context-provenance, storyteller-prompt-source-map | Storyteller runtime task contracts | split: SA technical vs OBS forensic read |
| Staff case reads / grants | forensic-access, support-situation-and-why, investigation-read-models | Player session auth; unapproved production Support grants | admin technical + observability; drafts stay drafts |
| Replay / retention / privacy | replay-retention-and-privacy, protected-artifact-store | Player replay product (still proposed) | product replay vs staff forensic separation |
| Telemetry | otel-bootstrap, telemetry-and-operations | Durable evidence dependency on traces | observability ops; traces ≠ history |
| Reconstruction / codecs | reconstruction-algorithm, archive-codecs, physical storage | Inventing live proof | observability; mark proposal vs landed OBS slices |

**OBS00-B** live default-worker entitlement remains **Blocked** — never worded as implemented in permanent docs.

## Tool path drift discovered (P5)

Executable writers currently use **`docs/observability/...`** (no `programs/`):

- `tools/chamber/src/main.ts` → writes `S1-CAMPAIGN-IDS.json` under `docs/observability/evaluations/...`
- `tools/api-integration/test/admin-control-ssr.integration.ts` → screenshots `docs/observability/evidence/assets/obs07-...png`

Tracked evidence today lives under `docs/programs/observability/...`. P5 must retarget both to the new `evidence/` roots (and stop writing into canonical `docs/`).
