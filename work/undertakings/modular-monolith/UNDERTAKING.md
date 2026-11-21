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
| 3a | [MA05A](../../changes/archive/2026-11/other/2026-11-21--ma05a-neutral-storyteller-kinds/CHANGE.md) | Freeze both persisted kind constants in Contracts, keep compatibility | Done. Neutral `@offscreen/contracts/storyteller-kinds`; old Storyteller exports retained. Contracts kind test 1/1, application parity 1/1, ENG03 capture 9/9. Not on `main` |
| 3b | [MA05B](../../changes/archive/2026-11/other/2026-11-21--ma05b-sql-outbox-port/CHANGE.md) | Make SQL enqueue/transaction/notice DB-owned, maintain Application export | Done. `@offscreen/db/outbox` owns the primitive; Application re-exports the same function. Identity test 1/1. Disposable notice-topic SQL 7/7, including mismatch rollback. Not on `main` |
| 3c | [MA05C](../../changes/open/2026-11-21--ma05c-direct-db-outbox-imports/CHANGE.md) | Migrate 46 Application-domain source imports to the DB SQL primitive without behavior changes | READY WITH LIMITS: next Composer candidate, four file-disjoint replacement cohorts and one joined build/graph |\n| 3d | [MA05](../../changes/open/2026-11-21--ma05-authority-runtime-port-inversion/CHANGE.md) | Complete Story Authority ↔ Storyteller runtime transactional inversion | PLANNER-BLOCKED: tx-scoped start, admission, capture, follow-ups, scripted generation remain; ChatGPT supplies source-grounded successors |
| 4 | MA06 | Extract cohesive story-authority/Storyteller-runtime workspaces, migrate consumers, retire obsolete application exports | PLANNER-BLOCKED: reserved A–D staged design, not one Cursor Change; requires post-MA05 extracted ownership and source map |
| Separate decision | Document schema/adapter split | Possible further extraction if dependency/bundle evidence justifies | Not selected; no speculative package proliferation |

**Execution selection (2026-11-21 after MA05B):** MA02–MA04, MA05A and MA05B are Done. **MA05C is the next narrowly executable Change**; its 46 current-branch imports are mapped into two optional parallel waves, with one parent verification/merge. After MA05C, ChatGPT must recheck and finalize the next runtime/authority SQL seam; original MA05 and MA06 remain PLANNER-BLOCKED. No automatic successor dispatch and no paid Cursor architectural investigation. Recheck current target HEAD and competing Writer changes before each branch.

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
