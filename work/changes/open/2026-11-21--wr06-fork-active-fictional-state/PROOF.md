# WR06 | planner proof matrix
**Evidence:** not yet executed; WR05 prerequisite mandatory.
| Case | Operation | Expected |
|---|---|---|
| Historical active fork | scene 37, travel 2/10h, offer, obligation; parent to scene 80 | child has 8 fictional hours left, exact old lore, playable choice |
| Replay | fork identical request twice | one child and one set of scheduled child events |
| Independence | advance parent after fork | child state/root unchanged; child actions do not affect parent |
| No paid-copy | provider attempt/Temporal worker active on parent | child has none of parent's operation/lease/money IDs |
| Full remap | every offer/activity/obligation/choice reference | child-local IDs valid, no dangling live parent foreign keys |
| Privacy | parent scene 80 and sibling private lore | invisible to fork 37 |
| Diverged revisions | same logical ID@2 on two branches | hashes distinguish and scoped retrieval correct |
| Corrupt checkpoint | missing source/state node | explicit refuse, no half-child |
| Clock | parent idle 7 real hours after scene 37 | child not automatically seven hours ahead |

**Routes:** `pnpm --filter @offscreen/game test`; `pnpm --filter @offscreen/application test`; `historical-fork.test.mjs`, `scene-checkpoint.test.mjs` and private GA/DB integration. Inspect derived event/outbox count, never infer from appearance alone.