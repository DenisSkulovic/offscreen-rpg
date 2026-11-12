# Verification: smallest convincing evidence

**Policy revised for the November 2026 AI-development reset and November 12 execution-economics direction.** Neither *no checks by habit* nor *full checks after every edit* is efficient. Choose the **cheapest check capable of catching a plausible regression at a useful boundary**. The [React/Next playbook](../../docs/engineering/frontend-execution-playbook.md#4-verification-ladder-stop-checking-every-keystroke) defines V0–V4 staged gates. This remains a pre-POC, not a production release.

## Check cadence: batching by risk, not keystroke

- **V0 hot editing:** IDE TypeScript/Next diagnostics and occasional `git diff --check`; keep existing dev/Vitest watch processes warm when useful. No full lint/type/build/test on every save.
- **V1–V2 coherent sub-slice/Change closure:** one relevant normal and discriminating negative unit/component case, targeted lint/typecheck of touched workspace when useful. Batch multiple small edits into one check.
- **V3 integration seam:** when Next SSR/auth, mutation receipts, forms or SSE connect, run *one* representative filtered build/real provider-free contract test before dependent work relies on it. Do not defer **security/idempotency negative cases** until all Changes are finished.
- **V4 portfolio/PR:** broad unit/lint/type/build and selected real browser/DB checks; not an inner-loop default.
- Expensive commands with side effects (notably `pnpm test:focus`) require explicit authorization and inspection of target DB. Skipped checks must be reported as skipped, never assumed passed.

## Choose by change risk

| Change | Default evidence | Expand only if needed |
| --- | --- | --- |
| Documentation, rules, skills | Readability/ownership review, check affected links when changed | `python scripts/check_docs.py` when links/routes moved |
| One local pure function or schema | Focused local test and/or targeted typecheck | Adjacent package test if its public contract changed |
| Frontend interaction | Targeted typecheck plus manual visual/interaction check of the changed flow | Browser E2E for user-visible regressions with a reliable harness |
| API/application state transition | Targeted tests including rejection, duplicate/retry and persistence boundary | Focused integration suite after verifying test DB and build state |
| Storyteller prompt/context/retrieval | Exact packet or deterministic fixture comparison; preserve baseline | Carefully authorized single live run only when offline evidence cannot answer |
| Migration, outbox, clock, billing, permission | Deterministic invariant checks and the narrow integration path | Wider suite when shared state semantics genuinely changed |

**No meaningless ceremony:** don't run a whole monorepo build for a Markdown edit, and don't format unrelated files. Where a focused test is missing, use a small static/invariant inspection and report the evidence gap rather than manufacturing a test framework for a one-off task. Don't rerun the same failing broad suite without a concrete fix.

## Commands and environment

- Formatting of edited files: `pnpm exec prettier --check <paths>`; formatting fix only of owned files: `pnpm exec prettier --write <paths>`.
- Web-only typecheck without production build: `pnpm --filter @offscreen/web typecheck` (Next `typegen`, incremental `tsc`). Cross-package typecheck when needed: `pnpm exec turbo run typecheck --filter=@offscreen/<package>` (builds workspace dependencies).
- Narrow pure package tests: `pnpm exec turbo run test --filter=@offscreen/game` (or `@offscreen/documents`); inspect selected scripts. Current Turbo `test` depends on the **same-package `build`**; W01 adds direct web Vitest and W20 adds a non-Next-building `test:fast` lane.
- Repository-wide checks **at V3/V4 milestones when warranted**, not after each edit: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- `pnpm test:focus -- <suite> [test-name]` builds the integration workspace, **resets `offscreen_auth_test`**, and removes provider keys/opt-in from its test environment. Read the wrapper before first use.
- `pnpm db:reset:test`, baseline generation, Docker startup, browser installs and Story mode are **not** reflexive verification. Understand prerequisites and side effects first.

Node, pnpm, Docker/Temporal and Postgres are not interchangeable. Never claim a test is green based on an old `dist/` build. A currently failing unrelated check remains a known baseline problem; distinguish it from failures caused by this change.

## Finish with a short evidence receipt

Report **what ran**, pass/fail/blocked, what did not run when that materially limits confidence, and any actionable defect. Review the actual diff, including relevant failure/retry paths. Code style, typechecking, tests, gameplay quality and human acceptance are separate claims.

Automated tests/CI must be **provider-free**. Never take a paid route merely to satisfy verification. Consult `spending.md` before any provider-facing experiments, including runs labeled free. A missing charge is not evidence of free inference.
