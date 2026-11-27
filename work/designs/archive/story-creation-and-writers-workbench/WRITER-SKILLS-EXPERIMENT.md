# Writer skills and the Workdesk metaphor | capability experiment

**Status:** exploratory investigation, 2026-11-20. These proposed in-game Storyteller skills are **not** the existing repository's coding-agent `.agents/skills/` and do not authorize live model calls. See [FILE-FIRST-LIBRARY-REVIEW](FILE-FIRST-LIBRARY-REVIEW.md) and [INITIALIZATION-LIFECYCLES](INITIALIZATION-LIFECYCLES.md).

## Thesis

A weaker/cheaper model may be more useful when given a **small well-timed craft procedure, grounded examples and tools that actually support the procedure** than when handed a gigantic perpetual "be a brilliant writer" system prompt. This is an experiment hypothesis, not an established claim. Smaller models may struggle to invoke tools, obey layered instructions or distinguish fiction facts from speculative notes. Skills cannot manufacture capabilities absent from the base model.

Use **Library** (persistent knowledge) and **Workdesk** (task-local working materials) as concise agent-facing metaphors. They are useful insofar as they help the model recognize provenance, plan compactly, inspect relevant records and avoid treating a draft as published canon. Avoid long theatrical system prompts about candles, tea and ink. The Storyteller is not a simulated human who needs an extra coffee-consumption state machine.

## Two different meanings of "skill"

1. **Craft skill:** a versioned Markdown document containing a narrowly scoped creative technique, a checklist or a good/bad example. Its contents guide behavior. It carries **zero authority to expand tool access, change fictional clock speed, override mechanics or spend money**. Authored preset guidance may be allowed within a lesser-trust creative namespace.
2. **Harness capability:** executable application-owned tool/read/proposal behavior with schemas, scopes, quotas, permission checks, durable replay, telemetry and costs. The engine grants tools under an admitted task/recipe, not by reading a Markdown file claiming "I have permission."

The **skill binding** between the two is a trusted, versioned runtime recipe that advertises which tool operations are available to this task. A preset can suggest a writing method; it cannot install code, grant network access or create a new runtime tool just by bundling `SKILL.md`.

Do not confuse these with user-facing role abilities or mechanical character skill scores. Those are separate domain concepts.

## Prototype catalogue, not an every-turn menu

| Prototype | Trigger | Core craft technique | Relevant evidence/tool use | Failure signal |
| --- | --- | --- | --- | --- |
| **Opening craft** | First playable composition, especially custom prompts | Establish a concrete situation, salient pressure/opportunity and meaningful response; avoid generic exposition and forced heroism | Pinned prompt/profile/required setting; optional bounded library read | Generic foggy opening, choices differ only in wording, premature gigantic lore dump |
| **Continuity editor** | Returning to earlier thread or relevant old character/claim | Separate recorded fact, attributed claim, rumor, private possibility, new development and exact state | `ask_memory`/`read_memory` or future exact library tools; cite pinned evidence | Hallucinated past, summary treated as original source, wrong holder/clock |
| **Nonhuman perspective** | Galaxy, microbe, collective or bodyless narrator | Identify admissible perception, scale, agency, options and meaningful consequences without assuming human anatomy | Exact game capability/adapter inventory and premise | Automatically invents HP/inventory/town dialogue; invalid mechanics |

Possible **later** candidates: scene rhythm, tension and release, dialogue/voice, emergent threads, worldbuilding coherence, character relationship tracking, revision/editing, experimental literary forms and branching decision craft. Do not create an encyclopedic skill folder before these three earn their existence.

### Example narrow skill (illustrative prose, not a deployed file)

```markdown
# Open a playable situation
Use this for an opening scene, not for every response.
- Read the captured premise and mandatory setting boundaries.
- Decide what the audience can perceive now.
- Present one concrete circumstance worth acting on.
- Offer distinct plausible responses if player agency is applicable.
- Preserve uncertainty where the user did not establish a fact.
- Do not author full history merely to populate a library.
- Keep future possibilities private, not current canon.
- When needed, propose a small source-linked library change.
```

Such a skill is *more useful* than "always write beautifully" because it gives a targeted procedure. However, it's not magical: if the model can't correctly resolve an abstract actor or produce supported choices, the skill should fail a test rather than claim success.

## Skill location and dispatch: alternatives

**Option 1: engine-owned trusted skill catalogue** (suggested for first experiment): versioned source-controlled Markdown documents, an explicit skill ID/revision and a task-purpose-to-skill mapping in code/config. The harness selects one compact skill core and records exact content/hash in the captured task. Optional example sections are read only when truly necessary.

**Option 2: creator/preset-carried craft guidance:** validated `creative-guidance` documents inside a prepared package. The model may receive selected advice, but it is lower-trust than the engine skill catalogue and cannot bind to arbitrary capabilities. This supports a preset authored by a skilled human writer, without giving that writer runtime administration rights.

**Option 3: autonomous skill picking from a large agent catalogue:** possibly useful later, but not selected. It adds discovery/tool calls, catalogue drift, selection errors and expense. Prove a small deterministic catalogue first.

The compiled capture should record *which* effective profile, *which* skill versions and *which* exact required source documents were used. Do not retain merely a mutable skill pathname and hope it means the same thing after deployment.

## Evaluation matrix

Compare for each scenario/model route:

- **Baseline:** existing profile with no additional craft skill.
- **Matched-token generic advice:** same input token allowance spent on general writing guidance.
- **Targeted skill:** short relevant procedure with controlled examples, no extra tool use.
- **Targeted skill + permitted tool:** same craft guidance plus one useful library-evidence/proposal route, and report the added rounds/cost.

Score blind by human reviewers or well-defined independent offline rubric: opening clarity, specificity, originality, meaningful agency, contradictions, user-intent fidelity, avoidance of unwarranted lore, later continuity and whether notes actually helped on later turns. Report inference tokens/latency, tool success, invalid schema rate, recovery and billed cost separately.

**Counterexample to the thesis:** a baseline model already performs as well as the skill variant, or skill text consumes context and causes repetitive/rigid openings. In that case *remove the skill*, do not insist that more prompt engineering will rescue it.

## Guardrails

- No skills that instruct the model to reveal/private-read other stories, browse external URLs, execute SQL/shell, dispatch paid calls or directly write shared storage.
- No skill has implicit mechanical world authority; typed game policies decide permissible actions.
- A model proposal to create a file can update only eligible document kinds within its admitted quota and revision fence.
- A craft procedure is advice for one task; `STORYTELLER_PROFILE.md` is a durable voice/personality preference. They must not compete to become two different Storytellers.
- Skills must not require invented quests, protagonists, chapters, maps or first-person framing; a nonhuman/abstract perspective is first-class.
- No forced inner-monologue logging, chain-of-thought storage or endless "planning" loops. A few justified private direction notes can be useful, but dumping internal deliberation into Markdown is neither canon nor a quality metric.

## Recommendation

Adopt the **vocabulary** experimentally: Library = persistent sources; Workdesk = temporary mission workspace. First test **one tiny, trusted opening-craft skill** versus baseline, with *no new tool* so any benefit is attributable to the guidance. Then test a narrow evidence read and batched proposed edit. Only expand skills after a measured improvement or clearly identified task-specific failure. Preserve source-grounded, cheap-model experiments and keep all inference opt-in.
