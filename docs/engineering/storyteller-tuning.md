# Storyteller tuning manual

Turn disappointing play into a bounded investigation and a discriminating experiment. The [working agreement](../../.agents/rules/working-agreement.md#agent-and-prompt-tuning-discipline) owns mandatory layer separation; the [skill](../skills/storyteller-tuning/SKILL.md) applies it. The [agentic systems field manual](agentic-systems-field-manual.md) supplies broader context and evaluation guidance. This is application tuning, not model weight training.

## Research and application

Primary sources reviewed 2026-09-22:

- Anthropic's [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) distinguishes tasks, repeated trials, transcripts and environment outcomes, separates capability from regression evaluation, and recommends examining the harness itself. Here: retain action, receipt and publication as distinct evidence; use deterministic admission checks plus owner taste; retain failed trials. One sample cannot establish reliability.
- [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) argues for enough high-signal context and instructions between brittle micromanagement and vague guidance. Here: inspect competing obligations in the actual packet before adding instructions. Measure schema and unused-branch overhead without assuming bytes prove attention loss.
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) recommends simple composable systems and complexity justified by measured need. Here: compare the existing one-call approach before adding planners, critics or repair loops. A richer architecture carries additional cost, latency and recovery obligations.

The following procedures are repository-specific decisions. These sources do not establish what makes this game enjoyable or which model will satisfy its players.

## Evidence that answers a question

Start with one failed journey and one useful contrast, not every log. Operational traces explain dispatch and publication. Provider responses explain generated output. Canonical state and receipts explain committed events. Owner judgment explains whether it was worth playing. None substitutes for the others.

| Question | Evidence | What it cannot prove |
| --- | --- | --- |
| Did the style reach the model? | Saved settings, compiled profile, exact messages | Adherence or enjoyment |
| Why does asking require another turn? | Original option, pre-authored outcome, receipt, next passage | Whether a stronger opening model avoids it |
| Did options offer freedom? | Intentions, prerequisites, consequences, plausible omitted approaches | Freedom from label variety or option count alone |
| Why did play stop? | Generation, attempt, hold, validation and publication states | Model failure when no inference occurred |
| Was memory used? | Supplied sources, result, subsequent state | General recall from one coherent clue |
| Were durations plausible? | Fictional units, time context, output, admission conversion | Model weakness when the required unit lacks meaning |

Classify discrepancies as implementation defect, missing mechanic, expectation/fixture limitation, configuration mismatch, model/task failure or unresolved subjective judgment. Multiple causes can coexist. Identify the earliest deficient boundary and what would falsify each hypothesis.

Before changing prose instructions or temperature for an invalid structured result, compare four layers in order:

1. Could the transmitted schema make the invalid value impossible?
2. Is the model being asked to repeat a version, status, empty field or access list that code can derive exactly?
3. Does the schema expose references, prerequisites or ranges that the later semantic validator must reject from the captured state?
4. Does the provider accept the exact strict-schema projection, including empty and union branches?

Repair these contract mismatches before judging model capability. Keep the later validator and the failed trace. Temperature remains a creative-distribution setting: lowering it may reduce variety and does not repair a legal-but-unadmittable output space.

## Ownership before intervention

The shared task defines supported authority and universal requirements. Creative settings describe this Storyteller's tone, rhythm, initiative and choice character. Campaign direction grants this story its agenda or absence of one. Content supplies world facts and fictional units. Code converts durations, validates and commits. Model policy controls capability and resources.

Inspect overrides, captured revisions and task-specific guidance, not just catalogue definitions. Editable settings affect future tasks under [settings execution](../technical/story-settings.md); changing a preset file cannot retroactively change a saved story. New preferences belong in the existing extensible settings contract, not another shared instruction or unrelated hard-coded slider.

- Comedy expressed only through a metaphor suggests weak profile adherence; capability, competing context and guidance remain competing explanations.
- A quiet scene without danger can be correct. Meaningful agency does not require escalation.
- Asking about terms produces only an invitation to negotiate: inspect intent fulfillment in the private plan before tuning narrative rhythm.
- Two undefined ticks for travel indicates missing time semantics; exhorting the model to estimate carefully cannot supply units.
- Several investigation variants may omit a plausible departure or different goal. A custom-intent channel, if needed, is product/architecture work; prose cannot make unsupported intent executable.

## Review dimensions

Use pass/fail/unknown for hard contracts and weak/adequate/strong with a concrete reason for qualitative dimensions. The owner may prefer either candidate or neither. Avoid an aggregate score that hides broken authority behind pleasant prose.

| Dimension | Review question | Legitimate contrast |
| --- | --- | --- |
| Authority and fulfillment | Does the result honor the receipt and address the accepted intention within its admitted scope? | Failed persuasion is still resolution; success is not guaranteed |
| Profile | Does tone/rhythm affect the scene and opportunities? | Subtle mystery versus physical comedy |
| Campaign direction | Does development fit the selected agenda and preserve refusal? | Directed narrative versus ordinary life |
| Agency | Do intentions differ in goals, methods, commitments or risks? | A constrained situation can have one option |
| Consequence | What changed or became meaningfully known? | Rest can resolve without a twist |
| Continuity | Are relevant identities, facts and possessions current and supported? | Abstract life without people or money |
| Time | Is fictional effort intelligible and distinct from real waiting? | Conversation versus subsecond microscopic activity |
| Experience cost | Was this result worth its wait, reading burden and charge? | Rich deliberate play versus brief interaction |

Evaluate choices against plausible player goals here, not a mandatory fight/talk/sneak menu. Distinguish a new label, approach and goal. Longer prose and more options are not default improvements.

## Controlled experiments

Keep a compact record in the active feature plan:

```text
Question / falsifiable hypothesis:
Evidence IDs, source revision, observed failure:
Owning layer; changed variable; fixed variables:
Target case; contrast; held-out follow-up:
Expected improvement; rejection criteria:
Route/provider/reasoning; prompt/schema/profile hashes:
Input/output/round/money ceilings; no-retry stop rule:
Verdicts; validator/publication outcome; charge/latency:
Decision: adopt, reject, or inconclusive; exact next action:
```

An exact task replay with only the model changed probes capability under the existing contract. Corrected context or a simplified contract probes the harness. Changing model, prompt, profile and time semantics together cannot identify the cause. Necessary transport differences make a configuration comparison rather than a pure model-only test.

When choices repeat, compare an opening/planning task as well as a consequence task. A stronger consequence narrator cannot truthfully turn a committed approach-only receipt into a completed conversation. Keep candidates private and use the normal validator; generation success is separate from publication.

Begin with a small human-reviewed pair. Reuse a captured baseline when its exact task is available and label the sample count. Expand independent samples and contrasting profiles when the result would affect a decision. Reserve an unseen related case before broad adoption. Do not report one lucky pair as a reliable preference rate or discard invalid outputs from the denominator. Fixtures prove plumbing; generated outputs establish model behavior.

If unused-branch preparation remains suspect, separately design a comparison of current all-options planning with an intent-first path that adjudicates the selected intention after selection. That introduces another latency, spending and recovery boundary. It is a candidate experiment, not an authorized rewrite or a reason to drop mechanical validation.

## Model and cost calibration

At inspection on 2026-09-22, Story mode hard-codes `openai/gpt-5.6-luna` in `tools/chamber/src/main.ts`; the provider builder explicitly sends `reasoning.enabled: false`. Six inspected recent responses report zero reasoning tokens. OpenAI describes [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) as the cost-sensitive tier roughly corresponding to earlier nano models. This supports investigating capacity; it does not establish equivalence to Haiku or GPT-4o mini on this task.

A proposed capability reference is [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), the same family's flagship, initially with reasoning disabled and the existing packet/output cap fixed. This is a research candidate, not a live route change. Reasoning is a later independent variable needing explicit adapter and accounting support.

The public [OpenRouter Sol page](https://openrouter.ai/openai/gpt-5.6-sol) displayed a temporary OpenAI-endpoint rate of USD 2/M input and 10/M output at inspection; official undiscounted prices were 4/M and 20/M. These are advisory quotes. At 12,000 input / 2,048 output tokens, undiscounted arithmetic including a 1.25x input cache-write allowance is USD 0.10096 per request. The current USD 0.01 operation ceiling therefore does not fit. Verify exact endpoint prices and premiums before admission; do not shrink context to disguise a different experiment or silently increase the cap. The [spending rule](../../.agents/rules/spending.md) owns authorization.

Proposed first probe: one saved opening replay on Sol, conservative USD 0.11 ceiling, no retry/fallback/publication. A matched continuation is conditional on the first result and reconciled spend. This has not run. Funding and unresolved liability must be readable before paid work. Historical response charges cannot establish current available funds.
