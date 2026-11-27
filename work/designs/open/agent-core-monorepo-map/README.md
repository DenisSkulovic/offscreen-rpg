# Agent Core and monorepo architecture mapping | R10 E1 freeze candidate

**Status:** open exploratory design; 2026-11-27. R10 freezes the designer candidate for independent review, subject to custodian commit of this exact content; owner ratification remains separate. R8 comparative evidence and R9 foundation contracts are retained with the patched dependency and replay evidence. Owner and designer collaborative workshop. Integration baseline `6dbd4c439f1d92733b539cd06a358bb46ca0372e`, main. Clean-slate target thinking; preserve existing source, history, working contracts and data. No implementation commission, canonical promotion, runtime changes or paid calls.

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
- [Technology selection (R10)](technology-selection/README.md)

## Evidence and limits
Read current main AGENTS, CHATGPT, design renewal rules and selected workflow/structure/planner guidance, current tree/manifests, product vision and Storyteller behavior/profile docs, canonical document and spending/trust boundary specs. Existing [historical architecture-health findings](../../../research/agent-practice/CODE-ARCHITECTURE-HEALTH-2026-11.md) retain evidence from the superseded MA/DO design; this draft is not ratified architecture. [Storyteller Workshop](../../undertakings/storyteller-workshop/OVERVIEW.md) remains open; its reported ~45% overall (±20pp or more) is not a new estimate or credit for this design. Current source and integration gaps are not audited here. R3 rolling first-party research retained; R8 records exact direct experimental versions and successful basic runtime evidence. R10 records the isolated dependency audit, license screen and native replay. Final pnpm resolution and maintained runtime qualification remain implementation acceptance; owner ratification remains open.

R2 amendment checked against current main `1bf121b488b798f57d1f9f0d738d0f6ba0ce4f11`; the original integration baseline is retained. No rebase or runtime changes in this amendment.

## E1: monorepo and Agent Core foundation (proposed scope)

**Goal:** freeze a coherent first implementation evolution, not the mature architecture. Establish an initial package responsibility map and grouped skeleton, and a working, provider-free generic agent mission on Temporal. Later evolutions increase resolution using working source and evidence. This scope is proposed for owner agreement; neither a framework nor implementation is commissioned here.

### Included outcome and selected candidate for review
- Adopt the proposed [R9 package map](PACKAGE-MAP.md#e1-workspace-decision-r9-candidate): five families, one active new grouped workspace, preserve all flat paths and identities; targeted nested workspace tooling compatibility. README-only placeholders for justified future boundaries.
- Adopt the proposed [R9 Agent Core foundation](AGENT-CORE.md): exact Vercel SDK/Temporal integration, generic versioned mission and definition, bounded text context and native loop, explicit synthetic tool registry, isolated provider-free test host. Two distinct agent configurations, no production consumers, real inference or authoritative writes.
- Design boundary is E1 only. No future production provider, persistence, delegation or compaction contract needs to be resolved now. G1–G8 remain adoption gates for relevant exposed scope; the unproved real-effect, child, live authority/privacy and expanded modality guarantees block those later activations, not this isolated fixture evolution.

### Design freeze criteria
- [x] Three comparable P0/P1 experiments passed; direct versions and limitations recorded.
- [x] Designer selection: Vercel, OpenAI retained as research reserve; grouped workspace boundary, internal ownership, mission contract and final acceptance defined in linked documents. Independent review and owner ratification remain pending.
- [x] Patched Zod 4.6.7 installed with strict peer resolution; audit reported zero vulnerabilities; unionfs packaged license inspected. Four rerun missions and completed P1 replay passed. [Receipt](technology-selection/experiments/p0-p1/README.md#r10-patched-vercel-and-replay-receipt-2026-11-27) records hashes and limitations. Preserve exact experiment files locally; final pnpm closure/license/security check remains acceptance. Worker interruption, negative tool/limit, cancellation and integration proofs are qualification.
- [x] Compact designer self-defense below; no unresolved Critical/High design finding identified within the bounded synthetic scope.
- [ ] Custodian commits exact R10 content; independent reviewer delivers SHA-bound verdict. Resolve blocking findings only; owner ratifies separately and promote accepted meaning before implementation commission.

### Designer self-defense (R10, 2026-11-27)

Designer: ChatGPT (author, not independent reviewer). Source/integration reference `c1fbde9b89c2a8bfe69c8c220aff135db290e27f` on main; original workshop baseline above is historical provenance. Exact frozen candidate SHA is the custodian's resulting commit, not this reference SHA. Scope: synthetic-only Agent Core and grouped workspace compatibility, no replacement or activation of existing domain/provider authority. Reviewed current agent rules, R9 contracts, P0/P1 specimens and receipts; prior snapshot source for unchanged affected runtime/build paths (comparison from 53d88b45 to c1fbde9b reported no changes under packages, apps, infra, tools, technical docs or root workspace configuration).

| Ranked objection / counterexample | Disposition and remaining evidence |
| --- | --- |
| SD1: Native SDK loop could fail deterministic replay, or a new Worker might lose fake-model state. | Actual 23-event replay passed with identical bundle identifier. R9 replaces call-counter-dependent model decisions with conversation-driven fixtures; restart of the maintained implementation is still essential qualification, not established by replay. No custom durable loop. |
| SD2: A model could request an unregistered capability, or errors/limits could be hidden by a final textual answer. | Static host registry, definition/request intersection, deterministic synchronous reservations, independently checked fixture dispatch and denial-first result mapping; no production tools. R10 clarifies identity binding, SDK error accounting and no-effect denial in Agent Core contract. Final diagnostic negative matrix required. |
| SD3: New grouped workspace could alter existing image closure, build or dev sync behavior. | Keep all existing paths/identities; explicit family globs, nested leaf discovery and duplicate rejection. Source anchors: `pnpm-workspace.yaml`, `infra/images/common/workspace-graph.mjs` (`loadWorkspaceIndex`), `infra/images/development/sync-plan.mjs` (`workspaceDirForPath`, `isAppManifestOrTsconfig`), existing `packages/workflows/package.json` and `apps/worker/package.json`. Preserve all four app closures; no app dependency or migrations. Revert isolated unaccepted implementation branch rather than cut over. |
| SD4: SDK or dependency compromise/exposure. | Zod advisory addressed by exact 4.6.7 rerun; zero findings reported for isolated npm closure. License screen not legal certification. No real provider, external tool, credentials, protected payload or application registration. Existing spending, provider and trust contracts remain authoritative (`docs/technical/platform/spending-and-entitlements.md`, `security-and-trust-boundaries.md`, `docs/technical/storyteller/provider-boundary.md`). Final pnpm graph must not regress existing dependencies; any existing baseline advisory is separate from the new package. |
| SD5: Could use a bespoke loop, retain the existing Storyteller controller, or choose OpenAI instead. | Existing controller is not a generic package; bespoke loop adds ownership and replay burden for behavior already demonstrated. OpenAI is credible and near-tied in warm latency but heavier in this specimen; Vercel suits reusable inference direction without adopting extra agent abstractions. If the maintained native seam fails a mandatory predicate, reopen the runtime decision, not implement an unreviewed fallback. |

Verdict: **DEFENDED for E1 candidate submission only**. No unresolved Critical/High design finding identified by the designer; independent verdict pending. Resource measurements are single-process samples, no scale claims. Deferred: persistent instances, child grants, paid/uncertain effect custody, protected payloads and live domain integration. No integration, deployment, implementation or spending authorization follows. Full qualification remains mandatory before merging the implementation evolution into main.

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
Custodian: preserve experiment manifests, locks and logs; commit R10 and supply its full SHA. Submit that immutable candidate for independent review under current progressive-resolution rules. Resolve only blocking findings, obtain owner ratification and promote accepted scope, then plan the complete implementation batch. No further framework research or design expansion absent material evidence. No implementation or live use authorized by this candidate.

## Historical Writer research (owner retirement 2026-11-27)
The [archived Writer's Workbench dossier](../../archive/story-creation-and-writers-workbench/README.md) is promoted product vision plus unratified technical research, not a competing architecture. Read canonical product/technical owners for accepted outcomes. Selectively consult [agentic capability examples](../../archive/story-creation-and-writers-workbench/AGENTIC-WRITER-POC.md), [vision traces](../../archive/story-creation-and-writers-workbench/VISION-FIRST-TRACES-AND-TESTS.md), [skills/model-quality experiment](../../archive/story-creation-and-writers-workbench/WRITER-SKILLS-EXPERIMENT.md), [open research questions](../../archive/story-creation-and-writers-workbench/QUESTIONS-AND-EXPERIMENTS.md), [index comparison](../../archive/story-creation-and-writers-workbench/PERSISTENT-INDEX-COMPARISON.md) and [synthetic microbenchmark](../../archive/story-creation-and-writers-workbench/experiments/research_index_microbench.py), [launch alternatives](../../archive/story-creation-and-writers-workbench/INITIALIZATION-LIFECYCLES.md), [versioning vectors](../../archive/story-creation-and-writers-workbench/VERSIONING-ACCEPTANCE-VECTORS.md), [fork research](../../archive/story-creation-and-writers-workbench/FORK-COMPATIBILITY-AND-MIGRATION-GATES.md) and [narrative fixtures](../../archive/story-creation-and-writers-workbench/fixtures/README.md). These are research leads, not mandatory experiments or inherited schema, numeric limits, provider, storage algorithm, recipe, package boundaries, deployment topology or migration requirements. Re-evaluate against current accepted architecture and evidence; no paid execution. Preserve unique research before archive pruning.


Historical ownership lessons: verify internal runtime/type-only edges, narrow exports and reverse consumers, preserve authority and provider custody, and keep developer fixtures outside production dependency closure. Reassess the specific capture/publication and custody seams against the selected target; do not import historical package names as constraints.


## Retained product research: semantic materialization

[Product reality research](../../../../research/product-reality/README.md) identifies the gap between creative proposals and deterministic authority: choosing enduring people, objects, promises, relationships and meaningful changes before validation is not solved by a correct execution loop. Preserve distinctions among observed narrative, proposed changes, admitted authoritative effects and published versioned evidence. Investigate admission/identity, provenance, false promotion, missed recall and fork-local history in eventual Storyteller/document/Library seams; no generic Agent Core dependency or old schema is implied. Measure total cost per accepted worthwhile turn, including retries and discarded work, in later evaluation. Research question only, not framework selection or acceptance fixture.


[Retained REAL semantic probes](../../../../research/product-reality/PLAYABILITY-EXPERIMENTS-2026-11-18.md) distinguish committed mechanics, published narrative, admitted semantic knowledge and actual task input. Use successful/failed gifts, omitted promises, attributed rumors, stale/hidden versions, restart and budget exhaustion to challenge future Storyteller/Library/authority boundaries. These are research discriminators, not a generic runtime contract, old schema or mandatory fixture.
