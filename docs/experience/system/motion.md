# Motion and atmosphere | animation must tell the truth

**Design status:** target behaviors and tool recommendation, not finalized visual identity. Primary references: [Motion for React](https://motion.dev/docs/react), [AnimatePresence](https://motion.dev/docs/react-animate-presence), [WCAG interaction animation](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions).

The game deserves movement. It does **not** deserve a casino of pulsating cards, perpetual dice and fake travel particles. Motion should make a state transition *felt*, especially acceptance, ongoing time, interruption and a consequential reveal.

## Motion grammar (recommended)

| Event | Appropriate visual cue | Purpose | Never |
| --- | --- | --- | --- |
| Enter a story | Brief softened scene reveal; static content available immediately | Arriving in a place | Forced multi-second intro |
| Choose an intention | Immediate pressed/selected feedback; then persistent accepted/pending label | Acknowledge the click without lying | Play a success animation before server admission |
| New passage published | Gentle opacity/position arrival, preserve reading focus | Differentiate new canonical content | Typewriter every letter or auto-scroll a reader |
| Work begins | Transition from offer to “Repairing ...” commitment state | Mark changed authority | Assume 100% eventual success |
| Work continues | Very restrained indicator tied to verified deadline/progress | Communicate durable activity | Rotate/spin a job continuously to imply free progress |
| Work boundary settles | Compact earned-milestone cue once per committed receipt | Consequence matters | Rerun on SSE refetch/reload as if new |
| Interrupting event | Stop progress motion, reveal new situation, bring action zone forward | Show agency needed | Keep old work bar running under modal danger |
| Dice check revealed | Short flourish resolving to an **already saved** die/result | Dramatize actual uncertainty | Client rolls or hides result to manipulate suspense |
| Manual pause/hold | Freeze all progress animation and reveal clearly labelled state | Stop is real | Animated “still running” ambience |
| Error/uncertain receipt | Steady status text with optional modest activity indicator | Avoid false certainty | Confetti, shaking, modal floods |
| Open Journal/You/World | Quick, spatially consistent transition | Maintain orientation | Heavy cinematic page-flip every navigation |
| Return after absence | Digest appears as an optional contextual layer, not an intrusive popup | Re-entry without disorientation | Auto-play dozens of accumulated events |

## Timing proposals (to prototype, not universal constants)

- Button and hover state: ~80–150 ms.
- Short panel/dialog transitions: ~140–220 ms.
- Passage entrance: ~180–280 ms; **do not delay the text becoming available or screen-reader-accessible**.
- Consequential reveal: ~250–450 ms maximum when not interrupting interaction.
- Scene-level transitions: under ~450 ms and skippable/reduced-motion friendly.
- Avoid indefinite “breathing” loops unless they express a true ongoing state and remain non-distracting.

Exact timing is a taste decision to validate in actual browsers. Content and input remain usable even if all animation is disabled.

## Tool choice

**CSS transitions** for simple hover, focus, color, opacity and one-off property changes. **Motion for React** for coordinated enter/exit/layout choreography and interruptible scene-state transitions. No large animation framework for one progress bar.

**Rive** is compelling for an optional *bespoke authored illustration*, e.g. a living instrument glyph, weather motif or title-screen ambient art. Do not use Rive as a general React component library or ship a heavy asset with every Storyteller passage. Rive is conditional on real art/design needs, runtime performance, accessibility fallback and license verification.

Do not run animations on a timer that changes underlying story state. Timeline may be visually interpolated from server-confirmed execution/deadline, but settlement comes from canonical GET/receipt, never an “animation complete” callback.

## Animation identity and lifecycle

- Key animation to *actual committed event identity/revision*, not every refetch or component mount.
- A returning player can read old outcomes without every prior animation replaying by default.
- When data revalidates to a newer version, animate only the relevant newly published change if it is currently in view and appropriate.
- Preserve focus, scroll and draft content during transitions.
- Background SSE may announce a development without stealing the screen while the player reads old history.
- In a reduced-motion environment, replace displacement/parallax/zoom with static or subtle color/opacity state, and offer a user option to disable nonessential motion if needed.

## Game-feel without visual overload

Atmosphere may arise from:
- Deliberately composed readable text and occasional expressive heading.
- An optional still image, illustration crop, texture or location-specific motif.
- A faint, accessible ambient environmental layer *when it adds meaning*, not stock “space dust.”
- A restrained purposeful sound design **only by separate user opt-in**, with captions/disable and no autoplay requirement.
- Rich consequences and remembered world details, which are stronger than 40 particle effects.

A fantasy setting may feel intimate and painterly; a microbe story may be spare and abstract. The **functional design system stays stable** across both.

## Negative checks

- Enabling OS reduced motion removes unnecessary position/scale/parallax transitions without hiding information.
- Provider latency lasts 30 seconds: no spinner pretends the character aged 30 extra fictional seconds.
- SSE sends a duplicate update: passage animation does not replay as a newly committed result.
- Pause mid-journey: progress visuals stop and preserve last confirmed state.
- Dice check failure: the animation cannot “change its mind” if data refreshes.
- Slow phone: motion does not block choice input, scroll or navigation; measure actual dropped frames and bundle cost before declaring it polished.
