# Conservative live-model evaluation plan

Feature: [Conservative live-model evaluation](FEATURE.md)
Status: Proposed. No live provider call is authorized.

Dependencies: QA journey/run contracts, trace completeness, existing persistent budget controls extended by [bounded-cost B1/B2](../2026-09-19--19-08--bounded-storyteller-cost/PLAN.md), and a playable task path worth evaluating. Reuse its captured recipes/operation ledger and provider semantics rather than implement competing controls in the launcher.

## Phase 1 — Evaluation-run contract and preflight (implemented offline)

Define captured case/model/route/pricing/limit policy, worst-case reservation, balance/accounting snapshot and preflight failures. Reuse the implemented [provider dispatch-review contract](../../technical/provider-dispatch-review.md) to build, hold and inspect the exact packet without dispatch.

Exit: an ineligible run explains exactly why it cannot start.

## Phase 2 — Chamber launcher and live isolation

Add a developer-only launcher separate from normal story controls. Offline is always default. Creating a live run requires explicit current parameters and provisions only that run's allowance. Ordinary tests and application startup cannot trigger it.

Exit: restarting the Chamber cannot silently preserve “live enabled” as a global mode.

## Phase 3 — Gate execution and stop policy

Drive one QA case through Gate 1/2 limits. Check persistent calls/tokens/reservations before each dispatch. Surface uncertainty immediately and prevent further provider work until reconciled.

Exit: a bounded run either finishes with verified accounting or stops safely with explicit uncertainty.

## Phase 4 — Review report

Combine QA results, trace links, rubric observations, latency, usage, cost and cumulative-account snapshot into one evidence report. Comparison is allowed only between deliberately selected runs of the same case/version.

Exit: the owner can decide whether to stop, make one targeted change or authorize the next gate without rereading terminal logs.

## First-run proposal

After dependencies are implemented, propose exactly one current compatible cheap model and one Gate 1 case within the [conservative preset](../../technical/usage-policy.md#conservative-development-preset-and-first-paid-gate). Prefer pineapple if its complete packet fits; otherwise choose a smaller meaningful case, never increase limits automatically. Verify pricing, window eligibility and remaining allowance at that time. Present the concrete worst-case reservation for owner authorization. Do not preselect a model because availability and pricing change. A first-run success does not authorize Gate 2 or recurring usage.

## Current checkpoint

The repository already has explicit provider opt-in, persistent reservation/attempt accounting and a real authenticated HTTP/worker dispatch-review path. On 2026-09-20, `pnpm chamber:packet` prepared a Seyda Neen opening, persisted the exact 4,350-byte serialized packet under hash `fea5a97e031ea4eddb859554ad518def759daec1a532630d07597cb614f3e035`, stopped in `awaiting-review`, and verified zero provider attempts. Its 1,367-byte output schema and 1,024-token output ceiling fit the dry-run byte policy; route-specific input token count and current pricing remain intentionally unknown.

Phase 1 now provides a strict `live-evaluation.v1` manifest, deterministic factory and pure fail-closed preflight. The captured recipe independently bounds primary, retrieval, repair, judge, comparison, background, concurrency, input/output/reasoning and money allowances. Gate 1 requires exactly one primary/in-flight call and zero optional calls/reasoning. The factory accepts only an awaiting-review packet and derives its conservative input bound and price-based reservation; preflight binds the held generation/hash and checks price and funding freshness, structured-output support, limits, available funding, accounting readiness and trace readiness. Focused contract/application builds and all three factory/preflight cases pass.

The selected model and route are part of the hashed provider body, so the unselected dry-run packet cannot be relabelled afterward. The credential-free `chamber:evaluation-packet` launcher now reads a strict non-secret configuration, creates a new authenticated held packet with that exact model/route, and writes the factory-produced manifest beside it. Configuration itself rejects optional calls, concurrency, reasoning, excess context and inconsistent metadata validity. It neither reads credentials nor provisions/enables funding or releases the packet. Affected contracts, application and Chamber builds plus all three manifest/preflight tests pass.

The Phase 2 authority surface is now implemented as the explicit `chamber:evaluation-run` mode. It requires a strict config plus a matching `--authorize=<evaluation-id>`, checks the selected endpoint's current context/structured-output support/prices and the authenticated credit balance, provisions a stopped account and disabled one-attempt run, captures and preflights the exact held packet, then enables and releases only that packet. It saves the existing request evidence and manifest plus a compact terminal report joining raw validated model output, normalized provider telemetry, durable accounting and before/after provider credit snapshots. It never retries.

The first Gate 1 run completed on 2026-09-20 using `mistralai/mistral-nemo` pinned to DeepInfra. The exact request was 4,345 bytes and the conservative reservation was 114 microusd. OpenRouter reported 514 prompt tokens, 352 completion tokens and a 21-microusd charge; the independent ledger calculation matched. The generation succeeded and returned valid opening JSON, but its prompt and option labels were mostly single letters, a useful qualitative failure for later model/prompt work. The OpenRouter credits endpoint still reported zero cumulative usage immediately afterward, so its account snapshot is lagging or too coarsely reported; the durable attempt is settled and the one-attempt local allowance is exhausted.

The owner subsequently made verified-zero-price OpenRouter models the default for bounded local gameplay and flow exploration. A new free run may proceed under the standing policy without waiting for the paid-credit snapshot, provided current model and endpoint metadata both prove zero input/output pricing, paid fallback is impossible, the exact finite recipe is traced, and the returned charge settles at zero. Any nonzero or ambiguous charge stops all provider work. Paid experiments remain separately authorized.

Phase 3's next bounded slice is an owner-authorized verified-free two-call loop: generate the Seyda Neen opening, start the ordinary story from that candidate, select the first published option through the ordinary resolution API, hold and inspect the resulting continuation packet, then release it under the same two-attempt run. The opening freezes its execution authority into the story, so both calls must share one captured run; stitching unrelated one-shot probes together would not test the game. Each task remains a one-round operation, while the run owns the total two-call ceiling. Paid multi-call recipes are rejected.

The first free-loop attempt stopped after its opening. Nvidia's free Nemotron endpoint returned HTTP 200 with 526 prompt tokens, 340 completion tokens, zero reasoning tokens and a settled/matched zero charge, but the response content was not parseable JSON. No continuation was admitted. This exposed that the adapter retained normalized telemetry and parsed successful output but not the literal provider envelope on an invalid-output result. Before another free run, the Chamber now records the bounded raw response envelope as a separate private artifact keyed by provider response ID; trace-write failure makes delivery uncertain rather than silently losing evidence.

Two traced Nex-N2.5-Pro openings then isolated the compatibility failure further. With `storyteller.v3`, the model emitted valid JSON but mis-nested `title` and `next`, despite the endpoint advertising structured outputs. `storyteller.v4` added a concise redundant opening skeleton and produced the correct nesting, but the constrained decoder filled every prompt, label and intention with the shortest schema-valid value, `"D"`. The choice contract had only required non-whitespace text while the prompt requested meaningful text. It now gives these fields modest minimum lengths plus JSON-Schema descriptions; this remains generic and rejects placeholder single-letter UI independently of model quality. No continuation call occurred in any of the three free runs. All three attempts settled at zero charge with no reasoning tokens.

The `storyteller.v5` rerun used the same model pinned to its sole Nex AGI endpoint after current metadata proved zero prompt/completion pricing. The 6,798-byte request returned HTTP 200 in 20,321 ms with 700 prompt, 332 completion, zero reasoning and 1,032 total tokens. Provider and durable accounting both report zero microusd, reconciliation is `matched`, and the credits snapshot remained 20 microusd used / 9,999,980 microusd available before and after. The content was valid JSON with the correct `scene` nesting, but native constrained decoding again emitted undersized prompt/label/intention values and omitted required `currentNotes` and `arrivalNotes`; local validation rejected it and the launcher made no continuation call. Two pre-dispatch launcher failures—one stale disposable database and one invalid nullable-join lock—made no provider call; the lock defect is fixed at its transactional owner.

The provider policy now captures `native-json-schema` or `json-object-local-validation`. The latter changes only OpenRouter's response format: messages, task schema, local validator, hold/release, accounting and publication remain identical, and invalid JSON or structure fails without coercion or repair. Its held packet was 4,106 bytes versus 6,149 for the comparable native packet, with identical messages/model/provider/output ceiling and zero provider attempts. One freshly verified zero-price call then returned meaningful prose rather than one-letter placeholders, but moved `next` to the root and omitted `currentNotes`, `arrivalNotes` and `documentChanges`. Local validation rejected it. The attempt used 700 prompt / 346 completion / zero reasoning tokens in 11,483 ms and settled at matched zero microusd with the provider credit snapshot unchanged. Prompt `storyteller.v6` now makes the redundant opening example match the complete required root, including the three empty arrays; no further live call has tested it.

The credential-free `storyteller.v6` ordinary-JSON packet is now held under hash `9526fe0ccdd2dac5360e377c6c8f4672d6df3c86b595caf7e5c3b6993cbb1209`. It is 4,231 bytes, exposes `json_object`, contains the complete note/document-array example and has zero attempts, funding or reservation. Exact next action: with fresh route metadata and a new run identity, use at most one verified-free call to determine whether the complete example fixes topology. If it still fails, stop prompt iteration and implement validation diagnostics suitable for model-specific compatibility evaluation before deciding whether a bounded explicit repair call is ever worth its cost. Memory retrieval remains out of the live launcher until this one-round output boundary produces a usable opening.

A general gate runner, judges, comparisons, memory retrieval, rich report UI and longer gameplay remain explicitly out of scope.
