# DOC01 | Player-experience dual-authority compare (C6)

**Sources:**  
A = `docs/product/journeys/player-experience.md` (+ related `story-creation.md`, `playthroughs.md`)  
B = `docs/programs/experience/**` (foundations / flows / patterns / spaces / system) — self-described **replacement product-experience specification**; UX/PX/PF Done as portfolio evidence, human UX not validated.

**P2 rule:** recompose by **user need**, not by copying B’s design-process taxonomy (`flows|patterns|spaces|system`).

| User need → target product owner | Primary A claims | Primary B sources to reconcile | Keep as draft / not silent-accept |
| --- | --- | --- | --- |
| Experience principles | Return-to-situation not admin sim; no chapter model; intention≠outcome | `foundations/experience-thesis.md`, living-world, vision-reconciliation, README non-negotiables | Free-intent / delegation patterns remain proposed |
| Entry and onboarding | Promise, OAuth, empty→create, demo≠production time | `spaces/public-portal-blueprint`, `flows/preview-to-play`, `flows/portfolio-first-contact`, PF program | Platform ecosystem umbrella still proposed |
| Play and decisions | Contextual options, commit feedback, no free reroll, agency limits | `patterns/interaction-grammar`, choice-surface, `spaces/living-stage-blueprint`, `spaces/now` | Custom intent / GM07 |
| Return and journal | Recap after absence; chronology vs overview; ordinary life matters | `flows/return-and-memory`, `spaces/journal-world-you`, committed-event-feed | Replay V1 stays proposed (OBS) |
| Navigation and stories | Stories space; recognizable premise/status | `spaces/information-architecture`, stories-library, player-home | |
| Settings and accessibility | (thin in A) | `flows/settings-and-controls`, `system/accessibility-and-voice` | |
| Presentation | Illustration atmosphere; delayed image must not block | `system/presentation-runtime` (+ language/media) → **technical/client** for runtime | Fix C3 stale “no implementation authorized” banner |
| Collaboration | (minimal in A) | `flows/shared-story-collaboration` | Keep proposed |
| Time honesty in UI | Wait estimates; pause/resume live `/play` | `patterns/time-and-truth`, autonomy-and-absence, offscreen/ten-hour flows | Must not override product time-and-autonomy |

**Technical split:** presentation runtime / React-Next / component strategy → `docs/technical/client/*` + engineering target link; not duplicate product journey text.

**C3 reminder:** when promoting presentation-runtime atoms, rewrite status to selected architecture + landed PX subset + “not visually accepted for engine integration” limitation — delete present-tense “no implementation authorized.”
