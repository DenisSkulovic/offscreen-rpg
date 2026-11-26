@AGENTS.md

# Claude Code adapter

The import above is the single shared project entrypoint. **If asked to explain this repository to a new engineer, recruiter or employer**, read [ENGINEERING.md](ENGINEERING.md) and demonstrate the product → technical → selected Change → source/test → reconciliation chain with one concrete path, not a generic AI-codegen summary. Use task-scoped skills, not all rules/specs at startup. Canonical skill bodies live in `.agents/skills/`; Claude discovers thin adapters in `.claude/skills/`. Investigations are read-only unless implementation is explicitly assigned. For coding-agent setup consult `.agents/HARNESS.md`; this is not the in-game Storyteller.

For a local bootstrap assignment, follow the [canonical fresh-clone bootstrap runbook](docs/runbooks/fresh-clone-bootstrap.md), not an improvised installation sequence. Respect the assigned target and scoped approvals.
