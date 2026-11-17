# Target | reliable repo understanding across GitHub API and local coding agents

**Type:** proposed developer-harness design. **Does not amend:** product/technical game contracts. **Existing owners:** root [AGENTS.md](../../../../AGENTS.md), [.agents/HARNESS.md](../../../../.agents/HARNESS.md), [WIKI07](../../../changes/archive/2026-11/other/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md).

## Observed starting point at 8aa952a

- Root `AGENTS.md` already routes known Changes to their first screen, one owner, and a few source anchors; unknown questions to `wiki:find` then `wiki:read`.
- `pnpm repo:brief` already prints branch, worktree status, three recent commits, STATUS orientation and Current change; it has no stable JSON/HEAD-SHA receipt. Extend it instead of creating a duplicate startup tool.
- `pnpm wiki:health`, `wiki:bench:static`, `wiki:change-guard`, `wiki:find`, and `wiki:read` exist in package scripts. `wiki:bench:agent` was removed from HEAD. WIKI07's independent review is still outstanding; do not claim the routing is proven just because commands exist.
- The canonical wiki has existing authority routing and draft separation. WIKI08 already owns content accuracy candidates, so this design must not create a second wiki-truth scanner.
- Cursor includes built-in codebase search/indexing; a local clone may also use Git, `rg` and language services. A GitHub API assistant may inspect specific remote files/diffs without access to that local working tree.

## One source of truth, multiple access modes

| Mode | Can inspect | Cannot infer without further evidence |
| --- | --- | --- |
| GitHub connector | Remote branch/ref, fetched file versions, diffs, refs, writes when authorized | Unsaved edits, local dependency state, local test outcomes, that fetched paths remained current after retrieval |
| Local coding agent | Checkout, dirty files, editor symbol references, tests, local tools | Approved product law from observed code, that an old commit still matches today's upstream, that a test not run passed |
| Optional retrieval service | Indexed source/heading excerpts, perhaps relations, if actually supported | A selected contract, an authorized Change, runtime truth, or the current branch unless freshness is checked |

### Investigation and write protocol

1. **Establish revision.** Capture branch/ref and full HEAD SHA at start. On local agents capture dirty state and relevant changed paths; on connector-only access mark local worktree `not observable`, not `clean`.
2. **Choose the authority question.** Is the task asking ratified product intent, selected technical semantics, source implementation, evidence, or an unselected proposal? Open the relevant owner heading, not a whole book.
3. **Locate implementation only when needed.** Known Change -> cited owner -> source README -> likely symbols/tests. Unknown question -> `wiki:find` -> bounded `wiki:read` -> targeted source search. Reject archived Change as current permission.
4. **Record evidence per claim.** For material conclusions supply exact doc#heading or file/symbol, inspected SHA or worktree state, strongest negative case, and label: `selected target`, `source-observed`, `fixture-tested`, `live-observed`, `proposed`, or `unknown`. Distinguish a command's existence from execution.
5. **Detect divergence.** If main moved during a design or code Change, compare affected paths/owners before committing; re-read changed source and amend the handoff. Do not quietly reuse stale blob SHAs, force push, or treat old local status as remote truth.
6. **Return a bounded receipt.** Goal, revision(s), affected authority headings, 2–5 key source anchors where appropriate, actual normal/negative proof, not-run tests, rejected hypothesis, remaining risk, code-write or paid-provider permission status, and commit SHA if any.

### Expected compact handoff format

- `baseline_ref`: fully qualified SHA and branch/ref; `post_ref` if a write landed.
- `worktree`: `clean | dirty(paths) | unavailable` and which environment this describes.
- `authority`: exact ratified heading(s) and any proposal-only links explicitly labeled.
- `realization`: source paths/symbols plus proof tier; `unknown` is acceptable.
- `invariant_and_negative`: meaningful failure/retry/permission or stale-snapshot check.
- `verification`: exact commands and outputs actually observed, plus skipped/blocked work.
- `next_action`: bounded selected Change or named owner decision; no implicit permission.

These fields form a **human-readable receipt contract**, not a demand for a new schema/daemon. HAR01 is Done: `pnpm repo:brief --json` is that local receipt. It does not fetch a remote.

## Retrieval architecture: earned complexity

**Tier 0: native.** Use Cursor/Claude/Codex built-ins, `git`, targeted `rg`, editor language tools, source READMEs, task-local tools. Known path/symbol -> direct read, not semantic search theater.

**Tier 1: current repo-native document locator.** WIKI07's lexical/section `wiki:find` + exact `wiki:read`; source `STATUS` companion for implemented claims; scope and authority labels. Requires only Node/pnpm, no network index.

**Tier 2: actively evaluated, opt-in semantic retrieval.** One read-only retrieval entry point behind a clearly opt-in flag, returning *citations to exact source spans* with authority class, index revision, dirty/freshness state, top-k cap and byte cap; fallback to Tier 0/1 on failure. Candidate technology can be language-server navigation, hybrid lexical/vector search, or a graph, not an assumed 'memory brain'.

**Nonnegotiable boundaries:** no bootstrap Docker/start-on-clone; no online indexing/secrets ingestion by default; no independent agent memory mutating canon; no unversioned indexed answer treated as proof; no automatic paid embeddings; no extra MCP tool catalog preloaded when unused. An index is disposable derived data and must be rebuildable/isolated per clone and revision.

## Intentional omissions

No new platform database, web UI, source-of-truth wiki, always-on rule, broad refactor, gameplay changes, parallel semantic-index rewrite, automatic agent launcher, or always-on monitoring process. **A deliberately opt-in Grepai/QMD pilot is encouraged**, but must not silently affect clean-clone operation, paid-provider behavior or normal dev setup. This is a developer-tooling experiment, not an Offscreen RPG game feature.
