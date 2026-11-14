# Storyteller evaluation | test a life, not a valid JSON envelope

**Status: selected evaluation design, 2026-11-14.** Authority [vision constitution](vision-and-quality-constitution.md), [connected POC evidence](../engineering/connected-poc-proof.md), [offline memory corpus](../engineering/long-story-memory-and-retrieval.md), [Storyteller tuning manual](../engineering/storyteller-tuning.md). No live model spend or destructive DB access is authorized.

## Why existing tests are necessary but not enough

The code has many real safety/serialization tests, and historical connected `storyteller.v16` managed six generations and a deterministic work completion. That proves a narrow functioning causal chain; it **does not establish an enjoyable full campaign**, consistent emotional tone, meaningful return months later or that the model uses all admitted memory. The historical 200/2000-scene lexical benchmark reported retrieval and assembly, not actual final model source use.

The target is **evidence at five distinct layers**, not a single magic “agent score”:
1. **Mechanics truth:** admitted action, time, roll, partial progress, state, hold and exact-once effects.
2. **Evidence quality:** required source exists, eligible, selected, exact body read, final prompt included, actually used/cited and published correctly.
3. **Agent work quality:** selected recipe, useful tool questions, no redundant reads, stops when enough; cost/latency and failure route.
4. **Narrative quality:** coherent intent satisfaction, profile faithfulness, option distinctness, earned consequences, character voice and ordinary life.
5. **Longitudinal playability:** after return/interruption/long quiet periods, the player feels continuity and wants another choice.

These are measured separately: perfect JSON is compatible with bad fiction; a compelling paragraph can be mechanically false.

## Provider-free scenario corpus (stable source identities)

| ID | Fixture and real question | Must carry / must not fabricate |
| --- | --- | --- |
| **L1 Work** | Greywake repair accepted 0→3/9 then held by visitor | Partial work persists; no total completion/reward; meaningful response |
| **L2 Long trip** | Ten hours permitted travel with sparse meaningful boundaries | No per-tick model calls; proper fictional vs model time; interruption and returns |
| **L3 Failed persuasion** | Small talk or failed reassurance with genuinely unchanged facts | No automatic successful persuasion; doesn't simply resend exact same ineffective offer as novel |
| **L4 Gift / trust** | Give one unique object to known character; 20 unrelated turns; revisit promise | Correct holder/recipient/source exact conversation; no duplicate gift |
| **L5 False report** | An attributed rumor corrected later | Claim vs canon distinguished; older source remains readable; newer fact wins |
| **L6 Quiet months** | Shopkeeper/gardener lives ordinary weeks, some intentional routines and social contact | No compulsory plot urgency, fake daily dice/prose, hallucinated relationship growth |
| **L7 Nonhuman** | Microbe/atmospheric electrical intelligence in different physics | No body, inventory, currency or human travel assumed when not applicable |
| **L8 Distinct profiles** | Same frozen world/receipts, Quiet Eerie vs Absurd Comedy vs Drama | Distinct language/initiative within exact same authorized mechanics |
| **L9 Causal loss** | Item transfer interrupted mid-flight, another agent legitimately has item | Interrupt no roll/receipt, source-linked consequence, no stale offer |
| **L10 Long memory** | 200 / 2000 scenes with ambiguous aliases, old exact quote, multi-hop and fork | No wrong person/branch/source, partial coverage explicit |
| **L11 Controlling outage** | Charged attempt timed out, budget exhausted, source root missing | No fresh charge/reroll/fabricated publication; last verified passage readable |
| **L12 World shifts** | Narrative changes environment between tightly scoped scenes | Published facts/creative setting authority remain distinct from frontend visual styling |
| **L13 Creative negative** | Player selected low drama and no aggressive story direction | A valid quiet moment with one/no new offer where mechanics support it |
| **L14 Shared future** | Two players/consented delegation scenario (later GM authority) | Never assume the second participant's consent or select their action |

Use real existing fixture names/data where maintained, not hardcoded narrative content inside generic source modules. The first few already correspond to maintained test harnesses; missing later mechanics remain **explicitly unavailable** rather than invented in tests.

## Measurement protocol

### A. Reproducible provider-free diagnostic lane

For each scenario capture:
- source story ID, versioned profile, task/prompt/recipe/route and canonical root;
- exact current game/actor/offer/receipts/clock and authorized actions;
- selected/omitted source handles and reasons, final provider-request (or scripted equivalent) section hashes and bytes;
- tool need, query, results, exact read, limits, terminal state and model-round plan;
- local semantic validation, scripted output, publication consequences and replay idempotency;
- model-free context/retrieval index build/read and SQL span timings.

**No provider calls** in the default test lane. A fake final output can prove source routing/validation, not model comprehension or taste. A retrieval benchmark should explicitly say generation was *not run* when true.

### B. Small live provider evaluation, only after owner approves spend

For a **frozen identical input**, capture one approved route/profile/prompt variant and one challenger, same effective cost cap and source/policy. Use at least a few independent seeds/trials for stochastic quality; never claim superiority from one response.

Compare:
- valid/accepted/published fraction and first-attempt acceptance;
- actual token categories including cached tokens, cache writes and reasoning, reported charge;
- wall-clock queue/input/tool/model/publication times;
- evidence recall and forbidden/incorrect source use;
- intent and result coherence, meaningful distinct options, tone/rhythm, absence respect;
- human preference and whether the next choice seems worth making.

**Define stopping conditions before spending:** max absolute money, model calls, rounds, deadline, no auto retry of uncertain attempts, provider/route pin, no hidden evaluator LLM unless separately funded. A trial with missing provenance or stale root is invalid; don't “repair” the benchmark mid-run and compare incomparable cases.

### C. A complete connected owner-play POC

One real authenticated campaign, prepared/custom creation → opening review → Start → choices → accepted extended work → interruption/quiet life → return after meaningful later developments → Journal → new current decision. Use **10–15 actual meaningful Storyteller turns** as a provisional human quality checkpoint, not a throughput performance metric. The owner should want to continue, recognize the selected profile and be able to explain why actions mattered.

Variants include one nonhuman or very different world, at least one old personal callback and one no-spend wait/quiet interval; a single story doesn't establish cross-world quality. If something feels bad, inspect **which stage** failed before changing prompts: absent source, source selected but not sent, source sent but ignored, candidate invalid, correct but mechanical offer too narrow, bad pacing, model route or render issue.

**No connected test or paid trial is approved by this document.** The later live Change must list the precise allowed provider/money/test accounts and preserve existing data before any potentially destructive DB reset.

## Human taste and negative quality patterns

Record both objective and subjective outcomes:
- **Agency:** action and player motive actually shape the next situation.
- **Continuity:** old promise/gift/place has source-grounded causal relevance, not just name-dropping.
- **Creativity:** plausible concrete local opportunities, not generic “investigate, leave, talk” repeated.
- **Tone:** selected Storyteller feels distinct; no universal mandated heroism or conflict.
- **Truth:** no new item/reward/health/social status without admitted effect; future private plan not public canon.
- **Economy:** no unnecessary tool reads, extra rounds, long latency or unbounded background work.
- **Comprehension:** human can tell whether action started, stopped, resolved or was blocked and why.
- **Return desire:** would the player willingly pick it up next time?

Use a small calibrated rubric for comparative A/B review, but avoid opaque single LLM “fun score.” Specific disliked moments and missing facts are more diagnostic than average adjective ratings.

### Known failure signatures worth preserving as regression cases

- A generated process outcome says “you notice something useful” with no concrete result.
- A later plan copies the previous six-coin reward into unrelated outcomes.
- A note cites an old passage for a fact only revealed now.
- A relationship is mentioned but never preserved in source-backed records; later search cannot find it.
- A profile chooses a frightening or comedic scene despite contrary captured direction.
- The model describes a success after a failed check, or shows unearned progress during hold.
- Prompt schema truncated at output limit; repair has no final capacity left.
- Retrieval returns correct source, but it is pruned before the final request or used with invalid temporary handle.
- A memory loop consumes paid rounds for current facts already present in typed state.
- Provider spend uncertain, but UI / worker auto re-dispatches and double charges.
- A story restarts active-scene scope and loses a low-drama commitment that should have remained relevant.

## Retrieval-specific benchmarking

Maintain the existing 12-case synthetic memory oracle and evolve with labelled truth, not by changing expected answers until a new backend passes. Metrics by *stage*: candidate recall, source precision, forbidden retrieval rate, context assembly coverage, final prompt inclusion, model evidence-use, publication continuity and later return. Compare indexed lexical, direct alias/relationship, local hybrid and episodic routes under **equal read and final input budgets**. Include 200, 2000 and larger histories plus multiple languages and fork isolation.

Avoid buying an embedding API or GPU merely to get a “vector RAG” checkbox. Promote only if it beats the baseline on actual missing cases without unsafe precision/maintenance tradeoff.

## Multi-tenant and cost stress without a model

A provider-free load trial should show:
- thousands of mostly idle stories cause no Storyteller inference;
- concurrent same-story controlling tasks serialize, different stories can progress independently;
- root-linked indexing/caches avoid redundant full-source reads for repeated return questions;
- every attempt has captured payer/funding authority and aggregate platform cap;
- omitted optional maintenance doesn't block current authorized player action;
- gradual failure of CAS/provider leaves valid existing stories readable and status/recovery truthful.

Latency charts should separate SQL locks (ENG03 owner), CAS/index, model queue, provider transport, validation and publication. A single “Storyteller took 28 seconds” number is not enough to optimize.

## Acceptance ladder and honest report

| Level | Required proof | Status by default |
| --- | --- | --- |
| 0 Target design | Constitution, contract and alternatives defined | Documentation only |
| 1 Deterministic / mocked agent | Parser/authority/source and expected negative states under repeatable fixtures | Doable with zero provider cost |
| 2 Disposable SQL / worker | Transactions, retries, source roots, holds and same-story concurrency | Explicit throwaway DB permission required |
| 3 Bounded connected model | Captured prompt, real route, evidence use, cost/latency and accepted output | Explicit money/provider permission required |
| 4 Connected full life | Multi-turn, interruption, source-backed long return, cost and browser truth | Not proven merely by level 3 |
| 5 Unprompted owner/player quality | Actual preference to continue, meaningful distinction across directions | Human observation required |

**The current historical connected POC remains unaccepted** despite a handful of successful turns. This evaluation program is how the project earns a stronger claim, not a promise that the present engine is already good.

## Evidence artifacts and privacy

Store versioned, compact **run manifest** (task/route/version/root, source coverage, operation IDs, measured costs/latency, test setup) and redacted step trace. Raw paid provider responses or private creative proposals are protected, optional source artifacts and must not be committed into Git or exposed in public StorySnapshot. Attach source hashes and test commands; clearly label simulated vs real.

A reviewer should reconstruct *why* one bad response happened by opening a single run manifest, not 100 unstructured JSONL files.

## When to stop building

- If a smaller prompt + deterministic direct source read makes the same quality at lower cost, stop adding agent tools.
- If a new memory tool improves retrieval but degrades final prose/publishing, diagnose downstream; don't celebrate retrieval-only green.
- If connected repeated runs fail despite valid schemas, revisit the **game-mechanics affordance** or selected Storyteller profile rather than endlessly “tuning the prompt.”
- If a richer agent consumes twice the money for negligible improvement, don't make it the default, even for premium tiers.
- If a story is genuinely quiet and nothing is admitted, **do nothing** rather than invoking a model to create activity.
- If an implemented pattern requires new actor/consent/domain rules, send it to the GM/engine authority program; Storyteller must not invent the missing rule in prose.
