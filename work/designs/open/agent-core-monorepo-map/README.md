# Agent Core and monorepo architecture mapping | R9 foundation candidate

**Status:** open exploratory design; 2026-11-27. R9 consolidates a bounded E1 candidate for owner agreement and independent review; R8 P0/P1 evidence retained. Owner and designer collaborative workshop. Integration baseline `6dbd4c439f1d92733b539cd06a358bb46ca0372e`, main. Clean-slate target thinking; preserve existing source, history, working contracts and data. No implementation commission, canonical promotion, runtime changes or paid calls.

## Purpose
Map the intended monorepo as a whole, using generic agent execution as the initial lens. Discover coherent package responsibilities independently of inherited implementation; grow the map into a browsable skeleton of README-only package placeholders after owner review. Existing package names and code are not evidence of desired ownership. A package is a responsibility boundary, not necessarily a process, database or service.

## Owner direction captured
- Generic agent machinery must be distinct from its Storyteller embodiment. Consider reuse for other agents and subagents.
- Context assembly, tool registry/management, execution loop, optional compaction and delegation belong in the agent-core investigation. Consider third-party machinery rather than assuming bespoke implementation.
- Keep Redis caching outside Agent Core. Postgres versus object storage placement is a separate design question.
- A distinct technical document versioning/rendering package is required: structured JSON content (whole Markdown or pieces) evolves with Git-like historical semantics and renders as Markdown. It must know nothing of Library, campaign or scene semantics. Library is a separate domain/package candidate.
- Model matching is reusable outside agents (direct LLM, image/video requests) and should be mapped independently. Reasoning effort spans mission intent, capability and provider encoding.
- Map budgeting, metering, billing, observability and adjacent game/platform domains without forcing direct dependencies on Agent Core.
- First map, then create placeholders, then flesh them out individually. Do not manufacture complexity to fill empty folders.

## R2: owner-selected organization convention (2026-11-27)
Use one organizational family level under `packages/`, with leaf workspaces retaining short `@offscreen/<name>` identities. Group by responsibility, not a mandatory dependency hierarchy. No numeric or family prefixes in package names; no additional npm scopes or nested workspace packages. The initial five families are `domain`, `ai`, `commerce`, `platform`, `foundation`; individual classifications and package names may evolve. See [package map](PACKAGE-MAP.md#organization-convention-r2) for the authoritative workshop specimen. This selects the design convention, not a source migration or implementation authorization.

## R3: borrow-first agent runtime investigation
Owner requests serious framework research instead of defaulting to an in-house loop. First-party research identifies native Temporal integrations for TypeScript agent frameworks; prioritize paired Vercel AI SDK and OpenAI Agents SDK specimens. No dependency selection yet. See [runtime research](AGENT-RUNTIME-RESEARCH.md). A reusable inference-execution boundary is a new candidate, not a selected package.

## R4: technology-selection research
See [candidate dossiers](technology-selection/README.md) for pinned source evidence, eight alternatives, version register and hard gates. Strands joins Vercel and OpenAI in the primary cohort; no winner selected. Documentation/source skew and exact published artifacts remain material gaps. Next owner review precedes version-pinned provider-free specimens and eventual independent defense.

## R5: compare actual execution machinery
[Execution architecture comparison](technology-selection/EXECUTION-ARCHITECTURES.md) traces the same mission across all candidates, identifies the trusted Activity identity/custody seam, and proposes Vercel multi-step generation as the first proof candidate, with Strands and OpenAI as alternatives. This is not an adoption decision; exact artifact resolution and provider-free proof remain open.

## R6: three runtime POCs
Owner authorizes experimental specimens across Vercel, Strands and OpenAI with existing local infrastructure. [P0/P1](technology-selection/experiments/p0-p1/README.md) contains candidate-specific native Workflow and fake-model source, shared assertion/measurement launcher and read-only preflight. Originally NOT RUN at R6; superseded by R8 execution evidence below.

## R8: comparative P0/P1 results
All three native integrations 2.0.0 with Temporal SDK 1.24.0 passed P0 and three P1 missions each in owner WSL without specimen corrections. [Result receipt](technology-selection/experiments/p0-p1/README.md#owner-operated-result-receipt-2026-11-27) records versions, timings, history and limitations. Vercel AI SDK 7.0.183 is the designer recommendation: smallest observed footprint/startup/history, simple provider and multi-step loop seam, warm latency comparable to OpenAI. OpenAI remains viable reserve; Strands adds a model configuration Activity. Owner selection pending; no full gate clearance, dependency adoption or live effects authorized.

## Working documents
- [Package map](PACKAGE-MAP.md)
- [Agent Core responsibility specimen](AGENT-CORE.md)
- [Agent runtime research and experiment plan (R3)](AGENT-RUNTIME-RESEARCH.md)
- [Technology selection (R8)](technology-selection/README.md)

## Evidence and limits
Read current main AGENTS, CHATGPT, design renewal rules and selected workflow/structure/planner guidance, current tree/manifests, product vision and Storyteller behavior/profile docs, canonical document and spending/trust boundary specs. Existing [historical architecture-health findings](../../../research/agent-practice/CODE-ARCHITECTURE-HEALTH-2026-11.md) retain evidence from the superseded MA/DO design; this draft is not ratified architecture. [Storyteller Workshop](../../undertakings/storyteller-workshop/OVERVIEW.md) remains open; its reported ~45% overall (±20pp or more) is not a new estimate or credit for this design. Current source and integration gaps are not audited here. R3 rolling first-party research retained; R8 records exact direct experimental versions and successful basic runtime evidence. Published dependency closure/security, additional E1 evidence, framework selection and architecture acceptance remain open.

R2 amendment checked against current main `1bf121b488b798f57d1f9f0d738d0f6ba0ce4f11`; the original integration baseline is retained. No rebase or runtime changes in this amendment.

## E1: monorepo and Agent Core foundation (proposed scope)

**Goal:** freeze a coherent first implementation evolution, not the mature architecture. Establish an initial package responsibility map and grouped skeleton, and a working, provider-free generic agent mission on Temporal. Later evolutions increase resolution using working source and evidence. This scope is proposed for owner agreement; neither a framework nor implementation is commissioned here.

### Included outcome and selected candidate for review
- Adopt the proposed [R9 package map](PACKAGE-MAP.md#e1-workspace-decision-r9-candidate): five families, one active new grouped workspace, preserve all flat paths and identities; targeted nested workspace tooling compatibility. README-only placeholders for justified future boundaries.
- Adopt the proposed [R9 Agent Core foundation](AGENT-CORE.md): exact Vercel SDK/Temporal integration, generic versioned mission and definition, bounded text context and native loop, explicit synthetic tool registry, isolated provider-free test host. Two distinct agent configurations, no production consumers, real inference or authoritative writes.
- Design boundary is E1 only. No future production provider, persistence, delegation or compaction contract needs to be resolved now. G1–G8 remain adoption gates for relevant exposed scope; the unproved real-effect, child, live authority/privacy and expanded modality guarantees block those later activations, not this isolated fixture evolution.

### Design freeze criteria
- [x] Three comparable P0/P1 experiments passed; direct versions and limitations recorded.
- [x] Candidate proposed: Vercel, with OpenAI as fallback; grouped workspace boundary, internal ownership, mission contract and final acceptance proposed in the linked R9 files. Await owner acceptance and targeted evidence, not additional speculative design.
- [ ] Confirm preserved exact lockfiles and resolve relevant dependency license/security findings; replay one actual completed Vercel P1 history using the same bundle/plugin. If this fails, investigate the native seam or use fallback only for a material blocker. Worker interruption, negative tool/limit, cancellation and full integration proofs are implementation qualification, not another pre-freeze research campaign.
- [ ] Perform compact self-defense of E1 (determinism, exposure, bounded limits, package compatibility), freeze exact candidate and obtain independent verdict. Correct Critical/High findings only; owner ratifies separately and promote accepted meaning before implementation commission.

### After acceptance
Prepare the complete bounded Change batch from the audited gaps. Use the current repository integration-branch, parallel execution and proof-scheduling rules. Shape the package and runtime foundation first; concentrate integration and qualification at coherent boundaries. Commission separately. E1 is delivered only when its implementation acceptance passes; source-only joins are not runtime proof. Preserve findings and lessons for the next evolution.

### Future evolution candidates (not E1 requirements or commissioned backlog)

| Candidate | Relative priority (proposed) | Revisit when |
| --- | --- | --- |
| Guarded real inference, route/provider selection, spend and uncertain-attempt custody; shared direct inference | High | Before any real model dispatch or corresponding consumer activation |
| Authorized durable tools, SQL effect recovery, Library/document-versioning and Storyteller integration | High | Before real domain effects or consumer cutover; select a bounded next outcome |
| Persistent instances, delegation, context compaction and richer execution state | Medium | A concrete mission requires them; resolve grant/concurrency/retention before exposure |
| Redis/cache, richer telemetry, broader modalities and performance tuning | Medium/Low | Workload or operational evidence warrants it |
| Further package migrations and splits | As needed | A concrete boundary or consumer justifies the move |

The original research, hard gates and later experiment tiers remain available. Future priority is distinct from current defect severity. Do not infer approval of live use from foundation acceptance.

## Next review
Owner: agree/amend the R9 candidate as one batch. Preserve R8 lockfiles and run the narrow Vercel replay and dependency evidence check. Close remaining material blockers, freeze and submit for independent review; then plan the complete implementation batch. Do not reopen all framework comparisons or future capabilities. No implementation or live use authorized by this draft.

## Historical Writer research (owner retirement 2026-11-27)
The [archived Writer's Workbench dossier](../../archive/story-creation-and-writers-workbench/README.md) is promoted product vision plus unratified technical research, not a competing architecture. Read canonical product/technical owners for accepted outcomes. Selectively consult [agentic capability examples](../../archive/story-creation-and-writers-workbench/AGENTIC-WRITER-POC.md), [vision traces](../../archive/story-creation-and-writers-workbench/VISION-FIRST-TRACES-AND-TESTS.md), [skills/model-quality experiment](../../archive/story-creation-and-writers-workbench/WRITER-SKILLS-EXPERIMENT.md), [open research questions](../../archive/story-creation-and-writers-workbench/QUESTIONS-AND-EXPERIMENTS.md), [index comparison](../../archive/story-creation-and-writers-workbench/PERSISTENT-INDEX-COMPARISON.md) and [synthetic microbenchmark](../../archive/story-creation-and-writers-workbench/experiments/research_index_microbench.py), [launch alternatives](../../archive/story-creation-and-writers-workbench/INITIALIZATION-LIFECYCLES.md), [versioning vectors](../../archive/story-creation-and-writers-workbench/VERSIONING-ACCEPTANCE-VECTORS.md), [fork research](../../archive/story-creation-and-writers-workbench/FORK-COMPATIBILITY-AND-MIGRATION-GATES.md) and [narrative fixtures](../../archive/story-creation-and-writers-workbench/fixtures/README.md). These are research leads, not mandatory experiments or inherited schema, numeric limits, provider, storage algorithm, recipe, package boundaries, deployment topology or migration requirements. Re-evaluate against current accepted architecture and evidence; no paid execution. Preserve unique research before archive pruning.


Historical ownership lessons: verify internal runtime/type-only edges, narrow exports and reverse consumers, preserve authority and provider custody, and keep developer fixtures outside production dependency closure. Reassess the specific capture/publication and custody seams against the selected target; do not import historical package names as constraints.


## Retained product research: semantic materialization

[Product reality research](../../../../research/product-reality/README.md) identifies the gap between creative proposals and deterministic authority: choosing enduring people, objects, promises, relationships and meaningful changes before validation is not solved by a correct execution loop. Preserve distinctions among observed narrative, proposed changes, admitted authoritative effects and published versioned evidence. Investigate admission/identity, provenance, false promotion, missed recall and fork-local history in eventual Storyteller/document/Library seams; no generic Agent Core dependency or old schema is implied. Measure total cost per accepted worthwhile turn, including retries and discarded work, in later evaluation. Research question only, not framework selection or acceptance fixture.


[Retained REAL semantic probes](../../../../research/product-reality/PLAYABILITY-EXPERIMENTS-2026-11-18.md) distinguish committed mechanics, published narrative, admitted semantic knowledge and actual task input. Use successful/failed gifts, omitted promises, attributed rumors, stale/hidden versions, restart and budget exhaustion to challenge future Storyteller/Library/authority boundaries. These are research discriminators, not a generic runtime contract, old schema or mandatory fixture.
