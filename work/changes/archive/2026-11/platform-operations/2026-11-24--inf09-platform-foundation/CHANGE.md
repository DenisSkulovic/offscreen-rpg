# INF09 | Shared platform foundation

**State: Done**

**Status: Done. Kind: implementation. Profile: CONTRACT.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `0ab4ef946797fd967fbccc676674cf25b3dae1ef` (packet inspection `66ed7551` had moved; named profile symbols still present). Depends: INF08 (Done). Source-only. Live cluster NOT-RUN.

Touched paths: `.prettierignore`, `scripts/repo-tools/check-lab-manifests.mjs`, `scripts/repo-tools/check-lab-manifests.test.mjs`, `work/changes/README.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/undertakings/storyteller-workshop/UNDERTAKING.md`, `work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md`, `infra/platform/common/cli.mjs`, `infra/platform/common/commands.mjs`, `infra/platform/common/pins.mjs`, `infra/platform/common/profile.mjs`, `infra/platform/common/render.mjs`, `infra/platform/common/tests/commands.test.mjs`, `infra/platform/common/tests/pins.test.mjs`, `infra/platform/common/tests/render.test.mjs`, `infra/platform/common/tests/fixtures/tiny-chart/Chart.yaml`, `infra/platform/common/tests/fixtures/tiny-chart/profiles/development.yaml`, `infra/platform/common/tests/fixtures/tiny-chart/profiles/release.yaml`, `infra/platform/common/tests/fixtures/tiny-chart/templates/_helpers.tpl`, `infra/platform/common/tests/fixtures/tiny-chart/templates/manifests.yaml`, `infra/platform/common/tests/fixtures/tiny-chart/values.schema.json`, `infra/platform/common/tests/fixtures/tiny-chart/values.yaml`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Shared platform profile and observation | work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md | unchanged: product behavior stays the same while common profile and command modules land | infra/platform/common/profile.mjs | source-observed | unknown profile, wrong context, port, owner, unreadable kubectl, and zero mutations | N/A |
| Pins and local Helm render | work/undertakings/storyteller-workshop/PLATFORM-PARALLEL.md | changed: pins, render, and CLI exist and service charts are not migrated here | infra/platform/common/render.mjs | source-observed | bad pins, Secret, foreign namespace, timeout, and unsupported profile | N/A |
| Lab manifest validation | scripts/repo-tools/check-lab-manifests.mjs | changed: raw YAML skips chart templates and only implemented charts are rendered | scripts/repo-tools/check-lab-manifests.mjs | source-observed | invalid YAML still fails and future charts are not required | N/A |
| Product and technical behavior | docs/technical/platform/deployment-and-compatibility.md | unchanged: this Change adds source primitives and INF15 owns environment assembly claims | no source behavior changed | source-observed | live cluster apply remains outside this Change | N/A |

Exclusive owner: infra/platform/common; manifest checker/CI. Outcome: Profile and observation; Pins and local render; Validation integration. Preserve runtime identities and existing data. [Batch contract](../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact task proofs pass; parent reconciles and integrates/archives, no live proof or queue change; no successor auto-start.
