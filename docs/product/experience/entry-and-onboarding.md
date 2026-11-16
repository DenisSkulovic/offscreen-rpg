# Entry and onboarding

**Owner (DOC01 P2):** arriving, signing in, creating a life. Reconciles `journeys/player-experience.md`, `journeys/story-creation.md`, and experience portal/PF design ([compare](../../../work/changes/open/2026-11-16--doc01-documentation-architecture/EXPERIENCE-CLAIM-COMPARE.md)).  
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

See [acceptance scenarios](../gameplay/acceptance-scenarios.md) and the legacy [story creation stub](../journeys/story-creation.md) until that stub is retired in P5.
