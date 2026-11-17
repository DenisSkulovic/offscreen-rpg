# Offscreen RPG | coding-agent entry

**Project:** pre-POC persistent-story RPG, currently an **engineering portfolio**. The game engine/application/DB—not a browser or LLM—own rules, time, permissions, publication and provider costs. React/Next architecture is [selected](docs/technical/client/architecture.md).

**Start here:**
1. [STATUS.md](STATUS.md) — demonstrated boundary and current priority
2. [work/changes/README.md](work/changes/README.md) — **Current change** selection (`none` is valid). Packets live under [work/changes/](work/changes/README.md).
3. If a Change is selected: read that packet’s first screen, **one** nearby owner README, then 2–5 named source files. Do **not** preload all maps, minutes, or program handoffs. For an unknown question, run `pnpm wiki:find` and then `pnpm wiki:read` on one heading. Open `STATUS.md` or source only when the question asks what is implemented. Stop when the selected rule, the actual source, and a negative case are known.

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
- Implement **only** the authorized code scope. Inspect `git status --short` before editing.
- If source contradicts approved design, report file/symbol, conflict and a negative case—do not quietly rewrite the bible.
- A code-bearing Change is **Done** only after its CHANGE.md **Reconciliation ledger** is complete. **Never mark Done while permanent docs are more stale than the landed code.**

**Return briefly:** changed files/diff; normal + meaningful negative proof; commands actually run/skipped; risk/blocker; next dependency; provider-spend status.
