# Public projection capability map | what the new UI may truthfully display now

**Evidence class:** source/schema inspection at GitHub main `3be49cc2c571dcd86585c56106905a87c789a19e`, 2026-11-13. **Not** a browser/API execution trace. Current code may move during Cursor work; re-inspect at implementation. The purpose is to prevent **wishful UX props** from becoming invented frontend facts.

## The rule

**UI design owns presentation; the application owns truth.** A proposed screen can require a capability that is not yet public or implemented. That is a valid architecture gap, **not** permission to derive it from prose, a client timer, raw DB-like objects, or an invented default.

The existing React architecture expects a validated viewer/story-keyed `StorySnapshot` with optional `CampaignView`, plus separate history, drafts, opening and settings projections. This map distinguishes **present fields** from **semantically complete player capabilities**.

## Current contracts at a glance

| UX need | Observed public data | Confidence / limitation | Design behavior if missing |
| --- | --- | --- | --- |
| Current published passage | `StorySnapshot.current.id/content.title/paragraphs` | **Present**, original title/paragraphs only | Full readable prose; no rich block type required |
| Current legacy contextual choice | `current.interaction`, `canRespond` | **Present**, `choice.v1` offers, labels/descriptions/risk | Only offer authorized options; no generic custom input |
| Current mechanical contextual offer | `CampaignView.offer`, `activityAccess` | **Present**, nested authored offer/rule plans behind the server | Render author-admitted intent; do not enumerate all imagined actions |
| Story identity / revision | `StorySnapshot.id/revision/viewVersion`, optional storyteller | **Present** for technical identity, **not** necessarily a human story title on snapshot | Use genuine passage/situation title; request story-title read model if needed |
| Current fictional time | `campaign.gameSecond/worldTime` | **Present** if campaign exists | Display authentic calendar/cycle label; omit if inapplicable |
| Current location | `campaign.location: string|null` | **Present but nullable**, may be abstract | Omit, or use grounded situation label; no fabricated coordinates |
| Active contribution | `campaign.activity.progress.kind=contribution`, earned/required | **Present** for supported activity | Show N/M earned, not percent from wall time |
| Active literal wait | `progress.kind=wait`, elapsed/required fictional seconds | **Present** for supported wait | Show elapsed world wait; current real ETA separately |
| Active work lifecycle | `activity.state`, dueAt/estimatedCompletionAt | **Present** but forecasts may be null/conditional | Use human copy; never promise completion or earning |
| Ongoing finite action | `campaign.actionExecution` start/targetGameSecond, state, dueAt | **Present** for supported finite timing | Show admitted attempt and real wait only where meaningful |
| Previously retained work | `campaign.commitments`, `activityEvents` | **Present**, bounded snapshots max sizes | Contextual “work you may return to”; do not infer resume permission |
| Accepted finite itinerary | `campaign.acceptedActivityPlan` state, entries, horizonGameSecond | **Present**; entry list bounded, no standing routine | Plain-language conditional next steps; no fake infinite routine |
| Holds | `campaign.holds` (decision, storyteller, obligation...), `StorySnapshot.resolution` | **Present**, several independent meanings | Map to correct attention/hold; don't reduce to spinner |
| Legacy journey wait | `StorySnapshot.waiting` dueAt/canControl/remainingMs/gameDurationMs | **Present** for narrative interval paths | Separate from mechanical route progress; do not infer location |
| Decision deadline/default | `StorySnapshot.decision` dueAt/defaultOptionId (nullable) | **Present** conditionally; not proof every scenario has timed defaults | Only show countdown when actual deadline exists |
| Committed action receipts | `campaign.actionReceipts`, `rolls` | **Present** bounded lists and effect detail; visibility rules still matter | Compact saved-roll detail only after settlement |
| Activity reports | `campaign.activityReports`, `worldObligationReports` | **Present** bounded, can be pending/generating/published/unavailable | A late report is historical, not a new current decision |
| World conditions/facts | `campaign.worldConditions`, `storyFacts`, character facts/quantities | **Present** but may be raw IDs and not a ready human narrative | Only show known, meaningful values with actual labels/context |
| Character capabilities | `campaign.character` (nullable, rule-linked schema) | **Present** for mechanical campaigns; no universal body/inventory | Conditional You info, no fabricated humanoid sheet |
| Items | `StorySnapshot.items` | **Present** for current bounded item vocabulary | Show only actual items; never infer available “use” choices |
| Public history passages | `storyHistorySchema.items{id,sequence,content}` and `nextBefore` | **Present**, read-only paged original narration | Journal v1 can be built; old options are dead |
| Model allowance | `usage.settledMicrousd/reservedMicrousd` and `resolution.blocker` | **Present** some numbers and blockers; account window not fully given | Surface binding reason when known; do not invent reset ETA |
| Auth freshness / update hints | Query key viewer/story + `viewVersion`; authenticated SSE hints | **Present** in selected architecture | GET validates truth; never treat SSE as full narrative data |

## Capabilities not demonstrated by the inspected public contract

| Desired experience | Gap | Correct design response | Proposed owner |
| --- | --- | --- | --- |
| Human **story title** reliably available in Now snapshot | Snapshot ID and current passage title aren't necessarily persistent story title | Show current passage/situation title without pretending it's story name; add safe title projection if needed | A small separate public read-model change |
| True **Since your last visit** | No reliable viewer-specific acknowledged event cursor evidenced | Say **Recent developments** until there is a well-defined seen/open baseline | [GM06](../../changes/2026-11-13--gm-viewer-read-position/CHANGE.md) |
| One chronological **full committed-event feed** | History passages separate from activity/action/obligation events | Start with existing source-backed entries; create a typed public event feed if needed | [GM05](../../changes/2026-11-13--gm-return-event-projection/CHANGE.md) |
| Relevant person/relationship index | Raw facts and canonical docs do not automatically form a safe full public entity graph | World v1 may show a few verified known facts; no omniscient roster | Separate future public-knowledge projection |
| Accurate travel distance/location progress | No generic route progress geometry evidenced | Show last known milestone/time, not naive position percent | Future travel/domain study |
| **Standing routine** | AcceptedActivityPlan is finite; no general repeat-until-policy | No standing-autonomy toggle yet; let short plans be honest | [GM03](../../changes/2026-11-13--gm-standing-life/CHANGE.md) |
| Free-form immediate player attempt | `choice.v1`/authored mechanical offers, no safe custom-intent interpretation+admission | Do not add textarea that executes text; research and explicit preview/admission | [GM01](../../changes/2026-11-13--gm-custom-intent-proposal/CHANGE.md) / [GM02](../../changes/2026-11-13--gm-custom-intent-admission/CHANGE.md) |
| Structured rich narrative blocks | `passageContentSchema` is title + paragraphs | Typography-first, optional future validated block schema | [Narrative presentation](../patterns/narrative-presentation.md) |
| True multiplayer player-specific decisions | Solo/current contract not established for many actors | Don't render “choose for companion” or global pause | Separate shared-play product/rules design |
| Custom lethal risk profiles | `campaignSettingsSchema.risk` currently literal `nonlethal` | Don't offer a risk slider that only changes narration | Separate future risk contract |
| Fully reliable background social life | No continuous NPC simulation/relationship auto-policy proved | Don't imply all unattended hours build friendships | Standing-life + continuity design, later |
| Real public provider-backed free trial | Scripted `/demo` exists, live hosted trial/cost consent not evidenced | Label scripted preview honestly; separate budgeted true play | [Portfolio trust design](../flows/portfolio-first-contact.md) |

## Data-ownership hazards an implementer must not miss

### The two “choice” structures are not identical contracts

`StorySnapshot.current.interaction` supports a versioned `choice.v1` input; `CampaignView.offer` is an admitted mechanical offer tree with action path/horizon controls. Their **player-visible intention grammar** can be consistent, but don't rewrite both into one untyped request builder. Use adapters and preserve immutable id/revision/receipt paths.

### Public status is a composite, not a backend enum

`story.resolution`, `story.waiting`, `campaign.holds`, `campaign.activity`, `campaign.actionExecution` and plan state may coexist. Build one pure **semantic projection**, with priority/focus defined in [state-and-attention](../patterns/state-and-attention.md). Do not derive fake “active” from a due date or use a single spinner.

### Bounded arrays are not infinite chronology

`actionReceipts` max20, `activityEvents` max100, `rolls` max100, `activityReports` max50 and `storyHistory` page max20 support localized views but not necessarily every event since a 30-day absence. For long life/reentry, request a **paginated authoritative event index** rather than overclaim complete history from the latest bounded snapshot.

### Model text isn't structured world truth

Do not scan paragraph strings to derive money, NPC affiliations, locations, relationships, action eligibility or map coordinates. The model can narrate a proposed future scene or an unreliable character belief; only application-admitted typed state changes can grant mechanical effects.

### World visibility is not a detail-panel shortcut

A private canonical document may contain future Storyteller direction or hidden facts. A World index must be built from a **public, viewer-authorized read model**, not by displaying every stored Markdown document. Do not expose a speculative “all NPCs” index.

### Countdown isn't completion

Even when a client timer reaches zero, the story may be waiting on a due settlement, holding for a decision or preparing narration. A 0ms remaining estimate is a cue to **refresh verified state**, never a frontend-owned success event.

## Recommended implementation cut-lines

- **UX01/02:** no new backend is required to make published prose central; compose from current passage and safe known status. Story title can be omitted or fetched independently under a verified read contract.
- **UX03:** show current offered intentions using existing typed adapters; **don't** add general free text.
- **UX04:** contribution/wait/action states largely have public fields; use them honestly. Do not invent route distance, standing routine or pause authority.
- **UX05:** story library can improve with existing list items; rich “needs attention” summaries may require public list DTO extension.
- **UX06:** existing draft + opening + Start lifecycle is robust enough for major UX changes, but not every storytelling/risk control is actually configurable.
- **UX07:** Journal can be source-backed using paged passages; **true since-last-viewed** needs GM05/GM06 or a separately selected contract.
- **UX08:** context details can use public character/item facts; full World entity graph is not demonstrated.
- **UX09:** scripted browser preview can be excellent without new engine code, provided the simulation boundary is explicit.
- **UX10/11:** motion and tests cannot confer backend capabilities. Test event identities rather than client animation illusions.

## Challenge for each Cursor packet

Before touching source, complete this sentence for every visible major claim:

> “The screen says **X**, because the authoritative public field **Y** from revision **Z** proves it. If **Y** is missing or stale, the screen says **W** instead.”

If this cannot be answered, **the UI is overclaiming**. Either narrow the label, get a proper safe projection Change, or block the feature pending mechanics. Attractive falsehoods aren't a design achievement.
