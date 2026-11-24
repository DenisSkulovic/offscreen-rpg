# INF19 | dispatch

Gate INF15 and INF16 Done. Parent gives one child selected EXECUTION T-ID and listed anchors only. Sequential. No live operations.

| T-ID | Anchors | Exit |
| --- | --- | --- |
| T01 Remove fixture namespace bootstrap | infra/clusters/kind/release/up.sh; infra/environments/release/namespaces.yaml; infra/verification/smoke/release.sh; infra/platform/{redis,observability}/install.sh | Exact positive/negative proof in EXECUTION T01; concise receipt |
| T02 Reduce release teardown contract | infra/environments/release/owned-app-resources.json; scripts/repo-tools/stack-lifecycle.mjs; scripts/repo-tools/stack-health.mjs; infra/verification/release-acceptance/turn03/fixture-pins.mjs; scripts/repo-tools/stack-preflight.mjs | Exact positive/negative proof in EXECUTION T02; concise receipt |
| T03 Verification ownership and content fixture | infra/environments/release/release-acceptance-preflight.mjs; infra/environments/release/release-acceptance-preflight.test.mjs; infra/environments/release/content-bootstrap/{smoke.sh,build.sh,Dockerfile}; infra/verification/release-acceptance/turn03/fixture-pins.mjs | Exact positive/negative proof in EXECUTION T03; concise receipt |
