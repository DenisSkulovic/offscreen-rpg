# Phase 1 | Experience model and player promise

**State:** OPEN DESIGN / candidate target, not ratified. **Authority:** proposals only; no implementation Change or product/technical rewrite authorized.
**Source anchor:** lean code archive `9e821c6e15bb`; canonical `docs/product/foundations/{vision,concepts}.md`, `docs/product/experience/*.md`, and the Phase 0 source audit. Source-level inspection is not rendered or human-tested UX evidence.

## 1. We are designing a life, not a screen sequence

**Candidate experience thesis:** A player inhabits a continuing life, makes occasional meaningful interventions, trusts time and consequence, and gradually acquires a story worth revisiting. The interface has two complementary editorial rhythms:

- **Now — presence.** What is genuinely happening, what can I influence, what has been committed, what needs my attention?
- **Journal — remembrance.** What did I live, how did events connect, where can I re-read the original words, and how do I return to the present?

**Leaving and returning are transitions between those rhythms, not substitute narrative spaces.** A player who closes the browser does not turn on automatic decision-making. The story advances only over already accepted execution, scheduled admissible developments, or separately consented policy. On return, the interface must distinguish current truth, intervening published history, and unknown/unpublished work.

The product's artistic promise is not that every story is cinematic. Some are funny, small, sad, strange, mundane or full of long silences. A well-designed quiet stage is as intentional as a spectacular confrontation.

## 2. Player mental model: a life with evidence

A player needs to understand five concepts without learning their database names:

| Player concept | Meaning in experience | Why this matters |
| --- | --- | --- |
| **My life** | A persistent character/world story with its own configuration, history and present situation | Stable identity through weeks or months; story cards are invitations back into a life |
| **What is happening** | Current authorized situation, last published prose, relevant facts and ongoing activity | Always distinguish shown prose from still-pending results |
| **What I can do** | Choices of intention and separately marked navigation/inspection | An attempt is not a guaranteed outcome |
| **What continues** | A previously accepted bounded action, activity or waiting interval, with truthful pause/interrupt controls where supported | Departure alone never creates permission or fictional time |
| **What I remember** | Original saved passages, committed developments, and clearly derived editorial aids | Looking backward is not replaying commands or changing history |

Do **not** mirror one passage = one scene = one turn = one event. Canonical `concepts.md` explicitly rejects this equation. A scene can span many turns and passages; a report may annotate history without opening a current choice. Thus the design must avoid UI that forces one page/scene per model round.

## 3. Primary jobs to design for

**J1 — Try the promise in under a short visit.** Visitor experiences a credible example of a decision and an earned consequence, with obvious demo-versus-live labeling. No account forced to see the introductory example. No false suggestion that manually stepped demo time is live persisted progression.

**J2 — Start a life without world-building homework.** Prepared or custom foundation, compatible role, creative direction, one review/consent step, explicit start. Drafts preserve edits. Expensive or unavailable generation has a truthful recovery path.

**J3 — Re-enter a recognizable situation.** Within one glance: which story is this, where/what am I now, what is verified, and is an action currently possible? The next choice is never obscured by an optional recap or atmospheric intro.

**J4 — Make a consequential intention.** Offer semantics, apparent cost/risk/time, exact commitment boundary, receipt/feedback. Never generate a new dice result because the UI was revisited. A “do nothing” option is meaningful only when explicitly authorized.

**J5 — Leave on legitimate terms.** Understand what has been accepted and when progress may occur. Let ambient stillness feel dignified. No false live countdown guarantees. No invented autonomous responses.

**J6 — Return after absence.** Quickly distinguish “since your previous acknowledged view” from “recent recorded developments” when coverage is unavailable; inspect source-backed new developments; access current action immediately.

**J7 — Rediscover history.** Scan a compact overview, re-find a passage, read it faithfully, move through the sequence, follow sourced context when available, then return to the saved present. Old choices stay inert.

**J8 — Recover from uncertainty safely.** Stale, offline, failed provider, ambiguous spend, pending receipt, unauthorized, deleted and unavailable contexts have legible outcomes. Status words are part of the experience, not back-office noise.

## 4. The four tempos

| Tempo | Typical interaction density | Design posture | Hazard |
| --- | --- | --- | --- |
| **First contact** | Fast comprehension and safe exploration | One compelling example before marketing explanation | Generic feature tiles and ambiguous demo promises |
| **Live decision** | Focused and tense or intimate | One reading focus and one meaningful action threshold | Dashboard noise; three giant indistinguishable buttons |
| **Accepted interval / return** | Sparse, potentially hours apart | Evidence-based progress, quiet ambient continuity, graceful return | Fake liveness, countdown theater, forced recap before action |
| **Long-form remembrance** | Browsing, searching, deep reading | Scannable index + excellent reader + accessible source links | Infinite feed of equally weighted full-text cards |

Do not force one universal layout to impersonate all four tempos. They share visual identity, typography, navigation and source references, but may have materially different compositions.

## 5. Information priorities inside a life

The system has two layers of truth and one layer of presentation:

1. **Committed game truth:** actions, receipts, time, persisted passage, admissible permissions, status and source-linked historical projections.
2. **Verified player-facing read models:** current situation, eligible choices, deadlines, known character/world records, published history.
3. **Editorial presentation:** excerpts, grouping, atmosphere, illustration, motion, typographic hierarchy and optional source-backed recaps.

Layer 3 cannot authorize, invent or hide critical facts in layers 1–2. Storyteller-controlled appearance can enrich stage mood and choice emphasis within validated bounds, but never change command semantics, focus, status colors or history. The story is fictional; the product must be scrupulously truthful about *what the game has actually committed*.

## 6. Necessary tensions (do not wave away)

- **Cinematic vs legible:** dramatic staging can make sense of one moment, while a 2,000-passage archive needs fast index scanning. The shared system must support both without decorative saturation.
- **Creative surprise vs player clarity:** never spoiler upcoming outcomes, but show known time, apparent risk, cost and choice commitment clearly.
- **World specificity vs platform identity:** a crystalline organism, a worker in Vvardenfell and a ship engineer should feel different without each reimplementing navigation, safety and accessibility.
- **Quiet life vs engagement metrics:** a player who intentionally left during a valid long interval must not be punished with fake urgency or manipulative prompts.
- **Summarization vs authorship:** a remembered “gist” can grow more useful as history accrues, but its derived nature and source coverage must stay visible.
- **Portfolio demo vs genuine game:** scripted demonstrations may be beautiful and reliable, but must not be confused with live duration, funded model generation or authenticated persistence.

## 7. Open proposal / acceptance questions

**P1:** Confirm Now and Journal as equally legitimate *primary in-story destinations*, with Now the default entrance. This is already directionally aligned with `navigation-and-stories.md`, not a newly invented six-tab sitemap.

**P2:** Treat return recap as a dismissible, source-scoped **Now prelude**, not an interstitial that steals control or a new route. If current action is available, it remains accessible.

**P3:** Let an “overview” show one or more *derived moments* referencing original passages, but never call those moments canonically stored scenes or chapters.

**P4:** Define World/You as conditional context surfaces; don't fill them with placeholder inventories or maps to make the layout look populated.

**P5:** Until visually compared, treat “living stage / living edition” as a leading design hypothesis rather than a chosen art direction.

**Phase 1 acceptance condition:** a reader can follow a first visit, a meaningful choice, an accepted absence, a multi-event return, and a deep re-read without confusing fiction, execution, derived narration, or historical play. The product owner should approve the architecture before visual concepts are ratified.
