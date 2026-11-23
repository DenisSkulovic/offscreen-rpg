# INF04 | Image build and live-update ownership cleanup

**State:** PROPOSED BACKLOG, **NOT READY / NOT COMMISSIONED**. **Domain:** platform operations. **Planner:** ChatGPT. **Initial source snapshot:** `undertaking/storyteller-workshop@314f1ef1f29ebc57adf1110bf153f864b18892cf`; revalidate on promotion. **Architecture program:** [INF plan](../INFRA-RESTRUCTURE-PLAN.md).

## Outcome

Consolidate image recipe/build authority while keeping Tilt dev sync and runtime freshness separate from deployment selection.

## Existing source anchors (not yet complete caller map)

`infra/kubernetes/lab/app-release/{Dockerfile.*,build*.sh,images.pin,prepare-runtime-tree.sh}; infra/kubernetes/lab/dev/{Dockerfile,Tiltfile,load-dev-slot-image.sh,dev-sync-paths.mjs,dev-watched-compilation-receipt.mjs}; infra/kubernetes/lab/dev/tilt/; scripts/repo-tools/dev-slot-image-plan.mjs`

## Decided migration direction

Classify canonical Docker recipes and dev aliases; make build/cache/digest/node-load transitions single-owner; keep Tilt watch and compile receipts in dev tooling, keeping release builder pins unchanged; replace moved paths with tested wrappers until callers migrate.

## Acceptance and hard stops

Prove same fingerprint for unchanged effective input; zero canonical rebuild on unchanged restart; correct alias/Kind loads, Pod digest and receipt READY gating; ensure unsafe edits rebuild; no release image behavior drift.

Preserve explicit `kind-offscreen-dev`/`kind-offscreen-lab` fences, dev v2 registry, saved tenants and unchanged public CLI unless a separately approved migration decides otherwise. No paid providers, data/tenant deletion, credential copying or live cluster changes are authorized by this proposal. Do not restructure files for cosmetic uniformity. Record actual before/after behavior and negative refusal proof.

## Dependencies and promotion

**Prerequisite:** DXK09 live image/receipt gate passed; INF02/INF03 interfaces settled.

At promotion, ChatGPT must inspect actual integration HEAD, all imports and shell/Tilt/script callers, source ownership and active changes; write scoped SOURCE-MAP/EXECUTION/TASKS/PROOF as justified, with exact function anchors, small independently testable T-IDs and a stop-on-contradiction rule. Pass an independent packet-readiness check **before** Cursor dispatch. This backlog packet is not an implementation instruction.
