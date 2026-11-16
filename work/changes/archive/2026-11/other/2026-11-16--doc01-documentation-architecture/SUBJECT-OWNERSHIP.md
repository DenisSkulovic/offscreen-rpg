# DOC01 | Cross-cutting subject ownership matrix (P1)

**Purpose:** every consequential subject gets **one** future product owner and **one** technical owner (where both exist). Competing current sections are listed so P2/P3 merge by claim, not by folder copy.  
**Status:** first-pass matrix; claim-level atom rows still open in local `atoms.jsonl`.

| Subject | Candidate product owner | Candidate technical owner | Primary competing sources today | Notes / conflicts |
| --- | --- | --- | --- | --- |
| Accepted action vs inspect/propose; time advance | `docs/product/gameplay/time-and-autonomy.md`, `actions-and-commitments.md` | `docs/technical/engine/chronology-and-activities.md`, authority transitions | `product/journeys/time-and-autonomy.md`, `technical/committed-time.md`, `ticks-and-tags.md`, engine time docs, GM07 draft | No silent advance without acceptance — preserve negative |
| Background activities / interruption / consented autonomy | gameplay time + continuity | engine chronology + concurrency | time-and-autonomy, GM03/GM07 open Changes, engine decisions | Unsettled GM policy stays `work/designs` / open Change |
| Mechanical world authority vs Storyteller proposals | gameplay rules + storyteller behavior limits | engine authority; storyteller provider boundary | `product/storytelling/storytelling.md` §authority, storyteller constitution, `technical/rules-and-activities`, ENG08 gate | Model cannot authorize item loss — dual product+tech |
| Canonical files / memory / committed consequence | storyteller memory-and-continuity; gameplay continuity | storyteller context-and-memory; engine lifecycle | storytelling.md promotion rules, SA continuity, `canonical-files.md`, OBS provenance | Distinguish player journal vs staff forensics |
| Provider auth / dispatch / charging / retries | (policy in product/admin spend fences) | platform spending; storyteller provider-boundary | usage-policy, OBS00, SA dispatch, spending rules | OBS00-B remains blocked entitlement — not “implemented” |
| User sessions vs staff principals / grants | admin authority-and-governance | platform identities; admin technical | Admin program product+technical, OBS case scope | Unapproved commercial/Support production grants stay draft |
| Player return/journal vs replay vs staff forensics | experience return-and-journal; experience replay; admin investigation | client + observability evidence | UX return flows, OBS player-replay, OBS staff reads | Three audiences — three owners |
| Client state / hydration / UI choice semantics | experience play-and-decisions | technical/client architecture | react-next target, PX/UX system docs, web READMEs | React target stays technical destination |
| Chamber lab vs player gameplay proof | (none as product promise) | technical/lab | chamber-laboratory target, chamber-lab-protocol, chamber READMEs | Lab ≠ live gameplay evidence |
| Retention / staff access / deletion privacy | admin commercial-and-trust + governance | observability + admin technical | Admin privacy gates, OBS retention | Many still unapproved — draft |
| Release / model-prompt evolution / evidence reconstruct | (compat as product continuity) | engine lifecycle; observability | evolution-and-release, ENG06, OBS provenance | |
| Current status vs roadmap vs architecture target | n/a (meta) | n/a | `progress.md`, `TODO.md`, `AGENTS.md`, program READMEs | → `STATUS.md`, `ROADMAP.md`, `work/changes` only |

## Dual-authority pairs to reconcile first in P2/P3

1. **Storyteller product:** `docs/product/storytelling/storytelling.md` (accepted-looking maintained product) vs `docs/programs/storyteller/vision-and-quality-constitution.md` (**normative proposed** end-state, explicitly not implemented). Merge carefully: constitution principles that restate vision may promote; “proposed end-state” wording must not become silent acceptance of unbuilt autonomy.
2. **Player experience:** `docs/product/journeys/player-experience.md` vs `docs/programs/experience/{foundations,flows,patterns,spaces}`.
3. **Engine technical:** `docs/technical/{architecture,rules-and-activities,committed-time,…}` vs `docs/programs/engine/{target-engine,domain-authority,decisions/*}`.
4. **Observability:** `docs/programs/observability/technical/*` vs Staff/Engine/Storyteller technical owners + SA evidence lineage.

## Asset retention (P1 checklist)

| Asset | Provisional class | Consumer scan next |
| --- | --- | --- |
| `…/ux01-story-frame-1440.png` | visual evidence / possible test snapshot | experience evidence + any visual regression refs |
| `…/ux01-story-frame-375.png` | visual evidence | same |
| `…/obs07-support-situation-synthetic.png` | synthetic illustration — not live usability proof | OBS07 evidence + UI docs |
| `S1-CAMPAIGN-IDS.json` | trial reproduction payload | forensic evaluation packet |
| `S2-LEDGER.json` | trial reproduction payload | same |
| `S3-FAULT-MATRIX.json` | trial negative matrix | same — **retain** as evidence |

## Non-docs path consumers (P5 preload)

See [non-docs-consumers.json](../../../../work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture/non-docs-consumers.json). Hot loaders: `scripts/repo-tools/{brief,docs-health,archive-changes}.mjs`, `AGENTS.md`, `.agents/rules/documentation.md`, `.agents/references/documentation-navigation-standard.md`, package/source-adjacent READMEs.
