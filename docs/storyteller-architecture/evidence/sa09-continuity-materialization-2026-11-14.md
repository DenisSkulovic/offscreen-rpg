# SA09 evidence | descriptive continuity materialization

**Date:** 2026-11-14. **Change:** [SA09](../../changes/2026-11-14--sa09-continuity-materialization/CHANGE.md). **Provider spend:** none. **DB:** none.

## What landed

- `descriptive-materialization.v1` — structured cue → create / omit / reject (not a noun extractor)
- Fixtures: named gift relationship, passing crowd omit, disputed attributed lore, failed-transfer reject
- Publication proof: gift relationship staged with source passage linkage, same-name Mira Pell isolated, 20 intervening lore passages, record still readable

## Proof

| Case | Result |
| --- | --- |
| Successful named gift/favor | `create` relationship canon |
| Low-drama successful transfer | still `create` (not discarded for quiet) |
| Passing crowd | `omit` |
| Disputed attributed claim | `create` lore `attributed` |
| Failed transfer remembered as success | `reject` |
| Private possibility as public canon | schema reject |
| 20 intervening weather docs | favor body + source passage intact; Mira Pell ≠ Mira Vale |

`@offscreen/storyteller` 50/50 · `story-publication-documents.test.mjs` 2/2 · application build clean

## Unknowns

- Live adaptive recipe auto-attaching materialization cues from SQL settlement (still caller-supplied structured flags)
- SA11 longitudinal scoring of materialization quality across many purposes
- Paid generation of gift prose (excluded)
