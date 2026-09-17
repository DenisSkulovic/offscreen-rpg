# Chamber laboratory

Status: Agreed

Approval: On 2026-09-18 the owner approved evolving the existing scripted chamber into the primary controlled development laboratory for Offscreen RPG. The chamber should make gameplay state, timing, storyteller boundaries, persistence, failures and recovery easy to exercise without becoming a second gameplay engine.

## Intended outcome

The Chamber becomes a powerful developer-only environment for creating controlled game situations and exercising the **real Offscreen RPG application machinery**.

It should allow a developer to:

- choose meaningful scenarios rather than opaque fixture versions;
- inspect what the player sees alongside what the application has actually committed;
- exercise timing, choices, persistence, consequences and asynchronous execution;
- later supply controlled fake storyteller results;
- later accelerate or jump through long waits;
- later inject failures and recovery conditions;
- reuse scenario definitions for manual exploration and automated verification;
- eventually run long-life benchmark scenarios that prove the foundational gameplay vision.

The Chamber is not a public game mode and not an alternative game engine.

Its purpose is to make difficult production behavior observable, reproducible and deliberately testable.

## Foundational rule

**The Chamber owns fixtures, controls, inspection and fault injection. Production owns gameplay behavior.**

A Chamber scenario may establish inputs and controlled external responses.

It must not independently implement rules that the production application is supposed to own.

As the real game architecture grows, Chamber fixtures should increasingly enter through the same production boundaries as live generated play.

For example:

Preferred:

`scripted storyteller result -> normal validation -> normal persistence -> normal timing/execution -> normal snapshot`

Avoid:

`ChamberTravelEngine -> ChamberInventoryEngine -> ChamberStoryResolver`

Do not grow a parallel simulation merely because scripted fixtures are convenient.

## Why this matters

Offscreen RPG combines several difficult dimensions:

- persistent fictional state;
- real elapsed time;
- long-running background work;
- decisions and deadlines;
- browser absence and reconnection;
- retries and idempotency;
- asynchronous storyteller generation;
- AI output validation;
- interruptions;
- player-visible narration that must agree with authoritative state.

Ordinary unit and integration tests can verify contracts, but they are poor tools for understanding a live situation while developing it.

The Chamber should function as a controlled miniature universe where known initial conditions can be observed and deliberately disturbed.

## Developer experience

The main Chamber view should evolve toward two complementary perspectives.

### Player view

Show the story approximately as the real player would experience it:

- current scene;
- available interaction;
- waiting/progress state;
- deadline;
- relevant possessions;
- chronology where appropriate.

This view must use production presentation/snapshot contracts wherever practical.

### Inspector view

Show authoritative developer information separately from the player-facing scene.

The inspector may eventually expose:

#### Story identity

- story ID;
- source;
- narrative revision;
- view version;
- lifecycle state when available.

#### Current passage

- passage ID;
- sequence;
- player-visible content;
- interaction;
- source generation/provenance where present.

#### Timing

- wait plan;
- due time;
- remaining time;
- paused state;
- interval/control revisions;
- decision deadline;
- default/fallback identity.

#### Persistent state

- items and holder identities;
- later: locations/progress;
- later: important facts;
- later: relationships;
- later: supported resources.

#### Generation

When applicable:

- generation ID;
- task/kind;
- lifecycle state;
- source revisions;
- attempt identity;
- failure code;
- persisted proposal;
- hidden option intentions;
- validation/result state.

Sensitive provider credentials, secrets and unrelated private internals must never appear.

#### Execution

Where safely available:

- pending durable work;
- outbox entries relevant to this story;
- workflow/activity identities or status useful for debugging.

Do not make Temporal history itself the game state.

### Revision/change inspection

As state models mature, the Chamber should make meaningful changes between committed revisions understandable.

Example:

- coins: 7 -> 11;
- letter holder: courier -> caretaker;
- location: road -> fort;
- wait: active -> completed;
- relationship/callback facts later.

Do not build a universal semantic diff framework before the state exists. Add focused views as supported state becomes authoritative.

## Scenario catalog

The current `chamber.vN` source keys remain durable fixture identities, but developers should select scenarios by descriptive metadata.

A scenario should expose at least:

- stable ID/source;
- human-readable name;
- short purpose;
- capabilities exercised.

Example catalog entries:

- Immediate conversation — branching and idempotent response.
- Timed courtyard visit — durable wait and browser absence.
- Timed deadline — automatic fallback and response race.
- Letter delivery — authoritative item transfer.
- Future: generated-offer resolution.
- Future: interrupted journey.
- Future: long-life earned progression.

Do not treat the scenario catalog as product configuration.

Fixture meaning remains versioned. If behavior changes incompatibly, introduce a new scenario/source identity rather than silently changing recovery semantics.

## Future controlled storyteller

The Chamber should eventually support a fake storyteller that supplies proposals through the same application boundary used by real generated play.

Controlled behaviors should eventually include:

- valid immediate continuation;
- valid wait/activity proposal;
- valid supported state effect;
- malformed result;
- structurally invalid result;
- stale-source result;
- unsupported effect;
- delayed result;
- failed result;
- uncertain result;
- result that never completes until developer intervention.

The fake storyteller exists to exercise generation/resolution machinery without provider spend.

It must not bypass:

- generation admission;
- source identity;
- runtime validation;
- persistence;
- stale-result fencing;
- normal commit boundaries.

Future live-provider evaluation may be selectable separately and explicitly, but the Chamber remains offline by default.

## Future time controls

The Chamber should eventually make long-running gameplay practical to test without weakening production timing semantics.

Useful developer controls may include:

- normal timing;
- scenario-defined accelerated timing;
- advance to next meaningful boundary;
- expire the current decision deadline;
- complete the current valid wait;
- pause/resume through ordinary production controls.

Do not implement arbitrary database timestamp editing from the browser.

Time manipulation should either:

- configure fixture durations before activity admission; or
- enter through a reviewed developer-only timing/testing boundary that preserves production invariants.

The Chamber must still support occasional real wall-clock acceptance runs. Accelerated tests cannot establish that restart/recovery behaves correctly across genuine hours or overnight absence.

## Future fault injection

The Chamber should eventually support deliberate reproduction of failure and race conditions.

Candidate controls include:

- stop worker during an active wait;
- restart worker;
- close/reload browser;
- duplicate a command;
- replay stale input;
- race response against deadline;
- race pause against completion;
- simulate generation timeout;
- simulate failed generation;
- simulate uncertain generation;
- delay completion;
- simulate temporarily unavailable execution/provider boundary;
- later simulate delayed/stale notification interaction.

Prefer fault injection at real boundaries rather than corrupting committed database rows into impossible states.

Automated integration tests remain the authoritative regression suite. Chamber controls complement them by making complex behavior inspectable and reproducible.

## Reusable scenario definitions

Over time, reduce duplication between:

- manual Chamber scenarios;
- browser integration tests;
- smoke checks;
- deterministic acceptance scenarios.

A scenario definition may eventually describe:

- metadata;
- supported initial authoritative state;
- controlled storyteller outputs;
- timing parameters;
- expected milestones.

Do not create a universal declarative game language.

Prefer typed TypeScript fixtures validated by production schemas unless another representation demonstrates clear value.

The same scenario should be usable by different drivers where practical:

- interactive Chamber;
- automated browser test;
- smoke/acceptance runner.

## Long-life benchmark scenarios

The Chamber should eventually exercise the foundational "earned life" vision described in `docs/vision.md` and `docs/playthroughs.md`.

A permanent benchmark should demonstrate something like:

### Earned-life scenario

1. Character begins with modest state.
2. Character accepts a routine activity such as work.
3. Activity requires meaningful elapsed time.
4. Reward is not committed before completion.
5. Activity can be interrupted.
6. Several completed activities accumulate a modest resource.
7. That accumulated state enables acquisition of something meaningful.
8. Character begins a long journey.
9. Journey progress persists while the player is absent.
10. An interruption changes the situation.
11. Later behavior recognizes earlier people/objects/facts.
12. A risky decision can cause meaningful loss.

The scenario must test the generic application model, not introduce profession-, currency-, fantasy- or Vvardenfell-specific production subsystems.

Other benchmark settings should remain possible:

- space voyage;
- ancient soldier;
- ordinary modern life;
- microorganism;
- abstract/non-human entity.

## Scope and boundaries

### Included in the Chamber vision

- descriptive scenario catalog;
- developer inspector;
- controlled fake storyteller;
- developer timing acceleration/jump controls;
- fault injection;
- reusable scenario fixtures;
- long-life benchmark cases;
- eventual record/replay support where useful.

### Explicitly excluded

- production gameplay logic implemented only for Chamber use;
- arbitrary SQL editor;
- arbitrary mutation of committed application state;
- universal game DSL;
- separate Chamber persistence model;
- separate inventory/travel/economy engines;
- provider calls enabled by default;
- public exposure of developer controls;
- secrets/credentials in inspector output;
- replacing automated regression tests with manual Chamber runs.

## Security and isolation

The Chamber remains local/developer-only.

The existing loopback-only launcher and dedicated `offscreen_chamber` database are important safeguards and should remain.

Developer inspection/control endpoints, if added, must:

- not be mounted in the ordinary production application unless explicitly guarded by a strong development-only boundary;
- never rely on obscurity of a URL;
- never permit remote database targets through the Chamber launcher;
- never expose credentials/provider secrets;
- remain unusable through ordinary hosted player sessions.

Prefer direct local/dev-only composition over permanent public API routes for tooling behavior.

## Acceptance for the complete Chamber vision

The overall Chamber evolution is successful when:

1. Developers select scenarios by understandable names and purposes.
2. The same story can be viewed as the player sees it and inspected as authoritative committed state.
3. Inspector data clearly distinguishes player-visible content from hidden/server-only state.
4. Core scenarios exercise real production story persistence and execution rather than Chamber-specific engines.
5. Fake storyteller outputs can enter the real generation/resolution pipeline.
6. Long waits can be exercised quickly in development without changing production semantics.
7. Important restart/failure/race cases can be reproduced deliberately.
8. Scenario definitions can be reused by interactive and automated drivers where useful.
9. At least one long-life benchmark demonstrates earned progression, interruption, persistence and meaningful consequence.
10. The Chamber remains offline by default and incurs no provider spend.
11. It remains isolated from ordinary hosted/public behavior.
12. Adding Chamber power does not create a second gameplay implementation.

## Decisions still needed

No product decisions are required for Phase 1.

Later phases must be designed against the actual production contracts existing at that time.

In particular:

- fake storyteller injection should wait until generated continuation admission exists;
- time control should be designed once general generated waits/activities have an authoritative contract;
- fault injection should target concrete execution boundaries rather than anticipated ones;
- long-life scenarios should grow incrementally with supported state.

## Owning specifications

- `docs/vision.md`
- `docs/playthroughs.md`
- `docs/gameplay.md`
- `docs/time-and-autonomy.md`
- `docs/continuity-and-consequences.md`
- `docs/technical/delivery-and-validation.md`
- `docs/development.md`
- `docs/progress.md`
- `packages/server/src/chamber.ts`
- `packages/server/src/chamber-fixtures.ts`
- `apps/api/dev/chamber.ts`