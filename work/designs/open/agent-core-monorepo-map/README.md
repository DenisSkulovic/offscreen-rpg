# Agent Core and monorepo architecture mapping | R1

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

## Working documents
- [Package map](PACKAGE-MAP.md)
- [Agent Core responsibility specimen](AGENT-CORE.md)

## Evidence and limits
Read current main AGENTS, CHATGPT, design renewal rules and selected workflow/structure/planner guidance, current tree/manifests, product vision and Storyteller behavior/profile docs, canonical document and spending/trust boundary specs. Existing [monorepo ownership dossier](../code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md) is historical context, not superseded by this draft. [Storyteller Workshop](../../undertakings/storyteller-workshop/OVERVIEW.md) remains open; its reported ~45% overall (±20pp or more) is not a new estimate or credit for this design. Current source and integration gaps are not audited here. No external framework selection or experiment performed; upstream research required before such selections. No proof or acceptance claimed.

## Next review
At the next owner workshop turn (review target 2026-11-28), validate the package inventory and refine the strongest boundaries: generic document revision vs Library, model routing vs provider adapter, and generic agent execution vs mission/domain composition. Record missing package families as discovered. Then approve a small README-only placeholder specimen/plan; no workspace manifests or build-graph mutation yet. Before implementation or permanent promotion reconcile adjacent canonical contracts, inspect actual import/export/data seams, research alternatives, define acceptance and defend the design under current repository protocol.
