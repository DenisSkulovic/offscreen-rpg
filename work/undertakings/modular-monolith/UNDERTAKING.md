# Modular Monolith | domain ownership and package boundaries

**State:** Program dossier riding the active Storyteller Workshop integration branch. **Current planning baseline:** `undertaking/storyteller-workshop` at `fa8e4865` on 2026-11-21, subject to change. A separate `undertaking/modular-monolith` branch would be the cleaner long-term home. Owner decision 2026-11-21: MA01–MA06 integrate on `undertaking/storyteller-workshop`. Leave `main` alone. Do not create a nested undertaking branch.

## Goal and architecture

Make the modular-monolith boundaries visible and enforceable: packages and domain owners correspond to stable responsibilities, no production domain depends on developer/test harnesses, and per-workspace imports obey manifest/exports/port rules. New domains may be extracted only with evidence that transactions, authorization, historical source identity, money, idempotency and publication are unchanged. [Architecture Design](../../designs/open/code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md) owns current alternatives and decisions; [selected engine architecture](../../../docs/technical/engine/selected-architecture.md) owns the existing high-level modular-monolith target.

## Scope and dependency stages

| Stage | Change | Selected bounded outcome | Dependency / readiness |
| --- | --- | --- | --- |
| 0 | [MA01](../../changes/archive/2026-11/other/2026-11-21--ma01-workspace-import-graph/CHANGE.md) | Mechanically measure manifest, exports, actual source edges and intra-application cycles | Done. `pnpm repo:module-graph` on `undertaking/storyteller-workshop` |
| 1 | [MA02](../../changes/open/2026-11-21--ma02-cache-port-inversion/CHANGE.md) | Remove Cache → Application inverse dependency | Ready algorithm; independent of MA03 |
| 1 | [MA03](../../changes/open/2026-11-21--ma03-admin-package-extraction/CHANGE.md) | Move Admin domain code into cohesive workspace with temporary compatibility export | PLANNER-BLOCKED: exact file/export/consumer/test relocation map required after CQ02 |
| 2 | [MA04](../../changes/open/2026-11-21--ma04-chamber-domain-decoupling/CHANGE.md) | Remove ordinary Stories → developer Chamber fixture policy | PLANNER-BLOCKED: ChatGPT must publish complete API/GA/Chamber composition and authorization matrix |
| 3 | MA05 | Establish story-authority ↔ Storyteller-runtime typed injection boundary and preserve SQL/fence | **Not Cursor-Ready** until graph, WR completion and resolved interface map |
| 4 | MA06 | Extract cohesive story-authority/Storyteller-runtime workspaces, migrate consumers, retire obsolete application exports | **Not Cursor-Ready**; depends MA05, ratified source graph and root/fence proof |
| Separate decision | Document schema/adapter split | Possible further extraction if dependency/bundle evidence justifies | Not selected; no speculative package proliferation |

**Execution selection:** MA02 is the next narrow Composer trial after MA01. MA03 and MA04 must NOT be commissioned as PATCH until the ChatGPT planner has replaced their broad tasks with source-verified, fully decided routes. MA03 also touches the shared lockfile; if it later runs alongside other Changes, integration is serialized. MA04 serializes with story/campaign/WR-changing work. MA05/MA06 are deliberately staged, not vague paid Cursor investigations.

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
