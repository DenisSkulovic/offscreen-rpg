# Provider dispatch review and dry-run analysis

Status: implemented for the offline POC. Exact packet construction, attempt-owned durable breakpoint/decisions and developer-only owner-scoped inspection/release/rejection endpoints exist. `pnpm chamber:packet` creates and exports a held opening without a browser or provider attempt. `pnpm chamber:memory-packet` materializes the maintained Greywake long-story corpus and captures the ordinary memory controller's exact first-round packet at the same zero-spend boundary. Rebuilding means admitting a fresh immutable generation. Pure packet comparison covers every implemented request purpose plus bounded human/nonhuman active-scene sequences and reports exact byte overlap without inferring cache savings. Live release still requires the separate spending and evaluation preflight.

## Product contract

Provider inference is a deliberate external effect. Preparing a Storyteller task, assembling its exact provider body and analyzing it are free local operations and must be possible without reserving money or opening network access. Dispatch is a separate authority transition.

Developer review has three modes captured per evaluation run:

- `off`: an otherwise authorized run proceeds through the normal dispatch fences;
- `hold`: every prepared provider packet stops before reservation/dispatch until explicitly released or rejected;
- `observe`: preserve the same artifacts without pausing, for an already authorized bounded run.

Ordinary gameplay, tests and startup never silently inherit a developer's previous release. A release names one immutable packet hash and one generation/attempt. It is not permission for retries, subsequent turns or a rebuilt packet.

## Exact packet boundary

The provider adapter owns one pure credential-free request builder. Dry-run inspection and network transport use the same per-dispatch specification: captured request plus its bounded generated-token ceiling. Accounting reserves that same specification rather than silently substituting the operation-wide ceiling. The inspection artifact includes the exact JSON body, SHA-256 hash, serialized byte count, message roles and sizes, output-schema size, top-level user-payload section sizes, captured route/provider, output ceiling and applicable resource-policy identities.

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

Live memory evaluation must not reinterpret the ordinary one-shot configuration. Its sibling configuration and manifest name the two-round operation ceiling, one-read allowance, per-round serialized and token ceilings, cumulative input/generated ceilings and a verified-zero-price route. Gate-0 preflight binds the first held attempt and exact hash but grants no authority to a later packet. If the first result requests memory, deterministic retrieval may prepare a second attempt only inside the captured operation; that attempt requires its own held-packet inspection, current route verification, release and settlement reconciliation.

The credential-free Chamber packet command applies that configuration before task admission, so the route in the hashed provider body, captured task authority and manifest are the same route rather than a post-hoc annotation. It installs a failing provider transport, requires held memory state with zero attempts, and writes the manifest next to the exact request evidence. It cannot provision funding or release a review.

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

The engine, not the model, owns legal game transitions: checks and modifiers, clocks, activity progress, possessions, capabilities, requirements, effects, deadlines and durable facts. A prompt supplies only the subset of those typed contracts and resolved facts needed for the current task. The Storyteller may narrate committed outcomes and propose intentions inside that contract; it does not roll, execute, or invent a parallel rules system.

Do not paste a general tabletop rulebook into every request or tell the model merely to “use D&D edition X.” The former wastes context and creates competing authority; the latter is ambiguous, model-dependent and cannot be validated. D&D-inspired mechanics are application contracts. A task should name the relevant check/action vocabulary and admissible values when that task can propose them, while omitting mechanics irrelevant to the turn.

Likewise, do not explain the entire product on every turn. The stable system message states role, authority and universal narrative boundaries. Task guidance states the current output opportunity—opening, continuation, committed consequence or report. The user payload carries the selected Storyteller profile and bounded authoritative context. The JSON Schema is part of the prompt budget and must be task-specific: fields with no legal meaning for that task are defects, not harmless completeness.

## Evidence retained after a real run

The released packet links to provider attempt, response, validation diagnostics, usage/cost, publication and resulting gameplay state. Human review records usefulness, irrelevant context, missing context, instruction adherence, narrative quality and option quality against the same packet. One charged request must therefore support both economic and product analysis without relying on terminal scrollback.

## Safety boundaries

- Inspection and hold are always zero-provider-call operations.
- No release can enable fallback, repair, retry or another round beyond the captured operation envelope.
- Raw packets remain private developer diagnostics and use bounded local storage/export redaction.
- A release after authority, source, pricing or packet changes fails closed.
- The breakpoint does not authorize live evaluation; the spending rules and evaluation gate still apply.
