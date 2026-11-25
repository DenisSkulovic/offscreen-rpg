# INF56 | Human-readable platform CLI

**State: Done (source implementation; human acceptance NOT-RUN).** Closed 2026-11-25 on Change branch `change/inf56-platform-cli-presentation`; squash-joined main after INF55 at base `e538337798ba688afc47526b24905ebbe06a5c69`. Kind: implementation. Profile: PATCH. Planning baseline `a652df1ac53daec1eecbe02878c41c2708baf5b9`. [Operator experience standard](../../../../../../docs/technical/platform/infrastructure-operator-experience.md) · [Tasks](TASKS.md) · [PROOF](PROOF.md).

Outcome: human presentation and useful help for existing `infra:plan` / `infra:up` / `infra:status`, with explicit `--human` and `--json`. Default JSON unchanged (compatibility-first). Pure formatter, static help, human-only `up` phase progress on stderr. No root manifest edits or topology CLI edits. Independent of INF55; shared catalog/runbook joins serialized against concurrent INF55 landing. No live resources.

## Authority and baseline

- Technical: [infrastructure-operator-experience.md](../../../../../../docs/technical/platform/infrastructure-operator-experience.md)
- Technical: [local-developer-platform.md](../../../../../../docs/technical/platform/local-developer-platform.md) developer commands
- Runbook: [local-development-platform.md](../../../../../../docs/runbooks/local-development-platform.md)
- Baseline main at join: `e538337798ba688afc47526b24905ebbe06a5c69` (INF55 already on main)

Touched implementation paths: `infra/environments/infra-presentation.mjs`, `infra/environments/infra-presentation.test.mjs`, `infra/environments/infra-progress.mjs`, `infra/environments/infra-cli.mjs`, `infra/environments/infra-cli.test.mjs`, `infra/environments/infra-cli-operation.test.mjs`, `infra/environments/platform-plan.mjs`.

Touched documentation/status paths: `docs/runbooks/local-development-platform.md`, `docs/technical/platform/infrastructure-operator-experience.md`, `docs/technical/platform/local-developer-platform.md`, `STATUS.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/infrastructure-operator-experience.md migration map row 2 (platform CLI) | technical | changed: record INF56 source Done for plan/up/status human/help/progress; default JSON retained; topology presentation still deferred | infra/environments/infra-cli.mjs; infra/environments/infra-presentation.mjs; infra/environments/infra-progress.mjs; infra/environments/platform-plan.mjs; docs/technical/platform/infrastructure-operator-experience.md; inspected on change branch from base `1ee7a651cf08b257ed7006429b03dcd4ba8d4656` | source-tested: PROOF 61/61 PASS; human acceptance NOT-RUN | `--no-color` without `--human` refuses; conflicting format flags refuse; malicious detail omitted; no phase START after FAIL | work/changes/README.md operator-experience section; STATUS.md checkpoint |
| docs/runbooks/local-development-platform.md platform plan/up/status commands | runbook | changed: document `--human`/`--json`/`--help`/`--no-color` modes, stderr progress for up, compatibility and redaction limits | docs/runbooks/local-development-platform.md; same source anchors | source-tested via PROOF fixtures; live NOT-RUN | no live readiness claim; topology CLI out of scope | N/A beyond runbook itself |
| docs/technical/platform/local-developer-platform.md developer commands | technical | changed: note default JSON retained and explicit `--human` for plan/up/status | docs/technical/platform/local-developer-platform.md | reviewed + INF56 source PASS | default machine contract not switched | N/A |
| Product player/story/auth contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits; inspected diff vs base `1ee7a651cf08b257ed7006429b03dcd4ba8d4656` | reviewed | no product promise rewritten for CLI presentation | map update not required because product docs untouched |
| Topology CLI presentation | technical | unchanged because INF56 excludes topology-cli; INF54 source already joined | no topology-cli edits | reviewed | topology human presentation remains future work | operator-experience migration map row 2 note |
| INF55 readable manifests | packet | unchanged because independent implementation; shared runbook/catalog rows merged with INF55 Done archive claims | no INF55 source/path edits in INF56 diff | reviewed | INF55 retains manifest `--format` surface | catalog lists both INF55 and INF56 as source Done |
