# Information architecture | spaces, focus and responsive composition

**Status:** recommended destination. Define the *player's mental map* first; route names, file names and database tables are subordinate.

## Spatial model

There are just three player navigation contexts:

1. **Outside a story:** Welcome / Try demo / Your stories / Create story / Account.
2. **Inside a story:** **Now** and **Journal** are the primary labelled navigation. **World** and **You** are contextual detail destinations, accessible through a stable Details entry when meaningful content exists; **Story settings** live in an out-of-fiction menu. These are *spaces*, not six permanent peer tabs.
3. **During a short task:** one focused layer for selecting intent, inspecting a result, changing course or completing creation. Return to the previous situation without losing the current scene.

A story is never an administrator workspace with separate “Campaign,” “Activities,” “Reports,” “Openings,” “Presets” and “Storyteller tasks” as peer navigation tabs. Those concepts can exist in internals without appearing in player space.

## Screens / purposes / primary action

| Surface | Why someone opens it | Primary behavior | Not |
| --- | --- | --- | --- |
| Welcome | Understand the promise | **Try a moment** in a short labeled demonstration, or continue to stories | Marketing feature grid |
| Stories | Choose which life to return to | One featured story with its current state; other stories and drafts separated | Table of status codes |
| Create | Decide who/where/what experience | Foundation → role → direction → review opening → **Start** | Gigantic configuration form |
| Now: scene | Perceive and decide | Read current passage, choose or propose a viable intention | Chat log, command console |
| Now: ongoing | Understand ongoing earned action | See actual progress, safe controls, expectation; leave | Tick dashboard or automatic choice spinner |
| Now: return | Catch up and reorient | Read compact change digest; continue at the real present | Infinite activity ledger |
| Now: hold | Understand stoppage | Resolve input/pause/error/allowance, or wait for supported recovery | Blinking generic loading state |
| Journal | Revisit continuity | Relevance-aware overview → event passages with source links | “Chapters” |
| World | Explore *known* places/people/threads | Inspect context without omniscience or fictional time cost | Mandatory map and global database |
| You | Inspect relevant self, capabilities, effects and possessions | Understand actionable status and actual records | Mandatory humanoid character sheet |
| Settings | Change supported play preferences | Inspect captured impact and confirm | Modify past facts, secretly spend resources |

**Story identity:** the story name and current state remain visible enough to prevent confusion during navigation and account switching. Every destructive or expensive action uses clear ownership and command scope.

## Reading-first desktop composition (target)

- **Global frame:** minimal story switcher, story identity and settings access; never full enterprise navigation.
- **Main stage:** approximately 640–760 px comfortable narrative line measure; the first viewport favors current location/situation, the latest meaningful passage and available action.
- **Context:** start with an **inline situational fact strip** or one Details disclosure. On wide screens, an optional restrained shelf may be tested for decisions that genuinely require comparisons; it is **not** a default permanent column.
- **Navigation:** Now and Journal are the two stable primary story destinations. World and You can be independently navigable when rich enough, but are reached contextually via **Details**, not added as changing permanent peer tabs. Opening a detail should preserve current story context and a clear route back.
- **Overlay policy:** normal inspection uses nonmodal panel/sheet; consequential stop/abandon or operation conflicts may require a dialog with action-specific heading and safe focus.

**Avoid a default two-sidebar trap.** If an 800-pixel window leaves only 400 pixels for storytelling, collapse secondary furniture before squeezing the narrative. Use container-based layout judgment, not viewport alone.

## Narrow-screen design (not a shrunk desktop)

- Single primary reading column with header that exposes story identity and state.
- Choices follow the relevant prose with comfortable tap targets; do not put an action menu offscreen behind an unexplained ellipsis.
- Optional information opens through a labelled **Details / Journal / Character** sheet or subview; preserved focus and a reliable back path.
- Current progress/decision state should not require opening the sidebar. Summarize it once near the scene title.
- Keep one primary action visible when the user reaches the decision point; avoid a sticky bottom bar that covers the last paragraph or forces all text into a cramped viewport.
- Dynamic text sizing, long names, localization and on-screen keyboards must not obscure the choice or free-intent draft.
- Never build a desktop-only hover interaction. Touch and keyboard are first-class.

## Transition rules

- **Stories → Now:** preserve actual story identity and show the latest verified situation. If the browser had been absent, reveal a compact return digest when new *settled* evidence exists.
- **Now → Journal → Now:** maintain current scene and scroll position where safe; the journal never retroactively changes history.
- **Now → World / You:** inspect state without fictional time passing. A close/back action returns to the same moment; no paid model call.
- **Now → offered sub-menu:** show that it is **exploration/choice selection**, not an accepted action. “Back to choices” is not a time advance.
- **Start → Now:** review and start are separate admitted actions; opening generation cannot silently start an unattended commitment.
- **Uncertain request → reload:** recover stable operation identity and latest canonical state; do not animate a new execution or auto-retry irreversible commands.
- **Story A → Story B:** no stale passages, pending intent or hidden identity bleed from A. Explicitly reset scoped local UI state.

## Navigation labels and tone

Primary visible labels: **Now, Journal, Stories**. Contextual destination labels: **World** and **You** (or an applicable equivalent) behind a stable **Details** entry. Settings is a distinct out-of-fiction control. Avoid “Campaign Control,” “Job Queue,” “Resolution,” “Activity Process,” “Generations,” “Provider,” “SceneCandidate.” Domain jargon can be used in a developer inspector but not default player labels.

The view should feel private and situated. A source passage may be whimsical or tragic; system messages remain clear and restrained. Atmospheric copy should not replace precise status text.

## Adaptivity constraints

A stable **Details** affordance can expose applicable World and You content when available; don't shuffle the top-level navigation every time an entity is discovered. World and You only expose relevant content or supported conceptual equivalents; a bodiless intelligence has no backpack just for navigational symmetry. If no meaningful map exists, World is a relationships/places/threads index, or is omitted until known entities exist. Within a single story, discovered elements may unlock contextual access but must not cause random navigation reshuffling mid-decision.

No required image on any surface. An absent image yields a deliberate literary layout, not a blank skeleton sized for promised artwork.

## Acceptance thought experiment

At 1440 px, a visitor should immediately see the passage and a possible intention. At 375 px, the same choice should remain comprehensible without horizontal scroll. At either size, a returning player should understand whether the character is moving through real time, idle, paused or waiting for their input. A screen that only “works” with an empty fixture fails.
