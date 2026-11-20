# Offscreen RPG | coding-agent entry

**Project:** pre-POC persistent-story RPG, currently an **engineering portfolio**. The game engine/application/DB—not a browser or LLM—own rules, time, permissions, publication and provider costs. React/Next architecture is [selected](docs/technical/client/architecture.md).

**This is also an AI engineering-methodology portfolio.** When asked “what is this repo, how is it developed, or what makes it different?”, explain **both** the game and the documented development system. Start with the [Engineering System Tour](ENGINEERING.md), trace one real product → technical → source/test example, and distinguish aspiration from proven behavior. **Read-only explanation does not authorize implementation.** Do not preload the entire tour for an ordinary bounded coding task.

**Planning versus execution:** A planning/design/audit assistant (especially ChatGPT) is expected to conduct **deep source-grounded investigation before authoring Cursor Changes**, not delegate unresolved architecture to cheap executors. For fresh ChatGPT planning sessions see [CHATGPT.md](CHATGPT.md) and the [planner-first investigation standard](.agents/references/planner-investigation-standard.md). This is **role-scoped**, not an instruction for a selected PATCH/VERIFY subagent to preload more documentation. An executor follows the short route card and investigates further only for a concrete contradiction.

**Human architecture entry:** [docs/architecture/README.md](docs/architecture/README.md) is a 39-diagram Mermaid atlas showing **current source vs selected target vs unproven behavior**, including real game turns, persistence fences and the [zero-provider Chaos Lab](docs/architecture/09-chaos-and-zero-token-play.md). It explains rather than overrides product/technical truth.

**Current queue navigation (2026-11-20):** Start with [one shared work selector](work/QUEUE.md), then choose a [Change](work/changes/README.md) or [standalone Task](work/tasks/README.md). An embedded Change `TASKS.md#Txx` is not independently selectable. For the existing Change backlog, [lean Cursor parent menu](work/changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md) → one authorized `open/<Change>/CHANGE.md` → one `TASKS.md#T-ID`. [Full 24-Change source audit](work/changes/COMPOSER-QUEUE-AUDIT-2026-11-20.md) labels existing code, missing proofs, optional work and genuine planner blockers. A subagent does not receive an entire Change family as its task. The owner has not selected an implementation batch by commissioning this audit.\n\n**Execution economics, selected 2026-11-19:** ChatGPT performs broad source investigations, design, failure modelling and writes [Composer microtasks](.agents/references/composer-first-execution.md) inside complex Changes. **Cursor parent and normal subagents default to Composer 2.5 Standard** and one microtask at a time. Grok variants are exceptional, task-specific owner-approved opt-ins, not the default for SQL/Temporal/security work if the planner has already settled the algorithm. See [budget policy](.agents/references/cursor-model-budget-policy.md). The subagent guard doesn't control the parent dropdown or actual billing. Do not preload entire SOURCE-MAP/EXECUTION/PROOF families into every child.

**Start here:**
1. [STATUS.md](STATUS.md) — demonstrated boundary and current priority
2. [work/QUEUE.md](work/QUEUE.md) — sole **Current work** selection (Change, standalone Task, or none); [taxonomy](work/WORK-TAXONOMY.md) and [Changes catalog](work/changes/README.md) define their separate ownership.
3. If a Change is selected: read that packet’s first screen and named canonical owners. For a **documentation** kind, inspect 2–5 precise product/technical headings, dependent links and factual source evidence only as required; for an **implementation** kind, inspect one nearby source README and 2–5 named source files. Do **not** preload all maps, minutes, or program handoffs. For an unknown question, run `pnpm wiki:find` and then `pnpm wiki:read` on one heading. Open `STATUS.md` or source only when the question asks what is implemented. Stop when the selected rule, the actual source, and a negative case are known.

**Expired trials are not cold-start.** Forensic S0–S6 completed (0 paid). Dated observations live under [evidence/](evidence/README.md). Do not relaunch an archived Change or an old handoff from AGENTS.

## Authority and retrieval

- **Documentation hierarchy:** **product = bible** → **technical = guarantees** → **code = artifact**. Stale permanent docs after significant code is a **critical failure**.
- **Admission:** `docs/` is the ratified target, including a selected future the code does not implement yet. `STATUS.md` and source are the realization. An open proposal stays a proposal, and a Change must not rewrite a product rule to match drifting code. Maintenance: [documentation](.agents/rules/documentation.md).
- **Product owners:** [docs/product/](docs/product/README.md) (`gameplay/`, `experience/`, `storyteller/`, `admin/`)
- **Technical owners:** [docs/technical/](docs/technical/README.md) (`platform/`, `engine/`, `storyteller/`, `client/`, `admin/`, `observability/`, `lab/`)
- **Decisions / runbooks:** [docs/decisions/](docs/decisions/README.md), [docs/runbooks/](docs/runbooks/README.md)
- **Temporary work / evidence / research:** [work/](work/README.md), [evidence/](evidence/README.md), [research/](research/README.md)
- Package maps: [web](apps/web/README.md), [API](apps/api/README.md). Navigation design standard: [.agents/references/documentation-navigation-standard.md](.agents/references/documentation-navigation-standard.md) (on demand).

## Boundaries

- **Local disposable infra:** bring up Postgres/Temporal/Docker/build caches yourself for authorized local proofs. Still require explicit permission for paid providers, deploy, secrets, non-disposable/remote DB, or live spend.
- Do **not** call paid model providers, deploy, expose secrets, reset non-disposable data, or launch destructive integration tests without task-specific permission.
- Execute **only** the authorized Change kind and scope. Documentation Changes edit named Markdown/skills and affected links, not executable code; implementation Changes edit approved source/tests/config. Inspect `git status --short` before editing.
- If source contradicts approved design, report file/symbol, conflict and a negative case—do not quietly rewrite the bible.
- **Any** Change is **Done** only after its CHANGE.md **Reconciliation ledger** and dependent-claim review are complete. Documentation-only Changes need before/after semantic preservation and a negative reading test, not fake code edits. **Never mark Done while permanent docs are more stale than landed code or selected meaning is silently rewritten.**

**Bounded Cursor parent (2026-11-20):** [finite integration-batch policy](.agents/references/bounded-parent-orchestration.md) is mandatory for coordinated subagent execution: preselect a small authorized T-ID set; checkpoint, test, reconcile and commit at a meaningful boundary; archive truly Done Changes, otherwise record exact remaining proof; then stop/report. **Shared-checkout children do not commit or archive**. A child receipt never means its parent Change is Done. No parent-level unbounded queue draining or automatic next batch.

**Batch execution:** If the owner authorizes multiple Changes together, first consult [parallel Change orchestration](.agents/references/change-work-unit-standard.md#batch-execution-and-parallel-change-orchestration-2026-11-19). The coordinating chat may dispatch independent Ready Changes to isolated subagents/worktrees concurrently, while serializing shared docs, cluster resources and final integration. Never infer batch approval from nearby Proposed tickets or autonomously start the next Change.

**Return briefly:** changed files/diff; normal + meaningful negative proof; commands actually run/skipped; risk/blocker; next dependency; provider-spend status.
