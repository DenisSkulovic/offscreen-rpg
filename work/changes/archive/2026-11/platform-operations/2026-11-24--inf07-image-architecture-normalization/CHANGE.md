# INF07 | Normalize container image architecture

**Status: Done. Kind: implementation. Profile: CONTRACT.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `dfacefdf33c6d7fa00a41cd9b22fb24a50092a9f`; implementation started at `b40d9dbc66167b68f78b4a71bbdf4df518c6b52d`. Source-only. Live Docker/Kind/Tilt NOT-RUN. No acceptance credit for live images.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Shared image factory | `docs/technical/platform/deployment-and-compatibility.md` Container image architecture; `infra/README.md` image atlas | changed: one toolchain pin and workspace graph; one dev union recipe; release services recipe with api, game-authority, and worker targets; shared all-node Kind distributor | `infra/images/common/toolchain.pin`; `infra/images/common/workspace-graph.mjs`; `infra/images/release/Dockerfile.services`; `infra/images/distribution/kind-image-loader.mjs` | source-inspected; focused node tests 150 pass, 1 skip | malformed pins and wrong-profile refs refuse before load; empty recipe tree is `unreadable-recipe`; post-load mismatch returns no receipt | `infra/README.md` image factory paragraph |
| CI node digest pin | `docs/technical/platform/deployment-and-compatibility.md` architecture tests | changed: digest is compared to `infra/images/common/toolchain.pin`, not artifact `images.pin` | `scripts/repo-tools/check-dxk05-ci-guards.mjs` | source-inspected; guard tests 7/7 | artifact pin containing `NODE_DIGEST` is rejected | same heading |
| Release tags and product play | product docs; `infra/workloads/release` | unchanged because stable tags and workload YAML were not edited and no product rule changed | workload YAML diff empty on this branch | source-inspected | live Kind load, Tilt, and cluster apply NOT-RUN | no product page edited |

## Outcome
One image factory with shared toolchain/graph primitives, one dev union artifact and four independently deployable release artifacts, common verified Kind distribution. Keep existing image refs, role aliases, app commands, non-root users, release Next rewrite, migration behavior, slot locks, Tilt sole Deployment image writer and public operator commands. No registry, immutable release tag migration, runtime slimming, or scaling in this Change.

[Execution contract](EXECUTION.md) · [Bounded tasks](TASKS.md) · [Technical owner](../../../../../../docs/technical/platform/deployment-and-compatibility.md) (image architecture section).

## Acceptance
All selected source tests, fake command vectors, all-node identity verification including partial failures, two-slot receipt isolation, toolchain consistency and dependency graph mode tests pass. No silent fallback from a slot to release. Release tags and workload manifests unchanged. Existing historical inventory guard follows explicit successor mapping. Docker/Kind/Tilt live proof NOT-RUN; no acceptance credit. Parent completes, reconciles, integrates and retires branch without another approval. Global QUEUE unchanged.
