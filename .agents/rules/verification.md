# Verification: smallest convincing evidence

**Policy revised for the November 2026 AI-development reset.** The old default of running *no* checks by habit was appropriate for fast exploration, but it produced an unreliable CI signal. We now choose the **cheapest check that is capable of catching a plausible regression**. This is still a pre-POC, not a production release gate.

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
- Typecheck (builds dependency packages): `pnpm exec turbo run typecheck --filter=@offscreen/<package>`.
- Narrow pure package tests: `pnpm exec turbo run test --filter=@offscreen/game` (or `@offscreen/documents`); inspect selected scripts before use.
- Repository-wide checks when warranted: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- `pnpm test:focus -- <suite> [test-name]` builds the integration workspace, **resets `offscreen_auth_test`**, and removes provider keys/opt-in from its test environment. Read the wrapper before first use.
- `pnpm db:reset:test`, baseline generation, Docker startup, browser installs and Story mode are **not** reflexive verification. Understand prerequisites and side effects first.

Node, pnpm, Docker/Temporal and Postgres are not interchangeable. Never claim a test is green based on an old `dist/` build. A currently failing unrelated check remains a known baseline problem; distinguish it from failures caused by this change.

## Finish with a short evidence receipt

Report **what ran**, pass/fail/blocked, what did not run when that materially limits confidence, and any actionable defect. Review the actual diff, including relevant failure/retry paths. Code style, typechecking, tests, gameplay quality and human acceptance are separate claims.

Automated tests/CI must be **provider-free**. Never take a paid route merely to satisfy verification. Consult `spending.md` before any provider-facing experiments, including runs labeled free. A missing charge is not evidence of free inference.
