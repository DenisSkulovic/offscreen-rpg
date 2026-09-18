# Inhabitable play and return

Status: Draft for owner review. Preparation does not authorize implementation or media generation.
Approval: Pending.

## Intended outcome

Make the browser feel like the character's current life rather than a developer console wrapped around story text. A player arriving for thirty seconds or returning after a day should immediately understand where they are, what is happening, what changed, what remains unfinished and what they can influence now.

This feature is presentation and information architecture over authoritative state. It does not create a second simulation, infer missing truth in the client or hide consequential dice.

## Representative flow

During active play, the page leads with the current scene: place/conditions, focused prose, present participants and the immediate question. Contextual intentions read as choices in that situation. A concise status element shows an unfinished commitment and its conditional timing without presenting every internal tick.

The player leaves during a shift and returns after an interruption. The page opens on the current interruption, followed by a compact “while you were away” account: progress earned before interruption, the development that stopped it and any delegated or automatic result. The old completion estimate is visibly superseded. Relevant character state and possessions are available nearby, while full receipts, dice and chronology remain inspectable rather than dominating the scene.

Pending generation, saved mechanical outcome, failure, held story, pause and stale interaction each have distinct language and recovery. Following an old notification opens the current state rather than reviving the old decision.

## Scope and boundaries

Included:

- player-first hierarchy for current scene, available influence and ongoing process;
- compact return recap derived only from committed chronology/state;
- relevant people/place/possession/process summaries when supported by authoritative data;
- progressive disclosure for dice, receipts, facts, settings and developer identifiers;
- explicit pending, committed-but-not-narrated, held, failed, uncertain, paused and stale states;
- responsive and accessible browser behavior;
- production snapshot contracts shared with Chamber player view.

Deferred:

- image generation, cinematic cameras, interactive maps and custom illustration pipelines;
- chat-style free text, voice, messaging notifications and multiplayer perspectives;
- client-side inference or prose generation;
- a universal dashboard/widget system.

Atmosphere begins with typography, pacing, hierarchy and specific scene content. Images may be added later, but cannot compensate for incoherent state or generic writing.

## Acceptance

- In five seconds, a player can identify the current situation, whether time is passing and whether a decision is available.
- A returning player can distinguish what completed, what was interrupted and what remains possible without reading raw receipts.
- Dice and committed effects remain discoverable and understandable, but debug identifiers and internal lifecycle labels are not primary gameplay copy.
- Pending narration still shows the saved mechanical outcome and cannot look like an uncommitted spinner.
- Held, failed, uncertain and paused states explain different causes and available recovery.
- No stale option remains actionable after snapshot refresh or an old notification.
- The same primary play layout accommodates rapid exchanges, a quiet long process and the microbe contrast without assuming a human inventory/economy.
- Chamber can place the production player view beside authoritative inspection without leaking inspector data into normal play.
- Owner review of the gold vertical slice finds no essential state hidden and no debug data competing with the fiction.

## Decisions still needed

- What is the default balance between prose, visual status and option density on desktop and mobile?
- Should the return recap be part of the current passage, a separate derived card, or a dismissible chronology projection?
- Which mechanical details are open by default after a roll?
- What art direction should eventual visuals support, without coupling this slice to generated images?

## Owning specifications

[Vision](../../vision.md), [player experience](../../player-experience.md), [gameplay](../../gameplay.md), [continuity and consequences](../../continuity-and-consequences.md), [time and autonomy](../../time-and-autonomy.md), and [client and identity](../../technical/client-and-identity.md).
