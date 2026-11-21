# WR08 | planner proof matrix
**Evidence:** planned, not executed; depends WR04+WR06+WR07, and actual UI routes must be verified.
| Case | UI/flow | Expected |
|---|---|---|
| Play preset | prepared Play one click | status then first committed scene, no wizard |
| Freeform | BAH and conscious galaxy | valid launches without humanoid form |
| Reconnect | page reload while composing | same idempotency/status; no second paid attempt |
| Uncertain | provider unknown | explicit held/uncertain UI, not endless spinner nor automatic retry |
| Historic root | scene 37 after parent scene 80 | shows scene-37 facts, not current |
| Fork | during activity/offer | child playable inherited interaction, parent unchanged |
| Private | player browses storyteller-private sources | no content or metadata leak |
| Integrate | tool+skill+private Workdesk+2 genuine research contexts | real persisted tool receipts and selected scene; no fake fixed-response acceptance |
| Failure | missing/corrupt checkpoint or cross-owner request | explicit denial/hold, no half-scene |
| Quality | separately funded creative test | report subjective findings separately from scripted functional pass |

**Routes:** `pnpm --filter @offscreen/web test`, `pnpm --filter @offscreen/web typecheck`, focused API/application tests, approved local stack E2E when available. Record browser/HTTP/SQL/CAS receipts and NOT-RUN. A screenshot alone does not prove complete flow.