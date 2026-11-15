# Cursor checkpoint | Forensic connected trial

**Prepared 2026-11-15. Nothing has been executed by Cursor yet under this runbook.** This file is a mutable **session checkpoint**, not an immutable claim of passing tests. Read this plus the one next phase when resuming. Do not ask the user to rerun steps.

## Current state

- **Run status:** NOT STARTED
- **Current phase:** S0
- **Last completed phase:** none
- **Start source baseline:** `offscreen-rpg main@18158402` before Cursor kickoff; recheck latest HEAD then record it
- **Working copy branch:** not selected; ensure no owner changes overwritten
- **Active code Change:** `none`
- **Authorization granted at actual kickoff:** NOT YET RECEIVED
- **Live provider cap:** default proposal $0.25 / max 4 requests / max $0.10 per operation, **not an active spend authorization before kickoff**
- **Actual outbound provider calls so far:** 0, because no evaluation has run
- **Actual settled spend so far:** $0, because no evaluation has run
- **Known pre-existing gate:** OBS00-B current provider dispatch authority unresolved (from source audit, recheck)
- **Next file:** [S0 safety/boot](00-SAFETY-AND-BOOT.md)
- **Next exact command:** `git status --short`, then `git rev-parse HEAD`
- **Last evidence commit:** none for the *executed* run

## Phase status ledger

| Phase | State | Actual evidence location | Blocker | Next |
| --- | --- | --- | --- | --- |
| S0 Infrastructure/baseline | NOT STARTED | none | none checked | Open S0 |
| S1 Connected campaigns | NOT STARTED | none | none checked | After S0 |
| S2 Forensic source capture | NOT STARTED | none | none checked | After S1 |
| S3 Faults/retries | NOT STARTED | none | none checked | After S2 |
| S4 OBS06/OBS07 + Support UI | NOT STARTED | none | Code/S1 policy requires kickoff | After S3 |
| S5 Live provider trial | NOT STARTED | none | Paid auth + OBS00-B + packet equality | After S4 |
| S6 Final synthesis | NOT STARTED | none | S0–S5 not attempted | After S5 |

## At the end of **each** Cursor session, replace this block

~~~text
Time UTC:
Git source SHA (before/after):
Phase completed: Sx
Status: DONE|PARTIAL|FAILED|BLOCKED
Exactly executed commands and relevant results:
Synthetic story IDs, G/receipt/event/attempt IDs (if known):
Provider attempts/settled cost/uncertain status:
Current active Change (none|link; exact status):
Files/commit pushed:
Blocker and safe next independent work:
NEXT PHASE FILE:
NEXT EXACT ACTION:
~~~

**No fake progress.** If a run fails, record it and continue independent safe phases. If next session would overwrite a user's non-disposable DB or require paid-model access not authorized, mark that subcase blocked rather than bypassing it.

**Source of execution authority:** [start-here contract](../../handoff/CURSOR-FORENSIC-TRIAL-START-HERE-2026-11-15.md) plus the user's explicit actual Cursor kickoff.