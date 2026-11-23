# INF02 | One-way dev environment manager boundary

**State:** PROPOSED BACKLOG, **NOT READY / NOT COMMISSIONED**. **Domain:** platform operations. **Planner:** ChatGPT. **Initial source snapshot:** `undertaking/storyteller-workshop@314f1ef1f29ebc57adf1110bf153f864b18892cf`; revalidate on promotion. **Architecture program:** [INF plan](../INFRA-RESTRUCTURE-PLAN.md).

## Outcome

Extract CLI, lifecycle, pure identity contracts and infrastructure adapters into a single clear owner with stable root commands and no circular source dependencies.

## Existing source anchors (not yet complete caller map)

`scripts/repo-tools/dev-{tilt,slot-startup,environment-session,worktree-allocator,worktree-registry,process-identity,slot-image-plan}.mjs; infra/kubernetes/lab/dev/backing/{dev-slot-project,dev-slot-app-graph,dev-sql-tenant-contract,dev-s3-tenant,dev-temporal-tenant}.mjs`

## Decided migration direction

Move in stages: extract pure environment identity/contracts first; make CLI a thin adapter; put side effects behind explicit injected adapters; make renderers depend only on pure contracts; maintain transitional wrappers, relative path and shell import tests.

## Acceptance and hard stops

Do not alter registry v2 schema/migration, env IDs, sessions, credentials, SQL grants, resource ownership, stop fencing or runtime freshness; prove no CLI↔provisioning import cycle and no cross-slot mutations.

Preserve explicit `kind-offscreen-dev`/`kind-offscreen-lab` fences, dev v2 registry, saved tenants and unchanged public CLI unless a separately approved migration decides otherwise. No paid providers, data/tenant deletion, credential copying or live cluster changes are authorized by this proposal. Do not restructure files for cosmetic uniformity. Record actual before/after behavior and negative refusal proof.

## Dependencies and promotion

**Prerequisite:** INF01 approved map; live DXK09 gate passed; no active writes on dev scripts.

At promotion, ChatGPT must inspect actual integration HEAD, all imports and shell/Tilt/script callers, source ownership and active changes; write scoped SOURCE-MAP/EXECUTION/TASKS/PROOF as justified, with exact function anchors, small independently testable T-IDs and a stop-on-contradiction rule. Pass an independent packet-readiness check **before** Cursor dispatch. This backlog packet is not an implementation instruction.
