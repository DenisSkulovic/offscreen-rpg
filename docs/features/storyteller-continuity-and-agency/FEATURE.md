# Continuity and meaningful offered choices

Status: Implemented offline scope; focused checks passed. Live evaluation remains deferred.
Approval: On 2026-09-18 the owner explicitly authorized Codex to design and implement the storyteller work across these features, batching checks after the implementation. Live inference remains disabled; paid evaluation is separately gated.

## Intended outcome

After several decisions, the selected storyteller still recognizes the starting situation, earlier consequential choices and present circumstances. Choosing to question Gary changes what follows differently from hiding or investigating. A profile affects what dilemmas arise and how consequences develop, not just adjectives.

Depends on [selectable storytellers](../storyteller-profiles-and-runtime/FEATURE.md). This is a small continuity capability for the playable POC, not a population model or a claim of reliable month-long memory.

## Representative flow

At the pineapple, ask why Gary is armed. Learn that he promised to protect a missing delivery. Later choose an ordinary trip to work, complete its real wait and have several other exchanges. When returning to the delivery question, the next continuation still knows the promise and whether the character agreed to help. Choosing to avoid the problem instead must not silently record that agreement.

Repeat with the mystery profile: an unusual sound, an investigation and a promise create a different situation. The runtime and output machinery are identical. A third premise involving a nonhuman creature verifies that neither context assembly nor memory assumes restaurants, human bodies or SpongeBob.

## Context architecture

The current continuation request includes premise, current scene, items and selected intention. It supplies neither earlier passages nor persistent narrative memory. Adding bigger profile prompts alone will not solve this.

Assemble one story-scoped immutable context at admission, under the existing story lock and consistent bounded reads. All story-writing paths must participate in that locking contract. Store the resulting artifact before inference. Required sections, in order:

1. Core/task instructions and selected profile guidance.
2. Frozen premise and optional direction.
3. Current committed passage, authoritative items, current wait/decision restrictions and application capabilities.
4. The exact chosen visible label and its server-recovered intention.
5. Bounded derived continuity notes, each with source evidence.
6. A recent chronology window in chronological order, including accepted responses where present.

The private manifest records story/base revision, passage IDs/sequences/source parts, profile/prompt versions, note revision and omitted chronology coverage. Use local passage handles in the model payload; database IDs and owner IDs stay in the private manifest. Never include another story, an unselected option's imagined outcome, an unfinished generation or prepared arrival as already happened.

Initial deterministic bounds: at most 6 previous committed passages, plus the current passage; at most 20 continuity notes of 400 characters each; at most 4 evidence handles per note. The context assembler also enforces a versioned total serialized-byte limit, initially 48 KiB for the complete captured request including schema. These are protective development defaults to tune through evaluation, not measured optimal token counts. Provider token admission is a separate later check.

Mandatory current state, intention, constraints and retained notes are never silently truncated. Include recent passages newest first until they fit, then emit them chronologically; omit whole older passages with coverage recorded. If mandatory data does not fit, return `context_too_large` before source execution and show an explained hold. No model call to summarize overflow automatically. Long original passages stay intact in the player's history.

## Small, source-backed continuity memory

Use a private story-owned derived note snapshot, not a general world entity table. A note has an opaque story-local key, text, source passage references and the revision at which it was last accepted. Suggested content: a relevant location description, a relationship, a promise, a clue or an unresolved consequence. Notes are narrative evidence aids, not authoritative inventory, character permissions, executable rules or secret future scripts.

Generate note changes alongside the scene in the same structured call. A profiled result envelope wraps the existing scene result and a bounded note patch; it does not fork the passage/timing engine. An opening can seed notes about its published scene. A continuation can create, update or retire notes using a discriminated patch operation. Use at most 8 changes per publication, unique keys across operations, bounded text and a final maximum of 20 notes. Unknown update/retire keys, existing create keys, invalid references and overflow reject the proposal. New keys are checked story-locally; the model never provides database identity or another story's references.

For evidence, a change references supplied context passage handles or the result's own publication handle (`current` or `arrival`). The application maps handles to committed passage IDs. A create/update must include supporting passage evidence; replacing a note replaces its evidence too. An explicit retirement includes a bounded reason retained in the generation artifact. This is a derived snapshot: it may be corrected without rewriting chronology. All original passages and accepted patches remain inspectable via provenance.

For timed results, current and arrival patches are separate. Current changes may refer only to previously committed sources or the current departure. Arrival changes stay private with the prepared arrival and are applied atomically only when it publishes. The departure cannot claim the character has arrived, learned an arrival secret or fulfilled an arrival promise. Reuse the waiting passage's generation/source-part provenance to load that patch; do not ask the storyteller again at timer completion. Reject a stale publication without updating notes.

Important limitation: validating an evidence reference does not prove that a model's summary is truthful. Note text is explicitly derived and untrusted as instructions. Committed prose is the narrative record; typed item/time state wins when representations conflict. Retain supporting text for referenced notes in bounded context, deduplicated against recent/current passages. If those mandatory supporting passages exceed the cap, hold rather than silently trust an unsupported summary. Better retrieval/compaction can replace this policy later; do not claim unlimited recall from 20 notes.

No embeddings, separate extraction call, graph database, universal entity schema or recursively summarized lifetime is needed for this slice. This note boundary can later be supplemented with canonical character/place records for mechanics that actually require stable identity.

## Agency contract

For new profiled generations, offer 2–5 plausible choices. Aim for three; fewer are better than invented nonsense. Enforce count, nonblank labels/intentions, unique IDs and normalized label uniqueness. Keep existing legacy decoding limits. A visible label must honestly convey the attempted goal and apparent commitment; its private intention may clarify execution but cannot smuggle in a different action.

Quality requirements, judged against concrete continuations rather than claimed by schema validation:

- Options differ in goal, information sought, relationship approach, exposure or commitment. They need not be attack/talk/flee in every scene.
- Resolve the chosen attempt before pivoting to another event. Failure is allowed; ignoring the attempt is not.
- At least one cautious, ordinary or disengaging approach appears when plausible. It is not a guaranteed safe outcome or an obligation to offer an impossible escape.
- Outcomes may reconverge later, but preserve different knowledge, commitments or circumstances where choices warranted them.
- Surprise respects prior consequences and character knowledge. A profile does not authorize involuntary catastrophic outcomes or unattended actions beyond application policy.
- Do not treat the end of a local problem as termination of the character's life. For this POC, new profiled stories continue with choices/intervals; reject automatic `end` results under the task policy. Legacy authored endings remain supported. Deliberate whole-story conclusion remains a later product control.

No free-text action entry, “reroll options” button, automatic default decision, hidden success probability, combat statistics or generated inventory effects are introduced. The POC adjudicates narrative plausibility; it must not advertise implemented combat/economy rules. Structured effects can be added through the existing application effect boundary in a later focused feature.

## Evaluation and acceptance

Keep a small repository-owned offline case set with captured inputs, scripted outputs and expected evidence. It covers both profiles on the same premise, a quiet mundane action, different choices from one scene, a delayed arrival, an old promise beyond the recent window, misleading dialogue, a nonhuman premise and malformed/stale outputs. Scripted sources may branch on fixture inputs; generic runtime code may not contain those branches.

Automated checks establish isolation, bounds, patch/reference validation, atomic commit, replay and prompt composition. They cannot establish that live prose is entertaining or that semantic contradictions were detected. A human rubric scores profile adherence, intention fidelity, option diversity, continuity and readability on 0–2 (fails/partial/clear). Record the exact scene/choice and offending text when a dimension fails; no model judge or shadow call is required.

Acceptance requires:

- Different scripted selected intentions lead to different preserved consequences through the actual admission/commit path.
- A fact outside the recent window is retained with its source; a retired/superseded note does not remain current.
- A fabricated source, cross-story reference or overflow fails without partially committing prose or memory.
- Departure/arrival notes publish at the correct time, exactly once, including pause/restart and stale-result cases.
- Conflicting item ownership is never applied from notes; generated text remains subject to later human quality evaluation.
- Each task's artifact records exactly what context it received and its omissions. Reload/worker restart does not reassemble it from newer history.
- Offline fixture evidence is labeled offline. Live quality remains unverified until the next feature's authorized playthrough.

## Decisions still needed

The owner authorized the bounded notes approach with the implementation. It preserves consequential narrative details without defining all world mechanics. Live model quality remains to be evaluated.

## Owning specifications

Owning contracts: [storytelling](../../storytelling.md), [continuity](../../continuity-and-consequences.md), [context](../../technical/context-and-cost.md), [runtime](../../technical/storyteller-runtime.md) and [data](../../technical/data.md). The shared runtime remains defined in the preceding feature.
