# DOC01 P0 baseline receipt

**Captured:** 2026-11-16  
**Branch:** `docs/doc01-architecture`  
**HEAD:** `0a0692f600a10c9e7c5b862ca57f4ddd63044caa`  
**Design baseline:** `8cec56e1262e5493020d9da2ba163264398ad667`  
**Worktree:** clean at selection (before selection-doc edits)

## Drift vs design baseline

Only the DOC01 design packet itself (plus Change queue index line) was added under `docs/` between `8cec56e` and HEAD. Tracked `docs/` file count: **491** (= 483 baseline + 8 packet files). No unrelated documentation mutations to absorb into the migration manifest.

## Non-Markdown assets (retention review required in P1)

| Path | Class note |
| --- | --- |
| `docs/programs/experience/evidence/renders/ux01-story-frame-1440.png` | visual evidence |
| `docs/programs/experience/evidence/renders/ux01-story-frame-375.png` | visual evidence |
| `docs/programs/observability/evidence/assets/obs07-support-situation-synthetic.png` | synthetic UI screenshot |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S1-CAMPAIGN-IDS.json` | trial payload |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S2-LEDGER.json` | trial payload |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S3-FAULT-MATRIX.json` | trial payload |

## Pre-migration tooling

| Command | Result |
| --- | --- |
| `python scripts/check_docs.py` | exit 0 — Checked 605 Markdown files; 0 problems |
| `pnpm repo:brief` | exit 0 (then still showed QA-SF01 as Current; selection updated after) |
| `pnpm repo:docs-health` | exit 0 — advisory MISSING Reconciliation ledger on 108 historical Done packets |

## Safety fence

- No paid providers, deploy, live DB, or runtime source mutation in P0.
- Permanent `docs/` tree not moved or deleted.
- Next gate: P1 atom/link inventory under this folder.
