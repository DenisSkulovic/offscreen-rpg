# MA05A | inspected source and compatibility map

**Remote branch:** `undertaking/storyteller-workshop` at `681c5fa910344551c5b4f40fd39dc1fdf87378ca`. Actual source signatures verified via GitHub; no live graph or compiler run by planner.

| Path/symbol | Observed | Decided edit |
| --- | --- | --- |
| `packages/application/src/storyteller/records.ts:storytellerKind` | exported literal `'storyteller.profiled.v1'`; many Storyteller runtime consumers use the named export | import and re-export from new neutral Contracts subpath, preserve local use |
| `packages/application/src/storyteller/context-capture.ts:storytellerContextCaptureKind` | exported `'storyteller.context-capture.v1'`, used in capture insert/lease flows | import and re-export neutral constant, no capture logic change |
| `packages/application/src/stories/start.ts:createStoryStart` | imports runtime records to test candidate.kind at two branches | switch that import only |
| `packages/application/src/stories/reads.ts:createStoryReads` | imports giant context-capture module only to compare `generationKind` at its history projection | switch that import only |
| `packages/contracts/package.json` | explicit compiled `dist/src/*` exports; Application already depends on Contracts | add `./storyteller-kinds` |
| `application/test/eng03-context-capture.test.mjs` | asserts exact capture-kind string; old dist module imports occur across many existing tests | preserve old exports, add a focused binding-parity test |

**Explicitly out of scope:** `storytellerTopic`, `storytellerDistributedTopic`, `readFrozenStorytellerNoticeTopic` and topic selector remain Runtime-owned. Do not treat persisted `generation.kind` as equivalent to frozen outbox transport `topic`. No SQL, permissions, retries or provider behavior changes. No new package or lockfile dependency required.
