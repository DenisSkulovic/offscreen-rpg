# Commit messages | history as an evidence index

**Authority:** This rule governs **new commits** by humans or agents, including direct GitHub API writes. Selected after [reviewing 1,040 historical commit messages](../references/commit-history-audit-2026-11-20.md). Do not rewrite history. This rule does not authorize an implementation Change or override product/technical design.

## Required shape

```text
fix(STORY03/control): publish saved results through Game Authority

Why: Direct SQL adoption in the control worker bypassed publication authority.
Evidence: focused publish/replay checks PASS; browser NOT RUN (no kind cluster).
Remaining: TURN03 cold browser proof remains unverified.
Refs: STORY03 T07
```

**Subject: `type(scope): achieved outcome` (maximum 100 characters).** Scope names an actual system/subsystem (`web`, `worker`, `api/auth`, `repo`) or an actual selected Change identifier (`STORY03`, `STORY03/control`). State the *achieved effect*, not “work on,” “update,” “misc changes,” or the intended future. Use an active verb plus an object, preferably with its effect or failure mode. No trailing period. If the outcome cannot be coherently summarized, consider splitting the commit.

**Blank line, then mandatory `Why:`.** Give a concrete reason for the change, distinct from merely restating the subject. A future reviewer should understand the problem or rationale without opening the diff.

**Mandatory `Evidence:`.** Name the check and *actual observed outcome*, or give `NOT RUN (reason)`. For documentation/rules, say what was reviewed. Existing tests, previously reported successes, and copied receipts are not claims that *this* change was verified. Never fabricate a PASS to satisfy the hook. The parser verifies syntax, **not** the truth of evidence.

**`Remaining:` when material.** Explicitly name unproven joins, failure cases, partial completions or known blockers. This is what distinguished the strongest older commits from broad false-positive “done” claims. Optional if there is no meaningful remainder. `Refs:` may identify a real Change/T-ID, issue or decision; do not invent tracking codes.

**Allowed types:** `feat` observable new behavior; `fix` bug; `refactor` behavior-preserving structure; `perf` measured performance; `test` evidence/fixtures; `docs` design, product/technical docs, indexes and links; `policy` agent/process rules; `build` dependencies/toolchain; `ci` automation; `infra` deployment; `lab` controlled experiment/instrumentation; `chore` maintenance; `revert` undo. Older `app`, `tools` and `design` are not good semantic types; translate by *effect* and use the scope for the component. No hardcoded list of scopes: names will evolve.

**Git compatibility:** preserve `Co-authored-by`, `Signed-off-by` and `BREAKING CHANGE` trailers. Built-in merge (`Merge ...`), revert (`Revert "..."`) and autosquash (`fixup!`/`squash!`/`amend!`/`reword!`) messages are exempt, so normal Git machinery is not obstructed.

## Examples

```text
test(HK03): isolate activity families from shared worker state

Why: The combined suite had mixed unrelated worker and task-queue failures.
Evidence: isolated families 44/44 twice on disposable SQL; shared suite NOT RUN.
Refs: HK03
```

```text
docs(repo): clarify how to install the commit-message hook

Why: Commit formats varied between agents and omitted failure boundaries.
Evidence: audited sampled history and tested local hook acceptance/rejection.
```

## Enforcement and its limits

1. `pnpm repo:commit:check:test` runs offline Node validator tests. Run `node scripts/repo-tools/check-commit-message.mjs <message-file>` to check one proposed message manually.
2. `pnpm repo:hooks:install` sets local `core.hooksPath=.githooks`. This installs the *correct* `commit-msg` hook, not `pre-commit`; it uses Node with no third-party dependencies and preserves an existing custom hooks path unless `--force` is explicitly supplied. The tracked hook has executable Git mode. Each clone must install its own hook.
3. A local hook is **not server-side enforcement**. `--no-verify` and direct GitHub API writes bypass it. A connector client that commits through an API must self-check message shape and truthfulness before calling that API. True remote rejection would require a configured mandatory status or server rule; no new paid GitHub Actions/branch-protection requirement was introduced.
4. Historical commits remain unchanged, and the check must not reject a new PR merely because an ancestor predates this policy.

**Human judgment after the parser:** From subject + Why, can you tell what was done and why? From Evidence + Remaining, do you know what was actually proved and what was not? A tiny honest message beats an elaborate fabricated receipt.
