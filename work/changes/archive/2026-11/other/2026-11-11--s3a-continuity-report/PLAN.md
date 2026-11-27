# Change execution plan: S3a continuity report

Change: [S3a continuity evidence report](./CHANGE.md).
Status: **Done (2026-11-18).** The report separates the five evidence states. The rest of the S3 program stays unselected.
Execution route: historical [Vvardenfell initiative](../../../../../designs/archive/legacy-initiatives-index/PARKED-2026-11-15.md#vvardenfell-story-mode-continuity). This is one bounded code outcome, not the full S3 program.

## Phases

1. **Source revalidation (read-only):** confirm current report structure, local DB/API read behavior, exact note and document identity sources and what the final captured request contains. Re-check Git revision and test entrypoint. The source filename is `scripts/repo-tools/story-session-report.mjs`.
2. **Small coding edit (future, separately authorized):** add only genuinely absent evidence fields, preserving existing format, source ownership and safe redaction. No new tracing system, side-effecting operation or semantic change.
3. **Verification and convergence (future):** validate proposed-versus-published and catalogue-versus-packed negative cases, verify report stays read-only and record actual checks. Fold durable findings into [connected proof](../../../../../../research/legacy-engineering/connected-poc-proof.md) rather than growing this plan.

## Current checkpoint

- **Current state:** Done. The local report adds `continuity` for proposed identities, publication state, the retained story root, selected handles, and packed request bodies. A missing field is `unknown`.
- **Next action:** S3b, S3c, S3d, and connected play stay separate. This plan does not authorize them.
- **Acceptance/negative:** A rejected proposal is not a retained document. A catalogue-only handle is not packed. See [Change contract](./CHANGE.md#verification-and-completion-receipt).
- **Verification:** Four provenance fixtures, 0 failures. The fixture import does not open Postgres. No model call.
- **Risk/permission:** `pnpm story:inspect` still reads the local story database when someone runs it. This packet did not run that command.
