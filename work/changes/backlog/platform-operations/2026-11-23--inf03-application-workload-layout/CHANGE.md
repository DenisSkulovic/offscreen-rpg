# INF03 | Workload definitions and environment overlay ownership

**State:** PROPOSED BACKLOG, **NOT READY / NOT COMMISSIONED**. **Domain:** platform operations. **Planner:** ChatGPT. **Initial source snapshot:** `undertaking/storyteller-workshop@314f1ef1f29ebc57adf1110bf153f864b18892cf`; revalidate on promotion. **Architecture program:** [INF plan](../INFRA-RESTRUCTURE-PLAN.md).

## Outcome

Map and consolidate active app workload rendering with explicit dev and release profile contracts, avoiding two competing authoritative workload definitions.

## Existing source anchors (not yet complete caller map)

`infra/kubernetes/lab/app-release/overlay/; infra/kubernetes/lab/dev/{web,api,authority,workers}.yaml; infra/kubernetes/lab/dev/backing/dev-slot-app-graph.mjs; scripts and Tilt consumers`

## Decided migration direction

Determine active/legacy generators by caller reachability; extract stable workload definitions only where manifest-equivalent; define profiles for dev watchers versus release processes; optionally Kustomize static overlays; keep dynamic dev-N renderer.

## Acceptance and hard stops

Diff normalized rendered resources including exact names, selectors, commands, env, auth Secret refs, labels, resources, security contexts, migration ordering and image policies; no live apply without authorization.

Preserve explicit `kind-offscreen-dev`/`kind-offscreen-lab` fences, dev v2 registry, saved tenants and unchanged public CLI unless a separately approved migration decides otherwise. No paid providers, data/tenant deletion, credential copying or live cluster changes are authorized by this proposal. Do not restructure files for cosmetic uniformity. Record actual before/after behavior and negative refusal proof.

## Dependencies and promotion

**Prerequisite:** INF01 and source-path freeze; serialize with INF02 renderer changes.

At promotion, ChatGPT must inspect actual integration HEAD, all imports and shell/Tilt/script callers, source ownership and active changes; write scoped SOURCE-MAP/EXECUTION/TASKS/PROOF as justified, with exact function anchors, small independently testable T-IDs and a stop-on-contradiction rule. Pass an independent packet-readiness check **before** Cursor dispatch. This backlog packet is not an implementation instruction.
