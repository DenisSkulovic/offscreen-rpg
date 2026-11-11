# Engineering portfolio renewal

**Owner direction, November 11, 2026. Status: active strategy; not a code-execution authorization.**

## Mission and why the priorities changed

Offscreen RPG is presently a **software-engineering portfolio and an AI-assisted development laboratory**, not a startup racing to acquire players or revenue. The near-term objective is to turn an uneven, largely AI-generated codebase into a professional, explainable, technically strong repository that the owner can confidently discuss with employers.

The bar is **quality of engineering judgment and results**, not lines written manually, number of features shipped or claims that the application is perfect. AI can generate the code; the owner must still understand its architecture, constraints, trade-offs, tests and failure modes well enough to defend them. The application should remain coherent and functional, but a smoother fishing quest is not the present optimization target.

**Current order of work:** finish the coding-agent and documentation ecosystem, especially the **Change** work-unit system and legacy dossier cleanup; **then** conduct focused engineering-improvement sessions; resume gameplay/product expansion only by a later explicit owner decision. No game implementation, live-model experimentation or broad application refactor is authorized by this roadmap.

## Stage 0: finish the development work system (current)

- [x] Define a **Change** as one bounded, verifiable planned source/test/script/executable-config delta, including refactors, bug fixes, tooling and migrations; distinguish it from initiative, design, investigation, documentation and evaluation.
- [x] Make `docs/changes/` the canonical execution route, with **no active Change** valid and no automatic gameplay selection; adapt the read-only briefing tools.
- [x] Classify the thirteen legacy `docs/features/` dossiers; retire four redundant/evaluation-heavy pairs with preserved decisions and historical links; retain nine unfinished or explicitly owner-preserved initiatives outside the active Change queue.
- [x] Align agent rules, `change-workflow` skill/adapters/templates, handoff procedure and roadmap/navigation with the new route; remove the old `feature-workflow` skill.
- [x] Review the changed Markdown's local link targets against the committed GitHub tree and inspect the selected-work/skill routing. This was a **static remote check**, not a local CLI/test run or a full historical-heading audit.
- [ ] Validate the workflow in a fresh Cursor/Claude read-only session: confirm discovery of `change-workflow`, `repo:brief` output with **no active Change**, correct classification of parked S3a and a believable prospective React Change. Record actual outputs/usage before calling the harness proven.

**Exit criterion:** a new agent can identify the present priority and absence/presence of a ready Change; distinguish design/evaluation from code; select one well-defined diff outcome, its source owners and negative proof; execute and close it without absorbing historical initiatives or inventing work. Keep the bureaucracy smaller than the engineering problem.

## Stage 1: focused engineering craftsmanship (later, not in this planning pass)

Choose **one area per session**. Begin as an expert review/design discussion, inspect actual code, decide what is worth changing, then cut one or more narrowly justified Changes for an implementation agent such as Cursor. This table is a *candidate menu*, **not a commitment to introduce every technology**.

| Candidate focus | Questions and credible outcomes |
| --- | --- |
| **React/frontend code** | Component boundaries, data ownership, hooks/effects, async races, state machines, forms, error/loading/empty states, accessibility, rendering/performance, maintainability and effective tests. Make the implementation explainable, not merely pretty. |
| **UI/UX and art direction** | Separate design work from React code quality: information architecture, coherent visual language, layout/typography, responsiveness, accessibility, interaction feedback and usability. Establish a design system only if useful. |
| **Next.js architecture** | **Next.js already exists in this repository.** Audit how it is used; evaluate server/client component boundaries, SSR/streaming/caching/rendering strategies, data fetching and auth. Do not pretend adoption is a new achievement. |
| **Backend/application design** | NestJS/API responsibilities, contracts/validation, domain boundaries, error semantics, transaction safety, concurrency, idempotency, orchestration and testability. Improve what is real before abstracting more. |
| **Data and persistence** | PostgreSQL models, queries/indexing, migrations, ownership and consistency. Demonstrate measured improvements and safe rollback where relevant. |
| **Events, real time and distributed systems** | Review existing Temporal/Redis/event flows before adding WebSockets, Redis pub/sub/streams or RabbitMQ. Add a mechanism only for a concrete need; document delivery semantics, failure/recovery, backpressure and tests. |
| **Quality, security and operations** | Testing strategy, CI, type/lint quality, auth boundaries, observability, performance measurement, configuration, deployment and reproducible local setup. Avoid dashboards or infrastructure merely for screenshots. |
| **Architecture and documentation** | Remove duplication and confused responsibilities; simplify; document a small number of meaningful decisions and demonstrate reproducible evidence. |

A session may recommend **doing nothing**, using an existing primitive better, or rejecting a tempting technology. Introducing RabbitMQ, WebSockets or a new framework **solely for resume keywords** is not a success. Genuine integration, precise trade-offs and operational correctness are.

## Stage 2: product work (intentionally deferred)

The Vvardenfell S3a continuity-report proposal and larger Storyteller/gameplay initiatives remain historical or parked context, **not the next assignment**. The sustained 10–15-turn gameplay proof is still missing, but proving it is not the present mandate. Product features, deeper story enjoyment, notifications, autonomous play, monetization and public-player readiness may be resumed later **only after the owner re-prioritizes them**.

## What a successful portfolio Change demonstrates

For each significant refactor/improvement, aim to leave a compact, credible engineering narrative:

1. **Baseline:** actual pain, current source and the observed/verified failure or maintainability constraint, including what is *not* yet measured.
2. **Alternatives:** why the chosen design beats simpler options, with operating cost and meaningful trade-offs; avoid novelty for its own sake.
3. **Bounded diff:** cohesive, reviewable and reversible source/test/config changes with explicit exclusions; no opportunistic game-feature expansion.
4. **Proof:** focused normal and negative cases, accessible/manual visual evidence for UI, performance measurements when claimed, and regressions prevented. Never upgrade a passing mock into a production claim.
5. **Explainability:** enough documentation and commit/diff history that the owner can explain implementation choices and discuss failures with an interviewer.

Quality does not mean making every file ornate, imposing enterprise architecture on a solo prototype or pursuing an impossible state of perfection. **Clear boundaries, correct behavior and controlled complexity** are a stronger hiring signal than a zoo of libraries.

## Working rhythm and permissions

- **Here (planning/review):** define priorities, examine actual code or historical evidence as needed, decide trade-offs, author/reconcile documentation and prepare bounded Changes.
- **Source-connected design/review:** use targeted investigation and independent criticism for consequential decisions, not compulsory multi-agent ceremonies.
- **Cursor or another coding agent (later):** implement one explicitly approved Change, verify it, return diff/test/unknowns; review and reconcile before selecting another.
- **Current boundary:** no gameplay development, broad code refactor, provider calls, migrations, deploy or automatic implementation. A roadmap idea is never permission to code or spend.

**Operational work queue:** use the [Change index](docs/changes/README.md) when available. This roadmap owns the *why and sequencing*, not executable specifications. Each Change owns exactly one implementation outcome; permanent product/technical docs retain authority over game behavior.
