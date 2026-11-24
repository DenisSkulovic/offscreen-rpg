# INF21 | Selected SQL tenant and migration integrity

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline a0f299407467baba7fc339fafe398e18df45996b; integrated on undertaking/storyteller-workshop from change/inf21-dev-sql-isolation. Dependency: INF20 Done. Source-only. Live cluster, Tilt, and Docker NOT-RUN.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Selected SQL writes | changed: known slots are a catalog allowlist; only the selected slot is created, closed, opened, or granted | `tools/dev-environments/src/adapters/dev-sql-tenant-executor.mjs` | executor and live-adapter tests 11 pass | unknown DB, foreign resource, partial identity, and existing peer B stay unwritten | developer-environments SQL provisioning paragraph |
| Canonical migration | changed: activation builds `@offscreen/db` and applies the compiled journal on the spare-port forward | `tools/dev-environments/src/adapters/dev-slot-migrate.mjs` | migrate tests 8 pass | hash mismatch, foreign port, malformed Secret, and forward exit refuse | N/A |
| One schema gate | changed: projection consumes in-process proof; runtime loses DML on the gate table | `dev-slot-project.mjs`, `dev-sql-tenant-grants.mjs` | project, startup, and grants tests in the 48-test join | missing, mismatched, or non-integer proof writes nothing; prior migration failure skips projection | developer-environments SQL provisioning paragraph |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | N/A | N/A |

Owner: SQL tenant executor/adapter, migration and projection schema gate.

[Program](../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [TASKS](TASKS.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md).
