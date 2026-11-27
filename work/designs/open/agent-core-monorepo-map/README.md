# Agent Core and monorepo architecture mapping | R7 scope proposal

**Status:** open exploratory design; 2026-11-27. R7 proposes the E1 boundary for owner agreement; R6 runtime evidence is unchanged. Owner and designer collaborative workshop. Integration baseline `6dbd4c439f1d92733b539cd06a358bb46ca0372e`, main. Clean-slate target thinking; preserve existing source, history, working contracts and data. No implementation commission, canonical promotion, runtime changes or paid calls.

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
Owner authorizes experimental specimens across Vercel, Strands and OpenAI with existing local infrastructure. [P0/P1](technology-selection/experiments/p0-p1/README.md) contains candidate-specific native Workflow and fake-model source, shared assertion/measurement launcher and read-only preflight. Runtime NOT RUN; npm registry unavailable from planner container. Next action: owner preflight and exact artifact selection, then bounded owned Temporal run; PostgreSQL/Redis tiers follow only after basic discrimination.

## Working documents
- [Package map](PACKAGE-MAP.md)
- [Agent Core responsibility specimen](AGENT-CORE.md)
- [Agent runtime research and experiment plan (R3)](AGENT-RUNTIME-RESEARCH.md)
- [Technology selection (R6)](technology-selection/README.md)

## Evidence and limits
Read current main AGENTS, CHATGPT, design renewal rules and selected workflow/structure/planner guidance, current tree/manifests, product vision and Storyteller behavior/profile docs, canonical document and spending/trust boundary specs. Existing [historical architecture-health findings](../../../research/agent-practice/CODE-ARCHITECTURE-HEALTH-2026-11.md) retain evidence from the superseded MA/DO design; this draft is not ratified architecture. [Storyteller Workshop](../../undertakings/storyteller-workshop/OVERVIEW.md) remains open; its reported ~45% overall (±20pp or more) is not a new estimate or credit for this design. Current source and integration gaps are not audited here. R3 rolling first-party framework research recorded; exact versions and experiments remain open. No framework selection performed. No proof or acceptance claimed.

R2 amendment checked against current main `1bf121b488b798f57d1f9f0d738d0f6ba0ce4f11`; the original integration baseline is retained. No rebase or runtime changes in this amendment.

## E1: monorepo and Agent Core foundation (proposed scope)

**Goal:** freeze a coherent first implementation evolution, not the mature architecture. Establish an initial package responsibility map and grouped skeleton, and a working, provider-free generic agent mission on Temporal. Later evolutions increase resolution using working source and evidence. This scope is proposed for owner agreement; neither a framework nor implementation is commissioned here.

### Included outcome
- Review the five-family package map; distinguish confirmed responsibilities, candidate boundaries and existing packages. Select useful README-only placeholders. Decide the minimal grouped workspace activation/migration needed for E1 after checking actual workspace, imports, build, CI and fixed-path consumers; preserve existing identities and behavior. Do not activate duplicate or speculative workspaces.
- Select one exact, compatible runtime dependency from the primary cohort (or a justified fallback). Define generic mission input/output, bounded execution and stopping, basic context, explicit tool registry, host composition, and deterministic Workflow versus effectful Activity ownership. Borrow SDK machinery where supported; no requirement to implement every responsibility in AGENT-CORE.md.
- Establish a maintained foundation mission using deterministic model doubles and synthetic scoped tools, with fail-closed capability exposure, explicit execution identity and basic lifecycle diagnostics. No live inference, real domain writes, or production consumer cutover. Unsupported paths must be absent or refused; existing authority and financial controls remain unchanged.

### Design freeze criteria
- [ ] Run the three [P0/P1 specimens](technology-selection/experiments/p0-p1/README.md) or record a concrete incompatibility/failure that justifies eliminating a candidate. Resolve exact published versions, compatibility, licensing and relevant security evidence; retain commands, outcomes, measurement limits and the reason for selection.
- [ ] Resolve the material E1 runtime questions: Workflow/Activity boundary, determinism and replay, mission/attempt/effect identity, allowed capabilities, stopping, cancellation/failure and basic context limits. Use the smallest targeted follow-up specimen needed for decisive uncertainty; do not require every P2–P5 research tier. Keep G1–G8 in [comparison](technology-selection/COMPARISON.md); apply the relevant gates to E1 and explicitly identify unproved adoption gates that forbid later live or expanded use. P0/P1 alone is not production proof.
- [ ] Agree on the initial package map, actual E1 workspace delta and Agent Core interfaces; reconcile affected existing source and canonical contracts. Resolve material dependencies and safe migration/integration boundaries without designing every future package.
- [ ] Define E1 acceptance: maintained synthetic mission (P0/P1 behavior), appropriate negative capability/limit and failure/replay checks, no real provider or protected-data effects, existing affected workspace/build behavior preserved. Assign final implementation proof separately from design evidence.
- [ ] Self-defend, freeze the selected candidate for independent architecture review, resolve blocking findings, obtain the exact-candidate verdict and separate owner acceptance, then promote only accepted guarantees. Medium/Low refinements do not prolong E1.

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
Owner workshop now: agree or amend E1, run read-only WSL preflight and the three version-pinned P0/P1 experiments, then review comparative results and choose only necessary follow-up evidence. Next design checkpoint: runtime selection and minimal package/workspace delta; freeze when the above criteria are met. No production runtime changes, dependency adoption or paid calls are authorized by this scope proposal.

## Historical Writer research (owner retirement 2026-11-27)
The [archived Writer's Workbench dossier](../../archive/story-creation-and-writers-workbench/README.md) is promoted product vision plus unratified technical research, not a competing architecture. Read canonical product/technical owners for accepted outcomes. Selectively consult [agentic capability examples](../../archive/story-creation-and-writers-workbench/AGENTIC-WRITER-POC.md), [vision traces](../../archive/story-creation-and-writers-workbench/VISION-FIRST-TRACES-AND-TESTS.md), [skills/model-quality experiment](../../archive/story-creation-and-writers-workbench/WRITER-SKILLS-EXPERIMENT.md), [open research questions](../../archive/story-creation-and-writers-workbench/QUESTIONS-AND-EXPERIMENTS.md), [index comparison](../../archive/story-creation-and-writers-workbench/PERSISTENT-INDEX-COMPARISON.md) and [synthetic microbenchmark](../../archive/story-creation-and-writers-workbench/experiments/research_index_microbench.py), [launch alternatives](../../archive/story-creation-and-writers-workbench/INITIALIZATION-LIFECYCLES.md), [versioning vectors](../../archive/story-creation-and-writers-workbench/VERSIONING-ACCEPTANCE-VECTORS.md), [fork research](../../archive/story-creation-and-writers-workbench/FORK-COMPATIBILITY-AND-MIGRATION-GATES.md) and [narrative fixtures](../../archive/story-creation-and-writers-workbench/fixtures/README.md). These are research leads, not mandatory experiments or inherited schema, numeric limits, provider, storage algorithm, recipe, package boundaries, deployment topology or migration requirements. Re-evaluate against current accepted architecture and evidence; no paid execution. Preserve unique research before archive pruning.


Historical ownership lessons: verify internal runtime/type-only edges, narrow exports and reverse consumers, preserve authority and provider custody, and keep developer fixtures outside production dependency closure. Reassess the specific capture/publication and custody seams against the selected target; do not import historical package names as constraints.


## Retained product research: semantic materialization

[Product reality research](../../../../research/product-reality/README.md) identifies the gap between creative proposals and deterministic authority: choosing enduring people, objects, promises, relationships and meaningful changes before validation is not solved by a correct execution loop. Preserve distinctions among observed narrative, proposed changes, admitted authoritative effects and published versioned evidence. Investigate admission/identity, provenance, false promotion, missed recall and fork-local history in eventual Storyteller/document/Library seams; no generic Agent Core dependency or old schema is implied. Measure total cost per accepted worthwhile turn, including retries and discarded work, in later evaluation. Research question only, not framework selection or acceptance fixture.


[Retained REAL semantic probes](../../../../research/product-reality/PLAYABILITY-EXPERIMENTS-2026-11-18.md) distinguish committed mechanics, published narrative, admitted semantic knowledge and actual task input. Use successful/failed gifts, omitted promises, attributed rumors, stale/hidden versions, restart and budget exhaustion to challenge future Storyteller/Library/authority boundaries. These are research discriminators, not a generic runtime contract, old schema or mandatory fixture.
