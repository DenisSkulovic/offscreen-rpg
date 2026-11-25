# INF71 | Fail closed at Temporal execution gates

**Status: Ready (dependency-gated) / owner-commissioned source implementation.**

Baseline d622ec7e25200b03ab75cb3fa87e2f67506b40a1; target main; owner commissioned source-only 2026-11-25. Dedicated Change branch/worktree via pnpm repo:change-branch --change INF71 --target main. One Composer Standard child at a time; parent runs combined affected tests, changed-file formatting and code-quality checks; review diff, reconcile canonical docs/catalog/undertaking, archive and integrate per WORKFLOW. Coordinate existing join custodian. No live Kubernetes, Docker, SQL, provider or destructive operations; preserve all existing identities and data. No successor auto-start. Contradictions return exact evidence to ChatGPT. No additional files or abstractions except explicitly selected tests.

Dependency: INF70 integrated; three builders use positional argv and explicit PGPASSWORD. Own dev-bootstrap.mjs, release-install.mjs and their corresponding executor tests. No schema-policy, chart or SQL builder changes.

[Tasks](TASKS.md) · [Programme](../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md)

## planned-impact.v1
| Plane | Disposition |
| --- | --- |
| Product | No change |
| Technical | Narrow legacy correctness correction, not target redesign |
| Source | Exact ownership in TASKS |
| Proof | Deterministic negative and positive tests, live NOT RUN |
| Related | Custodian reconciles documentation and ledger |

## Acceptance
All task proofs pass; parent verifies no unrelated edits, preserved identities, explicit failure receipts and actual test totals. Report SHA. No hosted or live readiness credit.
