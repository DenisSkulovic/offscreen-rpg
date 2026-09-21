# Implementation plan

Feature: [Hybrid semantic story retrieval](FEATURE.md).
Execution scope: measured local experiment followed by implementation only if it wins; no hosted inference authorization.
Implementation owner: Codex under the owner's continuing instruction.

## Phases

### H1 — Candidate experiment

- Outcome: compare a small licensed local embedding shortlist against L2 lexical results on the fixed oracle.
- Owners: disposable evaluation adapter and artifacts first; no production dependency during comparison.
- Measure paraphrase recall, forbidden rate, rank, multilingual cases, latency, RAM/VRAM/disk, build/update time and final assembled usefulness.
- Exit: written selection or explicit no-win decision with reproducible results. Status: depends on E2 and L2.

### H2 — Versioned semantic index

- Outcome: selected local model indexes eligible committed units with model/version/source hashes and prefilters.
- Rebuildable and asynchronous; lag is visible and never blocks exact state.
- Checks: supersession, deletion, partial rebuild, private/branch filters, restart and model-version change.
- Exit: semantic candidates use the same compact result/source-read contract as lexical candidates.

### H3 — Fusion, reranking and tiers

- Outcome: deterministic rank fusion across exact/link, lexical and dense routes; optional reranker evaluated only on the small pool.
- Raw scores are never compared as calibrated values. Minimal tier skips optional inference; richer tiers share fixed final evidence caps.
- Exit: end-to-end gains survive assembly and Storyteller use, not merely retrieval top-k metrics.

## Current checkpoint

- Current phase and exact next action: waiting on E2/L2; prepare no backend code before fixed baseline evidence exists.
- Base/reviewed Git revision and relevant uncommitted changes: `a38076c`; planning files only.
- Actual checks/results for this revision; checks not run: design/source review only.
- Unresolved findings/blockers: model/backend selection intentionally unresolved pending measurement.
- Provider spend and accounting certainty: $0; hosted embeddings and judges unauthorized.
