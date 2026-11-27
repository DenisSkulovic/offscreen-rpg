# Agent Core and monorepo architecture mapping | R6

**Status:** open exploratory design; 2026-11-27. Owner and ChatGPT collaborative workshop. Integration baseline `6dbd4c439f1d92733b539cd06a358bb46ca0372e`, main. Clean-slate target thinking; preserve existing source, history, working contracts and data. No implementation commission, canonical promotion, runtime changes or paid calls.

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
- [Technology selection (R4)](technology-selection/README.md)

## Evidence and limits
Read current main AGENTS, CHATGPT, design renewal rules and selected workflow/structure/planner guidance, current tree/manifests, product vision and Storyteller behavior/profile docs, canonical document and spending/trust boundary specs. Existing [monorepo ownership dossier](../code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md) is historical context, not superseded by this draft. [Storyteller Workshop](../../undertakings/storyteller-workshop/OVERVIEW.md) remains open; its reported ~45% overall (±20pp or more) is not a new estimate or credit for this design. Current source and integration gaps are not audited here. R3 rolling first-party framework research recorded; exact versions and experiments remain open. No framework selection performed. No proof or acceptance claimed.

R2 amendment checked against current main `1bf121b488b798f57d1f9f0d738d0f6ba0ce4f11`; the original integration baseline is retained. No rebase or runtime changes in this amendment.

## Next review
At the next owner workshop turn (review target 2026-11-28), review the R4 primary cohort and inference-execution boundary; resolve exact published versions before comparable specimens; continue to validate the package inventory and refine the strongest boundaries: generic document revision vs Library, model routing vs provider adapter, and generic agent execution vs mission/domain composition. Record missing package families as discovered. Then approve a small README-only placeholder specimen/plan; no workspace manifests or build-graph mutation yet. Before implementation or permanent promotion reconcile adjacent canonical contracts, inspect actual import/export/data seams, research alternatives, define acceptance and defend the design under current repository protocol.

## Historical Writer research (owner retirement 2026-11-27)
The [archived Writer's Workbench dossier](../../archive/story-creation-and-writers-workbench/README.md) is promoted product vision plus unratified technical research, not a competing architecture. Read canonical product/technical owners for accepted outcomes. Selectively consult [agentic capability examples](../../archive/story-creation-and-writers-workbench/AGENTIC-WRITER-POC.md), [vision traces](../../archive/story-creation-and-writers-workbench/VISION-FIRST-TRACES-AND-TESTS.md), [skills/model-quality experiment](../../archive/story-creation-and-writers-workbench/WRITER-SKILLS-EXPERIMENT.md), [open research questions](../../archive/story-creation-and-writers-workbench/QUESTIONS-AND-EXPERIMENTS.md), [index comparison](../../archive/story-creation-and-writers-workbench/PERSISTENT-INDEX-COMPARISON.md) and [synthetic microbenchmark](../../archive/story-creation-and-writers-workbench/experiments/research_index_microbench.py), [launch alternatives](../../archive/story-creation-and-writers-workbench/INITIALIZATION-LIFECYCLES.md), [versioning vectors](../../archive/story-creation-and-writers-workbench/VERSIONING-ACCEPTANCE-VECTORS.md), [fork research](../../archive/story-creation-and-writers-workbench/FORK-COMPATIBILITY-AND-MIGRATION-GATES.md) and [narrative fixtures](../../archive/story-creation-and-writers-workbench/fixtures/README.md). These are research leads, not mandatory experiments or inherited schema, numeric limits, provider, storage algorithm, recipe, package boundaries, deployment topology or migration requirements. Re-evaluate against current accepted architecture and evidence; no paid execution. Preserve unique research before archive pruning.
