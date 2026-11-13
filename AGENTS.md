# Offscreen RPG | coding-agent entry

**If you have one authorized Change:** read its `docs/changes/<folder>/CHANGE.md` first, then **one nearby owner README** and 2–5 named source files. Do **not** preload all repo maps, past minutes, the architecture target, or specialist manuals. [Change queue](docs/changes/README.md) owns selection; `Current change: none` is valid and is not permission to code.

**Project:** pre-POC persistent-story RPG, currently an **engineering portfolio**. React/Next architecture is [selected](docs/engineering/targets/react-next.md); gameplay/visual redesign are deferred. The game engine/application/DB, **not** a browser or LLM, own rules, time, permissions, publication and provider costs.

## Authority and retrieval

- **What/why:** product owner; **technical guarantee:** relevant [contract](docs/technical/README.md) / [engineering target](docs/engineering/targets/README.md); **where/how now:** source and tests. Current code is *not* the target, and documentation is *not* runtime evidence.
- **Navigate cheaply:** [docs map](docs/README.md) for unknown questions; [web package map](apps/web/README.md) → feature/route README for frontend; [API map](apps/api/README.md) → controller map for backend. Start at a file's **first screen/headings**, then read only relevant sections/symbols. [Information retrieval standard](.agents/references/documentation-navigation-standard.md) is for documentation design, **not** an every-task read.
- **Frontend cheap Cursor work:** read the selected packet, then its linked source map and narrow code/test boundary. [Execution playbook](docs/engineering/frontend-execution-playbook.md) is a *reference*, not required full context. Implementation details belong to Cursor; expensive architecture, research and cross-system investigation belong upstream. Use pnpm/filter/warm caches and [risk-staged checks](.agents/rules/verification.md).

## Boundaries

- **Local disposable infra:** if Postgres/Temporal/Docker/build caches needed for an authorized local lab/integration proof are down or missing, **bring them up yourself** (repo `infra:*` / disposable DBs / chamber guards) and continue. Do not report “blocked” for unplugged local services. Still require explicit permission for paid providers, deploy, secrets, non-disposable/remote DB, or live spend.
- Do **not** call paid model providers, deploy, expose secrets, reset non-disposable data, migrate a live database or launch destructive integration tests without explicit task-specific permission. `pnpm test:focus` rebuilds and resets disposable `offscreen_auth_test`; it is not a quick React check.
- Implement **only** the authorized code scope. Preserve unrelated work; inspect `git status --short` before editing. No speculative libraries, broad formatting, automatic subagents or self-appointed follow-up Changes.
- If a source fact contradicts an approved design, report **file/symbol, conflict and a negative case**; don't quietly change product/technical authority. Do not treat a mocked test as real authorization/idempotency evidence.
- For consequential daily work record owner decisions and handoffs in [dated minutes](docs/minutes/README.md); minutes are history, **not** execution authority. Update a source-adjacent README when an owning path, wire contract or important invariant actually changes, not after every JSX edit.

**Return briefly:** changed files/diff; normal + meaningful negative proof; commands *actually* run/skipped; risk/blocker; next dependency; provider-spend status.
