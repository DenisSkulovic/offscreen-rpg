# WIKI04 | Repair real wiki navigation without link farming

**Status: Proposed, NOT selected.** Code-bearing wiki-maintenance change (navigation documents + regression fixtures). Authoritative baseline for review: `51b21588b4a115cf7e7690c13fdcd9dee906833f, 2026-11-16. Reinspect current HEAD and any local user work before execution.

## Independent audit and actual baseline

WIKI01 reports zero broken maintained paths and anchors but only 69/74 canonical docs reachable from `docs/README.md (five unreachable; median reachable hops 2, p95 3). WIKI02 has a blocked 30-case run because the graph is not fully connected. Its source code is now on GitHub, and its first benchmark is implementer-validated, not independently reviewed. Re-run the actual graph on a **clean revision** at the start, storing baseline reports; do not mistake a prior dirty-worktree run for a newly executed benchmark.

The five presently unreachable documents and their status:

| Page | Intended relationship and change |
| --- | --- |
| `docs/runbooks/README.md | Canonical operations index. Add *Runbooks* to the `docs/README.md subject-map/footer with a clear “how to operate locally” question; preserve the useful direct local-development shortcut |
| `docs/technical/admin/console-and-read-models.md | Selected admin UI target. Add “How does the staff console navigate, render and isolate its data?” in `docs/technical/README.md; add a concise sibling route from `docs/technical/admin/topology-and-authorization.md |
| `docs/technical/lab/experiment-protocol.md | Selected Chamber protocol. Add context-specific protocol link under “scenario/driver/contracts” in `docs/technical/lab/chamber-and-fixtures.md and reciprocal link from protocol to the overview, not merely a root shortcut |
| `docs/technical/observability/capture-and-provenance.md | Explicitly describes **proposal-only** transition capture. First decide whether technically *selected for the long-term target* or genuinely still unaccepted; then route through the correct current selected evidence/reconstruction owner or move it to a named open design |
| `docs/technical/observability/telemetry-and-diagnostics.md | Explicitly labels OpenTelemetry/Grafana a **technical recommendation, not installed or authorized**. Treat as proposed unless separately ratified; route with a visibly proposed label or move to a named open-design gate |

### Authority is the difficult part

`docs/technical/observability/identities-and-evidence.md and `docs/technical/observability/investigation-and-reconstruction.md also use terms such as “target proposal” / “proposed architecture.” Distinguish (1) selected future technical contract, not implemented and not permission for code; (2) unaccepted design options, which should live under `work/designs/open/; (3) current source and evidence tier. **No silent owner ratification**. If an owner decision is needed, record that precisely and mark this Change blocked for the relevant page rather than linking an unapproved recommendation as settled engineering policy.

Do not improve canonical reachability by silently excluding a previously canonical page from the denominator. Report before/after total pages, pages reclassified, and every full path that moved. If those two genuinely pending proposals move out of docs, the target may be 72/72 (or another inspected denominator), but their design must remain discoverable as **proposals** from the owner pages and open-design index. If selected, keep them canonical and reach 74/74. Both are valid outcomes when honestly classified.

## Deliverables

1. Make only the few context-justified links above, with human-meaningful question/link labels and reciprocal routes when they serve different readers. A canonical link into an open proposal must say *proposed*; historic evidence is never a binding design.
2. Preserve product/technical body content and all selected negative cases, do not add umbrella files or copy long essays. Keep `docs/README.md concise; first-hop question routes and subject map are sufficient.
3. Add a test in the existing WIKI01 fixture suite that fails when an accepted canonical leaf becomes unreachable. Add a test that a newly moved proposal is classified as open-design, is navigable as proposal, and cannot be counted as canonical authority.
4. Capture clean post-change output of `pnpm wiki:health, `pnpm wiki:graph, `python scripts/check_docs.py, `pnpm wiki:bench:static, plus diff-check and changed path inventory. Report root reachability (absolute and ratio), shortest-path distribution and actual new edges.
5. Do **not** edit WIKI02 scoring logic in this Change. Its current broken metric names and Hopper bias are tracked in WIKI05, so show the old baseline without claiming semantic retrieval improvement.

## Required gates

- Every retained canonical page reachable via directed **canonical links** from `docs/README.md, with no unjustified exceptions; orphan and weak component diagnostics rechecked. No broken maintained paths or anchors.
- The Chamber detailed protocol is navigable from its overview, and Admin console from the Admin topology/technical map. No arbitrary top-level link pile.
- Unaccepted capture/telemetry remains clearly proposed, with exact owner and technical status. Nothing “selected” or “implemented” without separately supported evidence/decision.
- Complete existing terminal `work/changes/archive/ untouched, no game runtime changes, provider calls or hidden trial runs.
- Metric comparison is only between actual recorded SHAs and preserves the unchanged WIKI01 parser and WIKI02 scorer. Never declare DOC04 or WIKI01 “failed implementation” because their tools correctly found wiki defects.

## Reconciliation ledger (complete on implementation)

| Responsible change | Actual result | Evidence | State |
| --- | --- | --- | --- |
| Runbooks, Admin and Lab wiki routes | before/after links and path audit | CLI+diff | Pending |
| OBS proposal authority review | explicit selection/deferral, no invented grants | owner headings | Pending |
| Graph integrity and classification fixtures | real tests, actual reachable count | test logs | Pending |
| Old benchmark re-run | honest observed scores, still v1 | JSON report | Pending |
