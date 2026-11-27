# Phase 0 | Visual directions, references and technology hypotheses

**Status:** Inspiration and evaluative questions; no selected theme, UI kit or new dependency.

## 1. Learn from other games without copying their world skin

| Reference | Design principle worth studying | Danger if imitated literally |
| --- | --- | --- |
| *Pentiment* (Obsidian) | Typography, visual material and storytelling share one art direction | Medieval manuscript graphics would imprison our world-neutral platform |
| *Citizen Sleeper* | Character/world imagery + game state + narrative can coexist on a strong stage | Heavy science-fiction HUD can overwhelm reading and abstract worlds |
| *80 Days* (inkle) | Consequence, travel and story choices feel unified in a graphic narrative | One geographic-map metaphor cannot serve all characters/universes |
| *Roadwarden* | Highly readable text-forward RPG where picture, information and decisions stay together | Pixel-art layout and static panel blocks could feel dated if blindly copied |
| *BOOK OF HOURS* (Weather Factory) | Tactile interaction and optional deeper lore; physicality of an authored world | Card/inventory density can become busy, especially for a contemplative story |
| *Fallen London* / storylets | Named, differentiated fictional opportunities and distinct decision affordances | Lists of rectangular story cards are not themselves a designed history browser |

Sources and screenshots for exploration: https://pentiment.obsidian.net/ ; https://store.steampowered.com/app/1578650/Citizen_Sleeper/ ; https://www.inklestudios.com/80days/ ; https://store.steampowered.com/app/1155970/Roadwarden/ ; https://weatherfactory.biz/book-of-hours-streamer-press-kit/ ; https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two . These are reference products, **not** claims about our existing screens.

## 2. Three genuinely different concepts to prototype

### A. The Living Codex (editorial first)

**Core feel:** An unusually beautiful digital book that is still interactive. Thoughtful reading measure, typographic hierarchy, generous quiet space, page/folio continuity, illustrated scene anchors, meaningful marginalia for facts/choices. A new moment enters the edition as a new verified passage.

**Now:** Narrative dominates; decision threshold appears as a consequential annotation at the end of the passage. **Journal:** Excellent; overview → short excerpt cards → full text → linked threads. **Mobile:** Naturally suited to long-form reading. **Risk:** Could feel like a book website rather than a living game. Long mechanical processes and rapid decision sequences require special care.

**Prototype stress:** An urgent pursuit requiring rapid consecutive options and an evolving timed activity. Does the editorial metaphor become a straitjacket?

### B. The Responsive Stage (dramatic first)

**Core feel:** The present moment is a composed scene, not a text page. World art/lighting can occupy a viewport, reading is an anchored layer, choices are visually distinguished by interaction semantics, and the current situation shapes motion. Storyteller direction operates within strict validated composition capabilities.

**Now:** Powerful, atmospheric. **Journal:** Needs a different reading composition; stage snapshots alone are a poor way to read 2,000 moments. **Mobile:** Risk of crushed text, expensive assets and inappropriate visual layers. **Risk:** Spectacle dominates; performance and accessibility degrade; fiction turns into one-screen-at-a-time slideshow.

**Prototype stress:** A quiet ten-paragraph scene with no art, no choices and no map, plus an abstract, bodiless narrator. Does it still feel intentional?

### C. The Living Edition + Stage (conditional leading hypothesis)

**Core feel:** Stable platform identity, two designed attention modes: an immersive *Now* stage and an editorial *Journal* archive. Passage identity, typography families, breadcrumbs and transition grammar bridge the two. The same source passage can be read on stage and re-accessed in the edition. The platform owns chrome; a Storyteller can direct safe scene visual layers.

**Now:** Strong dramatic presence. **Journal:** Rich, legible memory of accumulated life. **Risk:** Two surfaces can become stylistically disjointed, double cost and confuse switching. A thin but explicit shared design grammar must link them.

**Prototype stress:** From current scene → a historic passage → skim a thread → return to latest scene, with stable focus and clear temporal status. If this feels like switching products, simplify.

**Current recommendation:** Prototype C against A and B, **do not select it simply because a hybrid sounds sophisticated**. Test with identical story content; compare task comprehension, reading comfort, emotional relevance, motion comfort, responsiveness and maintenance surface. This is a *direction for design work*, not an approved art direction.

## 3. Visual grammar to design, not prematurely lock

**Typography:** Define platform UI text, immersive passage prose, editorial headings, marginal metadata, action text, numbers/time and fallback for non-Latin languages. Test long Cyrillic words and unusual fictional symbols. Never pair fonts only because both are trendy.

**Color:** Separate platform-semantic roles (text, background, focus, error, permissions, disabled), story-identity roles, and scene-atmosphere roles (lighting, backdrop, emphasis). Scene palette must not control truthful system status, focus or actionable affordances.

**Material:** Investigate ink, illuminated edge, photographic/painted/schematic scene planes, subtle texture and depth. Each material must fit a specific world/scene job. Avoid universal glass, rounded cards and diffuse glows.

**Composition:** Test reading plate versus open stage, illustration location, decision density, quietness, split focus, return recap and mobile collapse. An authored layout registry is safer than arbitrary Storyteller DOM or CSS.

**Motion:** Establish a motion score: semantic events, duration ranges, easing, interruption, reduced-motion alternative, route transitions, scene entrance, choice acknowledgement and accepted-wait treatment. Ambient motion is a *budgeted, pausable* decoration, not a default perpetual pulse.

**Sound (deferred):** Decide the product promise, player controls and cost/asset rights before promising audio. 'Sound would be cool' is not a component specification.

## 4. Technology research: decide after prototypes

**Accessible primitives:** Radix Primitives offers unstyled interaction/focus semantics for complex dialogs, menus, popovers and tabs. It does not provide the product's visual identity. Relevant source: https://www.radix-ui.com/primitives/docs/overview/accessibility . Native semantic controls remain first option; an added dependency must solve a real repeated need.

**Motion:** Motion for React supports layout transitions, presence and gestures: https://motion.dev/docs/react and https://motion.dev/docs/react-layout-animations . Potentially suitable for passage/archive transitions and layered decisions *after* a defined motion score. CSS may handle many low-cost transitions; library adoption must be justified by a tested storyboard.

**Special illustration:** Rive can deliver state-machine driven animated illustrations: https://rive.app/docs/runtimes/react/react and https://github.com/rive-app/rive-react . Consider only for isolated, high-value art assets (e.g., one entry illustration or a specific status motif); never the source of gameplay authority, clickable permissions or required narrative clues.

**Timeline-heavy cinematic choreography:** GSAP is capable, but should be added only if a real storyboard requires its more precise sequencing and lifecycle control: https://gsap.com/docs/v3/Installation/ . Avoid stacking three animation engines just because they exist.

**Visual verification:** Existing Storybook and a11y addon can become a genuine component-gallery and design review bench. Add deterministic scenario screenshots and visual regression only when designs exist. Reference: https://storybook.js.org/docs/writing-tests/visual-testing and https://storybook.js.org/docs/writing-tests/accessibility-testing . Prefer locally reproducible screenshot diffs over assuming paid SaaS access.

**Recommended shortlist for *evaluation*, not installation:** native controls/CSS + purpose-specific Radix + Motion. Rive and GSAP are exploratory exceptions. The ordering is a budget and complexity discipline, not a blanket no to special effects.

## 5. Art-direction research artifacts we must make next

A reference board with 12–20 annotated examples, **not** a screenshot collage with no opinion. Three candidate full-screen compositions of the *same content* (real prose/choices/time); three mobile adaptations; six motion storyboards; a type specimen for English/Cyrillic; visual no-go samples demonstrating 'generic AI gradient/card soup'; and a one-page selected visual thesis with disconfirming tests.

A useful reference board annotates **what the image teaches**, which problem it solves, where it fails, and which part is world-specific. The output should lead to an original Offscreen visual identity, not a copy of screenshots.
