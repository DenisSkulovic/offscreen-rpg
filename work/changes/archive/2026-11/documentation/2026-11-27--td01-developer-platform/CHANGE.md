# TD01 | Developer platform and verification reading routes

**State:** Done — source joined to `implementation/technical-documentation-renewal`; joint semantic acceptance pending (PD07/TD10 and Design).

**Kind:** documentation (DOC). **Approval:** E1 design owner-accepted 2026-11-27; implementation release recorded in group. **Target:** `implementation/technical-documentation-renewal`. **Source baseline:** `c7058958ec3f43fd37ec680d05757561d628926b` (main); original snapshot `94808654fdf93e3102469ed3f5d5b2d476ff6f8d`, intervening docs only. [Accepted Design](../../../../../designs/open/technical-documentation-renewal/README.md) · [Group](../../../../open/technical-documentation-renewal/README.md).

**Release:** [group readiness and dispatch](../../../../open/technical-documentation-renewal/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

4 bounded editorial tasks. Parent reads this front door, [TASKS](TASKS.md), named source route and [PROOF](PROOF.md); child receives one task card and listed exact anchors. No runtime tests/live operations. No claim of time or token savings. Dependencies: No internal predecessor. Before dispatch verify five exact files against actual active AC/OBS/native write sets; file collision gates only the affected task. No live/resource operations.

## Target alignment and outcome

Actual local infrastructure commands and selected future lifecycle are distinct; historical proof remains scoped. The accepted E1 chooses substantial restructuring of existing owners over adding disclaimers or replacing the wiki. Existing correct paragraphs may survive; no new product or runtime decisions. [SOURCE-MAP](SOURCE-MAP.md) contains inspected claims and concrete contradictions. Actual changes confined to named pages; no new files or moved headings planned.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local platform presentation/verification does not change player or staff product promises | product first playable target remains separate | task semantic negatives |
| Technical | changed: `docs/technical/platform/local-developer-platform.md`, `docs/technical/platform/developer-environments.md`, `docs/technical/platform/infrastructure-operator-experience.md`, `docs/technical/platform/workstation-observability.md`, `docs/technical/platform/verification-programmes.md` | local operator runbooks, source commands, active native owners | source and claim map |
| Code | unchanged because documentation-only; no executable modifications authorized | no scripts, source, config, fixtures or tests changed | inspected diff; semantic negative in PROOF |
| Related | unchanged for shared indexes and STATUS because group integration owner reconciles; preserve exact affected heading paths, report stale dependent routes to integration owner | [SOURCE-MAP](SOURCE-MAP.md) and existing typed dependency headings | no link regression or lost claim |

## Scope and proof

May write only `docs/technical/platform/local-developer-platform.md`, `docs/technical/platform/developer-environments.md`, `docs/technical/platform/infrastructure-operator-experience.md`, `docs/technical/platform/workstation-observability.md`, `docs/technical/platform/verification-programmes.md` and own packet closure records. No sibling, shared index, native contract, active packet or runtime writes. Preserve all existing accepted conditions, refusal rules and scoped evidence; no policy, entitlement, source or new proof credit. [PROOF](PROOF.md) owns assigned semantic gate. A target profile is shown as runnable, a narrow source proof becomes release proof, a read-only operator action gains mutation rights, or missing data becomes zero.

## Handoff and closure

When separately Ready and commissioned, use one linked worktree from verified `implementation/technical-documentation-renewal` and `change/td01-developer-platform`; run `node scripts/repo-tools/change-branch-guard.mjs --change TD01 --target implementation/technical-documentation-renewal --design technical-documentation-renewal` before edits. Recheck actual HEAD and active ownership; do not override unrelated work. Execute tasks in order, compare exact changed claims and all retained negatives; run assigned docs checks at join. Stop on changed authority, unpreserved unique fact, active file overlap, or failed gate. No automatic successor. Archive own leaf on design branch after assigned gate and reconciliation; target-locked join, verify archive present and open absent, then report exact SHA. Joint semantic acceptance remains with TD10; no constituent main merge.

## Reconciliation ledger (complete before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/technical/platform/local-developer-platform.md` (task headings) | technical | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (semantic, see closure receipt) | assigned in PROOF | preserve routes; reconcile at closure |
| `docs/technical/platform/developer-environments.md` (task headings) | technical | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (semantic, see closure receipt) | assigned in PROOF | preserve routes; reconcile at closure |
| `docs/technical/platform/infrastructure-operator-experience.md` (task headings) | technical | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (semantic, see closure receipt) | assigned in PROOF | preserve routes; reconcile at closure |
| `docs/technical/platform/workstation-observability.md` (task headings) | technical | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (semantic, see closure receipt) | assigned in PROOF | preserve routes; reconcile at closure |
| `docs/technical/platform/verification-programmes.md` (task headings) | technical | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (semantic, see closure receipt) | assigned in PROOF | preserve routes; reconcile at closure |
| Known typed dependents (SOURCE-MAP) | related | unchanged selected authority; confirm each actual dependency | no source behavior changed | NOT RUN | semantic comparison | record actual affected route at closure |

## Closure receipt

Page commit `c7c6b339dbdd6a23c04c78d561646d9072cb2a55`. Changed: the five owned pages under `docs/technical/platform/` (local-developer-platform, developer-environments, infrastructure-operator-experience, workstation-observability, verification-programmes). No heading removed or renamed; local-developer-platform gained two subheadings under `Developer commands (target, not present yet)`; infrastructure-operator-experience Migration map heading retitled (dated status).

Checks: `git diff --check` clean; `check_docs.py` 96 problems, identical to baseline (the pre-existing INF29 link in verification-programmes only moved from line 17 to 19); `docs-health.mjs` identical to baseline apart from timing. Link health is not semantic proof. No runtime, cluster or live check run (NOT RUN).

Semantic answers (from rewritten text):
- Target profile not runnable: local-developer-platform `Developer commands` > `Target-only subcapabilities` states `parseDevCliArgs` refuses `--profile`, `install.sh` refuses arguments, `smoke|full` are in `NOT_IMPLEMENTED_SUITES`.
- Narrow source proof not release proof: verification-programmes `One entrypoint and one execution model` evidence table lists each live gate NOT-RUN; developer-environments `Capacity admission` separates dated DXK09 observations from invariants.
- Read-only action gains no mutation: infrastructure-operator-experience `Command contract` and `Plan`; developer-environments `Capacity admission` (stop is not disposal) and `Readiness and evidence ladder`.
- Missing is not zero: workstation-observability opening `Not live-observed` paragraph and `Clock, schema and measurement semantics (v1)`.
- Green Pod / debugMode: developer-environments `Readiness and evidence ladder` and `Temporal watcher compatibility is separate`.

Deferred findings: Low, pre-existing broken INF29 link in verification-programmes (destination: group register / TD10 router repair). Low, runbook "dev:release" not present; noted in page (destination: page text).
