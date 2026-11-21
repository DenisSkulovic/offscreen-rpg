# WR03 | planner proof matrix
**Evidence:** design only; tests NOT RUN. **Precondition:** WR02 rooted read permissions integrated; provider-free scripted decisions.
| Case | Operation | Required result |
|---|---|---|
| Mission freeze | captured root R, later root R2 | all reads and skills remain pinned to R, no silent latest |
| Tool loop | browse→find→read old scene→skill→stage→read→revise→submit | exact hashes and ordered durable steps; one valid proposal, no canon write |
| Restart | interrupt before dispatch, after delivery, before tool result, after stage | at most one paid attempt/one stage per idempotent tool ID, settled results reused |
| Unknown delivery | kill after transport with no settlement | explicit uncertain/hold and no second charged dispatch |
| Denied tool | model asks shell, SQL, private source or budget extension | typed denial, no data read/permission grant |
| Stage revision | two edits with same expected stage revision | one succeeds, stale one conflicts; not published |
| Forged evidence | valid ID with wrong objectHash/root | rejection, not narrative fact |
| Cost/round cap | exceed any captured budget | finite stop, no unchecked provider call |
| Simple path | no tool/research required | still captured and valid final proposal |
| Legacy | old memory-exploration.v1 and single-turn tasks | unchanged behavior and schema compatibility |

**Routes:** `pnpm --filter @offscreen/storyteller build`; `pnpm --filter @offscreen/application test`; focused `long-story-memory-evaluation.test.mjs` and `storyteller-loop-lifecycle.test.mjs`. New tests must prove persisted state, not only in-memory mock prompts. **No live paid provider in automatic CI.**