# Player replay | deferred design

**Deferred by owner, 2026-11-27.** Not ratified, not commissioned, not the staff forensic Turn Capsule. Journal/return remains source-faithful reading; this dossier is recorded playback as a separate product question.

**Owner:** product owner with experience, publication and observability authority owners. No selected Change, schema, API or spend.

**Reason:** authoritative scene history, publication and player-read contracts are not yet established enough to design or market replay without inventing coverage. Rebuilding around unstable history/publication semantics risks promising complete world time travel from partial sources.

**Reactivate when:** those contracts are established **and** the owner explicitly selects player replay. **R2** additionally requires verified historical transition coverage (complete typed action/activity/world evidence with a verified committed frontier). Refresh current HEAD and canonical owners before selecting posture. No automatic date-based dispatch.

[Original dossier tree](https://github.com/DenisSkulovic/offscreen-rpg/tree/6ddbd5330ae659f92823faa330c991c90838c80c/work/designs/open/player-replay) · [README](https://github.com/DenisSkulovic/offscreen-rpg/blob/6ddbd5330ae659f92823faa330c991c90838c80c/work/designs/open/player-replay/README.md) · [player-replay-experience-v1.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/6ddbd5330ae659f92823faa330c991c90838c80c/work/designs/open/player-replay/player-replay-experience-v1.md) (full SHA `6ddbd5330ae659f92823faa330c991c90838c80c`).

## What the player would watch

A sequence of historically recorded gameplay states and meaningful committed changes, rendered through today's story UI in explicitly **read-only** mode. Not an MP4, not model-generated recollection, not replaying live commands, and not inventing intermediate states. Presentational UI re-renders original saved content and archived effects; it must never call the rules engine or Storyteller to decide what *would have* happened.

## Three fidelity levels

| Mode | Inputs | What can be faithfully shown | What cannot be claimed |
| --- | --- | --- | --- |
| **R1: Published story playback** | Published passages, actual chosen responses, original content/appearance, GM05 visible events where available | Scene sequence, original narrative and player choice, known published outcomes | Full intermediate inventory/clock/holds at every arbitrary moment |
| **R2: Mechanical event playback** | R1 + complete typed action/activity/world transition evidence and verified committed frontier | Historical earned progress, item changes, time, holds and authored process boundaries | Model's hidden thoughts; uninstrumented old periods |
| **R3: Pixel-identical original presentation** | R2 + original renderer/asset/CSS/build versions and retained media | Potentially visual fidelity to a particular release | **Not promised** by V1; separate asset-preservation work |

Never silently upgrade “published story playback” to “complete world time travel.” [GM05 Done](../../../changes/archive/2026-11/experience/2026-11-13--gm-return-event-projection/CHANGE.md) is historical evidence of visible-event projection, **not** proof that complete replay exists.

## Binding constraints (unchanged intent)

- **Read-only execution:** no game, outbox, RNG, Temporal, workflow or command writes from replay.
- **Current authorization and historical visibility:** resolve the viewer's present permission at the historic perspective; story ownership is not automatic access to later shared-party secrets.
- **Zero provider spend:** no fallback prose or media generation for missing archived content; show unavailable frames with coverage.
- **Publication ordering:** default playback follows player-visible publication chronology; fictional time is a separate optional view. An older report may publish later.
- **Truthful coverage:** every displayed value needs an authorized retained source; partial coverage must be labelled; no fabricated intermediate actor state.
- **Live read-cursor isolation:** replay must not run live visit-opening paths or advance the live story last-opened cursor.
- **Separate fork authority:** clicking historical options must not submit actions; “fork here” is a distinct authorized game operation, disabled unless a proper historical fork contract exists.

## Four unresolved owner decisions

| Decision | Boundary |
| --- | --- |
| Player-facing replay as a product promise | Whether Story Replay is selected at all, and at which fidelity. |
| Retention of published narrative/media | What published content and media remain lawfully readable for replay. |
| Old shared-story visibility rights | Participant-specific historic visibility under current legitimate permission. |
| Fork-from-here as a distinct feature | Separate from R1/R2 playback; remapping, budget and start-control required. |

## Fifteen research scenarios

1. Scripted multi-scene R1 traversal with zero game/outbox/RNG/Temporal/provider writes.
2. Interrupted action shows no successful receipt and no transferred item; later consequence at real publication.
3. In-progress activity shows earned committed units, not projected completion.
4. Historic world report: earlier fictional time, correct publication placement.
5. Story under old profile/rules: original recorded narrative, not new prompt generation.
6. Identical source-body hash across unrelated users: no cross-story disclosure.
7. Shared-story fixture: only originally visible events for the selected participant under current permission.
8. Long history seek without loading the entire preceding corpus or full provider packets.
9. Live viewer cursor unchanged before and after replay reads.
10. Expired raw model request: lawful published content still shown; protected prompt drilldown unavailable.
11. Pre-instrumentation story: published playback where source exists; clear partial coverage; no fabricated state.
12. Clicking an old unchosen option executes no command.
13. Renderer upgrade: source hashes/choices identical; pixel-identical claim withheld.
14. Deletion or grant revocation mid-session: next page denied; cached frames invalidated.
15. Missing audio/video/asset: source-backed missing state, never unrelated newly generated media.

## Unratified alternatives

Historical `StoryPlaybackFrameV1` shapes, illustrative replay APIs, derived-frame caching, E0 ledger/checkpoint mechanisms and OBS packet dependencies in the original dossier are **unratified alternatives**, not selected contracts. Do not persist a second replay-frame table, adopt HMAC cursor designs, or couple player replay to staff forensic capsules by citing this backlog entry. Staff reconstruction stays in [observability identities](../../../../docs/technical/observability/identities-and-evidence.md) and [admin authority](../../../../docs/product/admin/authority-and-governance.md). Accepted return/journal meaning stays in [return and journal](../../../../docs/product/experience/return-and-journal.md).
