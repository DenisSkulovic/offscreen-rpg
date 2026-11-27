# OBS-D02 source map

Current inspected baseline `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`. Principal source anchors from previous source audit, confirmed no affected source drift in main comparison. Future interfaces below are intended, not existing exports. Revalidate every changed predecessor before promotion. No claim of local tracked census or runtime state.

| Source | Existing → target |
|---|---|
| P/identity.mjs::captureIdentity/recheckIdentity/readNamespaceUid | existing profile/Docker/snapshot checks → full immutable tuple, bound reads and F08 shared exports (D02 T01) |
| infra/platform/common/commands.mjs::assertPlatformTarget | existing ambient baseline guard; inject bounded runner, no edit |
| P/install.mjs::runObservabilityEnsure/runWrite | actual namespace create response binds UID before further reads; preserve pending fence |
| P/artifacts.mjs::loadArtifacts | default trusted offline Helm runner explicit <=60s, not identity <=15s; preserve D01 descriptor/render behavior |
| P/tests/identity.test.mjs, install.test.mjs | independent fixture identity and actual create JSON; no partial hand-built tuple |
| P/inventory.mjs, readiness.mjs and external observation | D04 owns remaining migration; no public claim of complete safety before joint boundary |

Historical exact contract and original test recipes: [archived original](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/); planner use only. [Independent sequencing findings](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) are binding blockers, not implementation instructions.
