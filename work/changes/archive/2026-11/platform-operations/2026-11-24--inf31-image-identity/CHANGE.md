# INF31 | Correct image identity and reuse

**Status: Done (2026-11-24). Kind: implementation. Profile: RELEASE.** Integrated on undertaking/storyteller-workshop from change/inf31-image-identity. Baseline 54f9261d; worktree start 1b86be6b. Dependency INF24 Done. Source-only. Live cluster, Docker, and Tilt NOT-RUN.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Kind node image identity | changed: reuse and load compare the OCI/Docker config id, and the receipt keeps digest plus a per-node config, manifest, and target map | `infra/images/distribution/kind-image-loader.mjs` | kind-image-loader tests inside the 78/78 focused run | wrong config, ambiguous index, absent ref, and unreadable content refuse | N/A |
| Dev alias and release accepted ids | changed: alias skip uses inspect JSON; migration and rollout accept verified node config, manifest, and target ids | `infra/images/development/load-dev-slot-image.sh`, `infra/environments/release/migration.mjs`, `infra/environments/release/rollout.mjs` | development and release tests inside the same 78/78 run | third-column digest and Docker RepoDigests are not accepted ids; malformed nodes map refused | N/A |
| Dev build fingerprint | changed: a supplied fingerprint is a hint; cache miss builds a temp tag and refuses if the fingerprint moves before the canonical tag | `infra/images/development/build.sh` | load-dev-slot-image tests inside the same 78/78 run | stale hint and mid-build drift exit before publishing the canonical tag | N/A |
| Product behavior | unchanged because this is developer and release image tooling | no product page edited | source-inspected | N/A | N/A |
| Technical deployment claim | unchanged because the deployment note already requires a verified image config id | `docs/technical/platform/deployment-and-compatibility.md` | source-inspected | N/A | N/A |

Owner: Kind image identity and dev artifact fingerprint. [Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [Tasks](TASKS.md) · [Execution](EXECUTION.md) · [Source map](SOURCE-MAP.md) · [Proof](PROOF.md).

Target undertaking/storyteller-workshop, reviewed snapshot 54f9261d699097835e6c97ad55612a02ae49e59c, owner commissioned 2026-11-24. Source-only, no live cluster/Docker/Tilt/registry mutation or tenant deletion. Personal dev platform: optimize daily flow, not enterprise adversarial security. Preserve existing data/credential/foreign-slot protections. No new frameworks, profile features or auto-retry. One linked Change worktree, branch guard node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop; parent Composer coordinates one bounded task at a time, shared docs/catalog joined by human custodian. Mechanical successor reconciliation permitted; material source contradiction stop. Focused tests from repo root, changed-file quality and docs health, receipt actual counts; no live acceptance credit.

Dispatch T01 after dependency receipt. Archive only after focused proofs and reconciliation. No successor auto-start.
