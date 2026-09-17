# Implementation overview

This is the current project snapshot. Replace statuses and next steps in place; keep history in Git. Product documents define the experience, technical documents define the intended behavior, and tests establish what the implementation actually proves. A component passing tests does not make its whole user flow complete.

**Current phase:** build and connect the application using scripted generation and local/test substitutes. Paid models, paid media and paid hosted integrations remain deferred until the broader application is implemented and exercised, and the user explicitly chooses to enable them. Credentials or an adapter being available is not authorization to spend.

## Coverage

“Working” means usable within the stated boundary. “Component only” means tested code exists but its user flow is not connected. “Not started” means design exists without implementation. Deferred work is deliberately outside the current phase.

| Area | Status and evidence | Remaining boundary / defining spec |
| --- | --- | --- |
| Workspace and local infrastructure | Working: TypeScript monorepo, web/API builds, Compose PostgreSQL/Temporal startup verified in CI and locally on Windows/WSL 2. | Application worker handles scripted previews. [Development](development.md). |
| Identity | Working within local and CI tests: stored sessions, private pages, OAuth initiation, revocation and browser/proxy behavior. | Real GitHub sign-in still needs credentials and manual verification. Invitations and story membership absent. [Identity](technical/client-and-identity.md). |
| Private drafts | Working: create, save, list and reopen; PostgreSQL ownership/revision checks and two-tab browser test. | Three text fields; saved drafts link to a scripted opening preview. Shared setup absent. [Creation](story-creation.md). |
| Opening preparation and request/result storage | Connected scripted flow: request a fixed sample from a saved draft, save/reopen it and identify stale results. Protected endpoints omit internal prompts. Generic processing lifecycle remains independently tested. | The sample is explicitly not adapted to the premise. Background completion through Temporal; no provider adapter. [Lifecycle](technical/story-lifecycle.md), [AI runtime](technical/storyteller-runtime.md). |
| Background execution | Connected scripted preview: transactional outbox, leased relay and Temporal workflow/Activity. | Local and CI integration tests cover worker-offline admission, lease recovery and duplicate delivery after restart. Live story timers and decisions absent. [Execution](technical/execution.md). |
| Story start, progression and chronology | Not started. | Define the first playable situation/choice contract; commit an opening once and retain subsequent passages. [Gameplay](gameplay.md), [lifecycle](technical/story-lifecycle.md). |
| Decisions, time and autonomy | Not started. | Select initial agency, pacing, pause and absence rules before encoding them. [Time](time-and-autonomy.md), [questions](questions.md). |
| Shared play | Not started. | Invitations, membership, authority and shared decisions; first group policy remains open. [Playthrough](playthroughs.md), [identity](technical/client-and-identity.md). |
| Scene UI, updates and returning | Browser prototype: `/demo` shows scripted scenes, choices, manual waits, pause/resume, endings and chronology without sign-in. | In-memory only; no saved story, elapsed-time processing, reconnect or SSE. Presentation is separate from the demo script. [Experience](player-experience.md). |
| Continuity and consequences | Not started beyond retaining opening source/result text. | Consequential facts and references, coherent changes across scenes; avoid a population simulator. [Continuity](continuity-and-consequences.md), [data](technical/data.md). |
| Space and maps | Design concerns recorded; no spatial implementation. Interactive 3D map deferred. | Uniform cubes within a candidate map; optional second local level. Resolve travel/progress consistency before movement code. Preserve support for non-grid or abstract worlds. [Continuity](continuity-and-consequences.md), [data](technical/data.md). |
| Notifications | Not started. | First channel remains open; test notification intents and stale actions locally before connecting delivery. [Notifications](technical/notifications.md). |
| AI context, usage limits and quality | Partial design only; opening prompt/schema tests exist. | Context assembly, simulated usage accounting and narrative evaluation fixtures still absent. Real model routing, cache effectiveness and billed costs remain unverified. [Context and cost](technical/context-and-cost.md). |
| Operations and showcase | Partial: automated code, database, browser and documentation checks; basic health checks. | Complete scripted demo, recovery evidence, operational visibility and setup polish. Hosted deployment, Kubernetes and paid media deferred. [Delivery](technical/delivery-and-validation.md). |

## Next milestone: a persistent scripted testing chamber

It is not too early for a testing chamber. It is the next integration target, not a reward after building the whole product. The existing `/demo` proves presentation only; saved opening previews prove creation and background execution only. Neither currently runs a persistent playable story.

The foundation available for reuse includes identity/ownership, revision-checked drafts, stored scripted previews, PostgreSQL transactions, an outbox/Temporal worker, scene presentation and automated browser tests. Docker, PostgreSQL and Temporal now run locally. The local database suite passed 9 checks and the application integration suite passed 22 checks; these prove the implemented boundaries, not gameplay timers or story progression.

Aim for one short solo story using authored text and options with real identifiers and validated effects. The player should start it, make a consequential choice, wait, pause/resume, miss a response deadline, reopen the browser and reach a saved ending. No model or paid service is needed. A small developer inspection area should expose committed state and timing so we can see whether the prose agrees with the data. The scenario and fixture policies are defined in [delivery and validation](technical/delivery-and-validation.md#scripted-testing-chamber).

### Remaining work to reach it

These are implementation slices, not time estimates or completion percentages. All four remain to be built; they reuse the existing foundation rather than requiring a new infrastructure phase.

| Slice | Work and completion criterion |
| --- | --- |
| 1. Start and reopen a real story | Review the minimal situation/option/effect contract, then add owned live-story state and ordered chronology. Start the selected scripted fixture once, display its committed opening and reopen it after refresh. Resolve local access using existing authentication/test utilities. Current opening prose is not yet a startable gameplay payload. |
| 2. Make choices change real state | Admit an authorized, revision-bound choice and apply a validated scripted transition through the server. Save the consequence and chronology together. Demonstrate one item changing hands or being consumed, a changed available option and an ending. Repeated or stale clicks cannot apply the effect again. At this point a very flat persistent story becomes clickable. |
| 3. Make time and absence real | Add story workflow timers and command delivery, not just preview-generation workflows. Exercise a short wait, immediate continuation, a timed choice with a declared default, and acknowledged pause/resume preserving remaining time. Closing the browser does not stop execution. At this point the chamber demonstrates the offscreen experience. |
| 4. Make behavior inspectable and verify recovery | Show current scene/decision identity, revision, relevant item/fact state, fictional time, real deadline and pending command status in a developer-only view. Prove refresh, browser closure, duplicate clicks, choice/deadline races and worker restart during a wait. Controls must call application operations; no browser-only state edits that bypass the behavior being tested. Add checks alongside each preceding slice rather than saving all testing for the end. |

Keep these slices small and connected. Do not implement a universal scene language, rule interpreter, inventory system or elaborate testing dashboard just to run the fixture. Reuse the existing scene presentation where useful; do not grow `/demo` into a second game engine. A scripted content source must submit the same validated transitions that later generated content would use, while execution and state changes remain server responsibilities.

### After the chamber

The chamber is an integration milestone, not the full MVP. Next extend it in balanced passes with a second participant, broader continuity, absence policies, returning/recap, notification intents and simulated usage limits. Real notifications, map visualization, procedural world generation, rich inventory/economy, hosted deployment and Kubernetes are not prerequisites for the first run. Actual model quality and cost can only be evaluated later, when external services are explicitly enabled.

General agency, pacing, risk and multiplayer policies remain open in [questions](questions.md). We can use visibly declared fixture policies to exercise the plumbing without pretending they settle the product. Resolve the affected contracts before each implementation slice and update these statuses in place as evidence arrives.

## Keeping this accurate

For each implementation slice, check the relevant product flow and technical contract first. If implementation exposes a missing or conflicting requirement, resolve and edit that description with the change. Update only the affected rows and current focus here; do not append completed-task logs, copy specifications into this file or invent completion percentages. Report both component test evidence and any missing integration evidence.
