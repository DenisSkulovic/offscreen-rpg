# Entry and onboarding

**Owns:** arriving, signing in, and creating a life. **Does not own:** a platform-ecosystem umbrella; that remains proposed.  
**Unsettled:** full platform-ecosystem umbrella remains proposed—do not treat as silently accepted.

## First contact

A new visitor should quickly understand the promise: create a character, choose a storytelling direction, and receive developments over time. A representative scene with a choice communicates this better than a feature catalogue.

OAuth provides a quick route to an account. Require an account before saving a playable story and spending its generation budget. Whether a visitor can draft a premise before signing in is an onboarding detail to test.

## Stories home

Returning users enter a Stories space showing their stories and an obvious way to create another. Each story should be recognizable by premise and current situation, with an indication whether it needs attention, is progressing, is paused or has ended (useful descriptions—not a prescribed DB status enum here).

For an empty account, lead directly toward story creation—do not strand the player on an empty dashboard.

## Creation information architecture

Creation turns a chosen story foundation into a small, playable beginning. It should invite imagination without asking the player to design a world database, understand canonical-file internals or fill in a long character sheet.

The player makes decisions in dependency order. A later screen must not reveal an earlier decision or silently reinterpret earlier answers:

1. **Choose a foundation.** Prepared experience, reusable world, or from-scratch. A prepared experience is a cohesive bundle (world, rules, starting situation, role constraints)—not an “opening seed” attached after an unrelated premise.
2. **Establish the player role.** Accept or customize the compatible character and immediate circumstances. Fixed foundation facts are explained rather than asked again.
3. **Choose how it is told.** Storyteller profile plus tone/direction, narrative initiative, pace, and an understandable canon-invention preset within world limits (canon-bound / grounded expansion / open world). Advanced per-domain invention, autonomy, risk and cost controls remain progressively disclosed. See [profiles and settings](../storyteller/profiles-and-settings.md).
4. **Review one setup summary.** Foundation, role, Storyteller, important rules and expected generation cost. Editing returns to the owning step. Generation never begins merely by visiting review.
5. **Create the opening.** Honest recoverable generation state. Success presents the first playable situation; validation failure, provider rejection, timeout and uncertain billing are different states with different recovery. A retry is never implied by a generic waiting label.

This is a short staged flow, not one long settings form. Draft persistence spans the whole flow; returning resumes the last incomplete step.

### Current POC honesty

First screen can offer two honest routes:

- **Seyda Neen prisoner arrival** — prepared experience with pinned Vvardenfell, rules, participants and starting constraints;
- **Create your own story** — freeform world/role/circumstances together until reusable-world selection is implemented.

Do not show a one-option world picker inside the prepared route, call developer fixtures “seeds,” or expose a prepared experience in the custom-story preview.

## Drafts vs playable stories

A private creation draft owns incomplete choices. Explicit Save keeps an incomplete idea without generating prose or starting time. The stories page lists drafts separately from playable stories.

See [acceptance scenarios](../gameplay/acceptance-scenarios.md).

## Premise, stale previews and captured openings

Editing a foundation, role or Storyteller choice makes an older generated opening visibly stale. Starting uses exactly the opening the player reviewed. It never silently regenerates it. If another tab changes a draft, keep the player's unsaved text and offer comparison with the saved version. A failed save or expired session must leave the text available to retry. Drafts are not shared merely because the eventual story may support several players.

Examples demonstrate variety rather than hard-code supported professions: a wizard on a journey, a creature in a tank, a crew member aboard a ship. The generated beginning establishes the character, immediate surroundings, a few relevant connections and a reason for something to happen next. Distant places and incidental people develop when the story needs them.

World setup is broader than terrain generation. An apartment, an underwater town, a star system and an abstract realm need meaningful places and ways to reach them. They need not share geography or physical scale. Do not ask the player to select a terrain generator before describing the story. A familiar name generated from model memory is an interpretation, not a promise of canonical accuracy.

Creating an opening and starting its real-time progression are different actions. The story must not begin consuming response windows while the creator is still reviewing setup. Show useful progress during generation and allow recovery from failure without duplicate stories or duplicate spending.

**Negative:** a recognizable place name does not authorize the model to fill missing lore from memory. An authored start is grounded in its pinned package. Anything outside that coverage follows the captured invention policy.

## Initiative, invention ceilings and progressive entities

Creation establishes how much narrative initiative the Storyteller has, independently of incident frequency and danger. The player may ask for a cultivated direction, occasional proactive developments, or an emergent ordinary life with no grand narrative. “No grand narrative” can still contain consequences. “Directed” does not promise a railroad or a particular ending.

A prepared world declares ceilings for characters, places, groups, world elements and deep lore. The story may choose stricter values and cannot exceed them. Simple presets come first. This setting governs factual authorship, not prose quality: a canon-bound Storyteller may be highly proactive using supplied material, while an open-world Storyteller may remain quiet.

When a start contains a hoped-for arc, antagonist move or reveal, preserve it as Storyteller-private noncanonical direction. Only scheduled facts that really must become due are admitted as executable obligations. The opening must not present a future possibility as already true.

Creation seeds stable records for the player and for immediate places and people whose participation is part of the selected start. Incidental mentions may remain prose until the player interacts meaningfully, a later turn depends on them, or a supported mechanic needs current state. A spoken name alone does not invent combat statistics. A nonhuman story may register organisms, signals, collectives, or nothing analogous.

Generating a playable candidate requires a selected profile. An admitted candidate captures the exact profile and execution policy. Start freezes that captured configuration onto the story. Later catalogue edits do not alter it.

Shared-story invitations, readiness and who may start remain an explicit open design. There is no requirement for public matchmaking, and those rules are not accepted by this page.
