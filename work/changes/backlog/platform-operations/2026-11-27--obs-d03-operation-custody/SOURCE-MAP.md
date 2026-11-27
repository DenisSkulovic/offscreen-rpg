# OBS-D03 source map

Current inspected baseline `ce96b1c405a3f5f21d0f37bf37824edcddd265ef`. Principal source anchors from previous source audit, confirmed no affected source drift in main comparison. Future interfaces below are intended, not existing exports. Revalidate every changed predecessor before promotion. No claim of local tracked census or runtime state.

| Source | Boundary |
|---|---|
| P/custody.mjs::custodyPaths/readPending/acquireCustody/runMutation | existing context service lock and schema-less pending → stable inode, read-only legacy fence, strict owner record |
| P/install.mjs::runWrite | conservative attempted/confirmed/possible and stop after uncertainty |
| P/forward.mjs, exec-owned.py | new private owned child primitive, no port forwarding in D03 |
| P/tests/custody-worker.mjs, custody.test.mjs | existing inherited flock test vs new parent-death direct exec evidence |
| P/tests/install.test.mjs | stateful independent pending fixture, actual mutation flags |
| D06/D10 | own exact upgrade/disruption details and narrow validators; no future operation admitted before its validator lands |

Historical exact contract and original test recipes: [archived original](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/); planner use only. [Independent sequencing findings](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) are binding blockers, not implementation instructions.
