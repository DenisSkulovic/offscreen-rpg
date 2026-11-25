# CQ06 | Changed-code craftsmanship diagnostics

**Status: Done (2026-11-25).** Kind: repository tooling + governance. Integration target `main`. Change branch `change/cq06-code-craft-diagnostics`.

Baseline main `9c2c29513a94e1ff6d1ad6a24f9baf939cfc33a6`. Implemented from `ad8d1ed0f636e95cbf2f52dd25f57cf7590fd4c0`. Squash-joined to `main` at `daec7e8a2c936db4a9de023d2f555aef059221ea`. Profile STANDARD. Independent of cache Changes; owns `scripts/repo-tools/code-health*`, quality rule and its tests only.

## Outcome
Readable and navigable code without changing cache authority, public contracts, wire format, limits or runtime guarantees (CQ06 adds advisory diagnostics only). See [source map and wave](../../../../undertakings/storyteller-workshop/CACHE-CRAFT.md) and [TASKS](TASKS.md).

## planned-impact.v1
| Plane | Disposition |
|---|---|
| Product/authority | Unchanged |
| Source | Exclusive paths in TASKS |
| Public contracts | Unchanged |
| Proof | Source tests, positive and negative; live NOT RUN |
| Documentation | Local README/canonical quality rule as applicable |

## Acceptance
All selected focused tests pass; retain existing behavioral claims and cache failure safeguards. Review diff for readable phase ownership and no new hidden coupling. Stop on exact contract contradiction, not ordinary dependency order. No live or outcome credit from source tests. Record actual SHA, test commands/counts and negative proof at closure.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged because CQ06 only extends the read-only `repo:code-health` advisory report and craftsmanship rule text; no gameplay, persistence, cache runtime, or provider behavior | scripts/repo-tools/code-health*.mjs + .agents/rules/code-quality.md on change/cq06-code-craft-diagnostics | source-observed | no `--write` path; production roots unchanged; live NOT RUN | N/A |
| Structural-growth review / Tests, barrels, and production/test boundaries | .agents/rules/code-quality.md | changed: orchestration vs computation, behavior-named tests, barrels as navigation, production test-boundary review, parent hotspot receipt, and `--base` scoped changed/new diagnostics | .agents/rules/code-quality.md on this Change | source-observed | advisories remain review signals; strict-new severe exits unchanged | heading updated in place |
| Cache craftsmanship wave CQ06 row | work/undertakings/storyteller-workshop/CACHE-CRAFT.md | changed: CQ06 marked Done with archive link | CACHE-CRAFT.md on this Change | source-observed | CACHE09–11 remain open; no live/outcome credit | link repaired to archive |

## Evidence

- `node --test scripts/repo-tools/code-health.test.mjs`: **39 pass / 0 fail**, exit 0.
- `pnpm repo:code-health --base 9c2c29513a94e1ff6d1ad6a24f9baf939cfc33a6`: exit **0**; `strict 0`; sample showed `Changed paths in diff 0` / `changed/new diagnostics 0` / existing debt counted separately (CQ06 paths under `scripts/repo-tools/` are outside production scan roots).
- Prettier write + `eslint -c eslint.quality.config.mjs` on changed scripts: PASS after removing unused `baselineProductionPaths`.
- Provider spend: none. Live/cluster: NOT RUN (not required). Application typecheck: NOT RUN (no application source changed).

**Parent craft hotspots reviewed:** `scripts/repo-tools/code-health-core.mjs` ~1220 lines (outside production roots). Cohesive diagnostic scanner with named phases (path classification, function-like AST advisories, naming/boundary gates, strict-new). No extraction in this Change — intentional tool-core colocation; optional follow-up split (AST metrics vs baseline/strict vs boundary) only if humans find navigation costly. No threshold gaming.

**Negatives retained:** below-threshold fixtures emit no per-function advisory kinds; type-only `import type` from test helpers does not emit boundary findings; `diagnosticsScope` omitted without `--base`; legacy packet-style names and baseline boundary imports suppressed from new-debt gate; strict-new exit behavior unchanged.

Closeout paths: scripts/repo-tools/code-health.mjs, scripts/repo-tools/code-health-core.mjs, scripts/repo-tools/code-health.test.mjs, .agents/rules/code-quality.md, work/undertakings/storyteller-workshop/CACHE-CRAFT.md, work/changes/README.md, work/changes/open/README.md, work/changes/ledger/2026-11.md, work/changes/archive/2026-11/README.md.
