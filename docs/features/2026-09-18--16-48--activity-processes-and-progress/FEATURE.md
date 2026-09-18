# Activity processes and world-defined progress

Status: Approved on 2026-09-19 for the contribution/runtime subset required by the earned-time playable loop. Other process families remain proposals.

## Problem

The current mechanical slice treats a positive `durationTicks` as the amount an activity must accumulate before completion. That confuses the simulation clock with progress. A tick says when rules may advance; it does not say what the character accomplished.

This produces the wrong model for work, movement and many stranger processes. A skilled character may contribute more than an unskilled character during the same interval. An interruption may consume time without advancing the goal. A journey can progress along a route, wait at a crossing, change vehicle or use a portal. Some processes decay, branch or become impossible. Waiting is different: reaching a clock position may itself be the completion condition.

## Intended outcome

Represent a committed activity as a resumable, rules-governed process. The shared runtime owns lifecycle, scheduling, authority, receipts, interruption and durable publication. A selected process rule owns the meaning of progress and completion.

Ticks remain the setting-independent simulation coordinate. They determine ordering and when a process is eligible to advance. They are never the universal progress unit.

## Core model

Every admitted process captures:

- a goal and the authoritative world state on which admission depended;
- a supported process rule and its immutable parameters;
- rule-owned progress state, which may be numeric, positional, staged or absent;
- the next meaningful boundary at which the rule must run;
- completion, interruption and invalidation conditions;
- a conditional estimate suitable for presentation, when one can honestly be calculated.

The runtime asks the captured rule to advance from one committed boundary to another. The rule returns a bounded result: committed progress/state changes, checks and random receipts, completion or interruption, and the next boundary. The storyteller can propose and narrate a process, but cannot directly award progress, invent executable rule names or declare mechanical completion.

This is not a requirement to execute code or roll once per tick. A deterministic contribution over twenty quiet ticks may be settled analytically in one operation. If a rule requires distinct checks or changing conditions, those points become explicit boundaries and are processed in order. Batching is an execution optimization and must produce the same committed result as the declared rule semantics.

## Progress families

These are semantic families, not mandatory database variants or one subsystem per activity name.

| Family | Authoritative progress | Typical completion | Examples |
| --- | --- | --- | --- |
| Contribution | Accumulated rule-defined work toward a requirement | Required contribution reached and final conditions hold | crafting, research, forming an abstract connection |
| Transformation | Captured state moves through stages or a state machine | A terminal state is reached | recovery, incubation, ritual, negotiation campaign |
| Traversal | Position/progress within an admitted route or transition | Destination/exit condition reached | walking, flying, sailing, teleport sequence, interdimensional passage |
| Clock condition | No productive progress is required | Target tick or temporal predicate becomes true | waiting, a cooldown, observing until dawn under an authored calendar |
| Repeating practice | Durable results occur at repeated boundaries; it may have no natural completion | Player stops, an interruption occurs or a separately defined goal is met | standing guard, ongoing study, maintaining a signal |
| Discrete exchange | Ordered actions change contested state | Encounter-specific terminal/exit condition | combat or another turn/exchange-based contest |

“Contribution points” are therefore useful for some processes but are not a synonym for time or a universal game resource. Their name, scale and modifiers belong to captured content/rules. Travel must not be disguised as generic work points if route state matters. Combat must not be stretched into a progress bar merely to reuse the activity UI.

## Contribution semantics

For a contribution process, each due boundary computes contribution from authoritative circumstances: capabilities, selected method, tools, assistance, conditions, checks and rule-specific modifiers. Equal elapsed ticks need not yield equal contribution. A boundary may yield zero, negative or transformed progress only when the captured rule explicitly permits it.

The accumulated result survives a pause or unrelated interruption when the fiction says the underlying work survives. The rule may instead define spoilage, decay, loss or invalidation. Preservation cannot be a blanket engine assumption.

A completion estimate is derived from current conditions and expected contribution. It is not a promised duration and cannot grant completion. When conditions, method or allocation change, the estimate is recomputed from committed state.

## Interruption, allocation and resumption

Real pause stops simulated advancement in its declared scope. A fictional distraction can allow the clock to advance while contributing nothing to the interrupted goal. A character normally cannot allocate the same exclusive capacity to two incompatible processes, but the capability being allocated must be explicit; the engine must not assume one human body. A distributed consciousness might support several processes, while a human tying a shoe pauses walking contribution.

An interruption commits everything resolved before its boundary, then applies the rule's interruption result. Resumption either continues the same durable process state or admits a revised process when its method, route or prerequisites changed. The runtime must not silently restart from zero, silently finish, or blindly resume an invalid plan.

## World independence

- Human craft: ticks schedule contribution opportunities; skill, tools and rolls determine contributed work.
- Human walk: the route rule advances position from movement capability and conditions; tying a shoe consumes fictional time with no route advancement.
- Bird or spacecraft: the same lifecycle can use a different supported traversal rule and route representation.
- Portal or interdimensional being: progress may be a discrete transition or staged condition rather than distance.
- Microbe: a process can transform environmental or colony state without employment, money, human anatomy or kilometres.
- Abstract entity: progress may mean strengthening a connection or completing a logical transformation.
- Waiting: completion may depend only on reaching an admitted clock condition.

These examples constrain the boundary. They do not authorize generic physics, a universal route graph, dedicated profession systems or arbitrary model-authored mechanics.

## Player experience

The UI describes the actual process state and a conditional expectation. It may show work completed, route position, current stage, next check, or simply “waiting until …”. It must not label elapsed ticks as completed work. If an interruption changes the process, the old estimate is visibly replaced.

The player chooses a contextual intention. Before publication, application policy validates that the resulting process uses a supported rule and that its prerequisites, authority and exclusivity constraints hold. Dice and committed rule results remain visible where the selected ruleset exposes them.

## Architecture boundary

The universal process runtime owns:

- admission and immutable rule capture;
- clock anchoring and scheduling the next meaningful boundary;
- process status, capacity claims, idempotency and locking;
- ordered settlement and durable receipts;
- pause, interruption, resumption and publication handoff.

Rule implementations own:

- their progress-state schema and invariants;
- boundary selection and contribution/state-transition calculation;
- relevant skill checks, modifiers and random events;
- completion, decay and invalidation predicates;
- estimates derived from committed state.

The runtime uses a finite server-owned registry of implemented rule kinds. Data selects a supported kind and supplies validated parameters; it cannot contain executable code. Add a new rule family only when a concrete playable slice needs semantics that existing families cannot express.

## Acceptance for the architecture correction

- No shared activity contract equates completion with accumulated elapsed ticks.
- Clock position, process progress, resolved boundary and presentation estimate are separate concepts.
- Contribution can vary by skill, roll, method and conditions, including zero contribution while fictional time advances.
- Waiting can complete from a clock condition without fake work points.
- A work-like process preserves valid accumulated work across interruption and resume.
- A traversal example records meaningful route state rather than generic work points.
- A microbe and an abstract entity use the same lifecycle without human time, distance, employment or anatomy assumptions.
- The storyteller proposes only plans expressible by supported rules; authoritative code resolves them.
- Quiet spans can be batched without per-tick persistence or inference.
- Estimates are explicitly conditional and never act as authority.

## Excluded from this feature

This feature does not settle a universal spatial representation, full travel simulation, combat, body/capacity modelling, decay for every process, arbitrary user-defined executable rules or live model evaluation. Those require concrete gameplay slices and their own reviewed designs.

## Owning specifications after approval

If approved, replace the duration-based activity model in [game rules](../../game-rules.md), [time and autonomy](../../time-and-autonomy.md), [ticks and tags](../../technical/ticks-and-tags.md), and [rules and activities](../../technical/rules-and-activities.md). The current implementation should then be treated as a prototype to reshape, not a contract to preserve.
