# INF43 dispatch

Sequential T-IDs. Dependency INF36 Done. Each child reads exact EXECUTION section and listed anchors, no broad discovery.

- T01: Repair retired imports. tools/dev-environments/test/dev-fu03-startup.test.mjs; tools/dev-environments/test/dev-slot-operation-lock.test.mjs; tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch. See EXECUTION T01.
- T02: Update fake image fixtures without weakening INF31. tools/dev-environments/test/dev-slot-startup.test.mjs lines 278–453; infra/images/development/tests/load-dev-slot-image.test.mjs; infra/images/development/load-dev-slot-image.sh; infra/images/development/build.sh. See EXECUTION T02.
- T03: Remove actual listener leak and join full source suite. tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch (SIGINT/SIGTERM registration around 1234–1245, finally); tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-v2-cli-startup.test.mjs. See EXECUTION T03.
