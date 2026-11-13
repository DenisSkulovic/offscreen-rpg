# Experience thesis | inhabit a life, do not operate a dashboard

**Design status:** recommended target. **Owner:** player experience. **Not:** an implementation or a claim that current gameplay supports this.

## The promise in one sentence

**You step into a character's life, make consequential intentions, leave, and later return to a world that remembers what actually happened.**

Three emotional anchors should be demonstrable within minutes: **presence** (I know where I am and what is happening); **agency** (my intention genuinely matters); **continuity** (effort and consequences survive my absence).

A strong Offscreen RPG should be playable without reading an architecture guide, inspecting D&D receipts, understanding LLM operations or operating a campaign manager. The primary interaction is a character-facing question: **What do you do now?** Sometimes the answer is **nothing yet, because you already committed to doing something**.

## The distinct experiences we need to support

| Mode of attention | Player's desire | UI's one job | Anti-pattern |
| --- | --- | --- | --- |
| In a live scene | Participate in a conversation, danger, investigation or quiet observation | Help me understand the situation and act | Chatbot with undifferentiated bubbles; giant option grid |
| In a sustained commitment | Go to work, travel, recover, observe, build, wait or carry out a plan | Show what is committed, what has actually progressed and what could stop it | Progress bar that implies guaranteed completion and rewards |
| Returning after absence | Reacquire orientation without rereading ten thousand words | Show meaningful changes, why they happened and the current decision | Dump raw log entries in chronological order |
| Idle without a commitment | Decide how to spend time | Present eligible next possibilities without claiming the world is moving | “Running” animation just because the browser is open |
| Blocked, paused or awaiting input | Understand whether anything will happen and what can be done | State the actual hold reason and available remedy | Generic “Something went wrong; Retry” |
| First-time visitor | Taste the fantasy before committing to setup | Let me influence one scene, then understand offscreen progression | Registration, settings and OAuth before seeing a game |

**None of these modes is inherently a full page.** They are states of one coherent story space; transitions should preserve context and make causality legible.

## Design north star: the living page

Use a **scene-first stage**. The present scene or current commitment occupies the visual and reading center. A restrained contextual shelf exposes character state, relevant people/places and recent history on demand. A journal is a dedicated place for reading a long life. Controls for settings, spending, and debugging are reachable but do not compete with the present fiction.

This is **not** a universal medieval parchment theme. The shell has stable typography, affordances and truth semantics. A prepared fantasy port, science-fiction station and sentient cloud may each have a different atmospheric treatment without changing navigation or requiring a map or portrait. Text is first-class art direction.

### The five-beat loop

1. **Notice:** a specific situation is presented, including what the character knows. No hidden spoilers.
2. **Intend:** choose one authored action or, in a later supported design, propose another bounded intention.
3. **Commit:** distinguish menu exploration, preview, acknowledged command and admitted action. A single click never both proposes an impossible action and pretends it occurred.
4. **Live:** an immediate action resolves, or a duration-bound commitment proceeds while the browser may be closed.
5. **Return:** show committed changes, uncertainty and the current interactive point. Never forge a recap from uncommitted plans.

The loop is not forced into one model turn per beat, nor one literary chapter per journey. Silence is valid. A tense negotiation can stay in beat 1–3 for many exchanges; a quiet shift can spend hours in beat 4.

## Design principles (falsifiable)

1. **Fiction first, status always obtainable.** Within a glance the person can identify the current situation and whether a decision is available; detailed rules appear on request.
2. **Authority has a shape.** Narrative description, estimated future, prepared option, accepted intention, committed result and derived recap look different enough to avoid confusion.
3. **Time is tangible, not theatrically faked.** Show fiction elapsed and real wait separately whenever important. An animation cannot stand in for an authoritative state transition.
4. **Input has meaning.** Each primary control is a verb tied to a specific operation; “Go,” “Submit,” “Run,” “Next” are not meaningful action labels unless context makes them unmistakable.
5. **The player never manages the engine.** Do not make people choose a Storyteller model, plan schema, queue cursor, receipt version or retry policy to play.
6. **Quiet is content.** Do not invent surprise quotas, notification spam, a mandatory task inbox or a universal “progression” battle pass.
7. **The current moment is not a chat log.** Long-form prose and multi-turn scenes need readable rhythm, persistent orientation and scannable choices.
8. **Worlds are plural.** Objects, abilities, maps, space, bodies, currency, language, work and death may not exist in a given premise.
9. **Trust beats sparkle.** Duplicate submission, stale offers, exhausted allowance, uncertain settlement and blocked generation require careful recovery. Cute motion cannot hide uncertainty.
10. **Polish is demonstrated, not declared.** Browser sessions, screen captures with real content, accessibility checks and task observation decide whether a screen meets the target.

## A signature experience to design toward

A character is repairing a beacon on a stormy coast. Work accumulates through accepted intervals. A stranger appears, interrupts progress and opens a dialogue. The player asks a question, makes a choice, then returns to the same partially repaired beacon. Later, after closing the browser, they return to learn what actually completed and what was interrupted.

**Proof of magic:** the returning player can say, without a tutorial: “That is the work I started. It did not finish while I was talking. My choice affected what happened. The game remembered.” The world can be Vvardenfell, a lighthouse on an original coast, or a nonhuman analogue. The shape of the experience remains.

## Portfolio criterion

A skeptical senior engineer reviewing the site should see:
- Original interactive design rather than the default output of a CRUD generator.
- Precise handling of acceptance, time, progression, restoration, provider failures and privacy.
- Strong reading composition, responsive choices and meaningful accessibility.
- At least one **honestly labeled** short public demonstration; no fake “persistent world” promise attached to a reset-on-refresh prototype.
- Source and Storybook states explaining how the experience works under adverse conditions.

**Do not optimize the game around a recruiter's attention span once they have entered a real story.** Instead offer a concise separate demonstration that previews the real promise without compromising earned long-duration play.

## Explicit omissions

No universal dashboard, loot grid, hourly tick feed, NPC census, omniscient world map, compulsory chapter/episode navigation, forced character face, notification bell as a proxy for game state, artificial idle animation, or automatic action just because the player has not visited.

## Design questions that are intentionally not settled here

- Exact autonomy/default permissions for specific story types, especially shared multiplayer; these require game authority and consent work.
- Free-intent parsing/admission, costs and exploit boundaries; see [design decisions](design-decisions.md) and [interaction grammar](../patterns/interaction-grammar.md).
- Visual art direction, typography licenses and asset production: decide after interaction, content and states are proven.
