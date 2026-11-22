# EV01 | Centwise Storyteller evaluation and reusable experiment evidence

**State: PROPOSED / PLANNER-BLOCKED. Planning packet only, not Cursor-executable or paid-call authorization.** Owner idea from [2026-11-22 minutes](../../../../sessions/2026-11-22.md#5-extremely-economical-storyteller-evals-one-inference-can-justify-an-hour-of-analysis). Reconcile current branch/HEAD and current Lab Support owners before any implementation.

## Why

The owner may need to tune Storyteller immediately after the first playable real model continuation. Each cent matters; no corporate-budget, repeated multi-model or paid-judge sweeps. One single authorized call followed by deep human review is a valid experiment. The experiment should produce durable diagnostic evidence reusable for later prompts, recipes, regressions and model choices. Do not equate more calls with better scientific evaluation.

## Existing source/authority to build on

- `packages/lab-support/src/{live-evaluation,memory-evaluator,creative-exploration-evaluator,evidence-packing-evaluator,retrieval-oracle}.ts` and `packages/contracts/src/live-evaluation.ts` already support strict typed cases, deterministic scoring and preflight.
- `docs/technical/platform/spending-and-entitlements.md` is the source of funding, entitlements, recipe, window and dispatch constraints; `docs/technical/storyteller/request-context-and-cost.md` owns request/usage/eval spending economics.
- AI02 private request/tool provenance is the eventual historical trace reader; EV01 must not create a parallel provider transcript store.
- Existing funding/attempt/cost reservation is authoritative; an EV01 `maxMicrousd` field alone can never grant spend.

## Proposed end state, three graduated proof tiers

1. **Zero paid calls, default:** deterministic case/fixture evaluation and already-recorded model response rescoring. Report schema, canon continuity, source truth, context packing, tool calls, optional false recall, output validity, root/owner/temporal correctness, latency/usage from existing receipts, with explicit missing-evidence labels.
2. **One-call manual experiment:** user selects immutable Scenario + resolved Recipe + one exact provider route; preflight pin hash, model compatibility, cached source, account/run remaining allocation and worst-case price. Show *money reservation in cents* and what the single inference answers before opt-in. Default approved allowance **zero**. Require explicit per-run approval with specific hard cap, exact provider/model/version and no auto-retry, fallback, paid judge or hidden research. Unknown provider attempt remains liable/held.
3. **Optional comparison:** only after a well-described baseline failure or hypothesis, another separately authorized call on the same pinned scenario. Report cost-quality differences and explain uncertainty, not a fake statistically significant score from N=1.

## Minimal durable experiment contract (to ratify later)

`EvaluationCase` (scenario source pins, intended task, deterministic oracle, version), `EvaluationRecipeRef` (resolved immutable policy/capture hash), `ExperimentReceipt` (original request/response/tool CAS evidence refs, actual spend or unknown, outcome, metric observations, human annotations, source SHA), `EvaluationReport` (failed checks, diagnosis, recommendations, evidence tier). No private messages in public artifacts or unnecessary duplication; no raw payloads in Temporal history.

Rubric labels may include canon fidelity, agency/choice quality, specificity, creative coherence, pacing, restraint, continuity payoff, desire to continue. Distinguish subjective human judgments from deterministic false-canon, policy/permissions and budget failures.

## Planner to resolve before Ready

- Inspect exact Lab Support manifests/case fixture APIs, current Chamber controllers and AI02 transcript provenance once implemented.
- Decide pure scoring/report schema and file/storage owner using existing packages, not a new npm package or hosted SaaS by default.
- Decide safe one-click preview/approval/execute flow and prevent concurrent double dispatch across all running Cursors, with a hard financial reconciliation receipt.
- Minimum positive: reused saved response scored for **$0**; one fake provider receipt with full trace; wrong root, stale price, unknown charge, missing funding, duplicate submit and unauthorized staff all fail closed.
- No unbounded automatic trials, subscriptions, judge models or paid CI. **Owner approval to create this planning packet is NOT model-spend authorization.**

**Next action:** after WR11 and AI02 source proof, planner promotes this to a source-grounded 2–4 task Change. Until then keep **PROPOSED**; avoid scheduling it alongside WR11/AI02 while shared Writer source changes.
