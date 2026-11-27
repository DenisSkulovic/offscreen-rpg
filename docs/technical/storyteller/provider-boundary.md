# Provider dispatch review and dry-run analysis

**Selected boundary (leading).** Preparing, inspecting, holding and dry-running a provider packet are local, zero-provider-call operations. An exact, immutable packet, its hash and its dry-run analysis are evidence of what the application would hand to transport; they are not evidence that a call was made, accepted or paid, and a dry-run proves no provider call. Dispatch is a separate authority transition that reloads current authorization, price and funding. Delivery is classified as known or uncertain: a known outcome settles its reported charge, an uncertain one retains its reservation, blocks further paid admission and is never resent for the same intention. Raw packets stay private and redacted; API keys and authorization headers never enter a packet artifact.

**Storyteller evolution boundary:** the existing attempt-custody guarantees apply to every main-writer and delegated-assistant provider call. Each child call has its own durable attempt identity and uncertainty state while remaining attributable to one admitted parent mission allowance. A retry, restart or branch fork never clones a paid attempt or turns uncertain delivery into permission for a second charge.

**Current realization.** Implemented for the offline POC, with **OBS00-C wire-equality**, **OBS00-L local Story trial guards** (2026-11-15), and **OBS00-B** SQL current-dispatch authority recheck at `budget.dispatch` (2026-11-20, provider-free proof only). Exact packet construction, attempt-owned durable breakpoint/decisions and developer-only owner-scoped inspection/release/rejection endpoints exist. `pnpm --filter @offscreen/chamber packet` creates and exports a held opening without a browser or provider attempt. `pnpm --filter @offscreen/chamber memory-packet` materializes the maintained Greywake long-story corpus and captures the ordinary memory controller's exact first-round packet at the same zero-spend boundary. Rebuilding means admitting a fresh immutable generation. Pure packet comparison covers every implemented request purpose plus bounded human/nonhuman active-scene sequences and reports exact byte overlap without inferring cache savings. Live paid release still requires a separate spending and evaluation preflight with a **fresh** owner cap; completing OBS00-B security tests does not authorize it.

**Route:** [attempt custody and an unknown call](#attempt-custody-and-an-unknown-call) · [exact packet boundary](#exact-packet-boundary) · [durable breakpoint](#durable-breakpoint-lifecycle) · [safety boundaries](#safety-boundaries). Grants and recovery stay in [Distinct authorities](../platform/spending-and-entitlements.md#distinct-authorities). Where a packet sits among the other trust boundaries is [Platform trust boundaries](../platform/security-and-trust-boundaries.md#boundary-map). The custody table and both constrained-by tables stay as written.

## Attempt custody and an unknown call

Preparing and inspecting a provider request are local. Dispatch is a separate authority transition, and this page does not grant it.

Billable dispatch now reloads independent current authority inside the `budget.dispatch` transaction: platform policy plus an owner grant must match the captured task under the same locks described in [Distinct authorities](../platform/spending-and-entitlements.md#distinct-authorities). A missing or revoked grant releases reserved work as unsent instead of dispatching. The env-driven `readStorytellerWorkerOptions` helper still supplies **no** `dispatchAuthority` callback, so the default worker path stays denied without an explicit SQL-owning runtime install. `startRuntime` may install the generation dispatch-authority reader only when a provider is configured and the caller did not pass a callback. The distributed Temporal executor still refuses provider mode (`ProviderModeRefused`) and has no SQL grant reader. Live paid release still requires separate spending approval beyond these fences.

| Concern | Where it stays |
| --- | --- |
| Durable attempt identity and the held request | [Durable breakpoint lifecycle](#durable-breakpoint-lifecycle). One attempt identity owns the review record. Rebuilding admits a fresh generation. |
| Reviewed bytes and transport | [Exact packet boundary](#exact-packet-boundary). Equality is what the application handed to transport, not provider receipt. |
| An unknown transport result or a partial outcome | The same lifecycle. The attempt stays uncertain and blocks further provider work. |
| Price, grant, window, and recovery | [Distinct authorities](../platform/spending-and-entitlements.md#distinct-authorities). Figures are not copied here. |

[Safety boundaries](#safety-boundaries) still forbid a release from adding a retry beyond the captured operation envelope. The status paragraph keeps live paid release behind a separate spending and evaluation preflight. This map does not add a live route or a recovery grant.

Writer rounds use `createWriterRoundTransport` (`@offscreen/storyteller/providers/writer-round-transport`). The factory sends one captured wire after a local preflight (model, provider pin, no fallback, finite timeout and price). Results are `delivered` with reported usage, `failed` (unsent wire rejection releases the attempt; a sent failure settles reported usage), or `unknown` (lost or unaccounted response). `advanceWriterMissionProviderStep` settles that reported cost when a real `providerPolicy` and `expectedWireSha256` are supplied. Scripted openings that omit that policy still settle the historical zero-usage receipt and do not reprice older attempts. A step already `dispatched` or `uncertain` is not sent again.

Negative: an uncertain charged dispatch does not start a second paid call. That stop follows [Window accounting and admission](../platform/spending-and-entitlements.md#window-accounting-and-admission). A changed creative profile does not replace the request or the permissions captured for that attempt.

### Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| Attempt custody and an unknown call | constrained-by | [Window accounting and admission](../platform/spending-and-entitlements.md#window-accounting-and-admission) | If unknown metering may be released or retried, this section's ban on a second paid call would dispatch another attempt for the same uncertain charge |

First-response identification stays in the task guide [Uncertain work recovery](../../runbooks/uncertain-work-recovery.md) and does not change this custody section or the table above.

## Product contract

Provider inference is a deliberate external effect. Preparing a Storyteller task, assembling its exact provider body and analyzing it are free local operations and must be possible without reserving money or opening network access. Dispatch is a separate authority transition.

Developer review has three modes captured per evaluation run:

- `off`: an otherwise authorized run proceeds through the normal dispatch fences;
- `hold`: every prepared provider packet stops before reservation/dispatch until explicitly released or rejected;
- `observe`: preserve the same artifacts without pausing, for an already authorized bounded run.

Ordinary gameplay, tests and startup never silently inherit a developer's previous release. A release names one immutable packet hash and one generation/attempt. It is not permission for retries, subsequent turns or a rebuilt packet.

## Exact packet boundary

The provider adapter owns one pure credential-free request builder. Dry-run inspection and network transport use the same per-dispatch specification: captured request plus its bounded generated-token ceiling. Accounting reserves that same specification rather than silently substituting the operation-wide ceiling. The inspection artifact includes the exact JSON body, SHA-256 hash, serialized byte count, message roles and sizes, output-schema size, top-level user-payload section sizes, captured route/provider, output ceiling and applicable resource-policy identities.

**Reviewed bytes equal handed-to-transport bytes (OBS00-C).** The builder has one serializer (`prepareOpenRouterWire`) returning the exact body string, its SHA-256 and byte count. After the review row is read under its lock and before `budget.reserve`/`budget.dispatch`, `prepareReviewedDispatch` obtains the provider's own `prepareWire(task, dispatch)`, re-hashes it, and requires the digest to equal the persisted `packet_sha256`. A provider that cannot attest (`prepareWire` absent) or whose bytes differ is refused with no reservation, no attempt, no HTTP and an untouched review row; a local refusal is never recorded as uncertain. The provider then sends that frozen string (`dispatch.wire.serialized`) as `RequestInit.body`. This bounds what the application handed to transport; it is not provider receipt. Proof: [OBS00-C receipt](../../../evidence/runs/observability-program-2026-11-15/obs00-c-provider-wire-equality-2026-11-15.md).

API keys, authorization headers and arbitrary environment data are never part of the packet artifact. Exact token count remains `unknown` until a route-specific tokenizer is verified; character or byte heuristics must not be relabelled as tokens or cost.

## Durable breakpoint lifecycle

Each review record is owned by the exact model-attempt UUID and linked to its generation; one generation may therefore retain several immutable round packets. Decisions are append-only and address the same attempt:

Review decisions lock the exact review and generation first. When the attempt belongs to a bounded memory round rather than the generation's one-shot attempt, its optional memory artifact is validated and locked separately. This preserves one transactional ownership check without applying PostgreSQL `FOR UPDATE` to the nullable side of an outer join.

```text
prepared -> awaiting-review -> released -> reserved -> dispatched
                          \-> rejected
                          \-> superseded (packet/source/authority changed)
```

Creating the record happens before budget reservation. The one-shot runtime uses its generation attempt UUID; bounded exploration supplies the model-round UUID already persisted with the exact request. Release performs, in order: attempt and packet-hash equality, generation/source freshness, current dispatch authority, current price/resource policy, funding/window availability and global uncertainty checks. Only then may the normal atomic reservation and dispatch path run. Code/config changes require rebuilding a new packet; the reviewer cannot edit captured JSON into an untraceable request.

Rejecting a packet is a safe terminal developer decision, not provider failure and not zero-cost model evidence. A held packet keeps the gameplay reason visible without consuming a provider attempt. Long-held review must not create fictional elapsed time.

Developer tools expose `GET` and `PUT /api/chamber-tools/generations/:id/dispatch-review` only when the API is explicitly composed with developer tools. GET resolves the generation's current attempt. The decision body carries that attempt ID, a fresh decision ID, expected review revision, exact packet hash and `release` or `reject`. The normal API composition does not mount these routes. Release is merely the first gate: it re-enters current funding, usage-window, authority and provider checks and cannot make an unpriced Chamber route dispatchable.

The memory packet command is Gate-0 structural evidence, not a synthetic prompt preview and not a playable-story or model-quality result. It builds an admitted continuation task with the normal resource resolver, reads the canonical corpus through the document store, persists a generation, invokes the ordinary durable memory executor and stops its first model attempt in `awaiting-review`. The Greywake task asks for an exact old hiding-place detail that is present in passage history but not stated by the compact canonical records already in context; this makes a memory request useful without forcing the controller to retrieve. Its provider implementation is a tripwire that fails if transport is reached. The command must observe memory state `held`, one held review and zero provider attempts before exporting evidence. It neither provisions funding nor releases the packet.

Live memory evaluation must not reinterpret the ordinary one-shot configuration. Its sibling configuration and per-attempt manifest name the two-round operation ceiling, one-read allowance, per-round serialized and token ceilings, cumulative input/generated ceilings and a verified-zero-price route. Each preflight binds one held attempt and exact hash but grants no authority to any later packet. If the first result requests memory, deterministic retrieval may prepare a second attempt only inside the captured operation; that attempt requires its own manifest, held-packet inspection, current route verification, release and settlement reconciliation.

The credential-free Chamber packet command applies that configuration before task admission, so the route in the hashed provider body, captured task authority and manifest are the same route rather than a post-hoc annotation. It installs a failing provider transport, requires held memory state with zero attempts, and writes the manifest next to the exact request evidence. It cannot provision funding or release a review.

The separate live-memory command is an explicit supervisor over the persisted controller, not a second exploration loop. It verifies the route immediately before work, provisions one stopped zero-microusd operation with at most two attempts, and requires the evaluation ID as an authorization argument. After releasing round one it waits for either a terminal generation or a different held attempt. A second release is permitted only after round one is durably settled with matched zero reported/calculated charge and the route has been freshly reverified. Terminal failure, uncertainty, nonzero charge, missing reconciliation, stale pricing or an unexpected third attempt stops the run. Raw provider responses remain separate private artifacts; the compact operation report records round/review/accounting states and pointers without copying prose.

OpenRouter exposes [generation usage lookup](https://openrouter.ai/docs/api/api-reference/generations/get-generation) only by provider generation ID; successful responses also expose that identity in the body and `X-Generation-Id` response header. A non-streaming client timeout may occur before response headers, leaving no documented identity with which to query a late provider record. Account-credit totals can corroborate that no aggregate charge appeared, but they cannot settle that individual attempt. Such an attempt remains uncertain and blocks further provider work. Before another live-memory attempt, evaluate an early-identity transport (for example, bounded streaming if it preserves constrained-output guarantees) or another provider-supported correlation path; never redispatch the same request merely to obtain an ID.

The adapter preserves a valid bounded `X-Generation-Id` as soon as a response object exists and returns it in uncertain telemetry if the response body is interrupted, oversized or invalid. Provider policy can explicitly select bounded SSE; its exact packet uses `stream: true` plus final usage reporting, while the completed stream is reconstructed into the same strict local response validator used for buffered JSON. OpenRouter documents both [streaming with structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs#streaming-with-structured-outputs) and the chat API's [`stream_options`](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request?explorer=true). Incomplete or malformed streams remain uncertain rather than manufacturing usage. This closes the post-header evidence-loss case and makes early headers possible without weakening structured output, but it does not repair the observed pre-header timeout, guarantee early headers on every route, or authorize another inference call.

## Analysis and comparison

The Chamber should show a summary before raw JSON:

- contribution by system message, user sections and output schema;
- included evidence handles, omission counts and source provenance;
- duplicated or near-duplicated material, especially current/evidence overlap;
- instruction hierarchy and untrusted-data boundaries;
- route limits, exact serialized bytes, unknown/verified token facts and worst-case reservation;
- differences from a selected earlier packet by prompt, context, schema, route and limits.

Analysis findings are structured diagnostics with severity, stable rule ID, affected JSON path and measured evidence. They do not automatically rewrite prompts. The reviewer changes code/content, rebuilds, and compares hashes. This preserves reproducibility and prevents a convenient UI edit from becoming invisible production behavior.

## Prompt responsibility

The engine, not the model, owns legal game transitions: checks and modifiers, clocks, activity progress, possessions, capabilities, requirements, effects, deadlines and durable facts. A prompt supplies only the subset of those typed contracts and resolved facts needed for the current task. The Storyteller may narrate committed outcomes and propose intentions inside that contract; it does not roll, execute, or invent a parallel rules system. That limit is [What it must not do](../../product/storyteller/behavior-and-quality.md#what-it-must-not-do).

Do not paste a general tabletop rulebook into every request or tell the model merely to “use D&D edition X.” The former wastes context and creates competing authority; the latter is ambiguous, model-dependent and cannot be validated. D&D-inspired mechanics are application contracts. A task should name the relevant check/action vocabulary and admissible values when that task can propose them, while omitting mechanics irrelevant to the turn.

Likewise, do not explain the entire product on every turn. The stable system message states role, authority and universal narrative boundaries. Task guidance states the current output opportunity—opening, continuation, committed consequence or report. The user payload carries the selected Storyteller profile and bounded authoritative context. The JSON Schema is part of the prompt budget and must be task-specific: fields with no legal meaning for that task are defects, not harmless completeness.

### Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| Prompt responsibility | constrained-by | [What it must not do](../../product/storyteller/behavior-and-quality.md#what-it-must-not-do) | If the product lets the model decide dice, uncommitted effects, or a second rules system, this prompt would carry authority the engine currently keeps |

## Evidence retained after a real run

The released packet links to provider attempt, response, validation diagnostics, usage/cost, publication and resulting gameplay state. Human review records usefulness, irrelevant context, missing context, instruction adherence, narrative quality and option quality against the same packet. One charged request must therefore support both economic and product analysis without relying on terminal scrollback.

## Safety boundaries

- Inspection and hold are always zero-provider-call operations, and a dry-run is never evidence that a provider was called or that usage was zero-cost.
- Missing or unreported usage is unknown, not zero spend; the reservation is retained until reconciliation.
- No release can enable fallback, repair, retry or another round beyond the captured operation envelope.
- Raw packets remain private developer diagnostics and use bounded local storage/export redaction.
- A release after authority, source, pricing or packet changes fails closed.
- The breakpoint does not authorize live evaluation; [Window accounting and admission](../platform/spending-and-entitlements.md#window-accounting-and-admission) and the evaluation gate still apply.
