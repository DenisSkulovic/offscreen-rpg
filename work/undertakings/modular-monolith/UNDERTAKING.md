# Modular Monolith | domain ownership and package boundaries

**State:** Proposed, **not yet an active integration branch**. This Undertaking is separate from Storyteller Workshop and must not consume its source/integration checkout. **Current planning baseline:** `undertaking/storyteller-workshop` at `fa8e4865` on 2026-11-21, subject to change. **Proposed integration branch:** `undertaking/modular-monolith`, to be created from **updated `main` after Storyteller Workshop lands** (or another explicit owner-approved base). Do not create a nested Undertaking branch or execute MA Changes on `main` merely because the branch is not ready.

## Goal and architecture

Make the modular-monolith boundaries visible and enforceable: packages and domain owners correspond to stable responsibilities, no production domain depends on developer/test harnesses, and per-workspace imports obey manifest/exports/port rules. New domains may be extracted only with evidence that transactions, authorization, historical source identity, money, idempotency and publication are unchanged. [Architecture Design](../../designs/open/code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md) owns current alternatives and decisions; [selected engine architecture](../../../docs/technical/engine/selected-architecture.md) owns the existing high-level modular-monolith target.

## Scope and dependency stages

| Stage | Change | Selected bounded outcome | Dependency / readiness |
| --- | --- | --- | --- |
| 0 | [MA01](../../changes/open/2026-11-21--ma01-workspace-import-graph/CHANGE.md) | Mechanically measure manifest, exports, actual source edges and intra-application cycles | Ready algorithm; **commission only after target branch created** |
| 1 | [MA02](../../changes/open/2026-11-21--ma02-cache-port-inversion/CHANGE.md) | Remove Cache → Application inverse dependency | Ready algorithm; independent of MA03 |
| 1 | [MA03](../../changes/open/2026-11-21--ma03-admin-package-extraction/CHANGE.md) | Move Admin domain code into cohesive workspace with temporary compatibility export | After CQ02; ready algorithm after target refresh |
| 2 | [MA04](../../changes/open/2026-11-21--ma04-chamber-domain-decoupling/CHANGE.md) | Remove ordinary Stories → developer Chamber fixture policy | After MA01; exact caller/projection tests |
| 3 | MA05 | Establish story-authority ↔ Storyteller-runtime typed injection boundary and preserve SQL/fence | **Not Cursor-Ready** until graph, WR completion and resolved interface map |
| 4 | MA06 | Extract cohesive story-authority/Storyteller-runtime workspaces, migrate consumers, retire obsolete application exports | **Not Cursor-Ready**; depends MA05, ratified source graph and root/fence proof |
| Separate decision | Document schema/adapter split | Possible further extraction if dependency/bundle evidence justifies | Not selected; no speculative package proliferation |

**Parallel preference:** MA02 and MA03 write disjoint source owners and may run concurrently on separate linked worktrees after MA01 supplies graph/proof and after the actual base is stable; MA04 should serialize with story/campaign/WR-changing work. MA05/MA06 are deliberately staged, not vague paid Cursor investigations.

## Admission / branch policy

1. Complete/land Storyteller Workshop or explicitly approve a safe alternative target. The new Undertaking's branch must have the required WR source version and stable imports. Re-run ChatGPT source maps against its actual HEAD and ratify the high-level module architecture in technical docs **before commissioning broad extracts**.
2. Activate `undertaking/modular-monolith` once. Each commissioned MA Change creates a temporary `change/maXX-<slug>` branch in its own linked worktree. No checkout switching of user's primary repo; no merging an individual MA Change into main or Storyteller Workshop.
3. Each Change parent executes all tasks and tests, reconciles and integrates into the undertaking without a ceremonial independent approval checkpoint. An actual failing security/data/fence test or unsafe Git collision remains a real blocker. An integration custodian serializes shared manifests, lockfile, exports, docs and joins.
4. Package movement follows **strangler compatibility**: add new package/build/exports → switch consumers → keep *one* short-lived compatibility re-export where required → verify all consumers/negative cases → remove compat in a later bounded step. No mass path churn without compile/test budget and proof.
5. The complete program lands back to its recorded upstream after acceptance and documentation reconciliation. Active dossier/temporary branches retire under the existing Undertaking lifecycle; no permanent extra roadmap file.

## Acceptance

- Accurate, tested manifest + source dependency graph with no production cross-layer edges that contradict the ratified target; errors for future prohibited edges.
- `@offscreen/application` no longer acts as the unbounded home for independent Admin, developer fixtures, Storyteller runtime and story authority once the selected split is complete. Remaining composition/compatibility must be explicitly bounded, with a retirement check.
- Normal and negative story authorization, root/revision/fork, publication/replay, finance/provider spend and Admin grants unchanged; source/tests compare original and moved exports.
- TypeScript/NodeNext exports, pnpm lockfile, Turbo build DAG, tests and documentation evidence all trace to current source.
- No new production services, database migration or automatic provider calls caused by the package restructure.
