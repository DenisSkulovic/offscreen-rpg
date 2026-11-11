# Change execution plan: S3a continuity report

Change: [S3a continuity evidence report](CHANGE.md).
Status: **Proposed, not implementing**. The owner is currently reviewing/reorganizing work planning and has explicitly forbidden application/code edits in this session.
Execution route: historical [Vvardenfell initiative](../2026-09-21--21-56--story-mode-vvardenfell-continuity/PLAN.md#s3a--make-the-causal-baseline-inspectable--nearest-slice). This is one bounded code outcome, not the full S3 program.

## Phases

1. **Source revalidation (read-only):** confirm current report structure, local DB/API read behavior, exact note and document identity sources and what the final captured request contains. Re-check Git revision and test entrypoint. The source filename is `scripts/repo-tools/story-session-report.mjs`.
2. **Small coding edit (future, separately authorized):** add only genuinely absent evidence fields, preserving existing format, source ownership and safe redaction. No new tracing system, side-effecting operation or semantic change.
3. **Verification and convergence (future):** validate proposed-versus-published and catalogue-versus-packed negative cases, verify report stays read-only and record actual checks. Fold durable findings into [connected proof](../../engineering/connected-poc-proof.md) rather than growing this plan.

## Current checkpoint

- **Current state:** Proposed packet, **no code changed**. Parent S3a scope was reviewed; one nonexistent source path corrected in this documentation plan. A narrow source read confirmed the actual report already summarizes document proposals, published states, catalogue selection and some request metadata.
- **Next action:** When the owner resumes implementation, perform Phase 1 source revalidation and get explicit permission for Phase 2. Do not infer permission from the old initiative's September approval.
- **Acceptance/negative:** See [Change contract](CHANGE.md#completion-evidence) and its proposal-versus-publication and catalogue-versus-packed rejection cases.
- **Verification:** GitHub source/docs inspected only. No code/test execution, Docker, DB connection, browser or provider call in this planning session.
- **Risk/permission:** Local report uses PostgreSQL and may read a local API. No live inference, DB reset, credentials or external spend. Preserve the owner's working tree and any evidence artifacts.
