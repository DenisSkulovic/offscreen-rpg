# TD10 | source and claim map

Inspected frozen main `4b621ec9708361a2304efdcff4d34bb7da2b6c88`. Heading inventory and source anchors below identify the actual owners; source existence is not live qualification. Read-only source checks, no runtime or provider operations.

## T01 | Front doors and current status

Owned existing headings:

- `README.md`: 1: Offscreen RPG; 9: Local setup; 13: Two systems, developed together; 26: The engineering ecosystem; 49: Explore the methodology; 62: Try the repository navigation; 76: The game: a life that continues while you're away; 95: Browse by role

- `docs/README.md`: 1: Documentation; 15: Storyteller evolution | fastest authoritative routes; 31: Visual introduction: follow a decision through the software

- `STATUS.md`: 1: Status | demonstrated boundary; 3: 2026-11-27 | Capability maturity baseline; 35: 2026-11-22 | Post-WR09B reality audit (source inspected; no new tests executed); 87: Orientation; 132: Capability coverage; 150: Evidence and limits


Controlling/evidence anchors: `docs/technical/README.md`; `infra/verification/CAPABILITIES.md`; `docs/decisions/D-0001--modular-engine.md`. Selected transformation and negative in TASKS T01.

## T02 | Technical and Atlas routers

Owned existing headings:

- `docs/technical/README.md`: 1: Technical contracts; 5: Storyteller evolution | authoritative implementation contracts; 23: Architecture at a glance

- `docs/architecture/README.md`: 1: Architecture atlas | see the game, the system and its failure boundaries; 13: New to the repository? Read this first; 26: The game in one picture; 43: Three layers, different questions; 59: Choose the question you want answered; 76: Diagrams as maintained architecture

- `docs/architecture/00-human-tour.md`: 1: Start here: Offscreen RPG for a new human engineer; 7: The shortest map; 27: Two meanings of “where it lives”; 47: Choose a journey, not a package; 57: Three kinds of “done”; 67: Read code without getting buried; 78: What these diagrams do *not* settle


Controlling/evidence anchors: `docs/technical/platform/topology.md`; `docs/technical/engine/selected-architecture.md`; `docs/technical/platform/agent-core.md`. Selected transformation and negative in TASKS T02.

## T03 | Core system Atlas

Owned existing headings:

- `docs/architecture/01-system-and-ownership.md`: 1: 1. System map and decision ownership; 10: Current source: a modular application, not yet independent game microservices; 35: Selected target: one story writer, a separate model executor; 59: Who makes the call? Logical ownership is not a service-per-noun plan; 78: Source guide and testable boundary

- `docs/architecture/02-one-turn.md`: 1: 2. One turn: from player click to a committed second scene; 10: Current source: one combined Storyteller Activity; 40: Selected distributed turn: execution and publication separated; 82: Admission is not completion; 106: Where slow time is allowed; 126: What remains genuinely unproven

- `docs/architecture/03-data-and-transactions.md`: 1: 3. Data truth, transaction boundaries and durable messages; 7: The three different persistence jobs; 34: Schema relationships, simplified and source-backed; 85: Current checkpoint commit is stage-then-select, not S3 within a SQL transaction; 113: A critical unimplemented bridge: custody is not generation success; 143: The durability chain has independent guarantees


Controlling/evidence anchors: `docs/technical/engine/selected-architecture.md`; `docs/technical/storyteller/generation-and-publication.md`; `docs/technical/platform/data-and-persistence.md`. Selected transformation and negative in TASKS T03.

## T04 | Failure and history Atlas

Owned existing headings:

- `docs/architecture/04-failure-and-recovery.md`: 1: 4. Failure, replay and resilience atlas; 5: Start with the right failure domain; 24: Crash windows for a single Storyteller turn; 51: External provider: safe retry is a question, not a default; 70: Temporary infrastructure failure is not a failed game command; 93: The RabbitMQ question: isolate an optional projection; 109: Failure matrix: evidence to insist on

- `docs/architecture/05-scenes-and-forks.md`: 1: 5. Scene checkpoints, historical forks and branch-safe memory; 7: Timeline is not one mutable notebook; 19: Current implementation: exact checkpoint beats live-head copy; 39: Knowledge retrieval must use the branch, not a global newest index; 64: Source and effect authority are different; 79: Fork POC proof: the relevant negative matters more than a smiley green test

- `docs/architecture/08-gaps-and-decisions.md`: 1: 8. Gaps found by drawing the architecture; 10: The POC gates, ordered by dependency rather than fashion; 29: A gap is an architectural finding when it distinguishes competing outcomes; 44: A conflict detected during the diagram review: workflow identity; 60: Proof tiers are gates, not interchangeable adjectives; 75: Diagram maintenance and proof


Controlling/evidence anchors: `docs/technical/engine/concurrency-and-recovery.md`; `docs/technical/engine/lifecycle-and-compatibility.md`; `docs/technical/platform/execution-and-delivery.md`. Selected transformation and negative in TASKS T04.

## T05 | Trust and entry Atlas

Owned existing headings:

- `docs/architecture/07-client-and-trust.md`: 1: 7. The browser, session and trust perimeter; 7: Query cache is a projection, never another story authority; 35: Status handling makes retries safe; 56: Cross-service trust boundary; 74: View isolation between players and story branches; 91: What to test, not merely trust

- `docs/architecture/11-visitor-and-session.md`: 1: 11. Visitor, GitHub sign-in and a private page; 5: A visitor needs almost nothing; 35: The session is a pass, not a master key; 65: If it fails; 75: Try this five-file tour

- `docs/architecture/12-creating-a-story.md`: 1: 12. Creating a story and setting up its Storyteller; 5: There are two entry routes, not one giant wizard; 14: A. The direct Play/Story Prompt launch; 47: B. The saved draft and opening candidate route; 65: What actually means “Storyteller setup”?; 75: Failures worth understanding


Controlling/evidence anchors: `docs/technical/platform/http-api-and-client-contracts.md`; `docs/technical/platform/identities-and-access.md`; `docs/technical/client/architecture.md`. Selected transformation and negative in TASKS T05.

## T06 | Play, lab and staff Atlas

Owned existing headings:

- `docs/architecture/09-chaos-and-zero-token-play.md`: 1: 9. Chaos Lab | play the game while the system breaks; 5: Our central idea: one continuous synthetic game as a live reliability oracle; 30: We already have the right no-provider fixture; 50: Two complementary experiments: targeted cuts, then seeded randomness; 79: The safety fence, before randomness; 103: Failure categories, with different expected behavior; 124: Health is a collection of invariants, not a green Pod count; 141: Why random kills alone are not enough

- `docs/architecture/13-playing-and-forking.md`: 1: 13. Playing, waiting for scene 2, and forking a past scene; 5: The single most important sentence; 41: What does the click actually call?; 57: Three different things people call “the state”; 75: How a scene fork works; 96: What TURN03 proves versus what it does not; 107: Failure examples worth tracing with your eyes

- `docs/architecture/14-admin-tour.md`: 1: 14. Admin and support: an entirely separate permission journey; 5: Player login does not give staff powers; 23: A support lookup is not unrestricted database browsing; 49: Find the current Admin features; 64: Why Admin was built separately; 71: Failure paths


Controlling/evidence anchors: `docs/technical/lab/experiment-protocol.md`; `docs/technical/engine/mechanics-and-capabilities.md`; `docs/technical/admin/topology-and-authorization.md`. Selected transformation and negative in TASKS T06.

## T07 | Affected source front doors

Owned existing headings:

- `packages/README.md`: 1: Monorepo package organization; 5: Organization and E1 migration boundary; 11: Existing flat packages and possible placement; 23: Longer-term responsibility candidates; 53: Known limitations and next triggers

- `apps/api/README.md`: 1: API: authenticated HTTP composition; 9: Find the request route; 25: Debug without recreating policy

- `apps/web/README.md`: 1: Web: Next.js player interface; 5: Find the owning surface in one hop; 22: Authority and design traps


Controlling/evidence anchors: `docs/technical/platform/topology.md`; `docs/technical/client/architecture.md`; `docs/technical/platform/agent-core.md`. Selected transformation and negative in TASKS T07.
