# Storyteller agency and taste

Status: Approved for offline implementation by the owner on 2026-09-19. Live inference remains unauthorized.
Approval: Implement the phased experience-quality slice with Codex choosing the bounded benchmark details.

## Intended outcome

Make a short Offscreen RPG exchange feel authored by a perceptive dungeon master rather than by a schema-compliant text generator. Structurally valid output is necessary, but this feature succeeds only when the Storyteller notices the situation, respects the selected genre and pace, offers genuinely different intentions, and lets committed outcomes reshape what becomes possible next.

This is the quality gate for the immediate DM loop. It does not weaken deterministic authority: the Storyteller still proposes, while application rules admit plans, roll dice and commit effects.

## Representative flow

In the pineapple benchmark, Gary is alarmed beside a suspicious rattling delivery. The opening offers several materially different approaches: calm him, seek cover, inspect the delivery indirectly, or disengage. The player chooses conversation and the server commits a failed Charisma check. The next scene does not paraphrase “failure” and repeat the same menu. Gary's distrust is visible, direct inspection may become harder, cover or retreat remains possible, and a newly established clue may create a different approach.

The same task handles a microbe responding to environmental change without translating the situation into human conversation, money or anatomy. A quiet premise may legitimately produce one low-stakes action or a held state. Absurd comedy changes framing and possibilities without forcing a joke into every outcome.

Malformed or mechanically unsupported proposals are rejected with bounded diagnostics. Offline scripted cases provide deliberately strong and deliberately bad examples. A later live-model run occurs only through the separately authorized evaluation feature.

## Scope and boundaries

Included:

- an observable agency/taste rubric for openings and consequence turns;
- state-responsive options, including at least one changed option set caused by a committed roll or fact;
- distinct intentions rather than cosmetic paraphrases;
- specific consequence prose grounded in the receipt and current scene;
- legitimate quiet, constrained, one-option and held situations;
- offline golden and anti-example fixtures through the production task/admission/publication path;
- human review evidence captured in the existing QA/Chamber facilities;
- prompt and result-contract changes needed to make these qualities inspectable.
- explicit contrast between reactive ordinary-life play and Storyteller-directed narrative pressure, without making a grand narrative mandatory;
- separation of mutable creative profile/settings from campaign-owned private narrative direction.

Deferred:

- live-model authorization, model comparison and spend policy, owned by conservative live-model evaluation;
- long-story recall, owned by storyteller memory and situated recall;
- full combat, arbitrary rules, autonomous absence and multiplayer judgment;
- an automated model critic or numerical “fun” score.
- implementation of narrative-direction storage, editing and world-obligation proposal beyond the existing canonical-storage/runtime owners.

The acceptance rubric is not application authority. Human preference cannot make an invalid plan executable, and a validator cannot certify good writing.

## Acceptance

- Three consecutive pineapple rounds contain situation-specific prose and materially different intentions.
- At least one committed success/failure or fact removes, alters or introduces a later feasible option without a scenario-name branch in application policy.
- The player can explain how each offered intention differs before seeing its hidden mechanics.
- A microbe case uses the same task and admission lifecycle while producing nonhuman options.
- A quiet case may remain quiet; the Storyteller is not rewarded merely for escalating stakes.
- A directed quiet-life case may introduce a larger pressure unrelated to the player's immediate routine, while preserving the option to ignore it and without predetermining the outcome.
- A no-grand-narrative case does not acquire a secret arc merely because routine play lasts a long time or the profile changes.
- Repeated labels, generic “assess/continue” loops, consequence prose that ignores the receipt and options that promise their own success fail the rubric.
- Offline golden fixtures and anti-examples are inspectable and reproducible, but are not reported as live-model quality evidence.
- One owner review records what felt specific, arbitrary, constrained, surprising and undesirable before any live evaluation is proposed.

## Selected POC decisions

- The canonical benchmark is the less weapon-centered absurd domestic problem: Gary and a suspicious rattling delivery at the pineapple window.
- Public options expose the attempted commitment and concise apparent risk through the existing intention/risk projection, never hidden outcomes or DCs.
- The first quality review retains admitted buttons only. Free-form gameplay intent remains outside this slice.

## Owning specifications

[Vision](../../vision.md), [gameplay](../../gameplay.md), [game rules](../../game-rules.md), [storytelling](../../storytelling.md), [player experience](../../player-experience.md), and the implemented [Storyteller runtime](../../technical/storyteller-runtime.md). Live calls remain governed by [conservative evaluation](../2026-09-18--17-27--conservative-live-model-evaluation/FEATURE.md).
