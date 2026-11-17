# ChatGPT design snapshot | portable repository ZIP

**Audience:** ordinary ChatGPT design/investigation conversations without an executable local checkout. This is a developer-agent harness export, **not** the in-game Storyteller, a backup, an automatic sync or a separate Codex/Work session.

## Quick start

From the repository root:

```bash
pnpm repo:snapshot:chatgpt
```

The command writes a versioned ZIP under `out/chatgpt-snapshots/`, already ignored via the root `out/` rule. It prints the absolute path, exact Git commit, branch, profile, byte size and SHA-256 digest. Attach **that ZIP** to an ordinary ChatGPT conversation.

The archive contains `offscreen-rpg-<short-sha>/` with `SNAPSHOT.json`: full commit SHA, branch, export time, profile, exclusions, dirty-worktree indication and suggested reading procedure. It includes only **committed HEAD**. Git supplies the authoritative file set; it is not a dump of the live working directory.

| Command | Behavior |
| --- | --- |
| `pnpm repo:snapshot:chatgpt` | Lean: current tracked source, tests, configs, ratified docs, agent instructions, active Changes and current design proposals. Omits archived Changes, historic session bulk, bulky run/inspection evidence and retired engineering research. |
| `pnpm repo:snapshot:chatgpt --full` | Adds tracked historical Changes, evidence and research when a forensic design investigation needs them; ordinary sensitive-name and generated-output exclusions still apply. |
| `pnpm repo:snapshot:chatgpt --strict` | Reject a dirty/untracked working tree instead of creating a committed-only snapshot with a warning. |
| `pnpm repo:snapshot:chatgpt:test` | Run the dependency-free Git/Node fixture test. |

### Important behavior

- **When Cursor is still editing:** dirty and untracked files are **never included**, even without `--strict`. You get an explicit warning and a snapshot of the last committed revision. Commit relevant work first, or share a separately reviewed diff.
- **No trash by default:** ignored/untracked dependencies and caches are excluded by `git archive`. The script additionally excludes tracked `node_modules`, `.next`, `dist`, `build`, `coverage`, `out`, `.env*` (including `.env.example`), private key extensions and several explicit credential filenames.
- **Confidentiality:** path exclusions do **not** detect secrets accidentally committed into ordinary `.md`, `.ts`, `.json` or other source files. Review before sharing, especially when adapting this pattern to private workplace repositories.
- **No additional infrastructure:** Git (with `git archive --add-file` support) and the existing pinned Node runtime are sufficient. No new npm dependencies, Docker services, hosted embeddings, automatic uploading or paid providers.

### What to tell ChatGPT

> Use the attached Offscreen RPG source ZIP for a source-grounded design investigation. First inspect `SNAPSHOT.json` and the relevant owning product/technical headings. Search extracted code and Markdown locally rather than repeatedly loading whole files via GitHub. Treat source as observed implementation, not ratified product intent. Before committing any design, compare the snapshot SHA with live GitHub HEAD.

A ZIP is a **frozen source view**, not a live Git mirror. Local text searches can be fast even if ChatGPT's execution environment does not have the repository's Node 24/pnpm dependencies. The GitHub connector still handles recent commits, source diffs and publishing. If Cursor pushes substantial changes after the export, refresh the ZIP or reconcile affected paths against remote HEAD before designing around them.

**Related:** [developer-agent harness](../../.agents/HARNESS.md) and [repository workbench design](../../work/designs/open/repository-agent-workbench/README.md).
