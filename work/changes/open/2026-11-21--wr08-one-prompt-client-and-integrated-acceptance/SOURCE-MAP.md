# WR08 | verified client & end-to-end surface
**Baseline:** `f2e0b237`, static inspection, tests NOT RUN; depends on WR04, WR06, WR07.
- `apps/web/src/features/stories/draft-editor.tsx:DraftEditor` is a 516-line client React Hook Form multi-step editor with declared `steps`, draft queries, StorytellerSelect and opening preview flow. Do not merely hide wizard steps while calling old preview route.
- `apps/web/src/features/play/history.tsx:StoryHistoryView` uses `storyHistoricalSceneOptions` and `storyHistoryInfiniteOptions`; current historical UI must consume WR05/06 as-of DTOs rather than live campaign.
- `apps/web/src/features/play/ui/campaign-play.tsx:CampaignPlay` is a small composition of useCampaignCommand, activity, history, offer and status panels. Keep command/permission ownership in existing hooks and API clients.
- `apps/api/src/modules/stories/controller.ts:{historicalScene,history,fork}` already exposes historical/fork API primitives, but current fork cannot carry active work. WR07 will add launch command and durable status; UI cannot fabricate those.
## Correct UI boundary
Prepared Play and one freeform prompt → WR07 launch → truthful status including uncertain/held → WR05 complete first scene → authenticated gameplay; history uses exact scene frontier, and Fork invokes WR06 with historical selector. Hide private notes, maintain source/root access.
## Known code discovery to settle before executor task
Exact Next route files and HTTP client hooks are not yet inspected here; the final client T-IDs must contain those symbols or stay **PLANNER-BLOCKED**. Implementing against old draft routes is not readiness. Integrated proof must distinguish zero-provider scripted correctness from optional funded creative quality.