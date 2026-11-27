# Phase 0 | Forensic audit of the existing web experience

**Status:** Source-observed audit, not visual acceptance.  
**Source:** Lean source archive, `main` at SHA `9e821c6e15bb90444ec711a1b82b1e18cff9539a`. Archive excludes `work/changes/archive/**`, certain evidence and legacy materials, builds and dependencies; claims below are scoped to included source.

## 1. Executive diagnosis

This is **not** a project with no UX design work at all. It already contains selected player-facing experience principles, a meaningful navigation taxonomy, runtime honesty constraints, a presentation schema and resolver, typed UI query/command boundaries, Storybook examples and accessibility-minded tests. The mistake would be to discard all of that.

But the repository does **not** contain an integrated professional visual system or a fully realized interactive-story reading grammar. The strongest design is in the *rules about what must not go wrong*. There is comparatively little authority for *what the experience should look, feel and behave like at full fidelity*. The current components are useful implementations of functional patterns, not the final product design.

## 2. Current player routes and spaces

| Route | Observed page/feature owner | Existing responsibility | Experience question left unresolved |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` → `features/public-portal/public-portal.tsx` | Public promise, authored sample, demo/start/source links | Distinctive identity, motion, narrative hook, conversion journey |
| `/demo` | `app/demo/*`, public-demo feature | Scripted, non-durable interactive proof | Realistic first-minute experience; visual parity without false equivalence |
| `/stories` | `features/stories/live-story-list.tsx`, `draft-list.tsx` | Story and draft listings | Which life requires attention? What changed? How do many lives look? |
| `/stories/new` & `/stories/:id` | `draft-editor.tsx`, opening preview | Draft and opening workflow | Creation as experience, not administrative form; progressive choice and preview |
| `/play/:id` | `features/play/view.tsx`, `ui/story-frame.tsx` | Current passage, command/status, context details, journal anchor | Immersion, hierarchy, storytelling cadence, authored composition, responsive navigation |
| `/chamber` | developer-tools/chamber | Lab and fixtures | Keep clearly developer-only; do not let lab UI define player language |
| `/control` | admin | Staff workspace | Separate design system domain or themed family; not player navigation |

Current product docs already define 'Outside a story', 'Inside a story', and 'Short task' contexts. That taxonomy is valuable but far from a journey map, responsive information architecture or high-fidelity screen spec.

## 3. Design-system inventory

- `apps/web/src/shared/` has APIs, not a shared React UI component library. There are **zero `.tsx` files** under that shared folder in the supplied snapshot.
- UI is defined principally in feature components and **four stylesheets**: `app/style.css` (635 lines), `features/public-portal/public-portal.css` (395), `features/stories/stories-library.css` (292), `features/play/ui/story-frame.css` (654). These contain largely **separate** semantic token namespaces: `--public-*`, `--sl-*`, `--sf-*`, plus broad element globals.
- `app/style.css` contains global defaults for `main`, `h1`, and `p` that require deliberate overrides in `public-portal.css`; a visible symptom of inadequate base/component separation.
- `StoryFrame`, `NarrativePassage`, `IntentionChoice`, `SceneMedia` and supporting pieces exist, but they are feature-owned fragments, not a governed component system with formal anatomy, usage rules, variants, states, access patterns and visual regression matrix.
- The repo has **10 top-level Storybook `.stories.tsx` files**, including presentation, play, draft, recovery, states and public entry examples. This is an excellent testing/workbench foothold, not yet a comprehensive product design library.
- Existing `apps/web/package.json` has Next/React, TanStack Query, RHF, Storybook/a11y. It does **not** declare Motion, Rive, GSAP or Radix, and contains no general styled UI library. That does not mean we should install all of them.
- No source-included Figma project, high-fidelity full-screen design boards, unified token spec, motion score, iconography system or image-art pipeline was identified.

**Judgment:** architecture/test fixtures exist; design-system governance, formal visual identity and reusable component contracts are missing.

## 4. Living scene and adaptive presentation

**Preserve:** `docs/technical/client/presentation-runtime.md` defines two representations (untrusted creative directions → validated resolved rendering), semantic style layers, exact option authorization matching, asset bounds, contrast, `prefers-reduced-motion`, safe fallback and scene identity. `apps/web/src/features/play/presentation/{parse,resolve,types}.ts`, Storybook presentation fixtures, tests and `story-frame.tsx` implement significant seams.

**Precise connectivity:** `StorySnapshot.current.appearance` is an optional public contract; DB `story_passage.appearance` exists; `packages/application/src/stories/reads.ts` reads and validates it; `apps/web/src/features/play/model/live-presentation.ts` resolves it; `features/play/view.tsx` passes the resolved presentation into `StoryFrame` and campaign presentation. **Therefore the live consumer is already wired to use an appearance when present.** However the supplied application/storyteller source search found no normal authoring/persistence writer for that field. `STATUS.md` expressly lists **engine-emitted presentation** as absent. Don't mistake the absence of production appearance for missing React consumer wiring.

**What the V1 expressive vocabulary can do:** optional palettes, limited typography/texture, lighting, vignette, backdrop or inline asset, basic stage styles, ambient effects and bounded choice emphasis. **What it cannot yet do:** intelligently select radically different product compositions, spatially sophisticated editorial staging, rich media choreography or a fully developed motion language. These would require newly selected contracts, not free-form model-generated CSS.

**Known code warning:** some comments in feature components still say 'Live Play leaves this unset' or 'Real Play omits this'. Read the current function call sites and repository status over those stale comments.

## 5. Animation and sensory quality

`story-frame.css` contains entrance animation and a few ambient/effect keyframes (`sf-passage-enter`, `sf-choice-pulse`, `sf-drift`, `sf-shimmer`). These are tangible first attempts. The motion system is **not** an authored language of state transitions, dramaturgy, navigation continuity, gesture, sound and reduced-motion equivalents. The repository does not establish that the rendered design feels good. A rotating glow is not a design philosophy.

## 6. Journal, history and continuity

**Durable truth:** the underlying `story_passage` data is persisted. `storyHistorySchema` exposes paginated historical entries as `{id, sequence, content}`, where content is versioned `{title, paragraphs}`. The server fetches in descending sequence, page size 20, and the client `StoryHistoryView` uses an infinite Query to display those entries. This is a legitimate basis for an immutable reading archive.

**Current UI reality:** `StoryHistoryView` is nested inside `details` passed to `StoryFrame`; `journalHref` is `#story-journal`, not an independently composed Journal route. The list is newest-first with full prose, a load-earlier control and a return-to-Now anchor. `CampaignHistory` separately shows recent activity and world/action records using HTML `<details>` sections and 'fictional second' labels. No curated overview, character-centric trail, excerpt card view, source-linked synopsis, bookmark, tailored reading density, meaningful navigation index or purpose-designed 2,000-passage experience is implemented here.

**Existing promising adjacent projections:** GM05 exposes source-linked player events (`publicStoryEventSchema`, e.g. passage published, action settled, world development); GM06 defines return/visit opening. A distinct proposed Player Replay document defines verified read-only historical playback. These are not automatically parts of the current Journal; their contracts must be reconciled before a unified experience is promised.

**Central caution:** stored passage text is canonical; derived summary cards, memory, cluster labels and highlights must remain identifiable derivations, never rewrites of the original. Fictional time may differ from publication sequence. A visual page does **not** imply an invented chapter or a canonical plot boundary.

## 7. Product and IA documentation strengths and gaps

**Preserve:** `docs/product/foundations/vision.md` insists on a world-neutral story that earns consequences across time. `docs/product/experience/principles.md` protects decisions, earned waits and genre flexibility. `navigation-and-stories.md` avoids six permanent peer tabs. `return-and-journal.md` correctly argues for digest → detail and no forced chapters. These are substantive constraints, not slop.

**Still needed:** well-defined player mental models, competing concepts, information hierarchy, complete journeys, content prototypes, empty/error/return states, composition patterns, visual identity, responsive variants, motion/haptics/audio policy, editorial history design, and validated design-system examples.

**Process gap:** `docs/technical/client/presentation-runtime.md` itself says visual/human acceptance is outstanding. Tests, Storybook fixtures and Markdown specifications are not substitutions for composed screenshots and observation of actual users.

## 8. Research limitations and follow-up evidence

This audit inspected source, CSS, documentation, schemas, Storybook declarations and status. It did **not** boot a full app, inspect a hosted browser or play through a connected real story. Avoid assertions about exact pixel appearance or end-user quality based only on stylesheet inspection. Later design review needs a screenshot corpus of 375/768/1440px renderings and important story states, plus an adversarial real-play content corpus.

Recommended next visual evidence capture: public portal, demo, empty/one/many stories, creation draft and opening, Now with legacy/campaign offers, active task, blocked/uncertain recovery, passage history of length 1/20/2000, narrow-screen keyboard and reduced motion. Gather both current-state screenshots and competing design prototypes. Do not let current implementation constrain the desired end state.

## 9. Verdict and priorities

**P0:** Align the conceptual experience and native reading/playing metaphor before UI polish.  
**P1:** Select a design language for global chrome and world-local presentation.  
**P1:** Define narrative information architecture and Journal/Now relationship.  
**P2:** Govern shared tokens, primitives, composition and responsive behavior.  
**P2:** Design motion and media rules alongside truth/permission states.  
**Only later:** reconcile backend projections, write technical contracts and compose code-changing packets.
