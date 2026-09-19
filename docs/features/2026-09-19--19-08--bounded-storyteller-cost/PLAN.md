# Bounded-cost implementation plan

Feature: [Bounded Storyteller effort and cost](FEATURE.md).
Execution scope: local/offline implementation and fake-provider evidence. No live authorization, model purchase, hosted service or runtime subagent implementation.
Implementation owner: the assigned coding agent, one owner per slice. Commit/push each coherent phase. No routine phase approval gate.

## Sequencing and current evidence

Start B1 with profile resolution, then captured recipes, before implementing exploration. It can run before canonical storage C1/C2 and has no storage dependency. B2 supplies window/envelope enforcement and game holds before live evaluation, memory Phase 3 or any independent paid maintenance/embedding route. B3 connects memory Phase 1–3 and storage C3 recipes; B4 joins the connected return/quiet-play rehearsal. Do not require the entire library/search system or a payment processor to deliver B1/B2. The first one-shot paid smoke test needs offline evidence for its full selected safety path, not every optional memory feature; no paid call is authorized here.

Inspected at base `2565214`: `tasks/policy.ts` bounds a serialized request plus framing and reserves configured input/output maxima. The schema has no reasoning/cache-write/tool pricing categories. `providers/openrouter.ts` pins provider/no-fallback and sends `max_tokens`, but does not capture explicit reasoning control or token/cache breakdown. Application `budget.ts` atomically reserves account/run money and admitted attempts, stops globally on uncertainty/overcharge, and retains uncertain reservations. These are useful foundations, not the proposed operation-wide policy. Current execution is one-shot. Do not remove the conservative bounds while adding richer accounting.

World-independent trace: a quiet patrol tick makes no model request; a rapid grounded conversation uses one shot; a returning acquaintance can use bounded evidence discovery; a microbe's changed environment uses the same envelope without NPC/location assumptions. Caps regulate software work, not fictional time or literary divisions.

## B1 — Effective usage profiles, captured recipes and preflight (implementing)

Outcome: an offline task explains precisely what it may load, call and spend, or why it cannot start.
Dependencies: existing task capture/provider policy only. Status: B1a implemented; B1b implementing.

Owners: `packages/storyteller/src/tasks/policy.ts`, `tasks/index.ts`, `tasks/opening.ts`, `context/index.ts`; application `storyteller/context.ts`, `execution.ts`, `records.ts`, plus a focused usage-policy resolver/configuration module. Account entitlement selection belongs to application authorization, not creative profiles. Use typed server-owned profile fixtures initially; no billing SDK or generic policy engine.

First bounded sub-slice B1a is implemented: versioned entitlement/restriction/window schemas, funding/recovery modes, strictest-limit and allowlist intersection, explicit denials/role-qualified provenance, a runtime-validated effective-policy snapshot and a disabled conservative development preset. Synthetic free/two paid/on-demand profiles live behind the developer-tools boundary rather than the runtime Storyteller API. The resolver is pure application policy; it cannot dispatch or persist provider work. Focused offline evidence covers lower limits, route/funding non-escalation, contradictory/unlimited rejection and disabled development policy. No commercial entitlement selection is connected yet.

B1b has begun at the model-facing boundary. Every newly captured task now includes a validated one-shot, tool-free, non-escalating recipe and a distinct byte/token/output/reasoning/deadline/cost envelope. Complete-request preflight uses serialized bytes plus framing overhead instead of comparing bytes with a token field; provider reservation and dispatch consume the captured byte/output ceilings. The authority is still the existing server-owned execution policy. Mapping the stricter application effective-policy snapshot into this task contract is the next sub-slice; durable window accounting remains B2.

Then B1b connects the resolved policy to existing captured tasks:

Bounded changes:

1. Capture versioned task recipe and effort-envelope schemas. Ordinary/report one-shot and evidence-seeking at most three rounds/six reads are distinct ceilings; no automatic escalation after failure. Pure deterministic selection uses task purpose and captured evidence cues. Preserve current one-shot execution until memory Phase 3 exists.
2. Add whole-operation byte/token/output/deadline/microusd fields and a preflight result with section sizes, required overflow and reserved final-request capacity. Recipe limits cannot exceed effective account/story/route/run authority; snapshots retain profile and window-definition versions. Money is supplied by explicitly funded runs, never inferred from an API key, tier or deposit note.
3. Normalize route capabilities/prices: input, applicable cache writes, billable completion/reasoning overlap, tool/embedding fees if supported, context capacity and provider-enforced output semantics. Unknown billable categories make a route ineligible. No new route/model selected here.
4. Serialize existing ordinary, report and opening fixtures to measure schema/instruction/state cost and assess the initial tuning candidates in the permanent contract. Do not claim byte counts are model-token counts. Keep conservative framing/reservation until a route-specific tokenizer is validated. If a target is incompatible, document the exact required overhead and reduce duplication or hold; no automatic widening.
5. Add bounded diagnostics by recipe/section and a future QA entry specification. No private context or model reasoning text in ordinary logs.

Acceptance: report excludes irrelevant planner/tools; mandatory input overflows before transport; three retransmitted requests count three inputs; final answer capacity fits or optional exploration is denied. Existing supported one-shot fixture artifacts remain usable under explicit versions/reset policy, not compatibility scaffolding.

Exit: named frozen envelopes and dry-run evidence, no provider dispatch; B2 can consume the contract.

## B2 — Durable shared enforcement and route accounting (implementing)

Outcome: every dispatch and side job consumes admitted capacity without escaping its originating operation.
Dependencies: B1. Status: B2a implementing; B2b queued.
Owners: application `storyteller/budget.ts`, `execution.ts`, `records.ts`; `packages/db/src/schema/storyteller.ts` and single baseline migration; `packages/storyteller/src/providers/openrouter.ts`. B2b also touches existing campaign hold/clock operations, public status contracts, API/snapshot projection, minimal play recovery controls and workflow wake-up bindings. Follow their current owners rather than duplicate a clock or scheduler.

Deliver as two coherent slices: B2a operation/attempt accounting and normalized provider usage; B2b account windows, policy transitions and game hold/recovery. Both are required before a live run. Keep one baseline migration and reset disposable data, no migration chain.

Extend the existing ledger with operation-envelope identity, aggregate consumption and allocations, not another ledger. The first B2a slice enriches the existing attempt row as the audit grain: account/run/owner/story-or-draft/generation attribution; task/profile/prompt/recipe/resource/price versions; requested and reported route; request bytes; estimated/reserved/reported/calculated money; normalized prompt/completion/reasoning/cache-read/cache-write tokens; lifecycle timestamps, duration, HTTP/finish metadata, outcome and reconciliation state. Private prompt/output prose remains in generation artifacts, not duplicated into accounting. Reserve operation money once, subdivide for attempts and settle/release known unused capacity without double-counting. Retain uncertain dispatched allocation and stop paid admission; deadlines/cancellation cannot erase liability. Consistent lock ordering covers concurrent attempts and background work. A retry receipt cannot reset aggregate limits. Preserve current global uncertainty/overcharge stop.

Map captured route reasoning controls to supported wire parameters; normalize returned usage/cache/reasoning metadata, preserving unavailable as unknown. Validate actual provider/model when observable. Reserve the greater applicable cold/cache-write price and other supported fees; cache hits release savings only after settlement. Unknown usage/cost keeps conservative reservations. Add bounded purpose/frequency allocation for optional background work; no autonomous summary agent.

Current B2a checkpoint: the existing attempt row now captures rich attribution, route/config versions, request size, a labelled byte-derived estimate, conservative reservation, dispatch/settlement timing, observed duration, normalized provider token/cache/reasoning usage, reported and calculable money, and reconciliation certainty. OpenRouter fake responses exercise reported model, generation id and token-detail normalization. Cache-priced attempts deliberately leave calculated cost unavailable until route snapshots carry cache prices. The Chamber inspector exposes per-story totals and the newest 50 sanitized attempts, including opening cost linked through passage provenance; it does not duplicate private prompt/output prose. The single baseline migration was regenerated. Next, capture effective usage-policy/window identity at admission, then implement durable operation/window allocations.

Acceptance/optional probes: injected transport for cache miss/write surcharge, reasoning-only truncated output, repeated repair, concurrent last allowance, crash after dispatch and saved-result replay. No duplicate mechanics or paid redispatch on uncertain delivery. Test tools remain fake; no live route validation implied.

B2b bounded work: persist versioned account grants/lower overrides and fixed/rolling window debits/reservations on the existing accounting boundary. Use server timestamps, intersect all scopes atomically, retain outstanding allocations across reset and attribute late usage to original dispatch. Recheck entitlement at dispatch; tier changes cannot reset usage or rewrite requests. Pin funding identity; reject implicit on-demand overage. Expose limiting reason/remaining/eligible time and independent usage hold. Default recovery is explicit Resume; optional auto-resume is a captured, revocable permission and remains forbidden for development live calls. Reuse clock reanchoring so held real time earns nothing. Wake-ups are durable, deduplicated, version-fenced and concurrency-bounded, not polling or fresh paid retries.

B2b QA: fixed-boundary and rolling recovery; window expires with an uncertain attempt; concurrent stories contend for the last allowance; grant downgrade/revocation before dispatch; no credit from tier toggling; required context permanently too large; optional report deferred without freezing unrelated work; manual pause survives reset; no held-time catch-up; recovery remains blocked by lifetime funding; many ready tasks cannot burst beyond concurrency/window limits. Use injected time/usage and fake providers.

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

Maintain manual QA for no-call quiet play, bounded fast dialogue, old-detail recall, report/maintenance deferral, profile/window enforcement and reset recovery, caps across reload, unknown billing stop and malformed-output costs. Compare one shot, deterministic recall plus one shot, bounded exploration on the same snapshots. Report effective limits and their sources, input retransmission, output/reasoning, reads, cached/write tokens when known, spend by purpose, total per accepted turn and uncertainty; record all-failure cases honestly. Include mock-cost bursts of rapid turns and competing background jobs, not only one successful request.

Offline results establish limits and orchestration, not prose/recall quality. A later explicitly authorized tiny live evaluation chooses a current compatible model and human-reviewed case; no automatic critic, fallback or subagent experiment. Keep GPU hosting and delegation out of scope unless separate evidence justifies them.

Exit: maintainable QA/cost evidence plus known quality gaps in permanent docs. Remove this folder only when all phases are delivered, not when a spending estimate looks cheap.

## Current checkpoint

- Phase: B1b/B2a implementing. Recipe/envelope capture, complete-request byte preflight, rich attempt-level cost attribution/reconciliation and sanitized Chamber inspection are implemented. Exact next action: map the application effective-policy snapshot into task admission and attempt attribution so account/story limits can only tighten the captured envelope; then add operation/window allocations and game holds. Do not enable provider execution. Storage C1/C2 remains independently ready.
- Slice base: `321944b`; B1a is committed and its package-boundary audit is complete. B1b is the next code slice.
- Verification: `@offscreen/application` and `@offscreen/api-integration` builds pass; focused `usage-policy.test.js` passes 4/4. Tests use pure fixtures and no provider path. No database/browser checks or live calls.
- Open choices: commercial tier names/prices/quotas and future authorized route selection. Not blockers for synthetic profile/window implementation; no checkout or live authorization inferred. Initial conservative development envelope is specified in usage policy; changes require deliberate review, not automatic widening to fit a fixture.
- Spend: $0 application-provider spend; cumulative account usage unverified.
