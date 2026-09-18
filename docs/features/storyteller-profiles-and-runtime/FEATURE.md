# Selectable storytellers on one reusable runtime

Status: Implemented offline scope; focused checks passed. Live evaluation remains deferred.
Approval: On 2026-09-18 the owner explicitly authorized Codex to design and implement the storyteller work across these features, batching checks after the implementation. Live inference remains disabled; paid evaluation is separately gated.

## Intended outcome

A player chooses how their story behaves before generating its opening. The same premise can produce different situations, dilemmas and consequences under different storytellers. Adding another profile using supported behavior requires content/configuration and validation, not a new resolver, workflow or provider route.

This is the first of three dependent features:

1. This feature: profiles, frozen selection and reusable generation execution.
2. [Continuity and choice quality](../storyteller-continuity-and-agency/FEATURE.md): relevant memory and observable agency.
3. [Budgeted playable POC](../budgeted-storyteller-poc/FEATURE.md): reliable provider execution and a real playthrough, after explicit spending authorization.

The intermediate offline result is development infrastructure. It must not be presented as a functioning generative game.

## Representative flow

1. In creation, choose **Absurd Action Comedy** and enter “I am SpongeBob, waking up in my pineapple. Gary is here.” Optional direction refines the selected style. Setup text remains allowed; gameplay actions use published options only.
2. Explicitly request an opening, review it and Start. The profile and its effective content are frozen with the reviewed candidate and resulting story.
3. In an illustrative opening, Gary crawls out with a machine gun. Choices might be “Ask what he is defending us from,” “Take cover and distract him with breakfast,” and “Check the window before joining his operation.” These pursue different goals and reveal plausible commitments. They are not guaranteed successes.
4. Resolving a choice publishes a consequence and a new offer, or begins a real wait with a privately prepared arrival. Gary's weapon is initially narrative detail, not an inventory item or evidence of implemented combat rules.
5. The same starting premise under **Quiet Eerie Mystery** might establish an unfamiliar tapping from Gary's apparently empty shell. Inspecting it, asking Gary and leaving for help should develop different knowledge or circumstances.
6. Reopening preserves the selection, scene and pending work. Editing a draft's profile makes its old candidate stale. A catalogue update does not change an existing story or an admitted request.

These scenes are acceptance examples, not production branches keyed to SpongeBob, Gary or option IDs. Offline examples are explicitly authored fixtures.

## Architecture decision

“Storyteller” names the player-facing creative profile and the system that realizes it. It does not imply a persistent agent process, one model, one giant prompt, or a team of agents.

| Responsibility | POC implementation | Authority |
| --- | --- | --- |
| Creative profile | Validated, versioned content in the AI package | Tone, framing, narrative habits, choice guidance |
| Task preparation | Separate pure opening and continuation preparation | Compose only the instructions/context needed for that task |
| Continuity selection | Application snapshot reads and pure bounded assembly | Select committed evidence; no invention during retrieval |
| Proposal generation | One replaceable source for a prepared task; scripted initially | Propose prose/options/fictional duration, never directly mutate the story |
| Game policy and commit | Existing server policies and transactions | Permissions, references, time, supported effects, once-only publication |
| Durable execution | Existing generation records, outbox and Temporal Activities | Admission, recovery, persisted results and stale fencing |
| Model execution policy | Separate server-owned configuration, later budget feature | Provider, context/output limits, attempts and spend |

The initial opening task and continuation task each produce one coherent structured result. Scene resolution and the resulting choices belong together initially: splitting them into two calls introduces extra latency and disagreement about what just happened. Waiting, retrieval, schema checks, timing conversion and publication are deterministic code. No model polling during waits.

There is no autonomous tool loop in this POC. This is not a limit of one agent forever: later tasks such as recap, memory extraction or a bounded investigative resolver can have separate prompts, context, tools and routing behind the same prepared-task/result boundary. Add a separate task when it needs different evidence/permissions/lifecycle or evaluations show a quality/cost benefit. Do not build an agent registry, general DAG executor, specialist voting, one agent per NPC, or always-on critic now. “Supporting arbitrary profiles” means arbitrary combinations of supported creative behavior, not arbitrary new game mechanics supplied as data.

## Profile contract and two starter definitions

Use a small strict data schema. Proposed fields: `schemaVersion: 1`, stable `id`, positive integer `revision`, `name`, `description`, `tone`, `dramaticRhythm`, `surprisePolicy`, `consequenceStyle`, `choiceGuidance`, `avoid`, and task guidance for `opening` and `continuation`. Guidance fields are bounded prose/lists, not executable templates or a universal rules language. IDs use lowercase kebab-case, maximum 80 characters. Name maximum 80, description maximum 300; each guidance section maximum 1,200 characters, list maximum 8 entries of 240 characters; complete serialized definition maximum 12,000 UTF-8 bytes. Validate duplicate identity/revision pairs and unknown fields.

First-party definitions live as separate JSON content files in `packages/ai/src/storytellers/`; one schema and explicit catalogue loader. Package/build wiring must ship that data with the worker rather than depend on the repository working directory. The browser receives only a projected catalogue of identity/name/description. It submits `{ id, revision }`, never a full definition or prompt. New profiles need a content file and catalogue entry, with no profile-specific runtime switch. No database CMS, marketplace or profile editor.

| Field | Absurd Action Comedy (`absurd-action-comedy`, revision 1) | Quiet Eerie Mystery (`quiet-eerie-mystery`, revision 1) |
| --- | --- | --- |
| Description | Everyday problems become extravagant action scenes; wit, caution and negotiation remain useful. | Familiar places acquire unsettling inconsistencies; observation and conversation uncover what is happening. |
| Tone | Playful, cinematic, absurd; clear physical situations beneath the jokes. | Restrained, curious, uneasy; concrete sensory detail rather than constant ominous adjectives. |
| Dramatic rhythm | Bursts of commotion separated by ordinary recovery and conversation. | Patient escalation with quiet periods and discoveries that alter the interpretation of earlier clues. |
| Surprise policy | Unexpected combinations rooted in established people, objects and intentions; no unrelated celebrity cameo every turn. | Seed perceivable clues before revelations; uncertainty is allowed, retroactively negating established events is not. |
| Consequence style | Failed stunts change the predicament; jokes do not erase losses, commitments or the selected intention. | Knowledge, trust and exposure change through choices; caution may help without guaranteeing safety. |
| Choice guidance | Support direct action, clever de-escalation and investigation where plausible; do not force participation in the spectacle. | Offer materially different ways to obtain information, engage or withdraw; communicate apparent stakes without disclosing secrets. |
| Avoid | Repeated random explosions, identical outcomes under different labels, involuntary heroic commitments. | Forced helplessness, every clue being a lie, danger after every quiet action. |
| Opening guidance | Anchor the player and one familiar relationship before introducing a manageable absurd disruption. | Anchor normal life, then introduce one observable discrepancy with several plausible responses. |
| Continuation guidance | Resolve the chosen approach and carry its consequences forward before adding another gag or complication. | Resolve what the chosen investigation could establish; preserve uncertainty only where the character actually lacks evidence. |

These definitions are implementable seed content. Their names and wording are tuning data, not architecture decisions requiring owner approval.

## Selection, precedence and versioning

- Save a nullable profile reference on drafts; incomplete and existing drafts remain valid. New generation requires explicit selection. No silent default for pre-existing stories.
- Changing selection increments the same draft revision as other content. Two-tab conflicts and old-candidate rejection keep their existing semantics.
- At opening admission, resolve the exact catalogue revision server-side and capture the full validated definition in the immutable request artifact. At Start, copy this captured definition into a separate story-owned storyteller snapshot. Keep premise and operational policy separate.
- Incomplete drafts may have no profile. A playable candidate requires an explicit profile selection. Discarded pre-POC candidates and stories are reset rather than decoded through compatibility paths.
- Pin story profile content for the POC; switching style mid-story and automatically upgrading catalogue revisions are deferred. Previously saved old references remain usable while their definition is shipped; missing definitions block new generation with a selection message, never resolve to a newer revision. Existing captured work does not need the catalogue to finish.
- System constraints and authoritative state outrank all creative preferences. Profile guidance sets the default; optional player direction refines compatible details and can narrow content. Conflicting direction does not silently replace the chosen style. Neither field grants authority, capabilities or spending permission.
- Prompt version, profile revision, task contract and model policy are separate identities. Openings use `playable.v1`; continuations use `playable.v2`. Discarded prototype formats are deleted rather than supported alongside the current contracts.

## Runtime separation required by the current code

`scripted-continuations.ts` currently contains authored output, proposal translation, generation settlement and story commit in one module. `complete()` chooses the same timed fixture for every intention and updates the generation inside the story transaction. `scripted-openings.ts` similarly supplies one universal opening. Those are explicit fixture runners, not places to insert a network call.

Extract the reusable prepare/validate/publish responsibilities while preserving current fixture adapters and their durable topics. A new profiled task source is injected at the application/worker composition boundary. Its output is `unknown` until validated. The source receives only the captured task, not a database transaction, HTTP request, credentials in prompts or unrestricted tool access. Source mode/identity is server-controlled and captured at admission; clients cannot select a provider by changing JSON.

The execution sequence is: admit and freeze input in a short transaction → run the source outside a transaction → persist validated result → conditionally publish under the existing story lock. A crash after result persistence retries publication without rerunning the source. A stale result stays diagnosable but does not publish. An already published resolution returns its receipt/current snapshot without applying it again. Provider uncertainty and billing are completed in the third feature, not guessed by this extraction.

Preserve `current`/`arrival` provenance and existing wait publication. An arrival is another publication from the same proposal, not a second generation. Fixture timing remains an explicit injected development policy; the generic translator must not import a file named `scripted-continuation-timing`.

## Acceptance

- Selecting either profile survives save/reopen, candidate review and Start; both opening and later tasks contain its same captured definition.
- Changing draft selection invalidates the candidate; duplicate Start and repeated choice submission retain existing protections.
- Altering catalogue data after admission cannot alter captured work or an existing story.
- A third valid profile can be added as data and appear in creation without changing execution, task preparation or commit code. Prove this with a test-only profile, not a production third style.
- Plain-text setup remains; gameplay exposes offered options only. Forged intentions, profile definitions and effect fields are rejected server-side.
- Offline input-sensitive fixtures demonstrate two profiles and at least two materially different choice outcomes through the production path; test fixture branches stay in fixture data/source modules.
- The authored chamber and current generated flow continue to work. Hidden intentions, profile instructions and prepared futures remain off public DTOs.
- No provider calls, new agent framework, world simulator or gameplay subsystem are introduced.

## Decisions still needed

Agreement on this bounded architecture/implementation scope. Exact profile copy is deliberately not a blocker. The later live stage needs separate explicit evaluation authorization; this proposal does not reopen spending.

## Owning specifications

After agreement, fold product decisions into [storytelling](../../storytelling.md) and [creation](../../story-creation.md), then technical contracts into [runtime](../../technical/storyteller-runtime.md), [lifecycle](../../technical/story-lifecycle.md) and [data](../../technical/data.md) before implementation. These feature documents currently own the proposed delta; permanent docs must not describe it as implemented.
