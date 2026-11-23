# INF01 | Infrastructure ownership and operational entrypoint atlas

**State:** PROPOSED BACKLOG, **NOT READY / NOT COMMISSIONED**. **Domain:** platform operations. **Planner:** ChatGPT. **Initial source snapshot:** `undertaking/storyteller-workshop@314f1ef1f29ebc57adf1110bf153f864b18892cf`; revalidate on promotion. **Architecture program:** [INF plan](../INFRA-RESTRUCTURE-PLAN.md).

## Outcome

Document owners and life cycles; classify every executable infra entrypoint and installed/fixture path; ratify minimum directory map without moving runtime code.

## Existing source anchors (not yet complete caller map)

`infra/kubernetes/lab/{kind.yaml,dev/kind.yaml,app-release/,dev/,cnpg/,temporal/,object-storage/,chaos/,fault/,probes/,skeletons/}; package.json scripts; scripts/repo-tools/dev-*.mjs`

## Decided migration direction

Entry-point/caller matrix including shell, Tilt, TypeScript, tests and docs; current vs target ownership; classify live/legacy/example; identify generated outputs and actual operator path; reconcile infra navigation and runtime docs without asserting unproven liveness.

## Acceptance and hard stops

No source move, workload apply, tenant change or silent retirement; read-only path and caller inventory with positive/negative coverage of known dev/release cluster and root CLI paths.

Preserve explicit `kind-offscreen-dev`/`kind-offscreen-lab` fences, dev v2 registry, saved tenants and unchanged public CLI unless a separately approved migration decides otherwise. No paid providers, data/tenant deletion, credential copying or live cluster changes are authorized by this proposal. Do not restructure files for cosmetic uniformity. Record actual before/after behavior and negative refusal proof.

## Dependencies and promotion

**Prerequisite:** After DXK09 acceptance and HR scheduling; may undertake read-only source mapping earlier.

At promotion, ChatGPT must inspect actual integration HEAD, all imports and shell/Tilt/script callers, source ownership and active changes; write scoped SOURCE-MAP/EXECUTION/TASKS/PROOF as justified, with exact function anchors, small independently testable T-IDs and a stop-on-contradiction rule. Pass an independent packet-readiness check **before** Cursor dispatch. This backlog packet is not an implementation instruction.
