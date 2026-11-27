# PD01 | task queue

Base SHA: `c7058958ec3f43fd37ec680d05757561d628926b`; latest must recheck. Change state: Proposed, no selection. Shared path lock: group target join only; no shared canonical writes. Contract owners: [accepted Design](../../../../designs/open/product-documentation-renewal/README.md), named card anchors. Tasks: T01 → T02; selected task: none.

## T01 | Vision and entry semantics | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: commission and verified target/ownership.

May write: `docs/product/foundations/vision.md`. Must not write: any other canonical owner, source, config, proof or shared register.

Read: `docs/product/foundations/vision.md`, `docs/product/gameplay/rules.md#world-independent-foundation`, `docs/product/gameplay/acceptance-scenarios.md#first-solo-acceptance-walkthrough--harbor-and-return`.

Algorithm: Keep the existing headings. Rewrite the opening and `What this page selects` as a short introduction to the intended experience and selected commitments, then move detailed explanations to their existing sections (no lost commitments). Merge the duplicate D&D sentence beneath `The D&D foundation`, leaving that anchor; say authored rules families are optional and mechanically authoritative when enabled. In `Scene history and alternate continuities` retain every historical state category, independent branch, no provider/spend/clock action on reads, and unresolved storage/timer/atomic design; rewrite as future experience rather than currently working ability. In `The storyteller` describe the selected creative identity and behavior before the realization mechanism; avoid presenting agent/model/task composition as an implementation guarantee. Preserve sparse world identity and applicability to nonhuman forms. In `First playable target`, retain Prepared Play/optional Customize, verbatim Story Prompt not canon, no required wizard/preview, first admitted scene, latency not clock progress, no unnecessary setup call. Collapse repeated solo/shared explanation into `Larger shared worlds` plus a one-sentence cross-link. Keep the illustrative $2 allowance and no spend permission in `Why build it`, and preserve all risk, immediate-gift/teleport, time and consent exceptions in `Earned life`. No new MVP, no current-playability claim.

Test: none at child boundary — source/diff semantic gate; parent runs [PROOF](PROOF.md) once. Negative: A reader must not infer mandatory D&D, a mandatory preview, delivered arbitrary forks, or player action when absent without authorization.

Stop: material source or selected-contract drift, unique fact without survivor, conflicting writer, or new policy decision. Receipt: exact edited headings, preserved constraints and evidence routes, semantic counterexample result, actual diff, any NOT RUN or contradiction.

## T02 | Concepts and realization boundary | PROPOSED

DEPTH=PATCH; type DOCUMENT.

Requires: T01 source receipt; verified target/ownership.

May write: `docs/product/foundations/concepts.md`. Must not write: any other canonical owner, source, config, proof or shared register.

Read: `docs/product/foundations/concepts.md`, `docs/technical/storyteller/request-context-and-cost.md#active-scene-continuity-and-disposable-task-conversations`, `docs/technical/storyteller/generation-and-publication.md#scene-publication-fence`.

Algorithm: Rewrite the opening as product vocabulary; move the storage-label caveat down into `Execution and storage concepts`. Keep every player/world term and boundary, grouping explanatory prose around the scene, decision, activity and authority distinction. Rewrite `The answer to “what does the Storyteller do?”` as the selected investigative target (pinned sources, Workdesk, tools, skills, optional bounded assistants and authority admission), not a running general agent. Preserve mission/turn/scene/passage/round non-equivalence and no hidden-reasoning persistence requirement. Keep `Execution and storage concepts` heading and definitions; mark internal storage labels and the current multi-publication path as dated legacy realization examples in one compact paragraph, retaining `result.scene`, `story_passage` and current-path scope verbatim until TD05 receives them. Do not remove unique facts now. Keep beacon example 600→660→750, supported D20 once, no repair labor while interrupted, no latency/deliberation time, no chapter assumption. Keep all existing anchors and technical owner links.

Test: none at child boundary — source/diff semantic gate; parent runs [PROOF](PROOF.md) once. Negative: A reader must not infer one scene per call/file, a mandatory chapter lifecycle, agent execution as delivered, or a Storyteller-owned mechanical result.

Stop: material source or selected-contract drift, unique fact without survivor, conflicting writer, or new policy decision. Receipt: exact edited headings, preserved constraints and evidence routes, semantic counterexample result, actual diff, any NOT RUN or contradiction.
