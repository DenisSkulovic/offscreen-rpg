# Verification during the POC phase

The owner explicitly made checks optional on 2026-09-18. We are shaping a pre-POC system, not preparing a production release. Prioritize useful implementation, sound design and the owner's time and usage budget. This policy remains in force until the owner explicitly asks to change it for a later lifecycle stage.

- Tests, builds, typechecks, lint, formatting checks, documentation validators and other verification commands are optional. Do not run them routinely or treat green results as a completion gate. Default to no check commands unless requested or a small targeted check directly helps resolve a concrete implementation problem.
- Do not spend substantial time or tokens adding tests, expanding coverage, chasing green results or fixing one or two minor issues. Record minor issues briefly for later and hand back the useful work. Do not keep working merely to make every check pass.
- Cross-package changes, persistence work and feature size do not automatically override this policy. Do not invent production-readiness requirements for the current phase or repeatedly ask permission to skip checks.
- Read the code thoughtfully and preserve good architecture. Optional verification is not permission to claim untested behavior was verified, conceal known problems or remove existing tests to manufacture success. State skipped checks briefly when relevant, without a lengthy disclaimer.
- If checks are useful or requested, batch them after the code changes and choose the smallest useful scope. Run heavyweight commands sequentially with bounded concurrency. Avoid broad suites, repeated builds, watchers and unrelated cleanup; stop processes started for the task.
- Inspect scripts before filtering. Tests using compiled dist files need a fresh affected build if they are run; never report stale results as verification of new source.
- Docs/rules-only changes do not require a documentation validator. Skill edits do not require a frontmatter validator. No blanket formatting or repository-wide autofixes.
- Spending, credential protection and authorization rules still apply. Ordinary checks must make no paid provider calls; see [Spending](spending.md).

This policy takes precedence over check/completion requirements in feature plans, templates and engineering guidance. Update the policy only when the owner requests a lifecycle change, not because an agent decides the project should be production-ready.
