@AGENTS.md

# Claude Code adapter

The import above is the single shared project entrypoint. Use task-scoped skills, not all rules/specs at startup. Canonical skill bodies live in `.agents/skills/`; Claude discovers thin adapters in `.claude/skills/`. Investigations are read-only unless implementation is explicitly assigned. For coding-agent setup consult `.agents/HARNESS.md`; this is not the in-game Storyteller.
