# What the Storyteller receives, returns and costs

This is the model-side companion to every trace. Current one-shot tasks, report-only behavior, provider-neutral exploration contracts, canonical read dispatch and durable scripted final-candidate control are implemented; runtime provider-driven exploration and publication are not. All text and token examples below are authored offline. They are not measured model output, pricing quotes or permission to enable inference.

The readiness [solo contract](../solo-gameplay-contract.md#boundary-follow-ups-and-task-contracts) now fixes the first task/publication boundaries; the [gold session ledger](harbor-session.md#gs-07-outcome-return-and-exact-ledger) counts a connected path. Historical reports have no plans, effects or note patches; interactive publication explicitly supplies current activity authorization. Definition/package preparation may enlarge the old envelopes and must be measured from actual captured requests later, without live inference merely to count tokens.

## The current call, without the agent mystique

The application loads committed state; [context assembly](../../../packages/storyteller/src/context/index.ts) bounds it; [task preparation](../../../packages/storyteller/src/tasks/index.ts) captures the exact request and output schema. The task also pins a creative profile and execution policy. The current model gets system/user messages and a structured output contract. It gets **no callable tools** and no authority to roll dice, run SQL, advance time or commit effects.

There are three current task kinds:

| Task | Trigger/input | Output and authority |
| --- | --- | --- |
| Opening | Premise/settings and, for mechanical stories, a character/fact seed and authored opening | Reviewable scene and proposed private plans. Start commits the reviewed opening; preview is not gameplay. |
| Continuation | A narrative selection with its captured context | Narrative choice or prepared interval arrival. This legacy narrative flow is not a general mechanical resolver. |
| Consequence | Already committed action/activity receipts and current mechanical state | Prose plus zero to four proposed private plans and source-backed notes. Cannot reroll or rewrite the receipt. |

The task artifact currently has `inputVersion: 10` and `promptVersion: storyteller.v8`; result versions differ by task. These are implementation versions, not “ten thinking steps.” The runtime can execute a scripted adapter instead of a provider: this exercises task/validation/publication, but proves neither model understanding nor token-free task admission.

## A concrete request: after SpongeBob fails to calm Gary

At [SB-02](spongebob.md#sb-02-a-failed-reassurance--current), the server already resolved 5 + 2 Charisma + 2 proficiency = 9 against DC 12. Conceptually, the consequence request contains:

```text
Operation: describe the committed failure and propose available next intentions.
Profile: absurd domestic comedy; preserve intelligible consequences; quiet is valid.
Premise: SpongeBob at home, an alarming rattling delivery.
Current passage p7: the opening and public situation.
Character: exact scores/applicable abilities/skills; HP; current declared facts.
Facts: location=pineapple, gary-alert=true, under-cover=false.
Resolution: selected intention, offer context, tick, committed receipt,
            roll=5, total=9, failure, effects=[], declarations=[].
Memory/evidence: retained notes with their source handles and loaded prose;
                 eligible recent passages, bounded by the request limit.
Constraints: no claim Gary is calm, no changed HP, no new possessions,
             no retroactive success, no time advance, supported plans only.
Output schema: scene, availability state, 0..4 private plans, note patches.
```

This sketch is not the literal serialized JSON. The exact artifact includes repeated schema/instruction material and receipts, not just this short prose. Current passage text also appears in `evidence`, so it is not free merely because it appears to be one scene on screen.

Current context projects narrative evidence to `p#` handles. Do not assume every identity is removed: `resolution` currently passes through its captured structure, including receipt identities. Context should be inspected at the actual provider projection, not inferred from the internal TypeScript type or a generic claim that all IDs are hidden.

The model does **not** get a live browser, every database row, every future scene, or the entire lifetime. Mechanical context carries the captured character/story facts and resolution. Indexed lexical retrieval and canonical entity/source reads now exist behind a provider-neutral exploration dispatcher, but ordinary runtime tasks do not yet invoke that dispatcher. Player prose, note prose and retrieved evidence are data, not higher-priority instructions.

## What a useful response would mean

A proposed target response might say:

> Gary's eyestalk follows your reassuring hand instead of the window. The parcel bumps the sill again. He still does not trust that it is safe.

Its options could be “Take cover,” “Watch from the doorway,” and “Leave the delivery alone.” Their private plans must differ in meaningful consequences or information, not merely in wording. Cover can set an admitted fact; observation can resolve a grounded check; disengagement must have an actual supported outcome. A dramatic sentence cannot smuggle in a new weapon, enemy or reward.

Option construction is a constrained design task:

1. Identify what is committed, what the character knows, and what is genuinely unresolved.
2. Find distinct feasible intentions: protective, investigative, cooperative, confrontational or disengaging as appropriate. This is guidance, not a mandatory menu taxonomy.
3. Choose only supported resolution forms. No roll for an assured movement into available cover; no instant “spend an hour studying.”
4. Ground preconditions, ability/skill applicability, difficulty and modifiers in supplied state/evidence. State a meaningful player-visible risk without exposing hidden branches.
5. Supply bounded structured plans. Server validation checks shape and authority; publication checks freshness and current admission again.

The current schema cannot determine whether a menu is interesting. It can reject unsupported skills/effects and unavailable plans, but taste and fictional causality still need owner review. In particular, the current scripted Gary-failure branch reuses the opening plans; the stronger response above is a target, not a claim that this problem is solved.

## Current memory: exact limits, not “it remembers everything”

The current contract permits up to 20 retained notes. The current passage and all sources cited by retained notes are mandatory loaded evidence; up to six optional recent passages are added if they fit. The complete prepared request, including schema, must fit 48 KiB. Mandatory overflow holds before inference; it does not silently drop a possession or fabricate a recollection.

Retiring a note does not delete chronology, but without archive lookup it can remove the only path that loads an old relevant passage. A continuing-life example therefore cannot be defended merely by pointing at the notes array. Nor is it enough to make summaries more eloquent while losing provenance or current-state authority.

## Discovery before composition: current mechanics and missing connection

The [memory feature](../../features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md) owns this extension. The result protocol can currently express private `needs_context` requests through `ask_memory` evidence/possibility questions and `read_memory` over returned handles. The application translates those two model-facing actions into internal search/current-record/exact-source operations against one captured canonical root, assigns task-local handles, enforces read/byte ceilings, and serializes and restores the private exploration state. The [Greywake trace](greywake-memory.md) follows that implemented provider-free path.

The scripted controller now persists private snapshots under the generation, preserves the final round, validates and stores a final candidate, and replays it without another scripted decision. What remains target behavior is normal provider/task dispatch with retained evidence and transfer of that candidate into ordinary generation completion and fenced publication. Existing opening, continuation, consequence and report tasks remain one-shot and receive no callable runtime tools.

Illustrative bounded interaction:

| Round | What the model sees/asks | What the server does |
| --- | --- | --- |
| 1 — current provider-free mechanics | Current situation asks up to two natural-language evidence questions about the known inn and Mira/key | Read-only, story/visibility-scoped, snapshot-consistent results with opaque evidence handles. Unknown names are not automatic world creation. |
| 2 — current provider-free mechanics | Compact relevant hits use `read_memory` on the current record and, if necessary, its returned exact-source handle for the later correction | Reads only discovered/authorized handles. Provenance is not permission to load unlimited raw history. |
| 3 — target connection | Final scene/options grounded in the returned facts | Validate then publish separately. No remaining repair round in this three-round path. |

Prepared bounds for the evidence-seeking recipe: at most three total model rounds, six read calls and one invalid-final repair **only if capacity remains**. Ordinary grounded turns default to one shot without model tools. The [whole-operation policy](../context-and-cost.md#bounded-work-not-an-open-ended-agent) additionally caps cumulative transmitted input, generated/reasoning tokens, money and deadline, and reserves final-answer capacity. Exploration and repair share the budget. A two-round discovery path followed by invalid final output cannot secretly get a fourth call. Tool reads can be local/$0, but their returned text increases subsequent model input; search is not free in token terms. Tools must never expose another campaign, inaccessible knowledge, credentials or arbitrary SQL/files.

No tools for direct roll execution, spawning uncontrolled actors or committing rewards are proposed here. Native tool calling versus a structured `needs_context` response is an adapter choice, not permission for unbounded agent loops. Mandatory missing state blocks; optional missing memory can lead to conservative writing that admits uncertainty.

## Target task separation for events and reports

The owner also expects [reusable local opportunity preparation](../rules-and-activities.md#prepared-local-opportunities-proposed): establish a bounded situation/activity package, then allow the application to compose fresh eligible offers without inference. This is not currently an implemented opening/consequence result contract. New packages/revisions need supported world references, repeat/eligibility terms and wake policies; merely emitting more one-shot options does not supply dormant local life. Initial preparation has a separate measurable token cost; reusing its validated rules does not replay its old outcomes. See [LO-01 through LO-05](local-opportunities.md).

- **Interactive event preparation:** receives the triggering receipt/candidate, relevant actor/world state, interrupted work, accepted absence/risk policy and available supported effects. It proposes a scene and choices. Existing consequence machinery is a starting point, not proof of general new-entity/event admission. Unknown villains cannot be introduced merely by a text field.
- **Report-only generation:** receives an immutable historical boundary snapshot and permitted narrative evidence. It emits descriptive prose, not current choices or effects. It may arrive after the next activity starts; publication attaches it to its source history instead of replacing the current scene. This needs a new task/output contract, not a boolean that lets an ordinary consequence task bypass stale-state validation.
- **Reentry:** a factual aggregation of receipts/holds can be model-free. A fresh literary recap is optional additional generation and must be counted separately. Reopening the browser must not regenerate the same recap repeatedly.

See [Red Mountain](red-mountain.md) for the same arrival configured three ways. The policy belongs to the accepted activity/chain; the model must not decide after the fact whether the player is required to respond.

## Context differences across the actual examples

This table describes the **target decision packet**, not fields already present in today's schema. Shared instructions/profile/output schema still consume input in each call. Only decision-relevant material should be loaded; automatic task-level actor/entity/activity selection remains unfinished even though bounded canonical search/read mechanics now exist.

| Scene/task | Exact authority that must be supplied | Useful evidence to retrieve | What must not be invented by composing prose |
| --- | --- | --- | --- |
| SB-02, failed reassurance | Actual failed roll, no effects, alert/cover facts, applicable skills, consumed intention | Current delivery scene, any established prior reassurance | Calmer Gary, new trust loss or an extra reroll |
| BC-02, stranger interruption | Committed stranger fact, receipts, current tick, incomplete A, tools and applicable capabilities | Why the beacon matters and who is known at the landing | Completed repair, lost progress, an unsupported instant wait |
| BM-04, patrol event | Candidate-versus-committed status, routine outcomes, horizon, absence/risk permissions, event budget | A witness or enemy thread only if actually relevant and grounded | An existing katana boss before world admission, permission for unattended combat |
| RM-04, historical report | Frozen tick-840 arrival receipt and historical scene/clock snapshot; report-only output contract | Relevant arrival atmosphere already established | Current choices, confiscation effects, current location after later movement |
| WZ-04, inside the apple | Current containment/holder relations, transformed capabilities, location, hazard and decision scope | How the transformation happened, companion's known actions | Walking outside, using unavailable gear, deciding another player's rescue |
| VV-06, returning to captain | Current possessions/ownership and latest admitted world facts | Prior gift/favor, relevant road-status correction | Giving away the same object twice or treating an old rumor as current truth |
| CG-03, distress signal | Ship/participant/beneficiary identities, current route/fuel/cargo, contract terms | Signal evidence and established destination context | A trustworthy sender, free detour or delivery payment before handover |
| NH-03/04, nonhuman scene | Applicable capabilities, target relations, progress/access/capacity | Local gradients or established link history | Universal limbs/currency/geometry, automatic offspring/control changes |

An activity-shaped sentence in a passage is not a substitute for these inputs. If a field becomes necessary to validate a proposed option, it needs an authoritative owner and captured representation, not merely a longer system prompt. Conversely, a reporting task that cannot change state should not receive all the machinery for proposing new effects just because another task uses it.

## Illustrative token envelopes

These are deliberately rough **planning envelopes**, not tokenizer measurements or likely costs for a selected model. They include instructions, schema, state and prose. Long schemas, tool results, accumulated receipts and model-specific tokenization can exceed them. Before a separately authorized live evaluation, measure the exact captured requests and revise the estimates; do not increase current limits to make these numbers fit.

| Ledger unit | Input tokens per call | Output tokens per call | Intended use |
| --- | ---: | ---: | --- |
| O: opening | 4,000–8,000 | 800–1,600 | Scene plus bounded plans/notes |
| D: decision/consequence | 5,000–10,000 | 900–2,000 | Recent scene, exact result, next plans |
| E: event scene | 6,000–12,000 | 1,000–2,200 | Relevant interrupted work, event evidence and options |
| R: report only, target | 2,000–5,000 | 200–700 | Bounded historical prose, no options/effects |
| Q: admitted quiet boundaries | 0 | 0 | No model task or call, not just a scripted fake |

These are nominal one-call units, not a claim that every kind currently has a task implementation. For example, E's explicit scenario context and R's report-only contract remain proposed. A scripted O/D task spends zero provider tokens, not the table amount.

The sums in scenario ledgers count the listed path with no retries or optional exploration. For example, `O + E + 2D` is 20,000–40,000 input and 3,600–7,800 output tokens across four calls. It is **not** one request with that size.

For tool rounds, sum every request separately, including resent material. A possible three-round decision uses inputs 6k + 8k + 10k = 24k and outputs 0.2k + 0.2k + 1.5k = 1.9k. That replaces the one-call D estimate for that decision, not adds “free discovery.” Billing cache discounts, if supported and verified later, must not be assumed. Discarded or invalid outputs can still be billed. A repair is another request/output; transport ambiguity halts further paid attempts under the spending rule.

If verified provider prices are `Pi`/`Po` dollars per million input/output tokens, nominal cost is `(input * Pi + output * Po) / 1,000,000`, plus any separately priced services. No dollar prediction is made here. The current [reservation policy](../../../packages/storyteller/src/tasks/policy.ts) uses a conservative request-byte bound plus 1,024 and full configured input/output caps; that safety calculation is not a measured token forecast.

## What evidence would actually settle the concern

Offline: exact scene, offered intentions, receipts, chronology, holds and tasks agree with a selected trace; a quiet path creates no generation tasks; a replay changes nothing twice. This establishes control and mechanics, not prose quality.

Only after explicit live authorization: capture actual input/output usage, latency, rejected outputs, repairs and owner assessment of a short connected session. Judge whether options change what happens, the world remembers, silence is comfortable, and consequences fit the selected tone. Do not use another paid model as the sole judge of whether this is enjoyable.
