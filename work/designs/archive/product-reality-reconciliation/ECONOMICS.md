# Storyteller economics and quality | falsifiable gates, not fantasy token accounting

## Observed versus imagined

- `docs/technical/storyteller/request-context-and-cost.md:169` records a **single actual** Sol provider generation: 6,626 prompt + 673 completion tokens, zero reported reasoning and cache read, 6,623 cache-write, and **23,294 microusd = $0.023294** settled. This is useful evidence of one packet, **not** median, tail latency, monthly spend, memory accuracy or gameplay quality.
- The same doc's `#a-concrete-cost-envelope` provides **invented arithmetic rates**: $0.50/M input and $2/M output. At 8,000 input + 1,000 output, one call costs **$0.006**; 2 calls/day costs $0.084/week, and a five-minute polling loop costs $12.096/week before overhead. This demonstrates that **frequency is as important as model list price**.
- `research/authored-scenarios/storyteller.md#the-current-call-without-the-agent-mystique` says the ordinary provider task has no callable tools. The bounded read/ask memory protocol has tested provider-free paths, with broader provider-driven integration pending.
- `STATUS.md` records six historical connected Sol generations and specifically disclaims sustained live 10–15-turn quality proof. This snapshot excluded archived evidence and was not used to replay paid tests.

## Why the user's subscription analogy isn't an API cost estimate

A $20 consumer chat subscription is not an invoice for the exact tokens, models, peak context, tools, caching or reasoning work used in that account. It may involve product-specific limits, model selection, pooled economics and other internal factors we cannot observe. We cannot infer whether past conversation activity would have cost $50, $5,000 or $50,000 at a particular API route without actual logs. Retail API rates are the costs the RPG developer needs to plan against; we should neither assume free model-owner capacity nor forecast bankruptcy without measurement.

AI Dungeon is a relevant counterexample to "no LLM story products exist": it exposes model/context limits and credits for expanded context. That actually supports the trade-off: *the user experience has to be shaped around finite inference economics*. See its public Help Center memory/context and memberships pages. Current provider prices should be re-read at execution, not embedded as eternal product facts:

- <https://developers.openai.com/api/docs/pricing>
- <https://openrouter.ai/pricing>
- <https://help.aidungeon.com/faq/what-are-tokens>
- <https://help.aidungeon.com/faq/what-are-advanced-settings>

## Transparent hypothetical cost ladder

**All table prices are invented for comparison, not current price quotes.** Costs exclude storage, worker hosting, embeddings, image generation, taxes, fees and failed-dispatch charge uncertainty unless explicitly included.

| Recipe | Per accepted turn assumption | Calculation | 30 turns | 1,000 turns |
| --- | --- | --- | ---: | ---: |
| Minimal | One 8k-input/1k-output call at $0.50/$2 per M | $0.006 | $0.18 | $6 |
| Observed-call repeat | Historical Sol call exactly repeats at $0.023294 | $0.023294 | $0.69882 | $23.294 |
| Exploratory | Three fresh rounds, each 30k input + 2k output at $2/$10 per M | 3 × ($0.060 + $0.020) = $0.24 | $7.20 | $240 |
| Bloated agentic | Five rounds, each 100k input + 4k output at $2/$10 per M | 5 × ($0.20 + $0.04) = $1.20 | $36 | $1,200 |

These round counts are deliberately exaggerated stress illustrations, NOT evidence that the engine currently performs them. A single cheap generation can be viable. A feature that requires repeated high-context exploratory rounds and elaborate repairs can destroy unit economics quickly. More importantly, **a cheap but incoherent 30-turn experience has zero product value**.

## Proposed development experiment, two stages

**Stage A: entirely provider-free.** Reproduce current package metrics at a clean SHA. Audit exact rendered request/schema bytes, input ceilings, reasons for holds, repairs, source coverage, provider attempt counts, failed/result discards, ledger reservation ceilings. Run deterministic fixtures covering 20–30 turns, full restart, one object transfer, one later recall cue, one interrupted commitment, one irrelevant-scene recall negative. These tests prove mechanics and request budgeting only, not creative quality. Do not install or download Cognee, graph indices, embedding models or paid services.

**Stage B: separately authorized tiny live human-play evaluation.** First obtain actual route/model, price snapshot, account funding balance, absolute reservation cap, per-task max, provider attempt limit and permission to spend. If any is missing, **do not call**. Compare baseline one-shot vs source-grounded retrieval on *the same* selected scenario/revision and evaluate by a human. Do not automatically launch premium shadow runs or model-judge every reply.

## Proposed metrics and decision thresholds

**Hard safety:** zero unauthorized provider calls; zero duplicate effects; zero unearned fictional time; zero accepted unsupported item/quantity changes; no hallucinated source claim rated as established; all uncertain charges hold. Failures in safety are not compensated by creative prose.

**Quality:** for every accepted playable turn, the owner rates consistency of intent/result, choice agency, credible narration and memory use; count repeats, empty menus, forced plots, ignored character constraints and moments requiring manual correction. Track session completion and whether the user voluntarily wants another turn. A valid JSON response is not a passed creative-quality test.

**Economics:** record actual dollars per **accepted** turn; cost of rejected/unused generations; total round count; input/output tokens and provider cache *reported* categories; 50th/95th-percentile latency; initial context/schema bytes; recall precision/false-person cases; calls per fictional day and per real unattended day; spending when no player action occurs.

**Provisional targets for owner review, not ratified release gates:** start with a total explicit **$1–$2 live trial cap** for a small, isolated test; seek one model round per ordinary turn, with occasional repair/exploration only when justified; compare 10-/30-turn results against a budget that the owner specifies in advance. Abandon/trim features if their incremental narrative value does not justify their measured incremental cost. No fixed commercial price tier or free allowance is decided here.

## Anti-gaming rules

- The denominator is **accepted useful turns**, not requests, successful JSON schemas or saved passages.
- Zero accepted turns and positive spend is a failed evaluation, not $0/turn.
- Include rejected schema repairs, concurrent attempts, discarded speculative generations, maintenance and narration of already committed results.
- Report cold and cache-hit paths separately. Do not estimate a provider hit from matching prompt prefixes or assume permanent KV cache for a story touched hours later.
- A retrieval hit must be **correct, current, authorized and actually used**; more retrieved tokens are not a win.
- The baseline must retain the same deterministic authority and source version. A cheaper route that invents canon is not a substitute product.

## Exit decision

After the first properly priced human playthrough, classify individual systems as **Adopt / Keep bounded / Redesign / Defer / Drop**. Do not give every appealing research idea a permanent engine interface. Reopen one only when a concrete repeated failure needs it and the proposed alternative beats the measured baseline.
