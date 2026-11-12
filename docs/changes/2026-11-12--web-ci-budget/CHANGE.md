# Change W21: Cost-aware GitHub Actions gates and efficient CI cache

> **Cursor first look (current source ≠ selected target):** [Integration cost map](../../../tools/api-integration/test/README.md) → the **one** owning symbol. **Primary contract:** [F15](../../engineering/targets/react-next.md#f15-performance-diagnostics-and-delivery-fitness).  
> **Pre-investigated trap:** Docs-only should skip heavy CI; required status checks must not become permanently pending.  
> **Context rule:** this packet is the complete implementation authority; read its remaining scope/negative test, **not** the entire audit, target, old minutes or adjacent Change folders.


**Status:** Done (2026-11-12). **Goal:** avoid broad GitHub Actions jobs after every tiny frontend or Markdown push while retaining real, reproducible integration proof. **Dependencies:** W01 and W20 (Done). **Authority:** [frontend execution playbook](../../engineering/frontend-execution-playbook.md#4-verification-ladder-stop-checking-every-keystroke); target F10/F15; [verification rule](../../../.agents/rules/verification.md). Implemented via always-on `scope` + `ci_gate` sentinel and conditional heavy jobs; classifier fixtures in `scripts/repo-tools/ci-change-scope.test.mjs`.

## Observed problem

Both `code.yml` and `docs.yml` trigger on every `push` and `pull_request`. The code workflow has code/lint/typing/build, an infrastructure Compose job, a PostgreSQL database job and an identity job that installs Chromium and starts Temporal. Doc-only commits and small code pushes can therefore consume time/resources on irrelevant jobs. Existing pnpm store cache is configured, but no measured cache-hit strategy or code-vs-docs CI selection exists.

## Binding CI policy

1. **Docs-only:** check Markdown/local links and navigation, not Postgres/Temporal/Chromium/full Next build. Preserve docs checks when code Changes *also edit docs*.
2. **Normal iterative code push:** use a lightweight provider-free lint/typecheck/focused unit or relevant build lane. A build should be included when a changed framework/package boundary genuinely needs it, not blindly for unrelated source.
3. **Integration gate:** real database, API/worker/Playwright suites run at PR or explicit `workflow_dispatch`/checkpoint and before claiming relevant milestone acceptance; not after every saved file/commit. For work done directly on main without PR, document the manual integration gate rather than implying it ran.
4. **Required checks caveat:** before applying workflow-level path filters, verify repository branch-protection/check requirements. GitHub skipped required workflows can leave required check statuses Pending. Prefer cheap always-reported sentinel with conditional expensive jobs if needed; never break protected merging merely to save minutes.
5. **Cache correctly:** retain `actions/setup-node` pnpm caching; add Turbo or Next CI caches only if cache key covers Node, pnpm lock, turbo config and appropriate source/env inputs and actual wall-time benefits. No paid remote cache or cache of private user/session artifacts.
6. **Test cost/safety:** CI never uses provider credentials; disposable DB/ports isolated; prevent accidental concurrent integration jobs sharing state. Cancel superseded PR-only runs only when they are safe to cancel.

## Code/config scope and acceptance

Edit workflows and at most a small standard-library Node/Python changed-path classifier/test if simple GitHub event conditions are insufficient. First produce an explicit matrix of docs-only, web-only, shared-contract, API/DB, PR and manual triggers, then implement. Avoid third-party actions just to detect file types.

- **Normal:** docs-only change checks docs and skips Docker; web-only code push uses fast lane; PR/manual full gate still works and records actually executed integration.
- **Negative:** changed `packages/contracts` or `pnpm-lock.yaml` not mistakenly classified docs-only; skipped mandatory workflow does not block merge; cache invalidated on real source change, no fake green.
- **Proof:** YAML syntax, path/event classifier fixtures, targeted dry-run; observe real Actions only with explicit permission, logging exact events/jobs/duration and costs if surfaced.
- **Exclusions:** no live deployment, provider calls, new hosted runner, engine changes, destructive local database reset or “skip all CI” shortcuts.

**Cursor handoff:** inspect two workflow files, root scripts and [verification policy](../../../.agents/rules/verification.md), implement one small CI workflow change, return trigger matrix, actual checks, limitations and side-effect boundary. Do not research general GitHub architecture or adopt unnecessary CI marketplace dependencies.
