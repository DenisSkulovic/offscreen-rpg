# INF43 source map

Baseline source 91bc2af40a94, HEAD 21ed6630e8a8f60a9a3e2bc49054eb5a0bec916e. Existing anchors and selected edits are in EXECUTION. Future exports are design, not landed source.

T01: tools/dev-environments/test/dev-fu03-startup.test.mjs; tools/dev-environments/test/dev-slot-operation-lock.test.mjs; tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch

T02: tools/dev-environments/test/dev-slot-startup.test.mjs lines 278–453; infra/images/development/tests/load-dev-slot-image.test.mjs; infra/images/development/load-dev-slot-image.sh; infra/images/development/build.sh

T03: tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch (SIGINT/SIGTERM registration around 1234–1245, finally); tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-v2-cli-startup.test.mjs
