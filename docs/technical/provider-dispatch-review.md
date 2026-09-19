# Provider dispatch review and dry-run analysis

Status: first packet-construction slice implemented; durable breakpoint/release lifecycle prepared.

## Product contract

Provider inference is a deliberate external effect. Preparing a Storyteller task, assembling its exact provider body and analyzing it are free local operations and must be possible without reserving money or opening network access. Dispatch is a separate authority transition.

Developer review has three modes captured per evaluation run:

- `off`: an otherwise authorized run proceeds through the normal dispatch fences;
- `hold`: every prepared provider packet stops before reservation/dispatch until explicitly released or rejected;
- `observe`: preserve the same artifacts without pausing, for an already authorized bounded run.

Ordinary gameplay, tests and startup never silently inherit a developer's previous release. A release names one immutable packet hash and one generation/attempt. It is not permission for retries, subsequent turns or a rebuilt packet.

## Exact packet boundary

The provider adapter owns one pure credential-free request builder. Dry-run inspection and network transport use that same value. The inspection artifact includes the exact JSON body, SHA-256 hash, serialized byte count, message roles and sizes, output-schema size, top-level user-payload section sizes, captured route/provider, output ceiling and applicable resource-policy identities.

API keys, authorization headers and arbitrary environment data are never part of the packet artifact. Exact token count remains `unknown` until a route-specific tokenizer is verified; character or byte heuristics must not be relabelled as tokens or cost.

## Durable breakpoint lifecycle

The planned review record is generation-owned and append-audited:

```text
prepared -> awaiting-review -> released -> reserved -> dispatched
                          \-> rejected
                          \-> superseded (packet/source/authority changed)
```

Creating the record happens before budget reservation. Release performs, in order: packet-hash equality, generation/source freshness, current dispatch authority, current price/resource policy, funding/window availability and global uncertainty checks. Only then may the normal atomic reservation and dispatch path run. Code/config changes require rebuilding a new packet; the reviewer cannot edit captured JSON into an untraceable request.

Rejecting a packet is a safe terminal developer decision, not provider failure and not zero-cost model evidence. A held packet keeps the gameplay reason visible without consuming a provider attempt. Long-held review must not create fictional elapsed time.

## Analysis and comparison

The Chamber should show a summary before raw JSON:

- contribution by system message, user sections and output schema;
- included evidence handles, omission counts and source provenance;
- duplicated or near-duplicated material, especially current/evidence overlap;
- instruction hierarchy and untrusted-data boundaries;
- route limits, exact serialized bytes, unknown/verified token facts and worst-case reservation;
- differences from a selected earlier packet by prompt, context, schema, route and limits.

Analysis findings are structured diagnostics with severity, stable rule ID, affected JSON path and measured evidence. They do not automatically rewrite prompts. The reviewer changes code/content, rebuilds, and compares hashes. This preserves reproducibility and prevents a convenient UI edit from becoming invisible production behavior.

## Evidence retained after a real run

The released packet links to provider attempt, response, validation diagnostics, usage/cost, publication and resulting gameplay state. Human review records usefulness, irrelevant context, missing context, instruction adherence, narrative quality and option quality against the same packet. One charged request must therefore support both economic and product analysis without relying on terminal scrollback.

## Safety boundaries

- Inspection and hold are always zero-provider-call operations.
- No release can enable fallback, repair, retry or another round beyond the captured operation envelope.
- Raw packets remain private developer diagnostics and use bounded local storage/export redaction.
- A release after authority, source, pricing or packet changes fails closed.
- The breakpoint does not authorize live evaluation; the spending rules and evaluation gate still apply.

