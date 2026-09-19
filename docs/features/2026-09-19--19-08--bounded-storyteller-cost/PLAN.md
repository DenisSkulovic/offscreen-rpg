# Bounded-cost implementation plan

Feature: [Bounded Storyteller effort and cost](FEATURE.md).
Execution scope: local/offline implementation and fake-provider evidence. No live authorization, model purchase, hosted service or runtime subagent implementation.
Implementation owner: the assigned coding agent, one owner per slice. Commit/push each coherent phase. No routine phase approval gate.

## Sequencing and current evidence

Start B1 before implementing exploration. It can run before canonical storage C1/C2 and has no storage dependency. B2 supplies enforcement before memory Phase 3 or any independent paid maintenance/embedding route. B3 connects memory Phase 1–3 and storage C3 recipes; B4 joins the connected return/quiet-play rehearsal. Do not require the entire library/search system to deliver B1/B2.

Inspected at base `2565214`: `tasks/policy.ts` bounds a serialized request plus framing and reserves configured input/output maxima. The schema has no reasoning/cache-write/tool pricing categories. `providers/openrouter.ts` pins provider/no-fallback and sends `max_tokens`, but does not capture explicit reasoning control or token/cache breakdown. Application `budget.ts` atomically reserves account/run money and admitted attempts, stops globally on uncertainty/overcharge, and retains uncertain reservations. These are useful foundations, not the proposed operation-wide policy. Current execution is one-shot. Do not remove the conservative bounds while adding richer accounting.

World-independent trace: a quiet patrol tick makes no model request; a rapid grounded conversation uses one shot; a returning acquaintance can use bounded evidence discovery; a microbe's changed environment uses the same envelope without NPC/location assumptions. Caps regulate software work, not fictional time or literary divisions.

## B1 — Captured recipes and whole-operation preflight (ready)

Outcome: an offline task explains precisely what it may load, call and spend, or why it cannot start.
Dependencies: existing task capture/provider policy only. Status: ready; exact next implementation slice.

Owners: `packages/storyteller/src/tasks/policy.ts`, `tasks/index.ts`, `tasks/opening.ts`, `context/index.ts`; application `storyteller/context.ts`, `execution.ts`, `records.ts`. Use one small recipe module beside task policy if separation helps. No general plugin registry.

Bounded changes:

1. Capture versioned task recipe and effort-envelope schemas. Ordinary/report one-shot and evidence-seeking at most three rounds/six reads are distinct ceilings; no automatic escalation after failure. Pure deterministic selection uses task purpose and captured evidence cues. Preserve current one-shot execution until memory Phase 3 exists.
2. Add whole-operation byte/token/output/deadline/microusd fields and a preflight result with section sizes, required overflow and reserved final-request capacity. Recipe limits cannot exceed route/run/account authority. Money is supplied by explicitly funded runs, never inferred from an API key or deposit note.
3. Normalize route capabilities/prices: input, applicable cache writes, billable completion/reasoning overlap, tool/embedding fees if supported, context capacity and provider-enforced output semantics. Unknown billable categories make a route ineligible. No new route/model selected here.
4. Serialize existing ordinary, report and opening fixtures to measure schema/instruction/state cost and assess the initial tuning candidates in the permanent contract. Do not claim byte counts are model-token counts. Keep conservative framing/reservation until a route-specific tokenizer is validated. If a target is incompatible, document the exact required overhead and reduce duplication or hold; no automatic widening.
5. Add bounded diagnostics by recipe/section and a future QA entry specification. No private context or model reasoning text in ordinary logs.

Acceptance: report excludes irrelevant planner/tools; mandatory input overflows before transport; three retransmitted requests count three inputs; final answer capacity fits or optional exploration is denied. Existing supported one-shot fixture artifacts remain usable under explicit versions/reset policy, not compatibility scaffolding.

Exit: named frozen envelopes and dry-run evidence, no provider dispatch; B2 can consume the contract.

## B2 — Durable shared enforcement and route accounting

Outcome: every dispatch and side job consumes admitted capacity without escaping its originating operation.
Dependencies: B1. Status: queued.
Owners: application `storyteller/budget.ts`, `execution.ts`, `records.ts`; `packages/db/src/schema/storyteller.ts` and single baseline migration; `packages/storyteller/src/providers/openrouter.ts`; workflow bindings only as needed for delivery.

Extend the existing ledger with operation-envelope identity, aggregate consumption and allocations, not another ledger. Reserve operation money once, subdivide for attempts and settle/release known unused capacity without double-counting. Retain uncertain dispatched allocation and stop paid admission; deadlines/cancellation cannot erase liability. Consistent lock ordering covers concurrent attempts and background work. A retry receipt cannot reset aggregate limits. Preserve current global uncertainty/overcharge stop.

Map captured route reasoning controls to supported wire parameters; normalize returned usage/cache/reasoning metadata, preserving unavailable as unknown. Validate actual provider/model when observable. Reserve the greater applicable cold/cache-write price and other supported fees; cache hits release savings only after settlement. Unknown usage/cost keeps conservative reservations. Add bounded purpose/frequency allocation for optional background work; no autonomous summary agent.

Acceptance/optional probes: injected transport for cache miss/write surcharge, reasoning-only truncated output, repeated repair, concurrent last allowance, crash after dispatch and saved-result replay. No duplicate mechanics or paid redispatch on uncertain delivery. Test tools remain fake; no live route validation implied.

Exit: existing one-shot dispatch uses the envelope; future round/maintenance callers cannot bypass it. Update QA catalogue with actually runnable evidence.

## B3 — Small working sets at memory/storage integration

Outcome: task specialization and bounded reads prevent library/tool growth from becoming prompt growth.
Dependencies: B1/B2 plus memory Phase 1 for provenance/projection; storage C3 for creative bundles. Connect read accounting as memory Phase 3 is implemented, not a parallel round runner. Status: queued.
Owners: existing context/task assembly; memory/document read operations and creative bundle compiler; relevant task/result schemas.

Compile only required creative/rule/schema fragments, keeping stable recipe prefix order. Deterministic retrieval before inference, bounded metadata/excerpts, deduplication, loaded-evidence status and optional-page eviction follow memory's contract. Count every subread and transmitted round. Enforce compact generated record/patch sizes; preserve original passages intact. Separate memory backlog/source coverage from permission to run paid maintenance. No LLM call to select tools or compact overflow.

Acceptance: forty old note sources do not all enter the prompt; repeated/rephrased reads exhaust allowance; large search results are bounded before model insertion; report has no live planning catalogue; injected document instructions cannot grant tools; cold-cache requests still fit; optional discovery yields to final generation or required-evidence hold.

Exit: real captured one-shot and exploration tasks use the same budget policy with source-correct context, not merely a mock cost display.

## B4 — Cost-quality evidence and live-evaluation handoff

Outcome: owner can see whether each kind of gameplay merits its resource cost.
Dependencies: B2/B3 and memory's connected turn; no full dashboard required. Status: queued.
Owners: Chamber inspector, `packages/application/src/developer-tools/qa-catalog.ts`, existing trace/usage artifacts and conservative live-evaluation handoff.

Maintain manual QA for no-call quiet play, bounded fast dialogue, old-detail recall, report/maintenance deferral, caps across reload, unknown billing stop and malformed-output costs. Compare one shot, deterministic recall plus one shot, bounded exploration on the same snapshots. Report input retransmission, output/reasoning, reads, cached/write tokens when known, spend by purpose, total per accepted turn and uncertainty; record all-failure cases honestly. Include mock-cost bursts of rapid turns and competing background jobs, not only one successful request.

Offline results establish limits and orchestration, not prose/recall quality. A later explicitly authorized tiny live evaluation chooses a current compatible model and human-reviewed case; no automatic critic, fallback or subagent experiment. Keep GPU hosting and delegation out of scope unless separate evidence justifies them.

Exit: maintainable QA/cost evidence plus known quality gaps in permanent docs. Remove this folder only when all phases are delivered, not when a spending estimate looks cheap.

## Current checkpoint

- Phase: prepared; begin B1 captured recipes/envelope and offline request-size evidence before memory exploration. Storage C1/C2 remains independently ready.
- Base: `2565214`; documentation only in this preparation.
- Verification: relevant policy/provider/accounting source inspected; no runtime tests or provider calls.
- Open choices: numerical tuning from captured fixtures and future authorized route selection; neither authorizes spending or a larger architecture.
- Spend: $0 application-provider spend; cumulative account usage unverified.
