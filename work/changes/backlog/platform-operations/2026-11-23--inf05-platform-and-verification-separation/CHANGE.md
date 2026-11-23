# INF05 | Shared platform services and verification tooling separation

**State:** PROPOSED BACKLOG, **NOT READY / NOT COMMISSIONED**. **Domain:** platform operations. **Planner:** ChatGPT. **Initial source snapshot:** `undertaking/storyteller-workshop@314f1ef1f29ebc57adf1110bf153f864b18892cf`; revalidate on promotion. **Architecture program:** [INF plan](../INFRA-RESTRUCTURE-PLAN.md).

## Outcome

Move reusable shared service provisioning to platform owners and operational smoke/fault/chaos/fixtures to verification, with safe disposition for unused examples.

## Existing source anchors (not yet complete caller map)

`infra/kubernetes/lab/{cnpg,temporal,object-storage,gateway,observability,redis,rabbitmq,chaos,fault,probes,skeletons,document-access,content-bootstrap}/ and app-release/turn03/`

## Decided migration direction

Classify installed resources vs probes vs fixture programs; preserve install script entrypoints and exact context selectors; relocate in service-sized batches; delete/supersede only after proving no caller and retaining distinctive evidence.

## Acceptance and hard stops

Preserve namespace/PVC/secret/resource ownership and identities, cross-store persistence, context safety, install order, Temporal schemas and SQL privileges; no uninstall/recreation/secret reissue; fail on stale command path.

Preserve explicit `kind-offscreen-dev`/`kind-offscreen-lab` fences, dev v2 registry, saved tenants and unchanged public CLI unless a separately approved migration decides otherwise. No paid providers, data/tenant deletion, credential copying or live cluster changes are authorized by this proposal. Do not restructure files for cosmetic uniformity. Record actual before/after behavior and negative refusal proof.

## Dependencies and promotion

**Prerequisite:** INF01 inventory and coordinated interfaces after INF02–04; no concurrent operator campaigns.

At promotion, ChatGPT must inspect actual integration HEAD, all imports and shell/Tilt/script callers, source ownership and active changes; write scoped SOURCE-MAP/EXECUTION/TASKS/PROOF as justified, with exact function anchors, small independently testable T-IDs and a stop-on-contradiction rule. Pass an independent packet-readiness check **before** Cursor dispatch. This backlog packet is not an implementation instruction.
