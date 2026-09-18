# Generated earned-time progression

Status: Agreed; implementation complete, awaiting review

Approval: On 2026-09-18 the owner explicitly delegated selection of the next focused POC slice: spawning, choosing generated intentions, consuming genuine real elapsed time during travel or activity, and persisting the necessary state. The owner also asked that sparse/materialized-world thinking be captured without letting that brainstorming inflate this slice. Reviewed base revision: `9150a1b92153e277b7294d2d478b25471e80289d`.

No live model/provider call is authorized.

## Intended outcome

A generated live story can turn a chosen intention into either an immediate playable scene, as today, or a timed activity whose arrival is earned by real elapsed time.

The connected POC spine becomes:

`draft -> candidate -> Start -> generated intention -> async fake storyteller -> timed progression -> real wait -> persistent arrival -> generated intention`

An intention to travel is not arrival. The character begins doing something; the current scene becomes the in-progress activity; later, after an authoritative deadline, the prepared arrival is committed exactly once.

## Representative flow

1. The player starts a generated live story and sees an option such as setting out toward a tavern.
2. They choose that published option. Admission recovers the hidden intention and starts asynchronous resolution exactly as today.
3. The fake storyteller returns a structurally validated continuation that says meaningful fictional time should pass.
4. The application commits an in-progress/departure passage now. It has no current interaction. Fictional duration is recorded. Real waiting duration is chosen by application policy, not by the storyteller.
5. The story becomes `waiting`. The browser may close. Reloading shows the same persisted progression and deadline.
6. Pause prevents arrival even after the original due time. Resume continues from the saved remainder.
7. When the interval is actually due, existing timing/Temporal machinery commits the prepared arrival exactly once.
8. The arrival may offer another generated choice. Selecting it uses the same generic `/resolutions/...` path.
9. Hidden intention recovery for that arrival choice uses the exact generation that produced the arrival, plus the arrival source part. Generation ID alone is not enough, because one generation published both the departure and the arrival.

Unavailable, late and retry cases that shape this feature:

- Worker restart during the wait must not duplicate or lose the arrival.
- A stale generation or interval completion must not rewrite a story that moved on.
- Identical control retries use stable operation IDs and `viewVersion` ordering.
- Existing v1 generated passages remain readable and resolvable.
- Hidden intentions never appear in public story or wait DTOs.

## Scope and boundaries

This feature connects generated continuation results to the already implemented interval machinery.

It includes:

- a versioned continuation result that can express an immediate scene or one prepared interval;
- `sourceGenerationPart` provenance so one generation can publish a current part and an arrival part;
- translation of a validated interval proposal into an ordinary wait plan;
- a narrow deterministic development timing policy with a short real wait;
- `/play/:id` waiting, pause/resume, polling and reload survival for generated stories;
- a fake storyteller timed fixture alongside preserved immediate coverage.

It does not include:

- NPC, location, relationship, fact, population, schedule or generic world-entity tables;
- one LLM agent per NPC, place or faction;
- live provider calls;
- campaign pace settings;
- storyteller-owned real waiting duration;
- mid-journey storyteller interruptions;
- item/world effects on generated intervals;
- an arbitrary future tree of prepared scenes;
- settling the space/movement representation question.

Existing authored Chamber waits, pause/resume, stale fencing and `advanceInterval` remain the timing engine. The fake storyteller must not create a second one.

## Acceptance

The feature is usable when all of these are true:

1. Existing draft -> candidate -> Start -> generated-choice behavior still works.
2. Selecting a generated option can asynchronously produce a timed continuation.
3. The in-progress/departure passage commits immediately after resolution; arrival does not.
4. Fictional duration is preserved.
5. Real wait duration is application-owned rather than storyteller-owned.
6. Reloading during the interval shows the same persisted progression/deadline.
7. Browser closure does not stop or restart the wait.
8. Worker restart does not duplicate or lose the arrival.
9. Pause prevents arrival even after the original due time.
10. Resume continues from the saved remainder.
11. Arrival is committed exactly once.
12. Arrival may offer a generated choice.
13. That choice resolves through the same generic `/resolutions/...` path.
14. Its hidden intention is recovered from the exact generation + source part that produced the arrival.
15. No hidden intentions leak into public story/wait DTOs.
16. Existing v1 generated passages remain supported.
17. Late/stale generation or interval work cannot rewrite a story that moved on.
18. No live provider call occurs.
19. No NPC/location/world simulation schema is introduced.
20. `/play/:id` alone can demonstrate: choose -> resolving -> travelling/waiting -> leave/reload -> arrival -> choose again.
21. Relevant targeted checks pass.

Automated tests use a short interval. The production interval representation already supports much longer real waits.

## Decisions still needed

None for this slice. Space/movement representation stays open in [questions](../../questions.md). Durable people/places/objects representation waits for a later gameplay slice that actually needs it.

## Owning specifications

- [Vision](../../vision.md)
- [Continuity and consequences](../../continuity-and-consequences.md)
- [Time and autonomy](../../time-and-autonomy.md)
- [Player experience](../../player-experience.md)
- [Data](../../technical/data.md)
- [Story lifecycle](../../technical/story-lifecycle.md)
- [Storyteller runtime](../../technical/storyteller-runtime.md)
- [Execution](../../technical/execution.md)
