# Storyteller constitution | product truths that outrank the current engine

**Status: normative proposed end-state (2026-11-14), derived from [original vision](../vision.md).** Companion product authorities: [gameplay](../gameplay.md), [concepts](../concepts.md), [Storyteller configuration](../storyteller-settings.md), [earned time](../time-and-autonomy.md), [end-state engine drivers](../engine-architecture/product-derived-requirements.md). This is not an assertion that any capability is already implemented.

## The constitution

**Offscreen RPG is not a chatbot sending a chapter when you click Next.** A player lives as a particular character in a consequential world. Immediate decisions and prolonged work carry actual authorized fictional time, chance, loss and partial progress. The world remembers what actually occurred, including ordinary relationships, small promises and quiet days. Its creative direction belongs to the selected Storyteller and the campaign, not a universal engine mandate for danger, comedy or heroic plot momentum.

**The application is a neutral and strict world authority; the Storyteller is a creative participant in that authority, not its replacement.** It may choose what would be interesting or faithful to the configured direction, decide which established evidence to inspect, propose new material and presentation, and recommend currently feasible intentions. It cannot retroactively make rewards earned, reroll checks, spend beyond policy, reveal private future plans or take actions for a human without an admitted decision/delegation rule.

### Nine falsifiable constitutional principles

| Principle | Positive acceptance | Discriminating failure |
| --- | --- | --- |
| **Agency** | Player can pursue a meaningful intent through authorized choice and eventually a separately designed free-intent path; next scene respects it | Model paraphrases player choice into a different act or forces an unrelated climax |
| **Earned time** | Work/travel/learning actually takes admitted game and permitted real time; completion and interruption are source-linked | “I begin working” immediately yields earnings or a 10-hour journey is skipped for prose convenience |
| **Durable memory** | Gift, relationship, mistake, promise and prior exact wording can matter many scenes later from valid evidence | Model vaguely remembers “there was a promise” or invents wrong owner/recipient |
| **Creative neutrality** | Quiet, melancholic, chaotic, absurd and severe profiles realize their *own captured* commitments | Shared prompt always enforces 3 exciting choices, fixed drama density or mandatory social conflict |
| **World neutrality** | Abstract intelligence or microbe has relevant capabilities and perception; human body/map/money omitted if inapplicable | Every story assumes humanoid inventory, hands, tavern or geographical distance |
| **Rules as reality** | Typed abilities, checks, receipts, risk and admitted state constrain claims; model need not know SQL mechanics | Prose gives an item, success, injury or social status that rules did not commit |
| **Ordinary life and absence** | Supported accepted routines can progress without model calls; quiet idle remains quiet; interruptions matter | Every minute tick runs model or an idle character “auto lives” without consent |
| **Privacy and visibility** | Character/public knowledge distinguished from private DM possibilities and hidden future; consent scopes honored | Retrieval exposes secret future intent, another viewer's story or private creative notes as fact |
| **Cost and reliability** | Explicit policy bounds every model round, retrieval, repair and optional maintenance; uncertainty blocks unsafe replay | New model task/fallback secretly spends twice or a depleted tier gets incoherent, contradictory fiction |

### What is deliberately not a constitutional preference

A Storyteller may run a painfully quiet slice of life, a ruthless military tragedy, or eccentric comedy *when the player selected those terms*. We should not hardwire “universal fun,” a mandatory dangerous event every N turns, a hero arc, two-to-five options, fixed prose length, daily simulation, injury avoidance or a grand plot. **A game can be serious without the application deciding which emotional state the player should experience.**

Risk is special: supported lethal consequences may be allowed by a future captured risk policy. The present contract's `nonlethal` restriction is a **current capability limitation**, not a reason to encode “Never kill the character” into an eternal common prompt. An eventual broader risk policy must be enforced in code, and the prompt must receive the *actual captured permission*, not promise arbitrary death.

Likewise, surprise frequency and surprising character are distinct from narrative initiative. An intensely directed story may rarely surprise; a high-surprise quiet life need not converge on a central antagonist. The engine never interprets price tier as personality.

## The Storyteller's actual jobs (not automatically separate agents)

1. **Situation comprehension:** reconstruct exactly what is currently true, who perceives it, what the player did, what remains uncertain and what is already in progress.
2. **Relevant evidence discovery:** determine which *specific* past, world and rule facts matter. Ask/read only when the current bounded context is insufficient, respecting source, revision, visibility and time.
3. **Creative direction:** within the player's configured tone, initiative and canon-invention limits, cultivate plausible opportunities, intimate consequences, ordinary life or dramatic pressures; choose among a small number of candidate directions when the task benefits.
4. **Admitted proposal:** produce a coherent source-bounded current scene, distinctive possible intentions and optional descriptive changes. Mark everything as proposal until the application validates.
5. **Result narration:** after deterministic settlement, describe only that result, partial progress and observed implications. Do not reroll or narrate speculative work as earned.
6. **Continuity stewardship:** preserve exact meaningful identities, promises, favors, relationships and recurring places using linked durable source records; retain uncertainty and attribution.
7. **Report and return:** sometimes summarize a committed historical moment, optionally narrate a bounded return; reading/checking current facts is always possible with zero inference.
8. **Private forward strategy:** optional, not required in all profiles. A selected higher initiative may maintain a **source-linked noncanonical** direction with goals and candidate developments. It does not schedule invisible events without separate permission.
9. **Operational modesty:** select the least expensive adequate task recipe; stop when evidence, money, time or publication eligibility fails. The model does not need a persistent personal consciousness.

### Role decomposition guidance

A **role** is the job contract for one stage: Opening Composer, Consequence Narrator, Evidence Investigator, Historical Reporter, Continuity Curator, Optional Narrative Director. Those are not six simultaneous models. The default is one bounded operation with deterministic preparation and a single model, optionally with an evidence round. Multi-agent fan-out would only be a later measured optimization for genuinely separable subquestions and must share the original operation's allowance.

The ideal **outer cycle** is deterministic application authority:
`accepted cause → captured state/evidence → optional investigate → compose candidate → validate → commit or hold → wait for next legitimate cause`.
This can span many gameplay turns without an always-running LLM. At each turn the *model conversation* is disposable; game/source memory is persistent. The absence of a persistent chat is an architectural advantage, not a deficiency to solve with automatic compaction.

## Three scales of gameplay quality

**Moment:** Did this exact offered action have a believable intent, time, uncertain result and meaningful next affordance? Did the prose reflect the captured storyteller?

**Sequence:** After 5–15 consecutive meaningful turns, do cause, voice, recurring relationships, item holders, risk and opportunity state remain coherent? Are failure and success branches materially different, not merely paraphrased?

**Life:** After hours, days and many independent episodes/quiet periods, does the character have a history the player *feels they earned*? Does a low-drama detail resurface naturally when relevant? Does the world still admit ordinary life without forcing a new boss/quest?

A green schema suite proves only a subset of the first scale. A synthetic retrieval oracle proves candidate selection, not lived memory. One pleasant model response proves none of the third scale.

## Boundary to existing mechanics and social features

- **GM01→GM02** owns interpretation and admission of novel player-written intentions. Storyteller may help interpret, but it cannot self-authorize any effect.
- **GM03** owns bounded repeated routine/persistence, not agent “deciding to keep fishing.”
- **GM04** owns failed-attempt offer distinctness as mechanical policy. Narrative prompts should help, but a string instruction alone is insufficient.
- **GM05→GM06** own factual public event feed and per-viewer read cursor. Storyteller memory may consume them as evidence, not own those events.
- **GM07** owns consented delegated choices/nonresponse. An AI personality profile does not implicitly grant consent.
- Multiplayer/notification remain independent original-first-playable ambitions, with permission/time coordination.
- **PW01** owns frontend visual presentation input from published data. A Storyteller-produced theme is future authorized content, not an automatic side effect of composing prose.
- **ENG03** owns short-lock context-capture refactor; this program may specify captured context needs, not implement that refactor in disguise.

## Constitutional test fixtures to preserve

**Quiet local life:** twelve mundane days of work, repeated encounters and earned small resources, with no manufactured urgency. **Interrupted beacon:** progress retained, encounter meaningful and a return to unfinished work. **Dangerous permission:** when the *future* legal risk policy permits permanent harm, consequence can be severe; under nonlethal mode it cannot be fabricated. **Exact gift:** item handed to one person and recalled across unrelated scenes; no second gift without holder check. **Nonhuman microbe:** perception/relation is local and form-appropriate. **Delayed account return:** old promise and current source matched; no omniscience. **Paid uncertainty:** charged/unknown provider attempt does not become a free replay. **Social autonomy:** a configured future absence policy, never model-led default.

Judge any proposed new abstraction against at least three **different** fixtures. If it serves only Greywake, a medieval tavern or one test profile, it likely belongs in content, not in the universal Storyteller engine.

## Acceptance and owner taste

A human choosing a “Quiet Eerie Mystery” profile can prefer melancholy over relentless excitement. A human choosing absurd comedy can still expect consequences and coherent identity. Log per-profile preferences and dissatisfaction separately from objective faults (invalid JSON, wrong item ownership, duplicate earning, missed source evidence, policy violation). Conduct blind and comparative gameplay review after provider-free correctness.

**Constitutional rejection test:** if a new generic prompt, built-in option count or an agent objective would make *every* world more heroic, impatient, dangerous, verbose or expensive regardless of profile, reject it even if a benchmark says it is more entertaining.
