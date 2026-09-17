# Implementation overview

This is the current project snapshot. Replace statuses and next steps in place; keep history in Git. Product documents define the experience, technical documents define the intended behavior, and tests establish what the implementation actually proves. A component passing tests does not make its whole user flow complete.

**Current phase:** build and connect the application using scripted generation and local/test substitutes. Paid models, paid media and paid hosted integrations remain deferred until the broader application is implemented and exercised, and the user explicitly chooses to enable them. OpenRouter credentials are now stored locally, with $10 intended to last at least a month and a strong preference for no-LLM tests or dirt-cheap models. No live adapter or budget enforcement is enabled. Before deliberate live evaluation, implement the safeguards in [spending](technical/context-and-cost.md#current-development-allowance); ordinary tests remain entirely scripted.

## Coverage

“Working” means usable within the stated boundary. “Component only” means tested code exists but its user flow is not connected. “Not started” means design exists without implementation. Deferred work is deliberately outside the current phase.

| Area | Status and evidence | Remaining boundary / defining spec |
| --- | --- | --- |
| Workspace and local infrastructure | Working: TypeScript monorepo, web/API builds, Compose PostgreSQL/Temporal startup verified in CI and locally on Windows/WSL 2. | Application worker handles scripted previews. [Development](development.md). |
| Identity | Working within local and CI tests: stored sessions, private pages, OAuth initiation, revocation and browser/proxy behavior. | Real GitHub sign-in still needs credentials and manual verification. Invitations and story membership absent. [Identity](technical/client-and-identity.md). |
| Private drafts | Working: create, save, list and reopen; PostgreSQL ownership/revision checks and two-tab browser test. | Three text fields; saved drafts link to a scripted opening preview. Shared setup absent. [Creation](story-creation.md). |
| Opening preparation and request/result storage | Connected scripted flow: request a fixed sample from a saved draft, save/reopen it and identify stale results. Protected endpoints omit internal prompts. Generic processing lifecycle remains independently tested. | The sample is explicitly not adapted to the premise. Background completion through Temporal; no provider adapter. [Lifecycle](technical/story-lifecycle.md), [AI runtime](technical/storyteller-runtime.md). |
| Background execution | Connected scripted preview: transactional outbox, leased relay and Temporal workflow/Activity. | Preview integration tests cover worker-offline admission, lease recovery and duplicate delivery after restart. Local interval tests also cover closure and worker restart during a wait. A fixed-interval workflow now publishes a prepared arrival. Journey pause/resume is committed with retry receipts and durable wake notices; broader story controls remain absent. [Execution](technical/execution.md). |
| Story start, progression and chronology | Scripted initialization connected: owned story and first passage saved atomically, duplicate starts reuse identities, `/chamber?id=...` reopens the snapshot. Bounded history retrieval and a browser reader are connected. | Authenticated scripted choices now connect to saved branches and conclusions. A 20-second timed visit is connected; journey pause/resume is connected, while a separate timed gate reply has an automatic default. The letter fixture exposes a saved item holder. Standard sign-in needs OAuth setup; `pnpm chamber` offers a loopback-only developer session. [Lifecycle](technical/story-lifecycle.md), [data](technical/data.md). |
| Decisions, time and autonomy | Scripted immediate choices connected; fixed waits, journey pause/resume and one declared timed default connected; general decision autonomy not started. Continuous elapsed time is described; scheduled boundaries, lightweight ticks or a hybrid remain candidates. | The timed solo fixture has a fixed declared fallback; general pace, recurring routines and condition rules remain unimplemented. [Time](time-and-autonomy.md), [questions](questions.md). |
| Shared play | Not started. | Invitations, membership, authority and shared decisions; first group policy remains open. Hundred-player shared worlds are a later ambition requiring separate scenes and contention tests, not a configurable capability of current storage. [Playthrough](playthroughs.md), [identity](technical/client-and-identity.md). |
| Scene UI, updates and returning | Browser prototype: `/demo` shows scripted scenes, choices, manual waits, pause/resume, endings and chronology without sign-in. | The `/demo` remains in-memory; `/chamber` now connects saved choices/history with a minimal textual UI. The timed visit polls saved progress, including while paused, and orders snapshots by a separate view version; no SSE or general reconnect protocol. Presentation is separate from the demo script. [Experience](player-experience.md). |
| Continuity and consequences | Authored consequences and responses are retained. One immediate item-transfer effect is connected, with story-scoped identity and expected-holder checks. | Consequential facts and references, coherent changes across scenes; avoid a population simulator. [Continuity](continuity-and-consequences.md), [data](technical/data.md). |
| Space and maps | Design concerns recorded; no spatial implementation. Interactive 3D map deferred. | Uniform cubes within a candidate map; optional second local level. Resolve travel/progress consistency before movement code. Preserve support for non-grid or abstract worlds. [Continuity](continuity-and-consequences.md), [data](technical/data.md). |
| Notifications | Not started. | First channel remains open; test notification intents and stale actions locally before connecting delivery. [Notifications](technical/notifications.md). |
| AI context, usage limits and quality | Offline components: opening prose plus a playable scene/choice proposal, captured intentions and bounded immediate context; 10 AI-package checks pass without inference. | Context assembly, simulated usage accounting and narrative evaluation fixtures still absent. Real model routing, cache effectiveness and billed costs remain unverified. [Context and cost](technical/context-and-cost.md). |
| Operations and showcase | Partial: automated code, database, browser and documentation checks; basic health checks. | Complete scripted demo, recovery evidence, operational visibility and setup polish. A hosted playable portfolio link is the delivery target; visitor onboarding, sponsored-trial admission and deployment are unimplemented. Kubernetes and paid media deferred. [Delivery](technical/delivery-and-validation.md). |

## Code quality prerequisite

Apply [the engineering standard](engineering/code-quality.md) before further implementation. Existing test evidence does not establish maintainability. A separate `lint:quality` audit exposes mechanical violations; existing code has not been refactored or certified. Keep any cleanup narrowly scoped and separate from feature expansion. The current standards task does not authorize implementation refactoring.

## Current assessment

The chamber is useful integration equipment, not an investor-facing POC or the next product milestone. It proves real persistence and execution with authored inputs. The application is still disconnected at an important boundary: a saved premise produces a fixed opening preview, while the chamber initializes an unrelated authored scenario. More fixtures or a longer timer would not connect those flows.

The current choice resolver branches on fixture source, narrative revision and option ID. It cannot interpret a newly generated offer. The AI package now has an offline playable-proposal component alongside opening prose: scene/choice/end validation, intention capture and a bounded immediate-context request. It is not connected to persistence, workflow resolution or the browser. Continuing memory retrieval and generation-to-commit integration remain absent. These are application gaps, not problems that buying a model call would solve.

The foundation is substantial but narrow: owner-scoped storage, atomic story transitions, retry protection, Temporal waits/defaults, journey pause/resume and one checked item transfer. Current passage and item snapshots are useful, but do not constitute a full model of place, character knowledge, story lifecycle or multiplayer. A single story revision currently serializes one situation. Keep those limits visible when selecting work.

## Evidence and its limits

The local database suite passed 9 checks and the application integration suite passed 32 checks. Integration coverage includes identity, drafts, previews, chamber initialization, saved choices/history, deadline contention, browser closure and worker restart during a paused journey. Item tests cover transfer/reload, retries, rollback, story isolation and rejection of client-supplied effects. The separate `pnpm chamber --smoke` check passed local session provisioning, play/reload, anonymous rejection and process shutdown.

These checks establish behavior within supported fixtures. They do not establish narrative quality, a coherent generated world, long-lived memory, shared play, large-scale capacity, spend enforcement or a polished player experience. The local launcher is available without OAuth credentials; the ordinary hosted sign-in path still needs provider setup. Model spend remains disabled; no provider adapter is active.

## Next milestone: connect the actual story lifecycle without inference

Use the chamber to exercise the same creation, intention, resolution and commit boundaries the eventual storyteller will use. A fake storyteller supplies controlled results, including bad and delayed ones; it must not bypass those boundaries. Do not grow a second engine or universal rule language to support fixtures.

| Pass | Connected result and evidence |
| --- | --- |
| 1. Define and connect playable creation | Review the smallest proposal/context boundary needed for a premise, starting situation and actionable options. Join saved draft, candidate review and explicit Start into one owned story. Preserve input identity and reject stale candidates or duplicate starts. Fixed preview prose alone is not sufficient. |
| 2. Resolve an intention asynchronously | Admit a selected published option, expose pending resolution, ask a fake storyteller for a proposal, validate and commit it once. Test delayed, malformed, stale and failed results and reopen while pending. Newly supplied option IDs must work without adding fixture-specific branches to the runtime. Keep effects restricted to implemented operations. |
| 3. Preserve continuity and time | Supply bounded current context with explicit source revisions and relevant known facts. Integrate waits/defaults and control fencing with resolution. Test a quiet continuation, a consequential change and a later callback; ensure prose agrees with saved item/place/time facts where those are represented. Specify the minimal place/progress contract before adding movement effects. |
| 4. Make it understandable to a player | Connect the scene presentation to these saved flows, with current situation, meaningful choices, pending/error states, absence and readable return history. Provide a way to list and reopen live stories rather than require saved URLs. Include inspection separately from the main scene. Test from fresh entry through returning on another session. |
| 5. Complete the first breadth pass | Add simulated cost reservations/usage, unknown-charge handling and a stop control; notification intents with a local sink; and an invited pair after choosing the initial shared authority policy. Exercise these with the same story flow. Scope remains small; hundred-player worlds and real delivery services are later. |

These passes describe priorities and dependencies, not a commitment to finish one subsystem to perfection before touching another. After each connected slice, check the product flow, update contracts and coverage, and select the next most consequential gap. Keep the chamber and offline fixtures evolving with the application. Do not add a new named scenario merely to claim another feature completed.

The immediate next task is to connect the offline playable proposal to saved candidate review and Start using a fake source, retaining the accepted intentions rather than adding fixture-specific resolver branches. The component supports immediate prose/choices only; clock advancement, effects and longer context need their own reviewed additions. Follow with durable pending resolution and stale-result checks. No live-provider dependency is needed.

## What a credible POC must demonstrate

The target is a small coherent game someone can understand and enjoy, not a script with generated adjectives. A player supplies a premise, starts the reviewed story, makes meaningful choices, leaves during progression, returns to consistent state and can understand what happened. Quiet life must be a supported pace rather than constant manufactured plot twists. The interface must communicate this without requiring knowledge of the database or workflow engine.

The SpongeBob journey is one acceptance example for that product: start at the pineapple, choose a trip to the restaurant, wait, arrive and tell Squidward a story. Running the same authored sequence for ten minutes would prove long-wait behavior only. It would not prove a storyteller, open-ended play or investor readiness. The full ten-minute acceptance run remains unperformed and is not the immediate priority.

Before considering paid evaluation, exercise the connected lifecycle with fake outputs and failure cases, bounded context, simulated spend and a usable presentation. Then explain the exact supported behavior and limitations to the user and revisit authorization. A later tiny model check can assess schema support and accounting; only a real playthrough can assess whether the resulting choices and continuity are engaging. Neither can be honestly certified today.

No LLM spending is authorized in the current development phase, including exploratory calls, free-form smoke checks or attempts to make fixtures feel more impressive. The saved OpenRouter key stays unused. Its $10 allowance remains a separate hard constraint for a later deliberately enabled phase; it is not a deadline to start using inference.

## Deferred depth

After the first connected breadth pass, deepen character continuity, recaps and narrative significance with a scripted long-life case before considering elaborate memory infrastructure. Test recognition of an early acquaintance after many irrelevant encounters, using source-backed facts rather than treating summaries as truth. Keep history and per-operation context bounded.

Interactive maps, detailed economy, population simulation, large shared worlds, Kubernetes and paid media are not prerequisites for a credible small game. Hosted portfolio access is still a delivery goal, but needs visitor admission, aggregate spending limits and operational checks. First establish an honest local product loop; do not use presentation polish to conceal missing behavior.

General agency, pacing, risk and multiplayer policies remain open in [questions](questions.md). Resolve the affected choices before implementing them, without inventing a large settings framework in anticipation of every world.

## Keeping this accurate

For each implementation slice, check the relevant product flow and technical contract first. If implementation exposes a missing or conflicting requirement, resolve and edit that description with the change. Update only the affected rows and current focus here; do not append completed-task logs, copy specifications into this file or invent completion percentages. Report both component test evidence and any missing integration evidence.
