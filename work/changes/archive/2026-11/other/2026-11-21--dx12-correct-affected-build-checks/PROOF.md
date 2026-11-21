# DX12 | readiness and proof

Source baseline 6dd12761 root scripts/turbo.json, ci-change-scope code and code.yml, package dependency manifests. No local pnpm/Turbo execution or test run by ChatGPT. Official Turbo docs support affected package selection with full Git history; actual installed syntax still must be smoke-tested.

G0 PASS undertaking and post-wave dependency. G1 PASS current build/CI graph inspected. G2 PASS fail-safe selected CLI and full fallback, no paid CI. G3 PASS source/test/manifest write paths and tasks. G4 PASS T01 pure classifier first. G5 PASS disjoint from Worker OPS12 and Writer WR09B, no current MA11 graph changes. G6 PASS negative selection/dirty/global/cache acceptance. G7 PASS useful daily engineering optimization with controlled rollout.

Require: docs-only -> no code tasks; leaf edit -> leaf and actual affected reverse dependents, unrelated workspace excluded; Story Engine/Contracts -> API/Worker/GA/API Integration included where actual graph demands; global toolchain/lockfile/dirty/missing ancestor -> FULL; dry default no execution; invalid dry JSON or empty plan for code -> FULL; correct old full scripts unchanged; tests never implicitly invoke SQL/live/paid provider. Optional second same-input run must show actual cache stats or mark NOT RUN, never invent speedup.

Commands: node --test scripts/repo-tools/affected-check.test.mjs; pnpm repo:affected --base REAL_SHA (read-only); pnpm repo:affected --base REAL_SHA --run only on clean provider-free developer checkout; git diff --check. Report exact PASS/FAIL/SKIP/NOT RUN and real task count, not merely a generated plan.
