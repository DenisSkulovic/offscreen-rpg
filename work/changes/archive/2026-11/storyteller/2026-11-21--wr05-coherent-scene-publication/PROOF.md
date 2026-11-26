> Superseded by owner 2026-11-26. Historical design/evidence only; no dispatch. WR05S/WR05P1/WR05P2/WR06 own realized slices; integrated acceptance remains separate.

# WR05 | planner proof matrix
**Evidence:** design only; tests NOT RUN. Use disposable DB and scripted provider; capture v1 historical hashes beforehand.
| Case | Setup | Result |
|---|---|---|
| Complete boundary | passage + accepted notes + active offer/plan + world obligation | selected v2 scene references exact resulting Library+state roots and choice meaning |
| Notes order | mutate accepted notes during same published scene | checkpoint contains **post-notes** state; no later detached notes update |
| Activity semantics | game-time active work + wall-time idle | active progress pinned, idle writer time adds zero fictional elapsed |
| History stable | after scene 40, later time/action changes live row | scene 40 reader unchanged |
| Stale frontier | two arrivals for same expected revision/root/state | one selected; second conflict; no double side effect |
| Pre-commit crash | CAS written, SQL not committed | no visible passage/selector; orphan objects harmless |
| Post-commit reply loss | same operation replay | same selected hashes, no additional passage/spend |
| Corrupt/missing | absent state root or forged passage hash | no successful publication/read |
| Private idea | model possibility presented as settled fact | admission rejects or labels private, not world fact |
| Legacy v1 | existing checkpoint rows | readable without hash/schema rewrite |
| Unsupported class | offer/activity fields not fully represented | no v2 scene selected; precise failure, never silent omission |

**Routes:** `pnpm --filter @offscreen/application test`; focused `scene-checkpoint-publication.test.mjs`, `story-publication-documents.test.mjs`, `scene-checkpoint.test.mjs`; DB/GA integration in disposable environment. No S3/SQL atomicity claim; assert selector rule.

### G0–G7 adversarial review, initial verdict: PLANNER-BLOCKED

G0 PASS; G1 PARTIAL (verified v1 schema, continuation/publication anchors, but not every active SQL transition and consumer); G2 FAIL (world-state v2 field schema, overflow and atomic after-image decisions left to executor); G3 FAIL T01–T05 (new contract, mapper, migration and after-state algorithm require planner design); G4 FAIL (no safe immediate dispatch for the whole Change); G5 FAIL (DAG currently assumes all serial without justified safe pair, not a blocker by itself, but resources are unmapped); G6 FAIL (negative crash/offer/notes/active classes lack concrete fixture+test commands); G7 FAIL (one Change spans many domain transitions and demands broad QA). No runtime/SQL proof executed; current v1 historical objects must remain byte-readable. Re-audit every resulting slice after exact state schema/transaction contract is ratified.
