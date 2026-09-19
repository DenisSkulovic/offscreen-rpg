# Implementation plan

Feature: [Provider dispatch review gate](FEATURE.md).
Contract: [Provider dispatch review](../../technical/provider-dispatch-review.md).

## D1 — Exact packet construction and local inspection

Status: implemented. One pure credential-free OpenRouter request builder is shared by dry-run inspection and transport. Inspection reports exact body/hash/bytes, per-message and top-level user-section sizes, schema size and explicitly unknown token estimate. Focused adapter evidence proves the route/fallback body and structural inspection.

Exit: tests prove inspected and transported bodies share the builder; no provider call is needed.

## D2 — Durable hold/release authority

Status: next. Fold the review record into the single baseline schema. Add captured mode, packet hash/artifact, prepared/released/rejected/superseded states and append-only review decisions. Worker execution stops before reservation when held. Developer-only application operations release/reject under ownership and expected revision, then redeliver the existing generation. Release rechecks packet hash, generation/source, current authority, route policy, global uncertainty and funding.

Exit: restart and duplicate delivery cannot bypass a hold; release of stale/rebuilt evidence fails closed.

## D3 — Chamber packet laboratory

Add a private summary/raw view, provenance and contribution panels, stable diagnostics, rebuild/reject/release controls and packet-to-packet diff. Keep raw content collapsed and exclude secrets. Integrate a dry-run QA journey whose accounting is verified zero.

Exit: a developer can improve a packet through inspect → change → rebuild → compare without provider I/O.

## D4 — End-to-end trace and evaluation evidence

Link the reviewed packet through attempt, provider result, validation, accounting, publication, resulting state and human rubric. Extend sanitized export and conservative live-evaluation preflight. Observe mode is allowed only inside a separately authorized bounded run.

Exit: one eventual charged call yields a complete decision-quality evidence bundle.

## Current checkpoint

- Phase: D1 complete. Exact builder and structural inspection are implemented and documented; the Storyteller build and all 30 focused package tests pass with injected transports only.
- Next: design the baseline review row and expected-revision release/reject operations for D2 before touching worker dispatch. The default must remain no review record/no live path until an evaluation run explicitly captures hold mode.
- Dependencies: existing immutable Storyteller task, B1/B2 authority/accounting and developer-only Chamber. D2 must reuse `budget.reserve/dispatch`; it cannot create a parallel money path.
- Spend: no provider calls are authorized or required; expected application-model spend is $0.
