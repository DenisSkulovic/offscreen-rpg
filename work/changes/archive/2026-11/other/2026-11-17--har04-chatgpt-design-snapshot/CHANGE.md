# HAR04 | Revision-stamped ChatGPT design-source ZIP

**State: Done (2026-11-17).** Owner specifically requested an easily uploadable, gitignored, versioned source/docs ZIP for ordinary ChatGPT design investigations. This small independent developer-tooling Change was authorized by that request; **WIKI07 remains the selected Change** for Cursor. No game source, runtime behavior, provider access, database or external service changed.

## Outcome, source and exclusions

- Added `scripts/repo-tools/chatgpt-snapshot.mjs` and `pnpm repo:snapshot:chatgpt`: a committed-HEAD ZIP built with native `git archive`, with lean and full profiles, gitignored output under `out/chatgpt-snapshots/` and a bundled `SNAPSHOT.json` revision manifest.
- Added `scripts/repo-tools/chatgpt-snapshot.test.mjs` and the targeted test command, plus the operating runbook at `docs/runbooks/chatgpt-design-snapshot.md`.
- Deliberately left `AGENTS.md` always-on instruction size and game-code paths untouched. The root runbook index and triggered `.agents/HARNESS.md` reference the optional procedure.
- No new dependency, image/DB/memory store, semantic search implementation, upload automation, or third-party provider.
- Default excludes historical bulk and tracked credential-shaped filenames. This is not a secrets-content scanner, so an owner must still review sensitive repositories before uploading.

## Actual verification / negative evidence

**Fixture evidence:** local isolated Git repo, Node 22.16.0 and Git 2.47.3. Ran `node --test` against the same exporter design and fixture code prior to publishing: one test passed. It inspected the ZIP central directory, extracted embedded JSON, checked exact source SHA and SHA-256, demonstrated committed-only behavior with a dirty tracked file, and confirmed omission of force-tracked `node_modules`, `.env.secret`, `out` and untracked files. Lean omitted retired Change/run evidence; full included them; `--strict` rejected dirty state. No model, network or database calls.

**Unverified:** no full repository runtime test or actual ZIP output from the user's Windows checkout has been run in this conversation. Cursor or the owner should run `pnpm repo:snapshot:chatgpt:test` and `pnpm repo:snapshot:chatgpt` locally after pulling the commit. Git archive requires a Git version supporting `--add-file`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged: developer export has no effect on game behavior or selected runtime architecture | `scripts/repo-tools/chatgpt-snapshot.mjs` and fixture test landed at HAR04; source content reviewed | fixture-tested; **real checkout not run** | omitted forced-tracked secrets/dependencies, old evidence and local dirty edits; `--strict` refusal | `docs/runbooks/chatgpt-design-snapshot.md`; root README; runbook index; `.agents/HARNESS.md` |

**Scope and evidence limitation:** the recorded local fixture is useful proof, not proof that this command was executed successfully against the actual Offscreen RPG checkout. If the local test or export fails, repair it before relying on the generated archive.
