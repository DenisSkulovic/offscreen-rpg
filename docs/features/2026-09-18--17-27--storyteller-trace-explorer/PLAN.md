# Storyteller trace explorer plan

Feature: [Storyteller trace explorer](FEATURE.md)
Status: Prepared. Exact outbound-packet construction is being implemented by the linked [provider dispatch review](../2026-09-19--22-58--provider-dispatch-review/PLAN.md); this plan owns the broader correlated trace UI.

## Phase 1 — Trace inventory and correlation contract

Inventory existing generation, attempt, publication, outbox, passage and campaign records. Define stable event names, correlation IDs, artifact classifications and redaction/size rules. Reuse existing records where they already preserve evidence; do not duplicate entire rows into a generic blob.

Exit: every required field has one owner and an explicit inspector mapping.

## Phase 2 — Durable agent-step evidence

Implement the operation/round/tool-step persistence required by the playable DM agent. Save each round/tool result before advancing. Record validation diagnostics and accounting certainty. This phase is coordinated with Phase 3 of the playable DM loop, not a parallel executor.

Exit: restart can resume from persisted steps and the inspector can reconstruct their order.

## Phase 3 — Structured runtime events

Add a small typed logger/event adapter at server/worker execution boundaries. Include correlation IDs and sanitized error codes. Keep ordinary development logs concise; detailed content stays in bounded artifacts.

Exit: runtime incidents link to durable operations without leaking secrets.

## Phase 4 — Chamber trace workspace

Build the operation timeline, artifact viewer, validation panel, cost panel and supported before/after state view. Link from current story/passage and QA stages.

Exit: a developer can explain one successful and one invalid-output run entirely in the Chamber.

## Phase 5 — Compare and export

Add side-by-side operation/run comparison and sanitized evidence export consumed by QA journeys and live evaluation.

Exit: two storyteller/model runs can be compared across output, tool behavior, latency, usage, cost and rubric evidence.

## Current checkpoint

The Chamber already exposes some generation provenance and saved context, while accounting records preserve attempts and charges. There is no unified operation timeline, durable tool-step model, validation-diagnostic artifact or evidence export. No provider call is required to implement this feature.
