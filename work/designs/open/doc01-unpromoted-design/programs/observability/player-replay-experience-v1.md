# Player Story Replay V1 | Reanimate recorded gameplay, not a video or another game run

**Status:** Proposed player product and technical target, wave 5 (2026-11-15). **No code/UI or game authority change authorized.** Related [replay modes and retention](../../../../../../docs/technical/observability/retention-and-access.md), [historical reconstruction](../../../../../../docs/technical/observability/investigation-and-reconstruction.md), [temporal coverage](../../../../../../docs/technical/observability/investigation-and-reconstruction.md), [Turn Evidence Capsule](../../../../../../docs/technical/observability/identities-and-evidence.md), [Living Stage/Player UX](../experience/README.md) and [GM05 player event feed](../experience/patterns/committed-event-feed.md).

## 1. What exactly is the player watching?

**A sequence of historically recorded gameplay states and meaningful committed changes, rendered through today's story UI in explicitly read-only mode.** Not an MP4, not a model-generated recollection of the story, not replaying live commands and not reconstructing invented intermediate states.

For a text-based game this is a uniquely valuable experience: the player can step through passages, accepted choices, actual action outcomes, fictional time, held activities and visible world changes. The presentational UI re-renders original saved content and archived effects. It must never call the rules engine or Storyteller to decide what *would have* happened.

**World of Tanks/War Thunder analogy, correctly translated:** replay from recorded world-state/event data, not from captured pixels. The actual vehicle movement equivalent here is **player-visible scene, action and source-backed state transitions**. If the original game did not persist granular NPC movement/facial expression between scenes, Replay cannot show those things as literal historical truth.

## 2. Three fidelity modes, one clear player promise

| Mode | Inputs | What can be faithfully shown | What cannot be claimed |
| --- | --- | --- | --- |
| **R1: Published story playback** | `story_passage`, actual chosen response, original published content/appearance, GM05 visible events where available | Scene sequence, original narrative and player choice, known published outcomes | Full intermediate inventory/clock/holds at every arbitrary moment |
| **R2: Mechanical event playback** | R1 + complete typed action/activity/world transition evidence and verified committed frontier | Historical earned progress, item changes, time, holds and authored process boundaries | Model's hidden thoughts; uninstrumented old period |
| **R3: Pixel-identical original presentation** | R2 + original renderer/asset/CSS/build versions and retained media | Potentially visual fidelity to a particular release | **Not promised** by V1; future separate asset-preservation work |

**Recommended launch:** R1 first if source coverage is sufficient, marketed as *Story Replay*. Add R2 incrementally as the E0 ledger and checkpoint fidelity becomes provable. Never silently upgrade the claim from “published story playback” to “complete world time travel.”

## 3. The visual/playback grammar

~~~text
[Replay: Story "..."   04 / 38 scenes]  [Back to live story]

[SCENE #4]          recorded game time / publication timestamp
 The original saved narrative and appropriate historical appearance

[PLAYER CHOSE]
 "Ask the guard where the parcel went"

[ACTION / CONSEQUENCE]
 ✓ The attempt was admitted
 ⏳ 5 fictional seconds elapsed
 ◉ Recorded roll/result (when player-visible)
 → Historical consequence (original saved narration)

[PLAYBACK BAR]
 | Start | ◀ Back | ▶ Play/Pause | Next ▶ | Jump to scene |
 | 0.5×  1×  2× (UI playback pace only)                    |

[WHAT CHANGED?]
 Character/resource/fact/equipment/commitment (only with retained source)

[COVERAGE]
 Published narrative: available
 Earlier mechanical state: not recorded / fully verified from X onward
~~~

**Every display value must originate from an actual authorized source.** The “roll” control cannot generate a random dice animation with a newly sampled result. It may animate the original retained result, with clear semantics. The player must not see previously hidden DM plans, unpublished provider alternatives, future world obligations or another participant's private data.

**Playback control never becomes live game choice:** old buttons are displayed as passive historical choices. If a passage had multiple offered options, the renderer can show which was actually chosen, and distinguish unchosen historical options if those were player-visible. Clicking an old option must **not** submit an action. A future “fork here” is a separate authorized game operation and must remain disabled unless a proper historical fork contract exists.

## 4. PlaybackFrameV1: derived original source references

~~~ts
type StoryPlaybackFrameV1 = Readonly<{
  version: 1;
  storyId: UUID;
  perspective: AuthorizedPerspectiveRef;
  frameId: string;            // deterministic source-driven identity
  kind: 'published-scene'|'player-choice'|'game-action'
      |'activity-progress'|'world-development'|'historical-report';
  source: { kind: string; id: string; revision: string; hash?: SHA256 };
  publishedAt: ISOTime | null;
  fictionalGameSecond: number | null;
  committedTransitionSeq: DecimalString | null;
  narrativePassageId: UUID | null;
  historicalContentRef: TypedRef | null; // original saved passage/appearance
  chosenResponseRef: TypedRef | null;    // actual accepted response
  visibleEffects: readonly PlayerKnownEffectProjection[];
  predecessorFrameId: string | null;
  coverage: EvidenceCoverageV1;
}>;
~~~

**Do not persist a second `story_replay_frame` table by default.** Frames are **derived, cached read projections** over passage and event source with strict original IDs. Only new historically essential E0 transition/delta data should be persisted. If a server cache is used, it must be bounded, versioned, viewer/perspective scoped and invalidated on deletion/grant change.

### Frame ordering

Do not sort all frames by `gameSecond`; an older fictional report may be **published later**. Default playback order is **the actual player-visible publication chronology**, with a separate optional “fictional timeline” view. For R2, within-commit checks are nested under one atomic parent, not shown as independently published world states.

Long idle gaps: display a labelled time skip or compress boring wait **based on real recorded clock boundaries**, not fabricate unrecorded NPC actions. An activity's projected due time is not a recorded completion.

## 5. Playback data access boundary

Recommended route (illustrative, not a current API claim):

~~~text
GET /api/stories/:storyId/replay?before=<opaqueSourceCursor>&limit=20
  -> StoryReplayWindowV1
  -> authorized player-visible published frames and coverage
  -> zero Storyteller/workflow/command writes

GET /api/stories/:storyId/replay/frames/:frameId
  -> exact source-backed frame, bounded content
~~~

The query resolves current viewer permission to inspect the original passage **at this historic perspective**; ownership of a story is not automatically access to all future shared-party secrets. HMAC cursor binds story, perspective, source sequence and projection version. A guessed source/content hash is never an access token.

**No GM06 ack side effect:** GM06's live `readStoryVisitOpening` writes a visit challenge from its GET and the client may ACK a foreground live opening. Historical Replay must use a **separate read-only source path**, never run the live visit opening or increment the current story's last-opened cursor. An optional “where did I stop replaying?” bookmark is private UI preference storage, **not** a game event and outside V1.

**No model spend:** no fallback prose generation for missing published content. If archived source was legally deleted/expired, show an unavailable frame with source coverage, not a present-day synthetic replacement.

## 6. Rendering source and visual fidelity

The user asked for data-driven replay, not a video. The scene renderer should use original `story_passage.content`, historical `appearance` and referenced media if retained. It may present the content in a better modern interface; **semantic historical fidelity** is separate from pixel fidelity.

Do not guarantee a historically exact UI skin unless the original:
- presentation schema/version and effective visual style,
- font/media/asset revisions and permission,
- renderer behavior/build and relevant browser environment
were captured. A modern renderer can display the same saved content with different typography/layout and still qualify as R1 semantic story replay.

Future movement/event animations must be driven by **persisted data**. Text “The ship slowly approaches” can be reread and animated as presentation, but replay must not infer an exact speed/path if no coordinates or detailed action events were recorded.

## 7. Advanced player features, consciously separate

- **Bookmarks/chapters:** source-backed passage/event refs; private per-user markers can be added later without changing game state.
- **Character growth timeline:** derived from verified progression deltas, not a fictional XP progression graph inferred from today's character.
- **Multiple perspectives:** future shared-party permission, participant-specific scene visibility and private narrative; a wholly separate authority decision.
- **Compare two playthroughs/forks:** source lineage between independent stories, no conflation of game effects/currency or model costs.
- **Share a replay link:** requires explicit access model, privacy/perspective and optional user permission. Not a public unscoped URL to source hash.
- **Fork at old scene:** new source game/start control, actor/holds/items/clock/canon remapping, future model budget. **Not** R1/R2 playback.
- **Cinematic playback:** optional event pacing/transitions across already recorded text; no synthetic lore or unintended model call.

## 8. Fidelity and privacy test corpus

1. 20-scene scripted story: R1 can traverse all persisted published scenes/choices without one game, outbox, RNG, Temporal or provider write.
2. Replayed interrupted action: shows no successful receipt and no transferred item; later narrated consequence at real publication point.
3. Activity in progress: frame displays earned 2/5 units when actually committed, not projected 5/5.
4. Historic world report: source fictional time predates its publication; original player-visible chronological placement remains correct.
5. A story published under old profile/rules: replay displays original recorded narrative, not new prompt generation.
6. Two unrelated users share identical source body hash: access still independent, no cross-story disclosure.
7. Shared-story future fixture: only events originally visible to selected participant, subject to current legitimate permission.
8. Long 2,000-scene history: seek to #1500 without loading #1–1499/full provider packets, bounded read latency and pagination.
9. GM06 live viewer cursor before and after Replay GET: unchanged, regardless of replay progress.
10. Original raw model request expired: R1 story still shows saved published content when lawful; protected prompt drilldown unavailable.
11. Old pre-E0 story: published playback works where source exists; no fabricated intermediate actor state, clear partial coverage.
12. Replay toolbar attempts to click an old unchosen option: no command route can execute from replay state.
13. App renderer upgraded: source hashes/recorded choices remain identical even if styling changes; pixel-identical claim withheld.
14. Player story deleted or grant revoked mid-session: next page read denied and cached frames invalidated.
15. Audio/video/asset missing: show source-backed graceful missing asset state, never an unrelated newly generated image.

## 9. Recommended execution

Start with a **narrow player-visible published-scene playback** sourced from actual `story_passage` + GM05 and recorded response. Keep it separate from the developer forensic capsule and current live Play API. Human-test its usefulness before assuming a full R2 mechanical replay system must ship on day one.

Then broaden to real R2 event stepping only after [OBS04](../../../work/changes/open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) and **all other material mutation writers** are captured with a verified historical frontier/checkpoints. Don't make every text animation depend on paid Storyteller calls or an unnecessary universal event-sourcing rewrite.

**Owner decisions remaining:** player-facing replay as a product promise, retention of published narrative/media, old shared-story visibility rights and whether “fork from here” is a distinct future feature. This Markdown does not authorize implementation.
