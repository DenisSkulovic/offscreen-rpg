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

Status: active. The existing private story inspector now renders review state/hash/timestamps, structural inspection and the exact credential-free body for the active resolution. Add dedicated provenance/contribution presentation, stable diagnostics, rebuild/reject/release controls and packet-to-packet diff. Keep raw content collapsed and exclude secrets. Integrate a dry-run QA journey whose accounting is verified zero.

Exit: a developer can improve a packet through inspect → change → rebuild → compare without provider I/O.

## D4 — End-to-end trace and evaluation evidence

Link the reviewed packet through attempt, provider result, validation, accounting, publication, resulting state and human rubric. Extend sanitized export and conservative live-evaluation preflight. Observe mode is allowed only inside a separately authorized bounded run.

Exit: one eventual charged call yields a complete decision-quality evidence bundle.

## Current checkpoint

- Phase: D1 complete; D2 core complete. Exact packet artifacts persist before accounting, held worker delivery cannot publish or reserve, and release/reject/supersede decisions are durable and hash-scoped. The focused fake-provider integration passes: awaiting review causes zero attempts/calls, then one explicit release permits exactly one dispatch through existing accounting.
- Next: expose release/reject through developer-only Chamber routes with conspicuous exact-packet confirmation and add freshness/blocker diagnostics. Read-only packet evidence is already present in the private story inspector; ordinary product routes must not gain these controls.
- Dependencies: existing immutable Storyteller task, B1/B2 authority/accounting and developer-only Chamber. D2 must reuse `budget.reserve/dispatch`; it cannot create a parallel money path.
- Spend: no provider calls are authorized or required; expected application-model spend is $0.
