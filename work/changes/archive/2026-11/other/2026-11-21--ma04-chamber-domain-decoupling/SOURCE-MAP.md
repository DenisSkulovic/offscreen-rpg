# MA04 | exact composition and fixture map

**Inspected:** source snapshot `dac6b69813b52ecb1f202158791deaa3b7ea89d7`, selected current remote critical files at `0a52a9a3991732bb1003eb7bdf83899e7a798c83`. Sources and test anchors were read, no runtime/SQL proof executed.

| Caller/composition | Current behavior | Selected edit / permission policy |
| --- | --- | --- |
| `packages/application/src/stories/index.ts:createStoryApplication.read` | globally consults `chamberAllowsResponse(source)` | replace import by optional `StoryApplicationOptions.fixtureSourceCanRespond`; absence = false. Retain real `playableOpeningStorySource` and campaign/interaction/resolution guards exactly |
| `packages/application/src/developer-tools/chamber.ts:createChamber` | builds `createStoryApplication(database, options)`, returns its own `read` which separately uses fixture eligibility | pass `{...options,fixtureSourceCanRespond:chamberAllowsResponse}` to underlying factory, keep outer Chamber `read` + `respond` authorization/fault policy untouched |
| `packages/application/src/developer-tools/index.ts` | exports createChamber and other dev APIs, not `chamberAllowsResponse` | explicitly `export { chamberAllowsResponse } from './chamber-fixtures';` for existing API host dev composition |
| `apps/api/src/app.ts:createApp` | normal `STORIES` provider built separately; Chamber controllers and CHAMBER provider gated on `options.developerTools === true` | import `chamberAllowsResponse` from existing developer-tools public subpath and add fixture predicate to ordinary `createStoryApplication` options **only when `options.developerTools === true`**. Never infer from URL/origin |
| `apps/game-authority/src/application.ts:createGameAuthoritySeam` | creates ordinary story app, no Chamber mode | **no edit**, default false. Real playable story eligibility preserved; GA admission never gains fixture permissions |
| `apps/worker/src/runtime/index.ts` | creates `createStories` core, not `createStoryApplication.read` | **no edit** |
| `tools/api-integration/test/fork01-private-ga-fork.integration.ts` | direct ordinary story factory | **no edit**, default false |
| `tools/api-integration/test/boot03-imported-start-distributed.integration.ts` | direct ordinary factory for object-read fault | **no edit**, default false |
| `tools/api-integration/test/stories-http.integration.ts:checkStoryHttp` | authorized Chamber scenario and normal/denied HTTP cases | add direct default-denial check for same source and injected/Chamber positive; preserve existing GET/PUT+permission regressions |
| `tools/api-integration/test/stories-core.integration.ts` | direct Chamber start/read/respond and denial fixtures | keep existing positive/negative fixture tests |

**No alternate composition needed:** `createStories` callers use core methods and do not calculate `canRespond`; they are not new policy injection roots. This predicate controls presentation eligibility only; `admitResolution` and Chamber `respond` retain actual SQL owner/revision/fixture gates.

**Source graph target:** after edit the only `stories/index.ts` developer-tools import is gone. Existing stories→storyteller and campaign→storyteller edges remain MA05 scope. MA01 source graph is observational on those.
