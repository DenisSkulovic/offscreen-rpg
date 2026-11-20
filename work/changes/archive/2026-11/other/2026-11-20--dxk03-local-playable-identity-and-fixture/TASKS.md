# DXK03 | bounded Composer tasks

**Status:** Done (2026-11-20). GitHub OAuth is the only runtime sign-in. A real browser login started the scripted Seyda Neen story and published one road question. Staff bootstrap was not run. **Program:** [DXK program](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md). The packet is archived. **Baseline:** 13bcd6cf + GitHub main 8796daaa; live proof is on `change/dxk03-local-playable` at `d506a969` before the close commit.


## T01 | Explicitly gated, real Better Auth local identity

**DEPTH=PATCH-L.** **Initial source route (2-4 anchors):** apps/api/src/modules/auth/auth.ts; apps/api/src/modules/auth/config.ts; apps/api/src/main.ts; tools/api-integration/test/admin-session.integration.ts. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Decide settled contract: enable Better Auth email/password solely in explicit local-demo profile with loopback APP_ORIGIN, owned kind context/namespace and single local ephemeral secret; GitHub OAuth remains the regular default when configured. Create unique local account via official Better Auth flow and a usable login UI; no forged cookies, anonymous admin, backdoor route or hard-coded permanent shared password. Production env/remote host + dev flag must refuse startup. Tests demonstrate valid session, invalid credentials, CSRF, foreign/anonymous denial and non-demo refusal.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T02 | Idempotent staff bootstrap and pinned content

**DEPTH=PATCH-L.** **Initial source route (2-4 anchors):** scripts/repo-tools/admin-bootstrap-staff.mjs; scripts/repo-tools/import-pinned-fixture.mjs; infra/kubernetes/lab/content-bootstrap/importer-job.yaml; tools/api-integration/test/start-package.integration.ts. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Use real authenticated user IDs and existing admin:bootstrap-staff authorization to provision one dev staff identity in owned cluster, not general admin impersonation. Import/verify pinned rule/world/start docs into S3 once; choose rights-cleared/publicly usable demo fixture consistent with selected campaign (do not silently treat Vvardenfell sample as licensed). Seed a selectable campaign/opening through existing application use cases, not direct fabricated game rows. Repeated deploy preserves user, staff grants, story and source hashes.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T03 | Real UI gameplay and negative checks

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** tools/api-integration/test/turn03-distributed-poc-fixture.integration.ts; apps/web/src/server/nest-reader.ts; apps/api/src/modules/stories/game-authority-client.ts; docs/runbooks/local-development.md. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** From browser login launch pinned campaign, play one deterministic meaningful action through Nest→private GA→SQL/S3/Temporal→publication, load scene continuation, inspect history and /control. If checkpoint/fork is prerequisite for declared golden scenario, use TURN03's real fixture; no fake response or green synthetic harness substitute. Wrong user denied, failed provider disabled and missing package have honest UI and readiness failure; capture exact browser/SQL/Pod evidence with zero model calls.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## Close conditions

Do not report DONE for successful source edits alone. Reconcile actual source/config tests, durable Change receipt, canonical documentation, root navigation, no duplicate ownership, safety gates and a coherent commit. Then and only then archive this Change, update the single work selector, and stop for the next finite batch selection.
