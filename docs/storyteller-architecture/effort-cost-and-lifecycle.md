# Effort, funding and lifecycle | configurable intelligence without expensive surprises

**Status: selected target policy, 2026-11-14.** Parent [operating model](target-operating-model.md), [prompt/model transport](prompt-tools-and-models.md). Existing authority: [effective usage policy](../technical/usage-policy.md), [context/cost](../technical/context-and-cost.md), [time](../time-and-autonomy.md), [provider attempt ledger](../../packages/application/src/storyteller/budget.ts), [captured resources](../../packages/storyteller/src/tasks/resources.ts). No entitlement, billing, domain clock or production route changes authorized.

## Don't encode intelligence as “Plan A: 10,000 tokens”

The practical decision isn't whether a premium user gets a longer prompt. It is how much **relevant work** a specific task is worth given the player's creative direction, its current uncertainty, the authorized route and available funding. A premium model can be wasted on one sentence of idle dialogue; a cheap model given too little relevant history can invent a life.

The intended relation is a **minimum of independent constraints**, not one aggregate multiplier:

~~~text
Platform safety ceiling (never overridden)
    ∩ Account entitlement / effective identity authorization
    ∩ Payer funding grant, reserved amount and window
    ∩ Story/campaign selected optional effort and consent
    ∩ Task purpose/minimal evidence needs and source permission
    ∩ Provider route capability/price/timeout
    ∩ Current operation remaining budget and actual call sequence
          ↓
    Captured effective task recipe and immutable operation envelope
          ↓
    Actual funded/authorized dispatch attempts, each separately settled
~~~

**Capabilities** (could use research tools, can access premium route), **budget** (may spend X), **creative preference** (quiet vs driven, richer prose), and **need** (missing exact gift history) are different fields. Never allow a tier to change canonical dice probabilities, actor permissions, accepted time, private visibility, or mechanically sanctioned death.

## Three effort decisions

1. **Task purpose:** opening, dialogue, consequence, controlling interruption, historical report, optional maintenance/direction. Select using **actual committed application event** and current permitted result schema. A report cannot be upgraded into a current-turn author just because a user paid more.
2. **Evidence complexity:** current state complete, direct linked source needed, uncertainty around identity/time/contradiction, long-return context, or broad optional creative possibilities. Deterministic need flags first; model can request further reads only within captured allowance.
3. **Budget tier/route fit:** evaluate model capabilities and protected final output. Choose cheapest **adequate** candidate recipe that meets mandatory context; richer route offers optional depth when user and payer permit and evaluations show quality gain.

### Suggested internal task plan shape (design sketch, not deployed DTO)

~~~ts
type StorytellerWorkPlan = {
  purpose: 'opening' | 'dialogue' | 'consequence' | 'interruption' | 'report';
  source: { storyId: string; passageId?: string; operationId: string; rootHash?: string };
  mandatoryEvidenceIds: string[];
  optionalEvidenceNeeds: Array<{
    question: string; value: 'critical' | 'helpful' | 'texture';
    sourceScope: string;
  }>;
  creativeProfileRevision: string;
  policy: { entitlementRevision: string; payerGrantId: string; effectivePolicyVersion: string };
  recipeId: 'single-turn.v1' | 'repairable-turn.v1' | 'memory-exploration.v1';
  routeId: string;            // authorized, pinned
  maxRounds: number; maxReadOperations: number;
  maxRetainedSourceBytes: number;
  maxInputTokensPerRound: number; maxInputTokensTotal: number;
  maxOutputTokensTotal: number; maxReasoningTokensTotal: number;
  maxCostMicrousd: string; deadlineMs: number;
  reservedFinalTokens: number; reservedFinalMicrousd: string;
};
~~~

**Exact physical fields** should reuse existing Zod task/resource/usage schemas and remain server-internal. Never store a second competing copy of effective authority that can drift; capture version and contributing policy sources as already done. Task plan is immutable once a paid attempt begins. Before dispatch, re-evaluate whether captured authority remains valid, with explicit downgrade/revocation semantics rather than blind client tier strings.

### Task recipe hierarchy

| Lane | Use | Model/read budget style | Failure behavior |
| --- | --- | --- | --- |
| **Deterministic-only** | Pure mechanics, status, ordinary accepted work, fact-based return | Zero model calls and no provider request | Honest current state; optional narration deferred |
| **One-shot** | Familiar dialogue, simple report or grounded consequence | Exactly one final packet; no model-tool reads | Invalid output requires explicit nonfree repair policy or hold |
| **Repairable one-shot** | Structurally difficult outputs needing one permitted repair | First final + one reserved repair under same operation | No extra call after unknown charged result |
| **Evidence-seeking** | Known missing exact source or complex identity/continuity | 2–3 rounds today, bounded asks/read, protected final | No match/partial/limit causes conservative final if noncritical, otherwise hold |
| **Richer deliberation (future experimental)** | High-value constrained narrative dilemma, complex long-return or optional source director | Multiple candidate ideas / source checks within same hard envelope; no automatic agent fan-out | No model-created world event when budget exhausted |

**The work-plan selector is not another LLM by default.** Deterministic flags can detect explicit relationships/older source references, presence of source links, missing current evidence, active-scene length, stale index/overlong context and task type. A model could choose whether to use the already-granted `needs_context` round; it cannot request model upgrades.

**No mandatory escalation:** if a cheap player has sufficient current truth, a one-shot result can be excellent. If a higher budget exists but no missing source, skip extra reads. If a low funded route cannot fit mandatory evidence, don't produce a deceptively simpler wrong answer; show a true hold or require a smaller supported task/schema.

## User-facing configuration versus operator policy

**Player controls** should be understandable and not promise mechanics they don't change:
- Storyteller style and narrative initiative, captured creative revision (what kinds of situations/quiet/direction may be authored);
- Optional detail/research preference such as **Concise / Balanced / Detailed**, with truthful scope and not numerical token salesmanship;
- A separate **spending cap/allowance display**, with explicit consent for any paid overage when commercial policy exists;
- Independent in-game risk, autonomy/absence and notification settings, which are **not** model effort knobs.

**Operator controls** (privileged backend contract, future admin): allowed provider routes, effective policy ceilings, task purpose permissions, concurrency and cache modes, account/story sponsorship grants, background work budget/frequency, fail-closed resource caps, audit and emergency stop. No frontend-only override.

**Tier plans**, if eventually sold, grant capability envelopes, not fixed prompts. A plan may offer better quality or longer optional evidence retrieval when actual money and route policy allow; do not promise “200 turns” when costs vary.

**Captured player choice:** If the story's user selects restrained prose, a larger tier doesn't force walls of description. If the user wants rich psychological fiction, a cheap route may admit fewer optional elaborations but still must respect mandatory state. Cost does not define taste.

## Time: three clocks and one deadline

| Clock | Source | Controls |
| --- | --- | --- |
| **Fictional world time** | Accepted game action/clock and deterministic settlement | Character effort, progress, results, risk; never provider latency |
| **Real world scheduling** | Worker timers for accepted activity boundaries, response windows if separately authorized | When a boundary is eligible, not when model has “thought enough” |
| **Model processing time** | Generation operation latency, queue and transport | How long UI says awaiting narrative, not earned fictional time |
| **Operation deadline** | Captured maximum service time/timeout and admission policy | Whether more model/tool work is permitted, not a forced story turn |

A Storyteller might take seconds or minutes. The player sees an **accepted intent or committed result** and a pending/held/uncertain narration status. A lengthy LLM job does not grant six hours of fictional work, and an interrupted already accepted activity must not lose earned progress. The page can be closed; task state and outbox survive. Refresh triggers GET reconciliation, not a new model call.

**Speculative preparation** may run before a scheduled settlement only under the existing bounded version/receipt fence. A speculative candidate remains private even if model output arrives early. The model's timeline must not decide actual clock progress. If the world changes, old candidate may become stale without recharging automatically.

**Backpressure** for thousands of users: per-story controlling task exclusivity, provider/route concurrency, per-account grant windows, platform spend ceiling and queue fair scheduling. Mostly quiet stories produce zero provider traffic. Optional reports/canonical memory indexing can be deferred, coalesced and bounded separately; never let nonessential creativity starve required current-scene publication.

## Failure and budget-exhaustion matrix

| Stage | Examples | Truth that must persist | Next legal action |
| --- | --- | --- | --- |
| Before admission | No grant, unsupported route/JSON, mandatory context too large | Player request not accepted as paid work; existing story unchanged | Explain denied/hold; revise setting or grant separately |
| After admitted cause, before transport | Outbox delay, missing immutable source, denied dispatch authority | Accepted operation, current passage and any earned mechanics stay | Safe held status, same ID preparation/recheck; no re-roll |
| Reserved but confirmed unsent | Provider unavailable/invalid schema before dispatch | Funds released/reconcilable as unsent; no fictive model result | Same operation retry only if allowed, not new UUID |
| Transport dispatched, ACK lost | Timeout, 5xx with unknown billing, partial SSE | Attempt remains uncertain, reservation retained conservatively | Status/receipt reconciliation or operator, **never automatic replay** |
| Received invalid candidate | JSON/schema/evidence mismatch, plan violates permissions, output length cutoff | Usage charged if provider confirms it; no world publication | Captured bounded repair if valid, otherwise blocked with source |
| After valid output, before commit | Source revision/root changes, game settled differently | Current newer story truth wins, old task remains audit | Mark stale/blocked; no overwrite or automatic duplicate spend |
| Publication failure | Unreadable CAS, DB transaction conflict, forbidden plan | Original passage/receipt remains intact, no fake success | Safe retry/reconciliation under existing publication operation |
| Optional maintenance exhausted | Recap/index/direction not funded | Main story unaffected; coverage gap acknowledged | Skip/coalesce optional work, no hidden debt |
| Account grant revoked | Tier revoked or sponsor paused | Verified existing stories readable where permitted | New dispatch fails; in-flight liability reconciled under original payer |

**Failure state categories are different from UI messages.** Show concise player-readable status; keep internal provider code and secrets in authorized diagnostics only. No $/time estimate invented from local browser clocks.

## End-of-operation reconciliation

At task completion retain:
- immutable task/result/source identity and version; source/evidence-use/omission manifest;
- each attempt's reserved, dispatched, settled or uncertain state, provider route, actual tokens/cost and duration;
- model rounds/read operations/retained bytes, final/repair usage and any blocked reason;
- publication's exact game revision/root/offer and its acknowledged result;
- independent quality/evaluation label when a human or offline probe supplied it.

Raw provider messages and private narrative sources need access controls and retention; don't copy full prompts into logging, admin UI or public history. Money accounting and player gameplay truth are different metrics.

**Billing correctness cannot be delegated to the model or inferred from a cached token count.** The runtime must cap worst-case cold cost including any cache write, output and reasoning, then settle actual provider-reported usage with conservative ambiguity handling. A potentially billed failure may leave no publishable story, and its cost still counts.

## Deployment and compatibility

All old saved generations and attempts must still decode under versioned readers; do not rewrite old runtime tasks into a new recipe just because new defaults exist. A story's captured creative profile and funding authority stay pinned for in-flight generation. Any future upgrade changes **new** tasks with explicit effective policy, not the attempt that already went to a provider.

A new route provider may have a different context limit, structured-output protocol or cache behavior; its capability contract must be verified and versioned separately. Avoid global rollout by process env that switches all in-flight tasks to a new model endpoint.

No automatic model-induced developer changes, no YAML saga engine and no token billing inside React.

## Minimum proof and stop rules

1. Pure recipe tests show every dimension is an **intersection**, zero disables, a low tier cannot create missing evidence, and richer funding cannot bypass rules/risk.
2. A cheap one-shot with sufficient source makes zero tool reads; a complex exact-person recall uses permitted source reads; both submit the same type of authorized plan validation.
3. Duplicate worker/HTTP reconcilation never resets operation budget or creates another accepted task/paid attempt.
4. 2–3 model rounds share exactly one operation budget; invalid output repair consumes its reserve; final answer capacity is protected before research.
5. Provider unavailable, input overrun, mid-stream unknown billing, and stale publication yield distinct durable public-safe states.
6. Large story / 2k-scene case measures context and CAS/search I/O per turn; mostly sleeping stories scale without model work.
7. A human can tell whether their character has legitimately progressed, even when the model is still processing or money runs out.

**Policy motto:** spare money buys optional creative care when it helps. It does not buy different reality.
