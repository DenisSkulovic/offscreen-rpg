# Experience validation | evidence before applause

**Status:** test plan, not completed research. No human user study or rendered design acceptance has been conducted for this target. Screenshots, Storybook states and automated tests are **different evidence classes**.

## Three gates

**Gate 1: conceptual clarity.** Can someone unfamiliar with the code describe the game's unique promise, distinguish proposing/committing/completing, and choose meaningfully?

**Gate 2: behavioral correctness.** Do authenticated, versioned operations and recovered states preserve time, agency, privacy and charges under realistic failures?

**Gate 3: craft and preference.** Does the interface feel inviting, distinctive, readable and coherent across stories and devices? This is a human judgment measured against actual experiences, not a CSS checklist.

The prototype can fail Gate 1 with perfect React architecture. It can pass Gate 1 with a static mockup while failing Gate 2. Neither is “finished.”

## Research tasks and provisional thresholds

Use 5–8 unfamiliar testers for an initial qualitative round. These numerical targets are **working decision gates**, not claims of measured success. Do not squeeze participants toward success; observe behavior first.

| Task | Ask person to do (without coaching) | Proposed success criterion |
| --- | --- | --- |
| T1: first scene | Open a public demo and make a meaningful decision | Most participants recognize how to interact within ~45 sec |
| T2: earned time | Start work and explain when reward is really owned | At least 4/5 distinguish start from completion |
| T3: different clocks | Explain in-world progress, real wait and why a timer may shift | At least 4/5 correctly identify both semantics |
| T4: interruption | Respond to stranger, then predict repair progress | At least 4/5 expect preserved, non-advancing suspended work |
| T5: re-entry | Return after days and identify what changed/current choice | At least 4/5 locate current situation within ~15 sec |
| T6: quiet idle | Open a story with no active work; explain if time is progressing | At least 4/5 answer “no” and can choose next action |
| T7: recovery | Confront unknown action ACK; decide what to do | No tester believes repeated clicks are the safe default |
| T8: nonhuman | Start/inspect a bodiless or microbe story | No irrelevant mandatory humanoid data/action assumptions |

Record hesitation, wrong clicks, exact utterances, time-to-orientation and perceived agency. Do not report only a vague satisfaction score.

## Design comparisons (actual alternatives)

**A. Scene-centric narrative column** vs **B. scene + restrained contextual shelf**. Compare comprehension of active work and reading ease, especially mobile. Choose shelf only when it adds context without stealing focus.

**A. Verb-led choice rows** vs **B. expanded choice cards with stakes**. Use simple dialogue and a consequential long commitment; may need different treatments for different cost levels. “Consistency” is not a reason to make every quick sentence a huge card.

**A. Short factual return digest** vs **B. full chronology on entry**. Measure reorientation and whether users can find evidence behind a claim.

**A. Native simple transitions** vs **B. motion-enhanced reveal**. Test comprehension, comfort and interruption; motion is not automatically preferred.

## Realistic content and state fixtures

- Passage of 1 paragraph; passage near maximum contract length; many dialogue turns in one scene.
- One offer, grouped dozens of local opportunities, nothing offered.
- A contribution process with failed attempts and unpredictable completion time.
- A literal wait with predictable elapsed fraction.
- Travel with no reliable path progress metric.
- Active work interrupted, preserved 3/5 earned progress.
- Known pause; no activity; decision hold; quota hold; provider disabled; recovered uncertain ACK.
- One character with concrete D&D sheet and coins; one with no body/map/economy.
- A brief visitor demo and a long-running authenticated story, explicitly distinguishable.
- Story name and location that are very long, multilingual, or absent/unknown.
- Dark/high contrast, image failed, 320/375/768/1440 px, browser 200%/400% zoom, keyboard, reduced motion.

## Evidence tools and limits

| Evidence | Good for | Cannot prove |
| --- | --- | --- |
| Markdown wireframe | Hierarchy and state concept | A beautiful or usable screen |
| Storybook with MSW | Deterministic visual state matrix and component accessibility | Provider/backend authority, cross-device browser truth |
| Vitest/RTL | Focus, choices, state rendering, race handling | Real-world aesthetic quality |
| Playwright/axe | Browser flows, viewport and common a11y violations | Human comprehension and all assistive-tech behavior |
| Manual keyboard/screen reader | Practical operability | Full range of users |
| Real authenticated server integration | Time, receipts, recovery, event ordering | General model storytelling quality unless explicitly exercised |
| Bounded live provider test, explicitly authorized | Real generation quality and cost | Unlimited long-story continuity or production scaling |
| Human observation | Comprehension, natural navigation, felt agency | Formal proof of backend idempotence |

No paid provider calls, destructive DB resets or deployment are authorized by this document.

## UX acceptance checklist for each Change

1. Clear primary player goal, hierarchy and action copy.
2. All relevant normal + blocked + pending + uncertain + empty states.
3. Distinction between *proposed*, *accepted* and *settled* consequences is preserved.
4. No hidden cost or accidental authority in navigation/retry.
5. Wide and narrow browser captures with meaningful prose.
6. Keyboard + focus + high contrast + reduced motion evidence.
7. Appropriate Storybook fixtures and a representative browser flow.
8. A negative case where a plausible AI-generated implementation would look correct while behaving incorrectly.
9. Human review of at least one actual rendered candidate, with written critique and a before/after comparison to the agreed target.

## Reporting format

For each review: **Scenario → observed user behavior → violation → severity → proposed design change → owner decision → evidence class**. A design Change can remain Proposed until browser evidence exists. Avoid “clean, modern and intuitive” as a measurement; it explains nothing.

## Stop conditions

Stop polishing if a foundational promise is broken (e.g., action promises reward before settlement, pause doesn't stop progress, recent recap invents events). Fix authority/comprehension before aesthetic finishing. Conversely, don't accept a working state machine as finished if the screen still feels like an enterprise issue tracker.
