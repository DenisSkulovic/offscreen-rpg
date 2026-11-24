# INF07 | Normalize container image architecture

**Status: Ready, owner commissioned 2026-11-24. Kind: implementation. Profile: CONTRACT.** Reference `undertaking/storyteller-workshop`, inspected baseline `dfacefdf33c6d7fa00a41cd9b22fb24a50092a9f`. INF06 Done (73 focused tests, live NOT-RUN). Source-only commission; no live Docker build/load, Tilt start, cluster mutation, provider spend or persistent data changes.

## Outcome
One image factory with shared toolchain/graph primitives, one dev union artifact and four independently deployable release artifacts, common verified Kind distribution. Keep existing image refs, role aliases, app commands, non-root users, release Next rewrite, migration behavior, slot locks, Tilt sole Deployment image writer and public operator commands. No registry, immutable release tag migration, runtime slimming, or scaling in this Change.

[Execution contract](EXECUTION.md) · [Bounded tasks](TASKS.md) · [Technical owner](../../../../docs/technical/platform/deployment-and-compatibility.md) (image architecture section).

## Acceptance
All selected source tests, fake command vectors, all-node identity verification including partial failures, two-slot receipt isolation, toolchain consistency and dependency graph mode tests pass. No silent fallback from a slot to release. Release tags and workload manifests unchanged. Existing historical inventory guard follows explicit successor mapping. Docker/Kind/Tilt live proof NOT-RUN; no acceptance credit. Parent completes, reconciles, integrates and retires branch without another approval. Global QUEUE unchanged.
