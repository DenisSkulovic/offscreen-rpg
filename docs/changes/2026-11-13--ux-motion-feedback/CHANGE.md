# UX10 | Game-feel motion tied to true events

**State:** Proposed. **Approval:** no code authorized. **Kind:** UI motion/feedback + accessibility/performance tests. **Parent:** [experience program](../../experience/implementation-program.md), M3. **Dependencies:** UX02, UX03, UX04.

## Cursor first-screen brief

> **Source map:** [Play owner](../../../apps/web/src/features/play/README.md), Storybook fixture catalogue and app CSS. Inspect source of passage, choice, work and saved roll receipt.
> **Primary target:** [motion grammar](../../experience/system/motion.md#motion-grammar-recommended) and [meaningful animation](../../experience/system/motion.md#animation-identity-and-lifecycle).
> **Known trap:** SSE invalidation/refetch and React remounting can replay entry animations; a frontend-rendered countdown can look complete before backend settlement. Dice must be **already committed** and their public details authorized before any flourish.
> **Scope:** proposed only. Add no general-purpose animated state machine, paid animation service or fake progress engine.

## Target and trade-off

The world should *feel* its actions: a committed choice, a new passage, an earned milestone, an interruption and a return can have short, purposeful visual cues. In continuous reading, animations should be so restrained that the narrative remains comfortable.

Alternative: continuous animated particles, simulated travel maps, elaborate typewriter text and repeated dice spins. They may create a “game” impression in a short mockup but compete with reading, slow play and confuse what truly occurred. Prefer static beauty where movement contributes no information.

## Code-bearing outcome

1. Standardized CSS transitions for simple focus/hover/selection and choice acknowledgment; dynamic motion only in components with a clear state transition.
2. Selectively install/use stable Motion for React **only** if a demonstrated composition needs coordinated enter/exit/layout transitions not adequately served by CSS. Version/bundle/license/Next compatibility verified during Change readiness; recommendation is not pre-approval.
3. Passage appearance keyed to **new published passage identity**. Do not reanimate history on remount, hydration, SSE hint or browser back.
4. Progress cues keyed to actual server-acknowledged ongoing state; freeze on pause/interrupt/hold, never declare completion at timer zero.
5. Saved-roll reveal can animate the **already recorded** authorized die/check result; never pick a result in the browser, reroll or leak a hidden DC.
6. Error/uncertain operation status uses restrained visual feedback. Duration and typography do not obscure the actual recovery control.
7. Respect reduced-motion with static/opacity alternatives, and never gate reading, choice, screen-reader announcements or model progression on animation.

## Authority and baseline

[Now](../../experience/spaces/now.md), [time authority](../../experience/patterns/time-and-truth.md), [Motion spec](../../experience/system/motion.md), [accessibility](../../experience/system/accessibility-and-voice.md), [React Query source](../../engineering/targets/react-next.md).

Stable Motion for React supports useReducedMotion and AnimatePresence (see linked research); Radix supports keyboard/focus primitives. Current app manifest inspected 2026-11-13 lacks a motion dependency. Main baseline 8c91618, no rendered animation or FPS measurement. Check source and package versions when Ready.

Likely source-local animated wrappers of Passage/Choice/Commitment and CSS/tests. Do not add global Query state, new Storyteller calls, Rive animation runtime, Lottie assets, heavy parallax or client-side roll randomness.

## Acceptance and negative proof

**Normal:** new committed passage arrives gently; selected choice shows feedback then honest waiting/settled state; interruption causes work motion to cease; saved die can be revealed without changing outcome; scene still reads elegantly in no-motion mode.

**Negative:** duplicate SSE or hydration cannot replay result as new; reduced-motion removes nonessential movement and nothing disappears; browser timer cannot animate reward before canonical settlement; pause stops motion but preserves progress; background updates don't steal focus or scroll; low-end phone shows no substantial interaction jank; animation complete callback performs no game mutation.

**Proof:** Storybook state variants with reduced-motion, RTL event-identity/re-render guards, Playwright or recorded browser evidence in motion/no-motion, bundle/performance comparison. Source code inspection alone is not visual acceptance.

## Handoff

Ask Cursor to present a tiny motion storyboard or two rendered before/after candidates and justify why each improves comprehension or atmosphere. Owner reviews motion **after** truthful core experience; treat restraint as a deliberate design decision.