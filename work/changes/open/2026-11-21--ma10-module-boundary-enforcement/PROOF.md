# MA10 | adversarial cold-read and acceptance proof plan

**Static source audit `e122d080`**, plus MA07 `4168db58`. MA08/MA09/WR09 outputs do not yet exist for this review. **Verdict: PLANNER-BLOCKED on dependent implementation/source rebase; not Cursor-ready yet.** This is a real 5-document packet with chosen migration and proof algorithm, not merely a roadmap.

**G0 PASS** integration branch/source baseline and gated schedule; **G1 PASS for original source** 112 old tests, package wildcard exports, scripts, source SCCs and current AST scanner; **G2 CONDITIONAL** exact final public import allowlist can only be frozen after MA08/MA09/WR09, but selected algorithm is deterministic from resulting imports, not an invitation to redesign; **G3 CONDITIONAL** T01–T05 concrete write ownership, but late exported surface varies with WR09; **G4 BLOCKED** legal first dispatch awaits predecessors and new source audit; **G5 PASS** serial tasks and explicit shared lockfile/CI resource; **G6 PASS in design** positive, negative and semantic regression matrix; **G7 PASS** one cohesive compatibility-retirement and source boundary enforcement Change, not cosmetic file split.

| Proof | Required expected result |
| --- | --- |
| 112 old test files migrated 1:1 | no dropped cases/negative assertions; compatibility-only test replaced by direct-owner verification |
| App package removal | no workspace, no lockfile importer, no runtime specifier, no build script invoking it |
| Lab boundary | engine/authority never imports lab, normal user route cannot use Chamber fixture override |
| Story Engine public exports | each real external specifier resolves; one fake internal path fails |
| Module graph | forbidden authority→Writer runtime import fails, type-only separately classified, no material cross-domain runtime SCC |
| Narrative intent/clock | unchanged Game Authority revision, operation ID, durable wake, restart idempotency |
| Writer custody | unchanged pinned wire, uncertain liability, CAS response replay, no charge duplication |
| User permission and fork | bad owner/stale root denied, no unauthorized events or document leaks |
| Build and tests | truthful PASS/FAIL/SKIP/NOT RUN, exact command/cwd, disposable SQL only |

**Zero tests run by planner; no paid provider operations.** Mandatory post-dependency independent G0–G7 review before promoting readiness. Do not hide blockers in an optimistic catalog label.
