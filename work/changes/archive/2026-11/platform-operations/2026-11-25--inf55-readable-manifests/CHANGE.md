# INF55 | Readable manifest inspection

**State: Done (source implementation; human acceptance NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf55-readable-manifests` from main `2dffa84dc966d0c07e3c6782a6c08e85f9587612`. Joined main at `6f01d92331a3f0c0eefa9f7f0fcf719dc6f6abc6` (packet planning SHA `a652df1ac53daec1eecbe02878c41c2708baf5b9` is an ancestor). Kind: implementation. Profile: PATCH. [Operator experience standard](../../../../../../docs/technical/platform/infrastructure-operator-experience.md) · [Tasks](TASKS.md).

Outcome: shared `formatManifestDocuments` with yaml/json/legacy; platform and workload render CLIs accept `--format` (default legacy on direct invocation) and `--help` without Helm; root aliases `pnpm infra:render` / `pnpm infra:render:workloads` default YAML. Internal Helm JSON-line parse and installer serialization unchanged. No live resources, paid providers, or cluster mutation. Human acceptance remains separate NOT-RUN.

## Authority and baseline

- Technical: [infrastructure-operator-experience.md](../../../../../../docs/technical/platform/infrastructure-operator-experience.md) (Command contract; Migration map row 1)
- Runbook: [local-development-platform.md](../../../../../../docs/runbooks/local-development-platform.md)
- Baseline main at commission: `2dffa84dc966d0c07e3c6782a6c08e85f9587612`

Touched implementation paths: `infra/platform/common/manifest-output.mjs`, `infra/platform/common/cli.mjs`, `infra/workloads/render.mjs`, `infra/platform/common/tests/manifest-output.test.mjs`, `infra/platform/common/tests/render.test.mjs`, `infra/workloads/tests/render.test.mjs`, `package.json`, `pnpm-lock.yaml` (`yaml@2.8.2`).

Touched docs/status paths: `docs/runbooks/local-development-platform.md`, `docs/technical/platform/infrastructure-operator-experience.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/infrastructure-operator-experience.md Command contract (render YAML/JSON/legacy) | technical | unchanged: ratified presentation contract already selected; INF55 implements it | `infra/platform/common/manifest-output.mjs`; `infra/platform/common/cli.mjs`; `infra/workloads/render.mjs`; inspected on change branch from `2dffa84dc966d0c07e3c6782a6c08e85f9587612` | source-tested: closure 62/62 PASS; semantic yaml/json≡legacy for postgres release/dev and workloads services | unknown/duplicate flags; help with empty PATH (no Helm); unknown format rejects | Migration map row 1 marked INF55 source Done |
| docs/technical/platform/infrastructure-operator-experience.md Migration map row 1 | technical | changed: record INF55 source Done and friendly aliases; human acceptance still NOT-RUN | `docs/technical/platform/infrastructure-operator-experience.md`; same inspected SHA | source-inspected + source-tested | no claim of live/human walkthrough | catalog operator-experience section |
| docs/runbooks/local-development-platform.md manifest inspect commands | runbook | changed: document `pnpm infra:render` / `pnpm infra:render:workloads` and direct `--format` CLIs | `docs/runbooks/local-development-platform.md`; `package.json` scripts; same SHA | source-tested aliases exit 0; samples parsed | bare `pnpm … --` separator rejected by CLI (pass args without that separator) | `work/changes/README.md` |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits; inspected diff vs base `2dffa84dc966d0c07e3c6782a6c08e85f9587612` | reviewed | no product promise rewritten for manifest presentation | map update not required because product docs untouched |
| Internal Helm JSON-line parse / installer serialization | technical | unchanged because presentation-only; `renderPlatformYaml`/`renderWorkloadYaml` retained for callers | `infra/workloads/render.mjs` exporters retained; `formatManifestDocuments` is additive; same SHA | source-tested legacy bytes match prior compact JSON | invalid format does not alter internal protocol | map update not required for internal parsers |
| INF56 platform CLI presentation | packet | unchanged because INF56 owns plan/up/status help; INF55 did not edit infra-cli | no `infra/environments/infra-cli.mjs` edits | reviewed | INF56 remains independent Open packet | catalog serialize note retained for INF56 |
