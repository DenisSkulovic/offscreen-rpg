# Implementation plan

Feature: [Storyteller creative exploration](FEATURE.md).
Execution scope: approved provider-free benchmark and contract phases first. No provider call, graph deployment or model-maintained index is authorized by this plan.
Implementation owner: Cursor by default; reviewer: Codex.

## Phases

### C0 — Creative-search benchmark and failure taxonomy — implemented and focused-verified

- Outcome: extend the maintained long-story corpus with fixed story positions where excellent turns require distributed connection-making rather than one known fact.
- Add conventional, quiet/no-grand-narrative and abstract-world cases. Label eligible source families, forbidden/private/stale material, genuinely distinct direction families and reasons a superficially clever connection is bad.
- Record discovery coverage, source validity, direction diversity and final evidence use separately. Human pairwise review owns surprise, coherence, restraint, payoff and desire-to-continue; an LLM judge remains optional and separately budgeted.
- Use story forks so alternative directions begin from the identical canonical checkpoint.
- Exit: a literal factual route, a deliberately noisy “creative” route and a curated offline direction set fail/pass different stages for understandable reasons.

### C1 — Generic creative-discovery contract — implemented and focused-verified

- Outcome: one provider-neutral contract describes a creative need, lens, scope and bounded result without hard-coding quests or human narrative concepts.
- Add typed lens requests over existing search/read/traversal owners. Results expose source-linked leads plus concise inferred connection/potential fields whose noncanonical status is explicit.
- Extend recipes with independent creative rounds, queries, reads, candidate-direction count, bytes, output tokens, latency and money. Zero means disabled; all work shares the parent operation envelope.
- Exit: provider-free fixtures prove branch/visibility/currentness filtering, partial/no-useful results, stable replay and no authority promotion.

### C2 — Diverge/converge orchestration — implementing

- Outcome: a bounded Storyteller operation may widen through several lenses, inspect exact sources, produce a small private direction set and compose one final candidate.
- Reuse the persisted memory-exploration controller and evidence pack; do not create a second agent runtime. Persist normalized requests/results before side effects and reserve final-composition capacity.
- Put creative discovery behind the same conversational `ask_memory` facade with a possibilities intent. The application expands that question through the admitted lens/search recipe and accounts for the resulting internal queries; cheap models do not need to select lens enums or retrieval backends correctly.
- Avoid stored chain-of-thought. Candidate directions contain only concise premise, involved evidence IDs, intended payoff/tension, compatibility constraints and rejection/selection status.
- Exit: crash-safe scripted integration demonstrates discovery → evidence → alternatives → one ordinary final result with private evidence-use reporting.
- The first POC keeps direction generation in final composition. Exact provider-free Greywake projection measured 20,256 request bytes inline versus 30,788 cumulative bytes and two rounds for separate ideation/composition under the same output-token allowance after creative candidate caps were applied. Separate ideation remains a rich-route experiment pending a live forked taste win; its final round consumes rather than regenerates the direction set.

### C3 — Adaptive routes and optional derived orientation

- Outcome: compare exact/lexical, semantic, admitted-link traversal and broad synthesis for creative needs; add only routes that improve the fixed benchmark.
- Controlled serendipity samples from eligible but less-obvious regions under explicit diversity distance and source filters. Required current facts are packed first and cannot be displaced.
- Evaluate query-focused period/theme maps, DRIFT-like follow-up and optional hierarchy/community orientation only after episodic/link coverage exists. Derived summaries/edges retain source/model/version/cost metadata and invalidate on source change.
- Exit: each adopted route materially improves discovery/final preference under at least one declared posture; losing techniques stay out.

### C4 — Connected model and owner taste comparison

- Outcome: replay the same fork checkpoint under off/minimal/balanced/rich recipes and compare actual Storyteller turns.
- Inspect request/response/evidence traces before publication. Use verified-free calls first under finite recipes; paid comparisons or judges require separate authorization.
- Record model/settings, route work, context/output sizes, latency, charge, citation integrity, direction diversity and owner/player preference. Preserve failures.
- Exit: at least one richer route produces a preferred connected turn often enough to justify its cost, while disabled/minimal modes remain coherent and honest.

## Current checkpoint

- Current phase and exact next action: C2 now has the accounting seam needed for multiple calls beneath one operation envelope. Next persist a deterministic attempt identity beside each pending exploration request and make dispatch review describe that exact per-round packet, then replace the current backend-shaped model request vocabulary with the agreed `ask_memory`/`read_memory` facade before connecting provider transport.
- Base/reviewed Git revision and relevant uncommitted changes: base `0aceb8f`; the budget owner now accepts an exact per-dispatch request and bounded token/byte reservation while preserving the captured task envelope as the non-renewable operation ceiling. Intermediate settlement leaves the operation open; only final settlement closes it.
- Actual checks/results for this revision: application and API-integration builds pass. The disposable-database integration case passes 1/1 and proves two smaller attempts consume one two-round operation rather than each reserving a fresh whole-operation allowance. No provider call or human taste judgment occurred.
- Unresolved findings/blockers: generation still stores only one attempt identity, dispatch review still stores only one packet per generation, and the persisted exploration artifact does not yet own a deterministic pending attempt ID. Those identities must be crash-safe before transport is connected. The current provider-facing schema also exposes five internal retrieval operations and creative lens selection; it must be simplified to the two-action conversational facade and evaluated with cheap models. The byte comparison cannot establish whether separate ideation improves creative quality, so it remains a future rich-route live experiment. C0's eight-lens vocabulary remains a benchmark/control vocabulary, not proof every lens deserves a distinct retrieval strategy.
- Provider spend and accounting certainty: $0; no provider call.

Candidate/lead accounting is genre-neutral: it counts returned creative candidate entries rather than characters, places, quests or human relationships, so Greywake and gradient-life use the same rule. Repeated material may be deduplicated for evidence packing, but repeated query results still consume the lead allowance because they consumed transport/context space.
