# Implementation overview

This is the current project snapshot. Replace statuses and next steps in place; keep history in Git. Product documents define the experience, technical documents define the intended behavior, and tests establish what the implementation actually proves. A component passing tests does not make its whole user flow complete.

**Current phase:** build and connect the application using scripted generation and local/test substitutes. Paid models, paid media and paid hosted integrations remain deferred until the broader application is implemented and exercised, and the user explicitly chooses to enable them. Credentials or an adapter being available is not authorization to spend.

## Coverage

“Working” means usable within the stated boundary. “Component only” means tested code exists but its user flow is not connected. “Not started” means design exists without implementation. Deferred work is deliberately outside the current phase.

| Area | Status and evidence | Remaining boundary / defining spec |
| --- | --- | --- |
| Workspace and local infrastructure | Working: TypeScript monorepo, web/API builds, Compose PostgreSQL/Temporal startup verified in CI. | No application Temporal worker. Docker is unavailable on the current Windows machine. [Development](development.md). |
| Identity | Working within tests: stored sessions, private pages, OAuth initiation, revocation and browser/proxy behavior. | Real GitHub sign-in still needs credentials and manual verification. Invitations and story membership absent. [Identity](technical/client-and-identity.md). |
| Private drafts | Working: create, save, list and reopen; PostgreSQL ownership/revision checks and two-tab browser test. | Three text fields, no generated opening or shared setup UI. [Creation](story-creation.md). |
| Opening preparation and request/result storage | Component only: exact input capture, schema validation, idempotent admission, competing claims, uncertain outcomes and stale-result handling tested. | Fake generation exists in tests only. No Generate endpoint, preview screen, dispatcher or provider adapter. [Lifecycle](technical/story-lifecycle.md), [AI runtime](technical/storyteller-runtime.md). |
| Background execution | Not started: Temporal container exists, application workflows/Activities/outbox do not. | Connect one bounded scripted flow; demonstrate delivery and restart behavior. [Execution](technical/execution.md). |
| Story start, progression and chronology | Not started. | Define the first playable situation/choice contract; commit an opening once and retain subsequent passages. [Gameplay](gameplay.md), [lifecycle](technical/story-lifecycle.md). |
| Decisions, time and autonomy | Not started. | Select initial agency, pacing, pause and absence rules before encoding them. [Time](time-and-autonomy.md), [questions](questions.md). |
| Shared play | Not started. | Invitations, membership, authority and shared decisions; first group policy remains open. [Playthrough](playthroughs.md), [identity](technical/client-and-identity.md). |
| Scene UI, updates and returning | Browser prototype: `/demo` shows scripted scenes, choices, manual waits, pause/resume, endings and chronology without sign-in. | In-memory only; no saved story, elapsed-time processing, reconnect or SSE. Presentation is separate from the demo script. [Experience](player-experience.md). |
| Continuity and consequences | Not started beyond retaining opening source/result text. | Consequential facts and references, coherent changes across scenes; avoid a population simulator. [Continuity](continuity-and-consequences.md), [data](technical/data.md). |
| Notifications | Not started. | First channel remains open; test notification intents and stale actions locally before connecting delivery. [Notifications](technical/notifications.md). |
| AI context, usage limits and quality | Partial design only; opening prompt/schema tests exist. | Context assembly, simulated usage accounting and narrative evaluation fixtures still absent. Real model routing, cache effectiveness and billed costs remain unverified. [Context and cost](technical/context-and-cost.md). |
| Operations and showcase | Partial: automated code, database, browser and documentation checks; basic health checks. | Complete scripted demo, recovery evidence, operational visibility and setup polish. Hosted deployment, Kubernetes and paid media deferred. [Delivery](technical/delivery-and-validation.md). |

## Current focus and next checkpoints

Work in balanced passes: establish representative behavior across major components, connect those boundaries, then deepen correctness tests and polish across the system. Prototype policies stay visibly provisional. Persistence and authorization still require meaningful correctness checks at their first implementation; balanced coverage does not justify unsafe shortcuts.

The scene prototype now makes the experience inspectable. The next gap is connecting creation/preview and durable execution to presentation, while defining the smallest shared-play and timing contracts needed for the first complete flow. Do not expand this prototype into a separate client-side game engine.

1. **Connect draft to scripted preview.** Reuse the existing components to request, process, display and reopen a clearly labelled scripted opening. Add only the execution and recovery pieces that this flow needs. Stop short of expanding provider routing, billing or reconciliation machinery.
2. **Make one story playable without paid services.** Settle the affected product questions, then implement start, scene display, choices, chronology, waits and pause/resume in small connected steps. Include browser reconnect and worker interruption in the acceptance checks. Opening prose alone is not a playable story.
3. **Exercise the broader experience.** Add shared play, absence/default behavior, returning/recap and notification intent handling. Test components separately and together; use deterministic fixtures and simulated costs. Revisit the architecture when these interactions reveal actual gaps.
4. **Evaluate readiness for external services.** Only after the broader application is exercised, review what remains missing and whether the user wants live integrations. Real narrative quality, provider behavior and cost must then be measured rather than inferred from scripted tests.

This sequence does not postpone all design questions until integration. Before starting an affected component, use [open questions](questions.md) to resolve the necessary behavior, update its product/technical description, then implement it. Avoid spending several iterations polishing one subsystem while the next user-facing step remains absent.

## Keeping this accurate

For each implementation slice, check the relevant product flow and technical contract first. If implementation exposes a missing or conflicting requirement, resolve and edit that description with the change. Update only the affected rows and current focus here; do not append completed-task logs, copy specifications into this file or invent completion percentages. Report both component test evidence and any missing integration evidence.
