# INF17 | dispatch

Gate INF08 Done. Parent gives one child selected EXECUTION T-ID and listed anchors only. Sequential. No live operations.

| T-ID | Anchors | Exit |
| --- | --- | --- |
| T01 Collapse slot loader entrypoint | infra/dev/load-dev-image.sh; infra/images/development/load-dev-slot-image.sh; infra/dev/load-dev-image.test.mjs; infra/images/development/build.sh | Exact positive/negative proof in EXECUTION T01; concise receipt |
| T02 Dev-only sync/rebuild contract | infra/dev/dev-sync-paths.mjs; infra/dev/dev-sync-paths.test.mjs; infra/images/common/workspace-graph.mjs; infra/images/development/tilt/build-release-images.sh | Exact positive/negative proof in EXECUTION T02; concise receipt |
| T03 Single root Tilt graph | Tiltfile; infra/dev/Tiltfile; infra/dev/dev-tiltfile-{api-authority,web,workers}.test.mjs; tools/dev-environments/test/dev-tiltfile-split.test.mjs | Exact positive/negative proof in EXECUTION T03; concise receipt |
