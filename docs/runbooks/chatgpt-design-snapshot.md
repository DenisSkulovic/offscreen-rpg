# ChatGPT design snapshot | portable repository ZIP

**Audience:** ordinary ChatGPT design/investigation conversations without an executable local checkout. This is a developer-agent harness export, **not** the in-game Storyteller, a backup, an automatic sync or a separate Codex/Work session.

## Quick start

From the repository root:

```bash
pnpm repo:snapshot:chatgpt
```

The command writes a versioned ZIP under `out/chatgpt-snapshots/`, already ignored via the root `out/` rule. It prints the absolute path, exact Git commit, branch, profile, byte size and SHA-256 digest. Attach **that ZIP** to an ordinary ChatGPT conversation.

The archive contains `offscreen-rpg-<short-sha>/` with `SNAPSHOT.json` (v2): full commit SHA, branch, export time, profile, exclusions, dirty-worktree indication, **sanitized tracked modified paths**, untracked count and suggested reading procedure. It includes only **committed HEAD**. Git supplies the authoritative file set; it is not a dump of the live working directory.

When the local wiki parser is available, the ZIP additionally contains **`WIKI-INDEX.json`** (`wiki.portable-snapshot.v1`), generated from a temporary staging tree exported from exactly the same commit. It carries source-exact headings/line ranges, authority and proposal labels, section previews, outbound links and a classified missing-link inventory. The index is not a proof of documentation truth and does not replace the original Markdown. No extra parser is written for the ZIP.

| Command | Behavior |
| --- | --- |
| `pnpm repo:snapshot:chatgpt` | Lean: current tracked source, tests, configs, ratified docs, agent instructions, active Changes and current design proposals. Omits archived Changes, historic session bulk, bulky run/inspection evidence and retired engineering research. |
| `pnpm repo:snapshot:chatgpt --full` | Adds tracked historical Changes, evidence and research when a forensic design investigation needs them; ordinary sensitive-name and generated-output exclusions still apply. |
| `pnpm repo:snapshot:chatgpt --strict` | Reject a dirty/untracked working tree instead of creating a committed-only snapshot with a warning. |
| `pnpm repo:snapshot:chatgpt:test` | Run the dependency-free Git/Node fixture test. |
| `pnpm repo:snapshot:chatgpt --require-index` | Fail if the wiki index cannot be generated; useful for validating this enhanced workflow. |

### Portable wiki status and link classification

`SNAPSHOT.json.portableWiki.status` is `ready` when the source-exact `WIKI-INDEX.json` is embedded. It is `unavailable` with an explicit reason when the local wiki parser, dependencies or the staging extraction cannot run. The default export remains useful even without an index; `--require-index` turns this into a fail-fast condition.

The index is generated using the **existing** `scripts/repo-tools/wiki-core/{route,markdown,paths}.mjs` parser and router against a temporary **committed HEAD** extraction, not Cursor's dirty worktree. No second Markdown parser or ranking engine is introduced. Running with an index requires the project's existing dev dependencies plus Git and `tar` available locally (including Windows `tar.exe` on supported Windows versions). The exported ZIP needs none of those dependencies to be read in ChatGPT.

A link to tracked material omitted from a lean ZIP is marked `excluded-by-snapshot-profile`, with an original SHA-pinned GitHub URL when a GitHub origin is configured. Sensitive-name exclusions are marked `excluded-sensitive-file` **without any fallback URL**. Genuine non-existing paths and missing heading anchors remain in `unresolvedLinks`. Do **not** interpret excluded historical pages as defects in the live repository. Reachability and counts refer to the **exported** graph.

The manifest's `trackedModifiedPaths` lists only locally modified tracked path names passing a sensitive-filename filter, never their contents. It also records redacted path counts and the number of untracked files, without publishing their names. It is a provenance aid, not a substitute for reviewing the ZIP for secrets.

### Important behavior

- **When Cursor is still editing:** dirty and untracked files are **never included**, even without `--strict`. You get an explicit warning and a snapshot of the last committed revision. Commit relevant work first, or share a separately reviewed diff.
- **No trash by default:** ignored/untracked dependencies and caches are excluded by `git archive`. The script additionally excludes tracked `node_modules`, `.next`, `dist`, `build`, `coverage`, `out`, `.env*` (including `.env.example`), private key extensions and several explicit credential filenames.
- **Confidentiality:** path exclusions do **not** detect secrets accidentally committed into ordinary `.md`, `.ts`, `.json` or other source files. Review before sharing, especially when adapting this pattern to private workplace repositories.
- **No additional service:** Git (with `git archive --add-file` support) and the pinned Node runtime export source; the optional portable index additionally uses local `tar` and the repo's **already-declared** Markdown parser dependencies. No new npm dependencies, Docker services, hosted embeddings, automatic uploading or paid providers.

### What to tell ChatGPT

> Use the attached Offscreen RPG source ZIP for a source-grounded design investigation. First inspect `SNAPSHOT.json`. If `portableWiki.status` is `ready`, consult `WIKI-INDEX.json` for authoritative headings, line spans and omitted historical links, then read original Markdown/source sections for evidence. Otherwise use local filesystem search. Treat implementation as evidence, not product law. Before publishing, compare the snapshot commit with live GitHub HEAD.

A ZIP is a **frozen source view**, not a live Git mirror. Local text searches can be fast even if ChatGPT's execution environment does not have the repository's Node 24/pnpm dependencies. The GitHub connector still handles recent commits, source diffs and publishing. If Cursor pushes substantial changes after the export, refresh the ZIP or reconcile affected paths against remote HEAD before designing around them.

**Related:** [developer-agent harness](../../.agents/HARNESS.md) and [repository workbench design](../../work/designs/open/repository-agent-workbench/README.md).
