# WR07 | planner proof matrix
**Evidence:** no runtime tests executed. Uses WR03 scripted Writer + WR05 final scene commit.
| Case | Request/fault | Expected |
|---|---|---|
| Prepared Play | pinned authored complete start | captures exact root, avoids redundant prep LLM, one scene published |
| Freeform | literal BAH | accepted under invention policy without compulsory character/rules |
| Nonhuman | conscious galaxy prompt | legitimate viewpoint choice without humanoid stats |
| Custom override | prepared root + user prompt override | original pinned root and verbatim prompt preserved |
| Replay | same owner and operation key twice | same status/story/scene, zero additional provider calls |
| Conflict | different text under same key | 409, no capture mutation |
| Auth | unauthenticated or wrong-owner status | denied, no source/prompt leakage |
| Preset drift | package updated after capture | old captured root used, no implicit latest |
| Unknown paid | transport uncertain | honest uncertain, no re-dispatch |
| Crash | before/after stage or after SQL commit before HTTP | safe recovery and same committed first scene |
| Fictional time | model runs minutes with no active plan | no invisible time progression |

**Routes:** focused Nest e2e + application tests and disposable DB. No provider network, no unapproved cluster. Verify private GA call path; route status must never mark preview as ready.

### G0–G7 adversarial review, initial verdict: PLANNER-BLOCKED

G0 PASS branch, WR03 implemented but WR05 missing; G1 PARTIAL (actual Nest/GA seam/Writer custody observed; launch schema and consumers not yet existent); G2 FAIL (DTO limits/route alternatives/SQL identity/first scene adoption); G3 FAIL T01–T05 (child would select architecture and chase local+remote callers); G4 FAIL (no first T-ID with final host contract); G5 FAIL (no noncolliding authenticated route/GA/SQL writer plan); G6 FAIL (no concrete scripted status+failure fixtures or local/remote suite commands); G7 FAIL (wide multi-service Change and possible accidental provider-cost work). No provider/test calls in this review; real provider authorization is separate.
