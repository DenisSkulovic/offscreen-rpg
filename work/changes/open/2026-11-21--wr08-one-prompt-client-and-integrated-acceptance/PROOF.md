# WR08 | planner proof matrix

**CURRENT VERDICT: READY WITH EXPLICIT LIMITS, owner commissioned (2026-11-21).** The independent post-P3 G0–G7 review at the bottom supersedes the retained initial PLANNER-BLOCKED historical review. T01 is dispatchable and T03a closes the real first-scene choice gap. Code/tests have not been run by the planner.
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


---

### Separate post-P3 G0-G7 cold-read review, 2026-11-21
**Verdict: READY WITH EXPLICIT LIMITS.** Initial FAIL above is preserved and superseded by the repaired current task cards; source was independently re-opened after preparation. **No planner test/browser/DB/build/provider execution.** Packet readiness is not product acceptance.

| Gate | Result | Source-grounded falsification / limit |
| --- | --- | --- |
| G0 repo/authority | PASS | DenisSkulovic/offscreen-rpg, undertaking/storyteller-workshop, P3-A/B/C integrated, owner commission, linked change/wr08-client required, no main/real spend |
| G1 actual source | PASS | Inspected Web PlayScene, CampaignPlay/OfferPanel, campaign-command route, story snapshot/query, Launch form/gate; P3-A narrative action/settlement, writer.scene.v1 outbox, missing Worker dispatcher and first-scene Launch offer |
| G2 design/authority | PASS | Existing authenticated actions PUT, frozen operation ID, no synthetic client effects; T03 worker missionId and no paid retry; T03a trusted server scripted option, exact staged v2 post-image and one SQL atomic Launch ready; v2 proposal remains interaction:null |
| G3 all T-IDs | PASS | T01 existing home/Launch, T02 no-character campaign action, T03 Writer wake Activity, T03a real first authored scripted offer/checkpoint, T04 joined Play/history/fork proof; each includes named read anchors/owned write paths/negative fixtures and commands |
| G4 first dispatch | PASS | Fetch latest origin, linked change/wr08-client worktree, run pnpm repo:change-branch --change WR08 --target undertaking/storyteller-workshop; T01 immediately executable |
| G5 concurrency | PASS | WR08 owns Web/Worker/Workflow and narrow Story Engine opening files; WR04 T01–T03 own Writer child contracts/schema/loop/custody; WR04 T04 waits WR08 merge. Separate disposable databases and serial integration |
| G6 tests | PASS (design, NOT run) | Existing Web view, launch, campaign, history/fork tests plus new disposable WR08 opening offer and Worker continuation cases; stale source, duplicate click, no first offer, repeated wake and held/unknown fail-closed |
| G7 cost/close | PASS | One Change, 4 main T-IDs plus mandatory T03a, focused builds/Vitest/disposable SQL, no broad repeated audits, archive/squash/push/retire by parent |

**Dispatch wave:** T01 → T02 → T03 → T03a → T04. Live feature flag remains default OFF; no claim that scripted first option proves model creativity. Required starter option is exactly server-scripted narrative-intent key observe, one fictional second, zero mechanical effects, pinned with v2 campaign offer+gameOffer, no passage interaction forgery. If the actual v2 snapshot cannot represent offer and plan, return exact contradiction, do not bypass canonical after-state equality.

**Honest limitation:** No execution proof was run by ChatGPT. Cursor must demonstrate actual tests/branch integration; paid provider calls and production flag enable are not authorized.