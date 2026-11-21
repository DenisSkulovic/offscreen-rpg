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