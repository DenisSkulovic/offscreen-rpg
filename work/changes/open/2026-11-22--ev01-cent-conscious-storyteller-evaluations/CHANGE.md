# EV01 | Cent-conscious Storyteller evals and a reusable experiment ledger

**State: PROPOSED / PLANNER-BLOCKED, not implementation-ready or authorized for live inference.** Owner motivation and every-cent constraint: [2026-11-22 minutes](../../../sessions/2026-11-22.md#5-extremely-economical-storyteller-evals-one-inference-can-justify-an-hour-of-analysis). This is a lightweight future planning packet, NOT an instruction for Cursor to run paid model tests.

## Why

Once a real player can obtain a Writer continuation, we need to tell whether it is coherent, continuous, faithful to canon, engaging, and worth its provider cost. Vibe-generated scenes plus casual impressions are inadequate, but the owner's personal budget cannot support corporate eval sweeps or even automatic $0.75 tests. **Every cent must create a reusable diagnostic asset.** A single chosen live response can justify an hour of human investigation, then be replayed offline for months. The default eval budget and number of allowed provider sends is **zero**.

## Reuse existing evaluators instead of another platform

Current `@offscreen/lab-support` already has `live-evaluation.ts` with manifest/reservation/preflight, `memory-evaluator.ts`, `evidence-packing-evaluator.ts`, `creative-exploration-evaluator.ts`, `retrieval-oracle.ts`; `@offscreen/contracts/live-evaluation` describes constrained recipes and route snapshots. Prior source does not establish a full player-continuation experiment ledger or Admin/Chamber analysis interface. Extend **these** owners and the eventual [AI02 transcript provenance](../2026-11-22--ai02-durable-agent-execution-provenance/CHANGE.md), preserving existing funding/dispatch custody. Avoid adding Langfuse/Promptfoo SaaS or a new independent evaluation runtime by default. External OSS tools may be compared later if their incremental value is demonstrated and self-host/maintenance cost acceptable.

## Selected experiment vocabulary

- **Scenario:** immutable deterministic source, scene checkpoint, player state, task purpose, known reference invariants and privacy class. Include constructed scene-20 and previously archived case variants.
- **Recipe:** immutable versioned model route, verified prices/capabilities, prompt/compiler, context packing, tools, sampling controls, maximum rounds/reads/repair/bytes/tokens, hard budget and soft conserve settings; effective policy from [CFG01](../2026-11-22--cfg01-effective-writer-config-and-budget/CHANGE.md), not permission to spend.
- **Observation:** full trace/proposal/publication/usage returned by a free fixture or an actual *authorized* call, with evidence class and hash.
- **Evaluation:** independent repeatable deterministic checks plus optional human annotations with named rubric/version and reference sources. Store hard validity separately from subjective narrative judgment.
- **Experiment:** immutable linkage of scenario+recipe+source SHA+execution/evidence IDs+scoring rubric+measured cost and uncertainty. Re-score previously archived observation at $0 without rerunning a provider.

## Cost-first execution ladder

**Level 0, $0:** deterministic schema, tool bounds, source pins, permission, world consistency, replay, context/truncation, negative cases and cost-limit preflights using fake provider or no provider.

**Level 1, $0:** re-score already paid and securely archived traces, compare prompt sections/tool decisions/response quality and write human annotations; never call provider just to change score rubric.

**Level 2, separately consented tiny actual call:** select ONE hypothesis, ONE scenario and ONE frozen recipe; no judge calls, no model fallback, no parallel replicas, no exploratory extra rounds outside explicitly bounded mission. Preflight must prove actual joined player/GA/Worker end-to-end using zero-cost transport first; verified price metadata, strict worst-case microusd hard cap, existing grant and durable reservation must all pass. Owner explicitly approves the **exact run and maximum charge**. If the provider send is uncertain, stop and keep reserved liability, not retry.

**Level 3:** paired recipe/model comparison only with a recorded reason another call is decision-relevant, a new precise owner approval and existing ledger reconciled. No scheduled bulk evaluations and no automatic paid LLM-as-judge.

Useful rubric starts with coherence, specificity, restraint, canon/source fidelity, player agency, continuity/payoff, desire to continue and explicit trade-offs for cost, latency and failure. Diagnose bad outcomes by category: incomplete context, retrieval quality, prompt/compiler, model, budget, wrong tool decisions, invalid schema or publication fence. One response should produce a reusable case, trace, causal hypothesis and next experiment recommendation, even if quality is poor.

## Integration with Chamber and Admin

[CH01](../2026-11-22--ch01-chamber-experiment-workbench/CHANGE.md) is the intended workshop for selecting synthetic scenarios and draft recipes; Admin configuration governance [CFG02](../2026-11-22--cfg02-admin-policy-management/CHANGE.md) is a *separate later role* and must not conflate testing a draft with publishing it. AI02/AI03 eventually support historical exact request/context inspection. Do not expose private real-user prompts broadly in eval artifacts.

## Promotion blockers and cheap proof

1. Inspect the actual completed WR11 player/provider continuation and effective CFG01 policy snapshot; identify exactly one provider dispatch gate, refund/uncertain semantics and legitimate trace reader.
2. Inventory existing Lab Support manifests and evaluators for reuse; decide one versioned experiment record and retention/privacy model. Prevent duplicate evaluation packet formats or unnecessarily paid scoring.
3. Define a tiny human-usable report with explicit **observed** rather than invented cost; zero price/reserved and unknown charge must never be conflated.
4. Prove deterministic and replay-only evals have **zero possible model send**, including when a developer runs all tests/CI by mistake; prove one-call preflight rejects unauthorized/stale-priced/over-budget/unknown-charge cases.
5. First paid experiment requires *separate specific user confirmation*, even if a prior WR11 packet lists a maximum hypothetical allocation. Missing approval → NOT RUN.

**Suggested first milestone:** take one previously archived fake/offline Writer continuation, run free validity/retrieval/creative rubric, save annotations and a compare-able immutable experiment report. No extra package unless the existing Lab Support cannot properly own it.

**No new paid run, subscription, provider credential or implementation is authorized by this Proposed packet.**
