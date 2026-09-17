---
id: DOC-AI-BUDGET
layer: product
status: draft
domains: [ai-experience]
tags: [affordability, autonomy, offline-play, continuity]
updated: 2026-09-16
relations:
  - type: derives_from
    target: DOC-PRODUCT-PRINCIPLES
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-KNOWLEDGE-BELIEFS
---

# AI contribution, spending and degraded play

Confirmed direction: selective LLM use, substantial game logic, affordable unattended life, and configurable model/spending preferences (D003, D028, D030). Denis's examples range from a few cents to roughly a dollar or somewhat more for a week away. They express a desired affordability range, not an accepted budget or measured feasibility result. All contracts and numbers below are proposals.

This document owns when expenditure is justified and what the player experiences. Provider integration, algorithms, data structures and specific model selection remain technical work for later.

## Three responsibilities

**Mechanical resolution:** eligibility, movement, time, resources, checks, damage, wages and lasting effects belong to explicit game rules. Rules can include randomness and interacting systems; they need not be a script for every story. An LLM must not calculate a different result merely because the player chose a richer narration profile.

**Character choice:** select an intention or action using that actor's permitted knowledge, personality and circumstances. Either ordinary logic or a bounded LLM contribution may serve this role. A stronger model is not a more intelligent character by default. It still portrays the chosen character, including foolishness.

**Presentation and content:** dialogue, description, explanation and constrained invention can benefit from models. Prose that introduces an item, promise, route or power is not harmless decoration merely because it arrived in a narration response. Consequential additions must become explicit, checked facts before later mechanics rely on them.

The minimum viable cheap experience needs coherent mechanical and decision behavior. Endless templated prose is not enough, but neither is expensive prose evidence of deeper simulation.

## Candidate decision nodes

Each selected node needs a trigger, relevant facts, allowed output, authority, latency tolerance, expenditure ceiling and fallback. “Use AI if needed” is insufficient. The following is an initial product allocation to test.

| Node | Ordinary handling | When an LLM may add value | No-model behavior / authority |
| --- | --- | --- | --- |
| Work progress, pay, food, rest, travel progress | Rules/data | No call for arithmetic or routine progression | Resolve supported rules; record facts without a story paragraph per update |
| Choose next routine action | Rules using traits, needs, commitments and eligibility | A novel conflict outside the supported policy, if meaningful and budgeted | Use a defined eligible fallback; pause if no valid fallback exists |
| Autonomous tactical choice | Defined game policy and allowed actions | Selected unusual strategic choice | Same legal actions, information limits and character profile; outcome still resolves through rules |
| Interpret free-text intent | Known controls/actions where unambiguous | Ambiguous or novel intent, principally during direct play | Offer supported actions or clarification; no invented successful action |
| Conversation | Rules govern facts, commitments and effects | Responsive character speech and nuanced intent | Plain factual response or wait for dialogue; disclose reduced presentation |
| New place/person/item | Existing content and constrained variants | Distinctive identity or local content when relevant | Reuse supported content or stop before unsupported creation; no invented executable powers |
| Major personal decision | Defined goals/permissions and current facts | Rare, consequential conflict where richer portrayal is worthwhile | Configured action policy or whole-world pause; not an unrestricted premium escalation |
| Distant developments | Defined processes and bounded event possibilities | Rare elaboration of a consequential connection | Maintain existing effects; do not run a conversation for every remote NPC |
| Recap and explanation | Factual change/history summary | Readable narrative at return or requested summary time | Plain facts remain available; no LLM required merely to know what happened |

These are behavioral roles, not nine services or mandatory calls. One interaction may combine compatible generation tasks. Independent actors must not receive each other's secrets simply to save tokens.

## When to spend more

Proposed preference order: use existing valid content/rules; consider a model for novelty or expressive interaction; select among models qualified for that node; apply the player's quality, latency and spending limits; use the node's fallback when no eligible call fits.

Higher stakes alone are not a reason to call a model. A lethal attack with fully defined mechanics requires correct rules. A delicate negotiation may warrant richer interpretation, but cannot authorize secret knowledge or waived costs. Player presence raises the value of expressive generation; absence should strongly favor supported logic and infrequent exceptional decisions. An unchanged scene does not justify repeated deliberation.

Avoid spending an LLM call to decide whether every routine event deserves another LLM call. A scarce richer-decision allowance must not become a target that the game tries to exhaust. Budget is a ceiling, not a required spend.

## Proposed spending contract

| ID | Draft behavior |
| --- | --- |
| AI-COST-001 | Player spending limits bind narration, autonomous choices, generation, retries and fallback models together. A character's personality cannot bypass them. |
| AI-COST-002 | Show unattended and active-play allowances separately, plus an overall limit, currency, accounting interval and reset behavior. Budget periods use real time, independent of campaign acceleration. |
| AI-COST-003 | Before admitting a paid request, its bounded potential cost must fit remaining allowance, accounting for outstanding calls and retries. If cost cannot be bounded, that route cannot satisfy a strict cap. Actual billed usage remains visible. |
| AI-COST-004 | Reaching a limit stops optional generation first. Supported mechanics and their authorized risks may continue with plain presentation. An unresolved required decision without a valid fallback pauses the whole world and records the reason. This fallback policy still needs Denis's agreement. |
| AI-COST-005 | No automatic paid upgrade, unlimited repair loop, or later burst of unrequested background narration. At most a bounded retry/fallback allowance chosen for the node. |
| AI-COST-006 | A delayed or rejected model response cannot retroactively change resolved play. A retry cannot award a second reward or spend the same fictional resource twice. |
| AI-COST-007 | Distinguish reduced presentation, paused progression and ongoing logical simulation. Never imply the character has continued living if progression stopped. |
| AI-COST-008 | Changing provider/model preserves campaign facts and accepted rule authority. Unsupported capabilities trigger an explicit fallback instead of silently changing the game contract. |

Automatic top-ups, exact reset intervals, caps and notifications are unselected. A hard API ceiling is not a promise about total hosting/electricity/storage cost. Provider fees and billable reasoning, cache operations, request charges or other services must be included where applicable; do not estimate only the visible response words.

## The unresolved fairness choice

Richer narration can vary without changing mechanical results. Richer decision-making can change which valid action is selected and therefore the story and survival odds. “All tiers use the same rules” does not eliminate that difference.

AI-F01: Recommend the initial spending preference primarily change expression and frequency of optional elaboration, with a common tested autonomy policy for consequential decisions. A later explicitly chosen simulation profile may allow model-dependent behavioral variation. Alternative: allow richer decision-making immediately, disclose the difference, and test character consistency and outcome bias across profiles. No claim of identical outcomes across different models is made.

The user explicitly welcomes hybrid logic/LLM nodes; this fork asks how far the resulting behavioral difference should go, not whether hybrid handling is permitted in principle.

## Cost arithmetic: a feasibility envelope, not a quote

Illustrative price profiles only: economical input/output at $0.25/$1.25 per million tokens, and richer at $3/$15. These are deliberately hypothetical, not a vendor recommendation or current model price. Assume 3,000 input tokens and 300 billable output tokens per call; no cache discounts, extra reasoning, tools, request fees or retries. Each call costs $0.001125 or $0.0135 respectively.

| Workload over seven real days | Calls | Economical profile | Richer profile |
| --- | ---: | ---: | ---: |
| Selected moments plus recaps | 40 | $0.045 | $0.54 |
| One call every hour | 168 | $0.189 | $2.268 |
| One call every minute | 10,080 | $11.34 | $136.08 |
| 100 NPCs, one call each per hour | 16,800 | $18.90 | $226.80 |

Forty calls is an illustrative total workload, not a promise that all campaigns fit it. On the same assumptions, a $0.50 cap admits at most 444 economical or 37 richer calls before other charges. A reasonable target to investigate is a quiet unattended week below $0.10 with a selectable $0.50 ceiling; both remain proposals. A disruptive week must fit the cap by reduced generation or an explicitly reported pause, not by secretly spending more.

Active conversation has a different envelope. One hundred interactions at 6,000 input and 600 output tokens each would cost $0.225 or $2.70 under those same hypothetical rates. Multiple calls per interaction multiply that. A longer campaign must not require sending its entire history on every turn; identify only the established facts needed for the node. Later technical work chooses how.

## Providers and qualification

Research checked 2026-09-16: OpenRouter documents model fallbacks and provider routing with price, latency and throughput preferences. Its provider `max_price` is a unit-price filter, not our campaign's weekly expenditure policy; performance preferences are not guaranteed response times. This supports considering it as an integration candidate, without choosing it. [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks).

Its pricing page currently lists a 5.5% pay-as-you-go platform fee; exact checkout and billing terms should be checked when selecting a route. Our arithmetic excludes that fee. [Pricing](https://openrouter.ai/pricing).

Qualify models by role using the same small scenario set: valid permitted actions, respect for hidden information, portrayal of traits, consistency, useful prose, actual latency, all-in cost, and fallback rate. Fast/cheap/smart/vivid are separate properties. A model that frequently needs repair may be poor value despite low token prices. No live paid benchmark or account setup was performed for this review.

## What must be decided next

World preparation and genuinely new mechanic authoring have a separate cost/latency envelope from unattended play (D034). A budget for a cheap week must not silently authorize expensive setup or mid-campaign extension work. Generate and check reusable behavior when required, then resolve supported routine instances through it. The [preparation contract](../worlds/starting-worlds-and-content.md#mechanical-variety-and-simple-setup) owns how unsupported mechanics are disclosed. A scale transition does not automatically authorize generating every newly relevant microscopic entity or repeatedly asking a model for physical laws.

Resolve AI-F01, actual setup/active/unattended limits and the explicit essential-no-fallback policy. Ordinary supported continuation is the current direction; browser/computer-closed progression and phone contact are already selected by D038, not an unresolved availability choice. Use [reference scenarios](../validation/reference-campaigns-and-journeys.md) to expose the experience before choosing infrastructure.

## Caching and an achievable web MVP

Distinguish three optimizations: reuse already generated world content; reduce/reuse repeated model input where a provider supports prompt caching; and manage inference KV/prefix caches when operating a model-serving runtime. They solve different problems. A cache is not the authoritative campaign state or a substitute for retrieving the correct current facts.

Official OpenRouter documentation describes provider-dependent prompt caching. That is a candidate for hosted inference; cache eligibility, routing, lifetime and charges need validation. [Prompt caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching), checked 2026-09-16. vLLM documents prefix caching that reuses KV state for shared prefixes; this is a serving-runtime capability, not control over a hosted provider's GPU from the web application. [vLLM prefix caching](https://docs.vllm.ai/en/v0.9.2/features/automatic_prefix_caching.html), versioned documentation checked 2026-09-16.

Recommend generated-content reuse, bounded per-node context, actual usage visibility and provider-supported caching where beneficial for the initial app. Treat self-hosted GPU serving/KV optimization as a later experiment unless a measured workload justifies it. Do not promise a GPU cost saving without comparing operating expense and maintenance. Ordinary ticks, map movement, wages, inventory and factual notifications should need no model call.

World creation may dominate a short demo's inference cost; frequent active dialogue could dominate a longer campaign. Measure setup and ongoing usage separately. Omitting dialogue in the first release is a valid proposed saving, not proof of a particular weekly bill. In an account-hosted web platform, do not share private campaign context or generated responses across users through an incorrectly scoped cache.

## Generation and director inference envelopes

For D043, distinguish world preparation, occasional director deliberation, actor choice and narration. They may share a model or use different models; none requires an always-running LLM process. Recommend logic to identify eligible decision opportunities, with a bounded real-time allowance and campaign pacing policy for model use. Accelerating fictional time must not multiply paid calls without limit. Skipping an optional director call preserves ordinary simulation; it does not silently skip an already admitted event's mechanical consequences.

Generation context should include the premise, supported constraints and established facts needed by the current responsibility. Director context should include relevant places/actors, current consequential state, selected unresolved threads, recent outcomes, authority limits and applicable policy. Actor context must respect that actor's knowledge. Do not send the whole world/history to every node, and do not let a summary replace authoritative facts. Later technical design chooses retrieval, versioning, reusable prefixes and invalidation.

Record the purpose, bounded allowance, admitted/rejected result and actual usage of each call sufficiently to evaluate it. Bound tool steps, retries and delegation as part of the same allowance. Compare the director with a procedural baseline for coherent consequences, useful variety, contradiction rate, latency and cost. If richer selection changes world events, disclose that behavioral effect; AI-F01's fairness choice also applies to directing. A cheap unattended week remains a cost target to measure, not guaranteed by calling a component an agent.

## Storyteller styles share an inference contract

D045–D046 intend LLM-based incident creation/selection across selectable styles. A preset is behavioral configuration, not necessarily a separate agent process or model. Supply the active style, allowed incident/effect space, relevant state, recent incidents and selected unresolved threads. Use logic for eligibility, pacing ceilings and budgets; use the model where creative selection and connections add value. Ordinary simulation and admitted consequences remain independent of whether the next optional call is affordable. Procedural fallback or deferred optional incidents must be explicit degraded behavior, not a claim that an LLM is still directing. Evaluate preset differences in actual event choices/cadence and coherence as well as prose; test that switching cannot reset spend or bypass limits.

## Long-gap continuity without population inference

For D047–D048, context selection must find relevant established entities, object transfers, relationships and unresolved obligations, not merely recent prose. A storyteller that recalls Bob but forgets that his spear was destroyed is not consistent. Use compact current facts plus relevant history as requirements; exact retrieval, indices and memory mechanisms remain technical choices. Summaries and caches are aids, not authority. Dormant entities need no recurring model refresh. Measure continuity across long gaps and cost against relevant context size, separately from total lore size and active simulation load.

## Technical handoff: storyteller context and tool experiments

For v0.01, derive a small, inspectable context/tool contract from these product boundaries. This is an assistant design recommendation, not a selected framework or tool schema.

- Context separates binding campaign facts, character-visible knowledge, last observations, unresolved threads and nonbinding storyteller plans. Relevant old connections must be retrievable beyond recent prose.
- Read access and creative proposals are distinct from committing mechanical changes. A proposed incident can contain new entities and supported effects, but validation and current permissions decide admission.
- Generated prose, user world descriptions and retrieved lore are content, not authority to change budgets, policies or tool permissions. The narrator cannot execute arbitrary code or obtain unrestricted database access merely because a story asks for it.
- Bound model calls, context size, tool steps and repair attempts per responsibility. Demonstrate a quiet interval without calling a model to decide every tick whether another call is needed.
- Inspect input context, proposed output, admission/rejection reason, resulting facts and usage in a development view. Keep hidden world facts out of the player-facing recap; diagnostic access is not character knowledge.
- Evaluate a small repeatable set: valid incident, contradictory identity/custody, omitted old obligation, hidden-fact leakage, unsupported effect, stale response, exhausted budget and nonresponse fallback. Keep mocked runs distinguishable from paid live evaluation.

Do not turn this into a second product specification or a mandatory multi-agent design. The experiment should reveal where retrieval, constraints or creative variety fail and guide the next small change.
