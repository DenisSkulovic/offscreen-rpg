# WR08 | decided execution design (planner-owned)
**Depends on WR04 + WR06 + WR07 landed.** UI must operate only against real new endpoints; scripted evidence and funded model quality are separate acceptance tiers.

## UI changes
- New story creation surface: prepared cards with Play/optional Customize and a freeform multiline prompt with optional hints. Reuse existing auth/session/TanStack Query patterns and Story UI; do not reuse old multi-step form schema that mandates character/body. The old `DraftEditor` remains only for explicitly preserved legacy drafts until migration/redirect proven.
- API client hook `useLaunchStory` uses a stable client-generated UUID operation ID reused across retry/reconnect; launch command captures exact prompt/preset pins. Query stable `GET .../launches/:id` pending/preparing/composing/ready/held/failed/uncertain. No automatically retriggered paid call on uncertain. Ready navigates directly to first committed scene, never a preview/second Start.
- Historical reader uses `storyHistoricalSceneOptions` by exact scene selector and shows the **as-of** passage/provenance/world-state summary distinct from current live state. Source browser reads only permitted rooted documents. Fork from that selector creates child through WR06 and opens inherited valid choice; do not display private Storyteller notes.
- Only after new happy+negative flows work, retire/redirect old mandatory preview/review screens and dead hooks. Keep keyboard, responsive layout, error status and ownership-denial behavior.

## Integrated functional acceptance
With explicit provider-free scripted mission: login → one prompt / authored Play → writer tool browsing + exact old read + pinned craft skill + private Workdesk draft/revision + independently contextual child research → WR05 published scene → player choice → history → fork scene during active work → child choice/action continuation with no parent change. Also BAH, conscious galaxy and long Mira/faction recall. Verify actual tool call receipts and source hashes; **a fabricated fixture response proves wiring only**, not creative quality. Real provider opt-in and spend are separate.

## Edit order
1. Exact Next route + API client symbols source-map refresh; do not guess router destination.
2. Launch transport/status hooks and tests.
3. Minimal prepared/freeform UI and recovery tests.
4. Historical/fork viewer using WR06 DTO and private-denial tests.
5. Remove compulsory wizard after compatibility review; run integrated zero-provider acceptance and docs reconciliation.

**Hard stops:** any backend v2 selector/tool/child/launch invariant missing; don't fake it in the UI. Existing historical route without active fork does not satisfy this Change.