# Implementation plan

Feature: [Long-story memory evaluation corpus](FEATURE.md).
Execution scope: approved provider-free evaluation foundation; live or paid judging remains separately gated.
Implementation owner: Codex under the owner's continuing implementation instruction.

## Phases

### E1 — Oracle schema and 200-scene corpus — implemented and focused-verified

- Outcome: deterministic corpus and query records with expected/acceptable/forbidden handles, scope, abstention and fixed budgets.
- Owners: `@offscreen/contracts` for artifact schemas, developer tooling for generation/inspection, canonical document fixtures for source truth.
- Preserve stable IDs and exact revisions; generate fixtures from compact declarations rather than checking in megabytes of repetitive prose.
- Checks: schema cases plus one conventional and one abstract corpus build/read.
- Exit: the current linear search can be measured without hand-authored database edits. Status: next after the active item-projection seam is safely checkpointed or explicitly deprioritized.

### E2 — Stage-separated evaluator

- Outcome: one provider-free runner reports index coverage/freshness, expected-handle recall, forbidden rate, rank/diversity, assembly duplication/omission and bounded work.
- Reuse saved retrieval and context manifests; do not parse console logs or require an LLM judge.
- Exit: a deliberately broken retriever produces a retrieval failure while a deliberately context-ignoring scripted result produces a generation-use failure.

### E3 — Scale and connected story evidence

- Outcome: 2,000-scene profile plus at least one connected playable return that uses the same oracle identities and captures player-visible continuity evidence.
- Record time, rows/units scanned, bytes, reads, rounds and $0/provider spend status.
- Exit: the suite detects linear-growth regressions and the connected return distinguishes structural correctness from human taste.

## Current checkpoint

- Current phase and exact next action: begin E2's stage-separated evaluator against the linear baseline, keeping thresholds unset until its first report.
- Base/reviewed Git revision and relevant uncommitted changes: `f92bf5e`; E1 contract, deterministic builders/materializer, focused test and documentation are uncommitted.
- Actual checks/results for this revision; checks not run: contracts and application builds pass; the focused provider-free corpus test passes with deterministic main/fork/abstract identities, 200 scenes per corpus, all thirteen query classes, real store materialization, corrected current search, private-decoy exclusion and abstract no-human-default abstention.
- Unresolved findings/blockers: initial thresholds await baseline measurement.
- Provider spend and accounting certainty: $0; no provider call planned.
