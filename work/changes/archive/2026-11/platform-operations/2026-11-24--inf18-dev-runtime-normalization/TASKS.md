# INF18 | dispatch

Gate INF17 Done. Parent gives one child selected EXECUTION T-ID and listed anchors only. Sequential. No live operations.

| T-ID | Anchors | Exit |
| --- | --- | --- |
| T01 Shared compiled generation receipt | infra/dev/dev-watched-compilation-receipt.mjs; packages/runtime-logging/src/dev-loaded-runtime-receipt.ts; infra/dev/dev-watched-compilation-receipt.test.mjs; tools/dev-environments/src/cli/dev-tilt.mjs | Exact positive/negative proof in EXECUTION T01; concise receipt |
| T02 One compiler supervisor; no production app receipt hooks | apps/{api,game-authority,worker}/dev-pod-compile-watch.mjs; packages/runtime-logging/src/dev-loaded-runtime-receipt.ts; apps/api/src/main.ts; apps/game-authority/src/bootstrap/main.ts; apps/worker/src/bootstrap/{control-main,executor-main,main}.ts | Exact positive/negative proof in EXECUTION T02; concise receipt |
| T03 Web and image packaging | apps/web/dev-pod-web-receipt.mjs; infra/images/development/Dockerfile; infra/dev/dev-image-runtime-modules.mjs; infra/workloads/chart/templates/_helpers.tpl; infra/workloads/profiles/development.yaml | Exact positive/negative proof in EXECUTION T03; concise receipt |
| T04 Host status and final folder removal | tools/dev-environments/src/cli/dev-tilt.mjs::pullSelectedSlotReceipts/printDevStatus; tools/dev-environments/test/dev-tilt.test.mjs; infra/dev remaining tests; scripts/repo-tools/infra-layout.test.mjs | Exact positive/negative proof in EXECUTION T04; concise receipt |
