# Implementation plan

Feature: [Provider dispatch review gate](FEATURE.md).
Contract: [Provider dispatch review](../../technical/provider-dispatch-review.md).

## D1 — Exact packet construction and local inspection

Status: implemented. One pure credential-free OpenRouter request builder is shared by dry-run inspection and transport. Inspection reports exact body/hash/bytes, per-message and top-level user-section sizes, schema size and explicitly unknown token estimate. Focused adapter evidence proves the route/fallback body and structural inspection.

Exit: tests prove inspected and transported bodies share the builder; no provider call is needed.

## D2 — Durable hold/release authority

Status: core implemented. The single baseline contains generation-owned review/artifact and append-only decision records. Captured `hold`, `observe` or `off` mode is mandatory for provider execution. Worker execution stops before reservation/publication while held; owner-scoped application controls release/reject under expected revision and packet hash, and release redelivers the existing generation through normal authority/budget enforcement. Packet changes supersede the review. Developer-only API/Chamber exposure and explicit source-freshness diagnostics remain.

Exit: restart and duplicate delivery cannot bypass a hold; release of stale/rebuilt evidence fails closed.

## D3 — Chamber packet laboratory

Status: active. The existing private story inspector renders review evidence for active resolutions. Chamber also provisions opening generation with a deliberately unpriced, model-unselected provider route in mandatory hold mode and exposes the pre-story packet through a developer-only endpoint on the ordinary opening-preview journey. Add dedicated provenance/contribution presentation, stable diagnostics, rebuild/reject/release controls and packet-to-packet diff. Keep raw content collapsed and exclude secrets. Integrate a dry-run QA journey whose accounting is verified zero.

Exit: a developer can improve a packet through inspect → change → rebuild → compare without provider I/O.

## D4 — End-to-end trace and evaluation evidence

Link the reviewed packet through attempt, provider result, validation, accounting, publication, resulting state and human rubric. Extend sanitized export and conservative live-evaluation preflight. Observe mode is allowed only inside a separately authorized bounded run.

Exit: one eventual charged call yields a complete decision-quality evidence bundle.

## Current checkpoint

- Phase: D1 complete; D2 core complete; D3 opening laboratory usable. `pnpm chamber:packet` exercised a genuine premise/profile opening through the production preparation and worker boundaries. It persisted `awaiting-review` before reservation/attempt/provider construction and exported the developer-only packet. First evidence: 7,097 serialized bytes, including 1,647 system-message bytes, 1,358 user-message bytes and 3,663 output-schema bytes; application-model spend remained $0.
- Inspection findings: the profile contributes 1,045 useful bytes; empty opening context is small. The generic opening schema unnecessarily includes arrival-note machinery and note evidence requirements that cannot be satisfied from a first passage. More importantly, arbitrary-premise openings can offer narrative choices but cannot author the richer activity/action-plan opportunity contract currently limited to authored mechanical seeds. The base prompt correctly withholds mechanical authority and does not need a copied or externally referenced D&D rulebook, but it underspecifies the game's deliberate-time/activity rhythm.
- Next: create an opening-specific result contract that removes inapplicable arrival/evidence machinery, then decide how generated openings author mechanically admissible opportunities without granting the model authority to invent rules. Compare the rebuilt packet hash and byte contributions before considering reject/release controls. Do not expose release until a priced route, funding preflight and explicit one-call authorization are deliberately configured.
- Dependencies: existing immutable Storyteller task, B1/B2 authority/accounting and developer-only Chamber. D2 must reuse `budget.reserve/dispatch`; it cannot create a parallel money path.
- Spend: no provider calls are authorized or required; expected application-model spend is $0.
