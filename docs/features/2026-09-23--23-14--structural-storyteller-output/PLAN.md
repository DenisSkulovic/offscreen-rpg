# Structural Storyteller output implementation plan

Feature: [Structural Storyteller output](FEATURE.md).
Execution scope: approved provider-free contract alignment and design of any subsequent compact proposal slice. No paid call or route change is authorized by this plan.
Implementation owner: Codex, as requested by the owner; review remains local to this slice.

## Phase S1 — Make the known invalid state unrepresentable

- Outcome: strict generated-result schemas cannot produce a zero quantity delta, while persisted domain compatibility and semantic validation remain intact.
- Owners: `packages/storyteller/src/tasks/index.ts`, focused Storyteller tests, and the Storyteller runtime/context specifications.
- Contract: recursively narrow only JSON-Schema objects whose discriminator is `quantity.change.v1`; use supported numeric bounds in two `anyOf` branches. Do not rewrite unrelated integers or relax the application validator.
- Versioning: accept captured v10 tasks and prepare new v11 tasks after simplifying the matching instruction.
- Targeted check: build the Game dependency and Storyteller package, then run the focused Storyteller test file because its compiled task fixtures expose opening and consequence schemas. This makes no provider call.
- Exit: schema assertions cover every discovered quantity-effect branch and current task preparation emits v11. Status: implemented.

## Phase S2 — Bound a compact proposal contract

- Outcome: remove mechanical-opening fields that code can derive without taking a creative or mechanical decision away from the Storyteller.
- Implemented boundary: the provider returns `content` and zero to six plan proposals. Code supplies both envelope versions, `next.kind`, state from plan count, empty fresh-plan evidence and access to every process plan. Fresh proposals retain labels, intentions, risks, prerequisites, resolutions, outcomes and process mechanics; supplied commitments remain authorized references. Activity resumption is absent because an opening has no activity identity to resume.
- Contrast: the same compiler applies to human, nonhuman and abstract fixtures; it assumes neither currency nor employment. Consequence plans retain their existing contract because prior evidence, resumable activity and continuity decisions are meaningful there.
- Evidence: the provider-free request audit reduced the mechanical-opening request from 23,209 to 21,564 bytes and its schema from 17,605 to 16,146 bytes after the structural nonzero expansion. These are exact serialized bytes, not token or quality claims. The consequence packet remains 31,702 bytes with a 22,550-byte schema.
- Exit: focused fixtures accept the compact provider result, reconstruct the stable stored plan, substitute authorized mechanics unchanged and accept legacy captured v10 results. Status: implemented.

## Phase S3 — Discriminating live probe

- Outcome: after an adopted compact contract or another material provider-facing improvement, run at most one deliberately funded comparison against saved baseline conditions, then reconcile before any continuation.
- Boundaries: no call merely to prove the deterministic schema edit; preserve model/profile/story variables and the daily spending limit.
- Exit: retained request/result/accounting evidence and an adopt/reject/inconclusive verdict. Status: deferred; not authorized by implementation alone.

## Current checkpoint

- Current phase and exact next action: S3; inspect a fresh v11 mechanical-opening packet under the connected Story mode authority, then release at most one Sol call and reconcile it before deciding whether another change or turn is warranted.
- Base/reviewed Git revision and relevant uncommitted changes: base `b64579d`; S1 and the bounded mechanical-opening S2 implementation are ready for checkpoint.
- Actual checks/results for this revision: Storyteller builds and passes 40/40 tests. The structural audit completed for mechanical opening and activity consequence with no provider transport.
- Unresolved findings/blockers: consequence schema compaction is intentionally unimplemented; one live opening can test strict decoding and the simpler response shape but cannot establish reliability.
- Provider spend and accounting certainty: zero provider calls and zero new spend in this feature.
