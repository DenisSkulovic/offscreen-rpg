# INF15 | Environment assembly

**State: Done**

**Status: Done. Kind: implementation. Profile: CONTRACT.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `51f3ae729da2e6cc708354a3433138f3cd67227d` (packet inspection `66ed7551` had moved; INF10–INF14 receipts present). Depends: INF10–INF14 (Done). Source-only. Live cluster NOT-RUN.

Touched paths: `infra/environments/platform-plan.mjs`, `infra/environments/dev/platform.mjs`, `infra/environments/release/platform.mjs`, `scripts/repo-tools/stack-lifecycle.mjs`, `scripts/repo-tools/stack.mjs`, `tools/dev-environments/src/application/dev-slot-startup.mjs`, `tools/dev-environments/src/application/dev-shared-core-readiness.mjs`, `scripts/repo-tools/infra-layout.test.mjs`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/runbooks/dev-worktree-stacks.md`, `infra/README.md`.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Environment assembly | docs/technical/platform/deployment-and-compatibility.md | changed: dev and release plans call existing installers in a fixed order with preflight gates | infra/environments/platform-plan.mjs | source-observed | wrong context confirmation yields no phases; second failure skips remaining steps | N/A |
| Stack and slot startup | docs/runbooks/dev-worktree-stacks.md | changed: cold up is cluster then release ensure then app install; warm refuses an unreadable migration Job; slots verify shared cores before tenant SQL | scripts/repo-tools/stack.mjs | source-observed | warm read error and shared-core failure perform no install or tenant mutation; down/reset do not mutate backing services | N/A |
| Move-map successors | scripts/repo-tools/infra-layout.test.mjs | changed: active destinations name the landed chart templates; historical INF-MOVE-MAP stays untouched | scripts/repo-tools/infra-layout.test.mjs | source-observed | INF07 and INF08 guards remain | N/A |
| Product behavior | docs/product | unchanged because no player-facing behavior was selected | no source behavior changed | source-observed | live apply remains outside this Change | N/A |

Exclusive owner: infra/environments platform entrypoints; stack plan/runner; dev slot startup; aggregate guards. Outcome: Explicit environment plans; Stack and slot startup; Final guard and docs join. Preserve runtime identities and existing data. [Batch contract](../../../../../undertakings/storyteller-workshop/PLATFORM-PARALLEL.md) · [Execution](EXECUTION.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

Acceptance: exact task proofs pass; parent reconciles and integrates/archives, no live proof or queue change; no successor auto-start.
