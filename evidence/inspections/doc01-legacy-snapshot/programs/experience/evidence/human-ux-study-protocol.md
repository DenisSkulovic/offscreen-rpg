# Human UX review protocol | how we know this feels like a game

**Status:** a practical evaluation procedure, not a claim that any user study has happened. Use after the first rendered prototypes exist. Product owner does **not** need to supply page layouts or diagnose visual-design issues: the UX architect generates competing solutions, chooses a preferred one and submits it to falsifiable tests. Related: [experience validation plan](validation-plan.md), [independent critique](independent-challenge.md), [composition alternatives](../foundations/composition-experiments.md).

## Evaluation philosophy

We're not asking testers whether a page is “modern,” “premium,” “intuitive” or “nice.” Those are almost meaningless without observed behavior. We ask whether someone understands **what is happening, what they can influence, what actually changed, and what will continue while they are gone**. Separately we ask whether they are curious enough to come back.

The test should punish confident but incoherent AI-made UI. A form can be valid JSX, satisfy accessibility linters and still require the player to decipher the developer's mental model.

## Research participants and setup

**First formative round:** ideally **5–8 people unfamiliar with this repository**. They needn't be paid industry experts; ordinary players with varied fiction/gaming familiarity are more useful than the coding agent that built the UI.

Try to include:
- people who like RPGs/text adventures;
- people familiar with games but not text-heavy RPGs;
- at least one person who rarely plays games;
- mobile and keyboard users where possible, with accessibility observations separately.

**Do not generalize small-sample percentages as population statistics.** The purpose is to find severe misconceptions and usability blockers, not publish a statistically significant conversion forecast. A later validation round can use more participants and instrumentation.

Test assets: an offline, deterministic story fixture and a **recorded list of which facts are real/simulated**. Provider spending disabled. Do not use an unverified LLM result that changes between testers to compare layouts.

## Three test variants, genuinely different

1. **A: Literary Reader** from [composition experiments](../foundations/composition-experiments.md#candidate-a--literary-reader). Narrative-first, minimal context.
2. **B: Living Situation Stage** from [composition experiments](../foundations/composition-experiments.md#candidate-b--living-situation-stage-recommended). Narrative with contextual commitment/time and a clear decision boundary.
3. **C: Deliberately operational comparator**, using the existing source structure or a neutral mock. Current UI is *not automatically worse* in every task, so test what it does well, especially tactical stat awareness.

Avoid making the comparator intentionally ugly. Content, underlying choices, state and typography readability should be comparable where possible. The hierarchy/interaction model is the variable.

Counterbalance order to reduce first-exposure effects: one tester sees B→A, another A→B. If true A/B instrumentation is impossible, show representative screenshots and ask tasks separately with explicit limitation.

## Session sequence (30–45 minutes as a recommended study format, not a production task duration promise)

### 0. Unprompted first impression

Show the initial Now screen **without narrating an explanation**.

Ask:
- “What do you think this is?”
- “What is happening right now?”
- “Where would you click first?”
- “What do you think would happen if you closed this page?”

Record exact words. If they say “AI chat,” “job tracking application,” or “settings page,” investigate whether the interface is undermining the game's promise.

### 1. Make a meaningful immediate choice

Fixture: stranger at the harbor beacon, active held repair at 3/9, two distinct options.

Instruction: **“You want to learn who this visitor is, without claiming you've already succeeded. Try doing that.”**

Observe: where they read, how they find the relevant action, whether they understand an attempted check, whether they notice the saved repair context. Do not tell them where to click.

Success: user can articulate “I tried to inspect the badge” rather than “I already know it's genuine.”

### 2. Commit to long-running work

Fixture: quiet harbor, repair A available, 3/9 retained, no current controlling scene.

Instruction: **“You would like your character to spend some time fixing this, then leave the browser.”**

Ask after commitment:
- “Has the repair already finished?”
- “How much progress has actually been earned?”
- “What will continue while you're gone?”
- “Could something interrupt it?”

Success: correct answers without explanation, no false reward expectation.

### 3. Interrupted commitment

Move to a **source-backed** interruption fixture if available, or explicitly labelled deterministic mock for visual comprehension.

Instruction: **“You return and discover someone arrived during the work. Tell me what happened and what you can do.”**

Success: they see work is suspended, earned progress persists, current decision is clear; they don't assume the repair completed during dialogue.

### 4. Return after a longer absence

Fixture: three actual committed events, one report pending, one unfinished plan; a reliable viewer-seen cursor only if supported, otherwise label **Recent developments**.

Instruction: **“You haven't looked at this story for several days. Tell me what matters now.”**

Success: within about 15–30 seconds in the study, the person correctly summarizes completed, unfinished and current decision. Timing target is provisional and should be interpreted in context (e.g., longer reading/assistive technology).

### 5. Weird-world test

Fixture: microbe sensing an environmental gradient, no human body/economy, one saved failed Wisdom/sensing check.

Instruction: **“Find what abilities your character can use here, and explain what it just failed to sense.”**

Success: no fake humanoid equipment/coins, no impossible Strength-based attempt shown; relevant state is discoverable without a giant dashboard.

### 6. Error/recovery trust

Fixture: network acknowledgment was lost *after* the user submitted an action, and the server outcome is unknown.

Instruction: **“You're not sure whether your action was accepted. What do you think is safe to do now?”**

Success: user doesn't assume clicking a new “Try again” always means the world never changed. The UI makes **Check status** or same-operation recovery understandable.

### 7. Public first contact

Show the scripted public preview independently of the private authenticated game.

Instruction: **“You arrived from an engineer's portfolio. Play one moment and tell me whether the preview's time is real.”**

Success: interactive choice visible before signup; participant correctly identifies simulation/reset behavior and can locate a truthful project/evidence link.

## Record observation, not designer interpretation

For each task, capture:
- participant's first selected action and time-to-first-relevant interaction;
- wrong clicks, hesitation, repeated backtracks and points requiring facilitator help;
- what they **believed** before/after action;
- whether belief matched the authoritative fixture;
- whether they discovered optional details when actually needed;
- qualitative curiosity: what would they do next without being told?
- whether visual art or motion helped or distracted.

A failure can be a semantic error (“I thought I'd arrived”) even with zero wrong clicks. Conversely, a long read isn't automatically failure for a literary RPG.

## Severity rubric

| Severity | Meaning | Example | Required response |
| --- | --- | --- | --- |
| **S0 trust-breaking** | Screen implies an authoritative consequence that did not occur | Reward displayed before settlement, phantom travel, duplicate command | Stop visual polish; fix data/contract or truthful copy |
| **S1 task-blocking** | Player cannot find or understand the necessary action | Decision buried under a settings inspector | Revise hierarchy/flow before implementation sign-off |
| **S2 costly confusion** | Player succeeds only after unexplained detour | Needs three drawers to check known danger | Promote relevant context, reduce interaction cost |
| **S3 comfort/taste** | Aesthetic/readability issue without false consequence | Too many borders, weak typographic rhythm | Prototype alternatives, evaluate in context |

A screenshot with great colors but an S0 defect **fails**. Releasing with an S1 defect because automated tests are green is a product mistake.

## Interpretation discipline and competing explanations

If a tester fails, do not immediately conclude that the visual layout was wrong. Plausible causes:
- the Storyteller authored indistinguishable choices;
- the server didn't project the necessary fact;
- the action's underlying mechanic is confusing;
- the page hierarchy is poor;
- user lacks game-domain vocabulary;
- an animation misrepresented acceptance;
- fixture story prose was ambiguous.

Rank causes from observed behavior and try a narrow alternative. A frontend-only fix cannot honestly repair unadmitted world state. Conversely, don't blame the model for a button named “Successor horizon in fictional seconds.”

## Design comparison: record a decision, not applause

Each comparison should produce:

**Candidate** → **What it helps** → **What it harms** → **Observed behavior** → **Leading cause of failure** → **Chosen direction** → **Reversal criterion** → **Next verification**.

Example: The contextual shelf may increase awareness of a saved repair but reduce prose reading width. If three participants can't find the choice while the shelf is open, test moving repair context into a compact inline strip. If a shelf improves high-stakes tactical choices without harming reading, enable it **conditionally**, not globally.

## Qualitative evidence packaging in GitHub

After the first real review, save a concise study report (private participant details anonymized) with:
- fixture identity and exact source/data evidence level;
- tested viewport, device class and input method;
- screenshot/video where permission exists and privacy is respected;
- critical observations and quotes;
- severity-ranked defects and the next design changes;
- what was **not** tested or remains uncertain.

**Do not manufacture a human study by having five LLMs review screenshots.** Multiple models can generate critiques and alternative explanations, but they are not independent human participants, and model-vs-model agreement is not proof of usability.

## Definition of done for the design, not just code

A player should leave understanding:
1. This is a persistent **life**, not a job scheduler;
2. I control my character's **intentions**, not guaranteed results;
3. Real time and committed consequence matter;
4. My previous effort isn't discarded at every scene;
5. Leaving is a valid part of play;
6. Returning reveals actual history and current agency.

And crucially, **the player should want to discover the next meaningful moment**. That last criterion requires observation of genuine story quality over time. It cannot be asserted from MD documents, mockups, TSX quality or an attractive static hero screenshot.
