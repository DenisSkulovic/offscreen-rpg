# Phase 2 | Meaningful motion and bounded adaptive presentation

**Status:** interaction storyboard proposals. Not technical implementation, animation engine selection or license commitment. See `docs/product/experience/presentation.md` and `docs/technical/client/presentation-runtime.md` for accepted boundaries; those remain authoritative.

## Motion score: each animation must answer a question

| Event | Semantic reason | Proposed treatment to prototype | Timing hypothesis | Reduced motion / interruption | Never |
| --- | --- | --- | --- | --- | --- |
| Entry into Now | Establish present tense | Spatial composition settles while text is immediately available | 250–500ms for scene art only | Static image instantly; no delayed prose | Pretend a new scene published on mere load |
| New **published** passage | A new source ID is committed | Slight fade and baseline rise for passage content, stable source marker | 180–320ms | Instant replacement plus updated source label | Animate an uncommitted model draft as official prose |
| Decision focused | Clarify exactly which authored intention is inspected | Rule/accent follows focus; inline cost/risk becomes easier to read | 100–180ms | Native focus outline and text only | Make a hover animation the only indicator of effect |
| Command submitted/admitted | Cross irreversible threshold | Transition selected intention to a non-actionable receipt/ongoing state | 130–260ms | Immediate state/text update and focus on receipt | Show an earned reward before mechanic commitment |
| Ongoing accepted interval | Quiet, accepted wait | Very subtle environment continuation if safe and explicitly opted in | Ambient, budgeted; static baseline | No ambient movement; full status still present | Fake progress and hypnotic permanent spinner |
| Re-enter after absence | Regain bearings | Brief source-scoped recap appears alongside present scene | <=250ms | Stable source-based prelude, no page gate | Force an animation or autoplay entire unseen history |
| Now → Journal | Change temporal perspective | Stage recedes; one known source marker remains visible into editorial overview | 180–300ms | Immediate route/state switch; restore position | Morph history into current actionable state |
| Overview → original passage | Focus on original source | Expand text plane, anchored title/sequence, original content loads | 150–260ms | Standard page switch; focus moved intentionally | Depend on original art/media to render source text |
| Model/media error | Keep user safe | Minimal status replacement; last committed prose remains | Immediate | Announcement once when necessary | Decorative “retry” loop generating duplicate spend |
| Atmospheric shift | Reflect a validated Storyteller directive | Crossfade *only* bounded background/lighting layers | 250–700ms | Static new scene art / controlled palette | Override focus, error/warning/disabled semantics |

**Rules:** (a) animation cannot determine command admission; (b) interactive controls must respond during nonblocking animation; (c) media is optional; (d) motion respects hidden-tab/low-power/reduced-motion requests; (e) long prose can scroll independently of artwork without jank; (f) Storyteller cannot inject CSS, JavaScript, fonts, arbitrary geometry or accessibility-altering instructions.

## Adaptive presentation: separate who owns what

1. **Platform authority:** navigation, layout affordances, source identity, active/disabled states, error/recovery, buttons, accessibility roles, text layout safety and budgets.
2. **Storyteller expression:** bounded appearance signal such as palette family, lighting mood, environment/motif, shot emphasis and media intent when a validated source directive is authorized. It may choose among reviewed visual variants, not invent DOM/props.
3. **User preferences:** reduced motion, contrast, text size, screen reader, data saver and potentially artwork/ambient-motion toggles. The user's preference can further constrain Storyteller expression.
4. **Game/source truth:** exact published passage, current offer, accepted time, visible status and authoritative media attachment. All upper layers consume, never create, this evidence.

**Fallback chain:** authorized current directive + safe asset → valid tokenized scene theme → default platform presentation with **fully readable prose and actions**. If a media asset arrives late, it attaches only to the passage it belongs to; it cannot retroactively switch a player's current choice because an old image finished rendering.

## Three world-specific motion sketches (proposed)

- **Greywater / coastal beacon:** single slow change in atmosphere, low-amplitude wavering sea artwork and lamp bloom. Text and buttons do not ride waves; verified current situation appears before art.
- **Seventh Current / abstract conscious signal:** subtle oscillation of orbital rings and a single source-linked pulse at publication. Avoid pretending the frequency waveform is gameplay telemetry or a source-based map.
- **The Last Bus / quiet night:** little or no motion. Possibly a barely perceptible streetlight variation in illustration if motion is enabled. Never fake vehicles/encounters as game updates.

## Library decision comes later

Native CSS and platform semantics first; evaluate [Motion for React](https://motion.dev/docs/react) for actual shared layout transitions and [reduced-motion guidance](https://motion.dev/docs/react-use-reduced-motion). Rive is a potential **isolated** authored art asset format, not a blanket player-experience runtime. GSAP/WebGL are justified only by a proven high-value scene transition/performance case, not by the desire to “add polish.”

The current HTML concepts contain only minimal CSS state transitions; the scene vectors are static on purpose. This document specifies **candidate motion jobs** for the next storyboard round, not claims that cinematic motion has been built or evaluated.
