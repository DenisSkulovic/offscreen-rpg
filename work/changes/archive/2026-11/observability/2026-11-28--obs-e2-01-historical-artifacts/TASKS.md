# OBS-E2-01 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PROPOSED — source-determined; independent readiness review pending. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02; selected: none.

## T01 | Name immutable E1 bundles | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: No source predecessor; owner commission and branch checks.
May write: infra/platform/observability/artifacts.mjs; infra/platform/observability/tests/render.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/artifacts.mjs: assertArtifactVariantAllowed, resolveValuesPaths, loadArtifacts, loadObservabilityVariants; infra/platform/observability/tests/render.test.mjs
Algorithm: Add explicit IDs dev-e1-base/dev-e1-developer/release-e1 as internal selectors; keep historical desired/predecessor inputs and default at this stage. Preserve exact values, image locks, chart checks, manifests, inventory and exported historical shape. Add artifactId to descriptors; reject cross-profile/unknown IDs. E2 ID reserved, refuses until 08 adds a validated bundle. Historical function still returns desired/dev developer and predecessor/base; release desired only.
Test: node --test infra/platform/observability/tests/render.test.mjs
Negative: Base/developer render difference remains Collector-only; invalid/cross-profile IDs and unavailable E2 reject.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Freeze pure revision table | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/artifact-history.mjs (new); infra/platform/observability/tests/artifact-history.test.mjs (new)
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/readiness.mjs: verifyHelmRevisionMatrix, verifyHelmStorageBijection; Design INTEGRATION.md: Final Helm revision and storage matrix
Algorithm: Export immutable ARTIFACT_HISTORY_ROWS with exact row IDs from INTEGRATION; each row maps each of five release roles to ordered artifact IDs for revisions 1..N, with latest deployed and preceding superseded. For E2 P/G revisions source E1 developer then E2; Collector base->developer where upgraded; unchanged roles use exact corresponding final artifact. Also export E2_PHASES and intermediate history rows keyed by original developer-fresh/upgraded. Intermediate changes only P at first phase; never public final rows. Row lookup requires profile and unique ID, no revision-only guessing.
Test: node --test infra/platform/observability/tests/artifact-history.test.mjs
Negative: All seven final rows exact; wrong tuple or unknown profile/phase cannot select a row by revision alone.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
