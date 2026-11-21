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

### G0–G7 adversarial review, initial verdict: PLANNER-BLOCKED

G0 PASS (branch and selected product intent); G1 PARTIAL (routes/hook/history observed, successor DTOs unavailable); G2 FAIL (transport/backoff/draft route/fixture detail absent); G3 FAIL T01,T05,T06,T07 (source-map-only T01 and hidden architecture/test migration); G4 FAIL (no immediate implementable launch client contract); G5 FAIL (no demonstrated safe independent UI/history wave); G6 FAIL (E2E not runnable as specified and lacks concrete seeded fixture/negative commands); G7 FAIL (large integration obligation in one child and unnecessary broad `web test`/App corpus). No builds/browser/SQL/provider calls were executed. Re-audit after predecessor contracts and selected fixture exist.
