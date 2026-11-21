# Modular Monolith | domain ownership and package boundaries

**State:** Program dossier riding the active Storyteller Workshop integration branch. **Planning evidence baseline:** inspected source at `dac6b698` with critical remote anchors rechecked at `0a52a9a3` on 2026-11-21; live integration HEAD advances with documentation changes. Recheck named symbols after each implemented predecessor, not just the SHA. A separate `undertaking/modular-monolith` branch would be the cleaner long-term home. Owner decision 2026-11-21: MA01–MA06 integrate on `undertaking/storyteller-workshop`. Leave `main` alone. Do not create a nested undertaking branch.

## Goal and architecture

Make the modular-monolith boundaries visible and enforceable: packages and domain owners correspond to stable responsibilities, no production domain depends on developer/test harnesses, and per-workspace imports obey manifest/exports/port rules. New domains may be extracted only with evidence that transactions, authorization, historical source identity, money, idempotency and publication are unchanged. [Architecture Design](../../designs/open/code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md) owns current alternatives and decisions; [selected engine architecture](../../../docs/technical/engine/selected-architecture.md) owns the existing high-level modular-monolith target.

## Scope and dependency stages

| Stage | Change | Selected bounded outcome | Dependency / readiness |
| --- | --- | --- | --- |
| 0 | [MA01](../../changes/archive/2026-11/other/2026-11-21--ma01-workspace-import-graph/CHANGE.md) | Mechanically measure manifest, exports, actual source edges and intra-application cycles | Done. `pnpm repo:module-graph` on `undertaking/storyteller-workshop` |
| 1 | [MA02](../../changes/archive/2026-11/other/2026-11-21--ma02-cache-port-inversion/CHANGE.md) | Remove Cache → Application inverse dependency | Done. `@offscreen/cache` depends on `@offscreen/contracts/read-cache` |
| 1 | [MA03](../../changes/archive/2026-11/other/2026-11-21--ma03-admin-package-extraction/CHANGE.md) | Move Admin domain code into cohesive workspace with temporary compatibility export | Done. `@offscreen/admin` owns the staff modules |
| 2 | [MA04](../../changes/archive/2026-11/other/2026-11-21--ma04-chamber-domain-decoupling/CHANGE.md) | Remove ordinary Stories → developer Chamber fixture policy | Done. Optional fixture predicate, default deny; story HTTP 4/4 and core 10/10 on `offscreen_auth_test` |
| 3 | MA05 | Establish story-authority ↔ Storyteller-runtime typed injection boundary and preserve SQL/fence | PLANNER-BLOCKED: complete tx-scoped port typing for 11 authority→runtime imports and generation/outbox ownership still needed |
| 4 | MA06 | Extract cohesive story-authority/Storyteller-runtime workspaces, migrate consumers, retire obsolete application exports | PLANNER-BLOCKED: reserved A–D staged design, not one Cursor Change; requires post-MA05 extracted ownership and source map |
| Separate decision | Document schema/adapter split | Possible further extraction if dependency/bundle evidence justifies | Not selected; no speculative package proliferation |

**Execution selection:** MA02, MA03, and MA04 are Done on `undertaking/storyteller-workshop`. MA05/MA06 remain PLANNER-BLOCKED and are not automatically commissioned; their staged design is ChatGPT's responsibility, never a vague paid Cursor investigation.

## Admission / branch policy

1. Re-run source maps against the current `undertaking/storyteller-workshop` HEAD and ratify the high-level module architecture in technical docs **before commissioning broad extracts** (MA05/MA06).
2. Each commissioned MA Change creates a temporary `change/maXX-<slug>` branch in its own linked worktree from `undertaking/storyteller-workshop`. Leave the primary checkout on its current branch. An individual MA Change lands on Storyteller Workshop, and stays off `main`.
3. Each Change parent executes all tasks and tests, reconciles and integrates into `undertaking/storyteller-workshop` without a ceremonial independent approval checkpoint. An actual failing security/data/fence test or unsafe Git collision remains a real blocker. An integration custodian serializes shared manifests, lockfile, exports, docs and joins. Preserve in-flight Writer work.
4. Package movement follows **strangler compatibility**: add new package/build/exports → switch consumers → keep *one* short-lived compatibility re-export where required → verify all consumers/negative cases → remove compat in a later bounded step. No mass path churn without compile/test budget and proof.
5. The complete program lands back to its recorded upstream after acceptance and documentation reconciliation. Active dossier/temporary branches retire under the existing Undertaking lifecycle; no permanent extra roadmap file.

## Acceptance

- Accurate, tested manifest + source dependency graph with no production cross-layer edges that contradict the ratified target; errors for future prohibited edges.
- `@offscreen/application` no longer acts as the unbounded home for independent Admin, developer fixtures, Storyteller runtime and story authority once the selected split is complete. Remaining composition/compatibility must be explicitly bounded, with a retirement check.
- Normal and negative story authorization, root/revision/fork, publication/replay, finance/provider spend and Admin grants unchanged; source/tests compare original and moved exports.
- TypeScript/NodeNext exports, pnpm lockfile, Turbo build DAG, tests and documentation evidence all trace to current source.
- No new production services, database migration or automatic provider calls caused by the package restructure.
