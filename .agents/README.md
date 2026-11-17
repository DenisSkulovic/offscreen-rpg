# Agent knowledge and operating model

**New engineer / portfolio evaluator?** Start with the [Engineering System Tour](../ENGINEERING.md) for the *why*, then this index for the *where*, and [HARNESS.md](HARNESS.md) for the binding operating model. For an ordinary scoped task, skip the public tour and load only what the task needs.

Root [`AGENTS.md`](../AGENTS.md) is the short default instruction. Start from [STATUS.md](../STATUS.md) and the selected Change in [work/changes/README.md](../work/changes/README.md). [Layer-zero harness](HARNESS.md) and [context economics](references/context-economics.md) own coding-agent setup, not the in-game Storyteller.

Permanent product and technical truth lives under [docs/product](../docs/product/README.md) and [docs/technical](../docs/technical/README.md). Do not cold-start from an expired handoff or a retired study. Git history is not current authority.

## Put knowledge in the correct place

| Kind | Purpose | Loading policy |
| --- | --- | --- |
| `AGENTS.md` | Safety and essential task routing | Small; every agent session |
| `STATUS.md` / `ROADMAP.md` | Demonstrated boundary / strategy | Orientation; not a Change authorization |
| `.agents/rules/` | Durable project-specific constraints | Only if the task triggers them |
| `.agents/skills/<name>/SKILL.md` | Repeatable procedure | Discover description; load body on demand |
| [`.agents/knowledge/`](knowledge/README.md) | Deep professional manuals | One relevant domain when warranted |
| `docs/product`, `docs/technical` | Product bible and technical guarantees | Read the relevant owner/section |
| `work/changes/…/CHANGE.md` | Bounded code-bearing outcome | Only when selected; `none` is valid |
| `work/designs/open`, `evidence`, `research` | Named proposals, proof, nonbinding studies | On demand; never silent product authority |
| Tests, fixtures, scripts | Executable evidence | Run selectively |

**Working-session continuity:** [daily minutes rule](rules/session-minutes.md); prefer promoting decisions to permanent owners. Rolling notes live under [work/sessions](../work/sessions/README.md).

## Roles and delegation

- [Role orchestration](roles/README.md), [catalog](roles/catalog.md), [assignments](roles/assignments.md), [UI playbook](roles/playbooks/ui-feature.md).
- Optional native subagents remain explicitly scoped read-only.

## Conditional rules

- [`working-agreement`](rules/working-agreement.md), [`documentation`](rules/documentation.md), [`domain-design`](rules/domain-design.md), [`storyteller`](rules/storyteller.md), [`verification`](rules/verification.md), [`spending`](rules/spending.md).

## Skills

Discover under [`skills/`](skills/) — load bodies on demand when the task matches the skill description. Change workflow: [`change-workflow`](skills/change-workflow/SKILL.md).

## Repository commands (read-only orientation)

- `pnpm repo:brief` — STATUS + Current change (optional `--checkpoint`; `--json` prints the local SHA and dirty paths and does not contact a remote)
- `pnpm repo:snapshot:chatgpt` — export revision-stamped source + **required portable wiki index** for ordinary ChatGPT. Explicit `--no-index` creates a source-only ZIP; see the [runbook](../docs/runbooks/chatgpt-design-snapshot.md).
- `pnpm repo:docs-health` — Change checkpoints and docs taxonomy checks
- `python scripts/check_docs.py` — Markdown link check
- `pnpm wiki:health` — maintained wiki graph (`docs/`, open designs, open Changes, source READMEs). Exit 1 on broken paths, broken anchors, or a docs page with no directed route from `docs/README.md`. `pnpm wiki:graph` writes JSON and DOT under gitignored `out/wiki-health/`. Neither command calls a model, and neither score is a quality grade.
- `pnpm wiki:bench:static` — zero-model routes, Wiki Hopper, and lexical Recall/MRR/nDCG for the frozen 30-question set. A graph hard error marks the run blocked. It is not an agent trial.
- Retired, not runnable: `repo:retrieval-compare`, `repo:semantic-pilot`, and `wiki:bench:agent`. Their results stay in the [experiment register](../research/agent-practice/RETRIEVAL-EXPERIMENTS-2026-11-17.md). Git history keeps the old runners.
