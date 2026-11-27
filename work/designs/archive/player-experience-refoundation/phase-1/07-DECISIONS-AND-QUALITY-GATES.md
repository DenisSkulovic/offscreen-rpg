# Phase 1 | Decision register, evidence map and design-quality gates

**Status:** OPEN DESIGN REVIEW. **No item below constitutes owner ratification** unless it explicitly quotes an existing accepted source. No implementation Change may be inferred from this file.
**Current evidence:** code/document review of ZIP `9e821c6e15bb`; canonical experience pages rechecked on GitHub at the 2026-11-17 Phase 1 start. No browser screenshot audit, production deployment test, participant interviews or high-fidelity concept comparison has been completed.

## 1. Deliberate candidate comparison: what architecture wins?

| Candidate | Strength | Failure mode | Working recommendation |
| --- | --- | --- | --- |
| **A. One Play view with collapsible Details/Journal** | Low navigation cost, simple existing code | Makes an entire lived history a subordinate developer detail; poor deep reading | **Reject as target**; it describes the present implementation, not the desired product |
| **B. Now and Journal as primary story destinations; context only as needed** | Separates temporal attention, serves long history, respects canonical navigation | Must design explicit return/back and source identity | **Lead**; already aligns with existing product authority |
| **C. One immersive flipbook for both past and present** | Attractive strong literary metaphor | Past/current command ambiguity; 2,000 pages become laborious; waiting awkward | Keep as an **art-direction influence for reading**, not global information architecture |
| **D. Everything in a simulation dashboard** | Many facts simultaneously inspectable | Wrong product framing; empty nonhuman worlds; narrative becomes secondary | **Reject** as core player interface; limited context panels may still be valuable |

**Reasoned recommendation:** B. The cost of designing a stable link between Now and Journal is real, but worth paying. In contrast, A keeps history obscure, C risks turning reading into accidental replay, and D subordinates the work's unique promise to generic management software.

This is a recommended design direction, **not** an approval to replace routes or CSS.

## 2. Existing accepted policy we must preserve

| Existing authority | Implication in our proposal | If later changed, who decides? |
| --- | --- | --- |
| `docs/product/foundations/vision.md` | Fictional life is persistent, world-flexible, earned through time and consequences; first POC/portfolio demo must be honest | Product owner and the canonical vision owner |
| `docs/product/foundations/concepts.md` | Scene ≠ passage ≠ Storyteller turn ≠ event; internal memory segment is not chapter | Product ontology decision, not UI copywriter |
| `docs/product/experience/principles.md` | No mandatory body/map or chapters; no unaccepted offline choice; demo time is simulated | Product authority with engine constraint review |
| `docs/product/experience/navigation-and-stories.md` | Three navigation contexts; Now/Journal primary, World/You contextual, Story settings utility | Product navigation owner |
| `docs/product/experience/entry-and-onboarding.md` | Foundation → role → creative settings → review → explicit generate/start; drafts persist | Creation product owner |
| `docs/product/experience/play-and-decisions.md` | Contextual distinct intentions, honest time/risk, exactly-once, UI exploration not gameplay command | Gameplay/experience owners |
| `docs/product/experience/return-and-journal.md` | Coverage-bound recap, searchable long history, original source, no chapter enforcement | Return & Journal product owner |
| `docs/product/experience/presentation.md` + `docs/technical/client/presentation-runtime.md` | Storyteller expression is validated, bounded and cannot control permissions, commands, system affordances | Product presentation + client technical owners |
| `docs/technical/client/state-and-server-boundary.md` | Server truth + viewer-scoped cache, frozen intents, monotonic snapshots, no client-simulated outcomes | Technical owner; cannot be waived by motion designer |
| `work/designs/open/player-replay/` | Player Replay is a separate unaccepted design, NOT a committed Journal feature | Replay product owner |

## 3. Candidate decisions awaiting owner review

| ID | Candidate decision | Leading position | Falsifier / proof needed | State |
| --- | --- | --- | --- | --- |
| PX-ARCH-01 | Central player mental model | Continuing life rather than game-system dashboard | First-contact and return walkthroughs | Proposed |
| PX-ARCH-02 | Main story spaces | Now + Journal first-class, Now default | Can a user distinguish past from actionable current? | Proposed, aligned with accepted navigation |
| PX-ARCH-03 | Return recap | Optional scoped prelude within Now, never a blocking route | Test with actionable choice and 0/50 new events | Proposed |
| PX-ARCH-04 | Historical reading | Overview + original reader as two tempos | 1/20/2,000 passage tasks; access and latency | Proposed |
| PX-ARCH-05 | Moment as an editorial unit | Source-linked 1:N passage preview, not a saved scene/chapter | Fifteen-passage conversation + later-relevant gift | Proposed |
| PX-ARCH-06 | World/You conditional surfaces | Only when known facts are meaningful | Abstract-world specimen and empty-state review | Proposed, aligned with existing policy |
| PX-ARCH-07 | Story shelf hierarchy | Resume recognizable life first; drafts separate | 0/1/10-story screens and attention-state proof | Proposed |
| PX-ARCH-08 | History deep links/bookmarks | Address exact original; private place restoration | Permission, route, client-state and mobile tests | Proposed |
| PX-ARCH-09 | Dynamic story atmosphere | Platform controls stable; scene can adapt safely | Three-world same-component fixtures; no-presentation fallback | Proposed, constrained by selected language |
| PX-ARCH-10 | Historical query capabilities | Progressive source-based search/seek, no invented index | Source/read model and access policy design | Proposed, data gap |
| PX-ARCH-11 | Visual/art direction | Keep multiple competing concepts alive | 3 materially different same-copy prototypes | **Not selected** |
| PX-ARCH-12 | Libraries/component system | Extract from approved screen behavior, not vice versa | Cross-screen patterns, a11y and motion proof | **Not selected** |

We can recommend a candidate strongly without acting as though it was accepted. The next conversation should actively critique this table, not rubber-stamp all twelve entries.

## 4. Actual implementation baseline vs desired product

| Concern | Currently evidenced | What design proposes, NOT yet evidenced |
| --- | --- | --- |
| Play | SSR-hydrated one story snapshot, choice/command semantics, waiting/recovery and current prose | Intentional separate compositions for decision, quiet, wait, return and blocked states |
| Journal | `StoryHistoryView` inside `StoryFrame` Details; `#story-journal`; newest-first full prose and older cursor | Primary story destination, overview and full reader, source-linked previews and position restoration |
| History data | 20-entry pages with `id`, `sequence`, `content` and `nextBefore` | Seek/search/marks, historical appearance, source-linked event/decision context, derived gist (all need evidence/policy) |
| Scene presentation | Validated pure resolver and optional current snapshot appearance consumer | Approved visual language and proven production authoring-to-publishing pipeline for scene direction |
| Portfolio/demo | Scripted temporary demo route and live authenticated story separation | High-quality, human-understood explanation of earned time and unique promise |
| Responsive quality | React/CSS responsive work exists | Demonstrably excellent reading/action design at desktop, tablet and mobile, with real screenshots and tests |
| Storyteller profile | Product semantics exist | Whether visible storyteller identity should affect chrome or remain a subtle story signature |
| Player Replay | Separate proposed study | No promotion to a finished player feature through this design project |

## 5. Quality evidence gates before styling becomes law

**Gate G1 — coherent structure:** narrate each journey without assuming old page layouts. Inspect at least first visit, active choice, accepted activity, zero-event return, multi-event return, deep historical reread, abstract form and blocked generation. Mark contradictions to accepted product rules.

**Gate G2 — genuine visual competition:** three **compositionally different** art directions, not palette swaps. Every concept must use the exact fixed [specimens](06-FIXED-DESIGN-SPECIMENS.md), including a mundane quiet state and no-image abstract scene.

**Gate G3 — behavior in actual screen sizes:** evaluate long and short prose on 1440, 768 and 375px viewports, keyboard focus, accessibility/contrast, forced colors, reduced motion, slow network and unknown scene appearance.

**Gate G4 — content scale:** histories of 1/20/200/2000 passages and a fifteen-passage conversation must preserve reference identity and reading task completion. Specify which navigation depends on missing query/read-model capabilities.

**Gate G5 — source and safety:** historical content, current source, pending operation, provider uncertainty, permissions and actual readable events are correctly represented. Mockup-only summaries and artworks must be explicitly labeled, never treated as live data.

**Gate G6 — human critique:** observe users trying to answer “Where am I?”, “Can I act?”, “Did my work finish?”, “What changed since I was away?”, “Find an old moment,” and “Return to Now.” Record errors/confusions, not just satisfaction adjectives.

**Gate G7 — ratification into canonical docs:** accept specific decisions and reconcile them into existing `docs/product/experience/` (and, once appropriate, `docs/technical/client/`) with an explicit decision/evidence trail. Retain alternatives and rejections here.

**Gate G8 — executable Changes only after selection:** split design-approved outcomes into bounded, testable implementation packets. This dossier is deliberately **not** a Change and does not instruct Cursor to touch React or CSS.

## 6. Kill criteria for “AI slop” before implementation

Reject a design when:
- its aesthetic can be described as “gradient background + glowing cards + abstract AI sparkles” with no information job;
- every state looks like the same dashboard with different text;
- story text becomes illegible under a beautiful image or atmospheric overlay;
- it requires an NPC portrait, character inventory or map when the world supplies none;
- it visually promotes a speculative reward/periodic timer as actual committed progress;
- a 2,000-passage journal is navigated only by hundreds of indistinguishable cards;
- the UI cannot explain a 409/ambiguous provider operation without an unsafe retry;
- it looks good only with handcrafted hero art and falls apart with raw paragraphs;
- it “solves” design by installing a large animation kit rather than defining what motion should communicate;
- it has no real mobile, keyboard or reduced-motion specimen;
- its motion or display can be unilaterally changed by untrusted Storyteller output beyond the selected presentation contract.

A design need not be maximally flashy to be excellent; however, *deliberate distinctiveness* must be visible in real compositions, not inferred from an impressive prose manifesto.

## 7. What remains unresolved after this Phase 1 draft

- Which art direction best expresses the living stage and living edition, including an alternative that challenges the dual-mode thesis?
- How should the stories shelf and creation journey feel visually without inheriting the present site's generic components?
- What is the correct visual grammar for action kinds: reply, investigation, risky attempt, commitment, waiting and recovery?
- Which Journal overview model helps readers *find* rather than simply *scroll*?
- How and when should we introduce user bookmarks, historical choice context, time labels and source-backed derived summaries?
- What verified capabilities are needed for full live dynamic scene art direction without conflating current and historical appearance?
- Which screen layouts actually survive the human task trials with dignity?

**Exit posture:** Phase 1 can become a serious reviewable architecture without pretending the visual design has already happened. Proceed to Phase 2 visual research/prototyping only with explicit understanding that these are still proposals until ratified.
