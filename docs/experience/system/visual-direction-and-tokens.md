# Visual language and art direction | make it feel like a game without fantasy UI clichés

**Status:** proposed visual **direction**, not finished palette, pixel-specification or approved asset collection. User priority is information architecture/flows/mechanics; nonetheless visual personality matters for the public portfolio. This is the bridge between experience and later art design.

**Implementation connection:** the living field-journal aesthetic remains a default visual direction, not the sole look of every world. The selected [presentation runtime](presentation-runtime.md) and its [versioned language](presentation-language.md) allow future story/scene-specific atmospheres and individual expressive choices while protecting the reading experience. The [frontend-only PX program](../presentation-implementation-program.md) defines the implementation route; no engine styling output is implemented or authorized by this design note.\n\n## The anti-default brief

If a screenshot can be repainted and shipped unchanged as a project management dashboard, our UI failed. If the game requires parchment, swords, illustrated humans or a fantasy map to look good, our world-neutral promise failed. If it is purely a blog post, the UI failed to express **time, agency and consequence**.

**Selected direction to prototype:** **“A living field journal with instruments for time.”** Literary, atmospheric and precise, with a stage that shifts as a life shifts. The **fiction** gives it personality; the **interface** gives it clarity; the **commitment/return** gives it game-feel.

This is a working designer thesis, not a final theme. Test it against a fantasy prisoner, a sentient storm, ordinary city life and a strange biological scale.

## Three genuinely different visual directions

| Direction | Visual behavior | Advantage | Danger | Verdict |
| --- | --- | --- | --- | --- |
| **A. Illustrated Folio** | Strong scene art, decorative chapter-like typography, tactile material | Immediate atmospheric identity for familiar RPGs | Medieval/fantasy assumptions, costly images, weak for abstract worlds, false “chapters” | Optional per-world skin, **not platform default** |
| **B. Living Field Journal** | Strong prose typography, restrained framing, precise situation/time seams, modest motif | Works across worlds, favors reading and earned effort | May look like an article site if time/consequence feedback is weak | **Primary prototype direction** |
| **C. World Instrument** | Systems-driven status layers, geometric panels, animated time/route indicators | Distinct sense of world simulation, good for long journeys | Easy to become an engineer dashboard or sci-fi terminal | Borrow only contextual status grammar |

The selected B should borrow C's **truthful time instrumentation** without inheriting C's density. Let a world choose an art style where content justifies it.

## Architectural composition roles

### Background / place

The ambient plane establishes emotional space: subtle texture, lighting, original location motif or just sophisticated negative space. It does **not** carry unique information or fill the screen with stock animation. A quiet absence can legitimately have a lot of room.

### Narrative stage

The center is an **open readable plane**, not a stack of outlined cards. Prose and scene title dominate. Its edges can be gentle without imitating a paper form. A story's changing situation may change atmosphere but never hide text or controls.

### Action threshold

A distinct boundary announces that the player is now choosing, not reading. Structural separation plus an accessible label beats relying on color alone. Action rows can be deliberately simple for dialogue; a large commitment earns a little extra space and consequence detail.

### Time seam

A small but precise region communicates **earned progress / forecast / pause / interruption**, not a global clock widget pulsing regardless of activity. When time matters, its semantics become visible; otherwise the interface doesn't demand a timer for every sentence.

### Context / memory

A single concise fact strip or optional Details view exposes what the player needs. A wide screen does not automatically deserve a second column of statistics.

## Token system: roles before hex codes

| Token family | Required semantic roles | Design note |
| --- | --- | --- |
| Backgrounds | app backdrop, narrative plane, contextual surface, interactive surface | Do not place every element inside the same bordered card |
| Text | long-form narrative, control label, secondary context, quiet caption, inverse | Body reading has strong contrast; metadata never becomes invisible |
| Action | interactive default, hover/focus, selected, disabled/reason, consequential confirm | Appearance matches affordance; disabled isn't the only way to explain unavailable |
| State | attention needed, active, paused, pending, blocked, settled, uncertain | Never depend solely on color; icon+label/semantic structure |
| Borders/separators | scene-action threshold, optional context separation, focus outline | Use sparingly; a wall of borders is admin UI |
| Depth | background, stage, sheet, modal | Limited hierarchy, no uncontrolled z-index wars |
| Type | scene title, passage body, action label, system status, numbers, small metadata | Different reading and numerical semantics |
| Motion | selection feedback, passage arrival, commitment transition, interruption | Tied to actual event identity; reduced-motion alternative |

## Initial numeric experiments (not contractual token values)

- Narrative body: try **16–19 CSS px** depending on font and viewport, with comfortable line-height around **1.5–1.7**. Don't force 19 px if it reduces mobile reading efficiency; test actual content.
- Reading measure: initially target **60–75 characters per line** for paragraph text where space permits; never force horizontal scroll.
- Choice rows: enough vertical padding to read touch/keyboard focus comfortably, test **44px or more** interactive target where feasible. WCAG 2.2 AA has nuanced target-size requirements, not a blanket 44px rule; aim beyond the minimum where the game can.
- Body text contrast: **at least 4.5:1** for normal text, interactive component/graphics contrast **at least 3:1** where applicable. Enhanced contrast and high-contrast modes need actual rendered testing.
- Typical modest state transition: around **120–280ms**, no mandatory animated text delay. Do not use “longer transition means more immersive” as a rule.
- Story heading scale should make a change of situation visible, but avoid a massive hero headline that pushes all choices far below fold every two sentences.

These values are hypotheses for prototype inspection. Chosen fonts, non-Latin coverage, user zoom and actual story length dictate final tokens.

## Typography is a game mechanic for this project

Text is much of what the user consumes. Choose at least:
- A **body reading face** with excellent Cyrillic/Latin and other relevant script support, legible punctuation, distinction of similar glyphs, fast rendering and robust fallbacks.
- A **display face** only if it adds identity without harming longer passages.
- A **UI face** optimized for small actionable labels, numbers and multilingual text; it may be the same as body if that yields cohesion.
- A **numerical presentation** for durations/rolls where alignment improves comprehension, not a monospace terminal across all text.

Don't hardcode one evocative font with poor glyph coverage and discover that the Vvardenfell name or player-created non-Latin world renders in a different weight.

## World-specific atmosphere without fragmenting UI

A given story might optionally supply a **scene palette/accent, banner/motif, illustration, soundscape** (later and opt-in), or a small set of contextual assets. These change **mood**, not status meaning or layout authority.

- Fantasy port: restrained sea-glass tones / antique texture, but no mandatory parchment.
- Deep-space station: sparse geometric motif without a permanently flashing HUD.
- Microbe: abstract gradient or organic shape if art exists, not a terrestrial map.
- Sentient storm: atmospheric field lines/motion optional, without pretending to expose omniscient meteorology.
- Domestic quiet story: subtle everyday detail, not a forced heroic RPG frame.

A story without assets still gets full typography and user actions. If assets fail, nothing blocks play.

## Component and implementation tool choice

- Use native semantic HTML first; **Radix Primitives** for dialogs/popovers/menus when keyboard/focus behavior is complex. [Official accessibility guidance](https://www.radix-ui.com/primitives/docs/overview/accessibility).
- Use **shadcn/ui** as **selective source-owned starting code**, not as the style system; it documents that it is a way to build your library rather than a fixed installed library ([official](https://ui.shadcn.com/docs)).
- Use CSS transitions for simple hover/focus; consider **Motion for React** for meaningful enter/exit/layout choreography, with reduced motion ([official](https://motion.dev/docs/react-use-reduced-motion)).
- Treat **Rive or bespoke vectors** as separate optional art production; do not add to the base bundle to animate a status label.
- Existing Next/TanStack/RHF/Zod engineering architecture remains selected. Visual changes do not authorize state/store rewrites or broad Tailwind migration.

## Negative visual judgments

Reject a design if:
1. It has 5 equal-weight cards on the first screen and no obvious decision.
2. Character stats, settings and history occupy more attention than current fiction.
3. The image is the only way to understand an important clue.
4. The whole interface pulses while the game is paused.
5. An abstract story looks like a reskinned medieval character-sheet manager.
6. Contrast/target/focus breaks on long text, zoom or mobile.
7. The UI feels “premium” in a static screenshot but nobody understands whether work is *earned* or merely *estimated*.
8. A skeleton or gradient covers the scene while the provider is delayed even though the last verified passage could remain readable.

## Visual review deliverables for Cursor, later

For the first actual scene Change, require:
- One **wide** desktop capture (current scene+offer), one **375px** capture, one no-image variant.
- A 10-paragraph passage, an interrupted work scene and a quiet no-activity state.
- Focus/hover/disabled contrast and reduced-motion proof.
- Explicit comparison against **Reader** and **Dashboard** alternatives, not a choice between two accent colors.
- An explanation of *why* every major visible surface occupies its space.

This art-direction document is a decision instrument. Human review of rendered scenes, not the words “immersive” or “cinematic,” decides whether it worked.
