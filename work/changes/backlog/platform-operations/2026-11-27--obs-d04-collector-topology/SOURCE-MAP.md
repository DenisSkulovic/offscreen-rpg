# OBS-D04 source map

Current inspected baseline `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`. Principal source anchors from previous source audit, confirmed no affected source drift in main comparison. Future interfaces below are intended, not existing exports. Revalidate every changed predecessor before promotion. No claim of local tracked census or runtime state.

| Source | Boundary |
|---|---|
| P/artifacts.mjs::loadArtifacts, renderObservabilityDocuments | base singleton D01 → ordered dev overlay plus internal predecessor; release unchanged |
| P/inventory.mjs::collectInventory/listHelmReleases/fetchHelmManifest | frozen list/history/manifests/Secret/PV projection |
| P/readiness.mjs::classifyInventory/observeObservability | pure supported state classifier, exact owned adapters; no pending override |
| P/install.mjs::verifyCompletedPhasePrefix/runObservabilityEnsure; P/receipt.mjs::parseEnsureReceipt/evaluateObservationReceipt | consume same preloaded descriptors and owned shape, typed receipts |
| infra/environments/platform-plan.mjs, infra-cli.mjs; infra/verification/diagnostic-live.mjs, diagnostic.mjs, provisioning.mjs | exact affected caller/default migration, no other service changes |
| P/tests/{inventory,readiness,install,receipt,diagnostic-worker,snapshot-fixtures}.mjs and named external tests | real rendered fixtures and negative one-field mutations |

Historical exact contract and original test recipes: [archived original](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/); planner use only. [Independent sequencing findings](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) are binding blockers, not implementation instructions.
