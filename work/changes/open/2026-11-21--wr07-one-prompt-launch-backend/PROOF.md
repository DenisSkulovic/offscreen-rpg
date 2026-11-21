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