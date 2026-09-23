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
- Evidence: before state-indexing, the provider-free request audit reduced the mechanical-opening request from 23,209 to 21,564 bytes and its schema from 17,605 to 16,146 bytes after the structural nonzero expansion. These are exact serialized bytes, not token or quality claims. The consequence packet remained 31,702 bytes with a 22,550-byte schema.
- Exit: focused fixtures accept the compact provider result, reconstruct the stable stored plan, substitute authorized mechanics unchanged and accept legacy captured v10 results. Status: implemented.

## Phase S3 — Discriminating live probe

- Outcome: after an adopted compact contract or another material provider-facing improvement, run at most one deliberately funded comparison against saved baseline conditions, then reconcile before any continuation.
- Boundaries: no call merely to prove the deterministic schema edit; preserve model/profile/story variables and the daily spending limit.
- Result: one matched Seyda Neen / Character-Driven Drama opening used the compact v11 contract. Strict decoding succeeded and no zero delta recurred, but publication rejected one fresh road plan because it required at least one septim while captured state held zero. The attempt used 6,078 input and 749 output tokens, no reasoning, and settled with matched charge of 22,684 microusd. No retry or second call ran.
- Verdict: S1/S2 passed their targeted boundary in this sample; overall opening validity failed at the next semantic boundary. Status: complete.

## Phase S4 — State-index opening prerequisites

- Outcome: the mechanical-opening schema permits only character/story fact pairs that are true in captured state and only quantity minima at or below the captured value.
- Owners: task-specific JSON-Schema projection and focused Storyteller fixtures. The domain validator remains unchanged.
- Boundaries: this does not decide which prerequisites a plan should have, invent costs, remove genuine mechanics or make unavailable actions available. It only prevents the model from emitting an offer that the existing opening contract must reject immediately.
- Evidence: the Seyda fixture exposes its four exact current character fact/value pairs, no story prerequisites, and a `septims` minimum capped at the captured value of zero. Human, nonhuman, abstract and authorized-reference fixtures still use the same compiler. An initial live transport check exposed that an empty prerequisite array had replaced its item schema with `{}`, which OpenAI rejects even with `maxItems: 0`; it returned HTTP 400 before inference with zero tokens and zero matched charge. The projection now retains the typed item schema while closing the array. The final audited opening request/schema is 22,071/16,653 bytes, still 1,138/824 bytes below the pre-feature contract.
- Exit: the transmitted opening schema enumerates exact satisfied fact pairs, closes empty story-fact sets, bounds each quantity minimum by current value and preserves the existing human/nonhuman fixtures. Status: implemented.

## Current checkpoint

- Current phase and exact next action: checkpoint the typed-empty-array repair. A later fresh opening may live-prove S4, but do not issue a third operation in this slice.
- Base/reviewed Git revision and relevant uncommitted changes: S1/S2 are pushed at `378292a`; state-indexing is pushed at `5a58a68`; the typed empty-array repair and final evidence are the current working change.
- Actual checks/results for this revision: Storyteller builds and passes 40/40 tests. The final provider-free mechanical-opening audit reports 22,071 request bytes and 16,653 schema bytes. S3 produced one structurally valid compact response that failed semantic availability; the next transport-only attempt exposed and confirmed the typed-empty-array defect at zero inference.
- Unresolved findings/blockers: S4 is not yet live-proved after the transport repair. Consequence schema compaction and state-indexing are intentionally unimplemented. One generated sample does not establish v11 reliability.
- Provider spend and accounting certainty: the sole billable S3 call settled and reconciled at 22,684 microusd (6,078 prompt, 749 completion, zero reasoning); operation state remains open only for explicit repair, with zero account/run reservation and no uncertain attempt. The next fresh operation returned HTTP 400 `invalid-json-schema` before inference and reconciled at zero tokens/zero charge with no retry capacity. OpenRouter reported USD 0.657259296 cumulative account usage and USD 9.342740704 remaining at 2026-09-23T20:58:44Z.
