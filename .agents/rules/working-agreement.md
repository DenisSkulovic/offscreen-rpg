# Working agreement

## Product → Technical → Code

Code is an artifact of the product and technical specifications. Before changing behavior, update the affected product description, then its technical contract, then implement. For a structural change with no product effect, confirm the existing product contract and update only the relevant technical description; do not manufacture product changes.

Keep proposed behavior distinguishable from implemented and verified behavior. Update docs/progress.md when that boundary changes. If implementation reveals a design problem, correct the owning specification before proceeding; never leave the code and docs knowingly contradictory.

Before changing shared domain contracts or progression logic, use [Vision](../../docs/vision.md) and the [benchmark playthroughs](../../docs/playthroughs.md) as design constraints. Distinguish a universal invariant, selected ruleset/content, an illustrative fixture and an explicit implementation limit. Trace the proposed boundary through the immediate example and a contrasting existing benchmark, including the small/abstract benchmark when introducing character, world or resource assumptions. Record the short reasoning in the active feature plan. This is source/design reasoning, not a requirement to run tests or implement every example. A fixture must exercise the same application contract as generated play; moving constants to a fixture file is insufficient if shared handlers still interpret scenario names. Do not weaken acceptance or relabel an unfinished integration as future work to declare completion.

Documentation describes the current design. Replace or delete obsolete text in place. No superseded paragraphs, amendment tables, chronological logs or review-report dumps. Git holds history. Describe behavior, boundaries and consequential tradeoffs, not each branch of code. Keep open product choices in docs/questions.md until resolved. Brainstorming examples are inspiration, not automatic requirements.

## Navigation and durable understanding

Use [the code map](../../docs/engineering/code-navigation.md) to locate the owning flow, then read only the relevant package guide and implementation. Do not reload the entire architecture library for every task.

When investigation reveals a non-obvious cross-file relationship, authority boundary, retry rule or implementation limitation that another maintainer would otherwise have to rediscover, preserve the useful conclusion beside its owner during the same change. A local comment explains a local invariant; a package README explains entry points and flow; a technical specification owns the design decision; progress owns current coverage; an active feature plan owns unfinished work. Link between them instead of copying the explanation. Do not record exploration diaries or obvious syntax.

Before adding documentation, find its existing owner. Keep one authoritative explanation per decision. Update or remove affected navigation links and stale claims when moving code or changing behavior. Package guides should give a short route from input to authority to output, identify surprising coupling and link to the defining contract. Add file headers only where they explain otherwise hidden responsibility or constraints; no mandatory header on every file, exhaustive import lists, custom tag vocabulary or duplicate FAQ catalogue.

Persist only inspected facts as implemented behavior. Mark proposals and unverified assumptions explicitly. Record verification scope once with its limits; remove superseded failures/counts rather than appending contradictory status paragraphs. Documentation cannot substitute for fixing confusing ownership: identify the structural issue and keep its proposed resolution distinguishable from the current path.

## Lifecycle and scope

This is a very raw POC/MVP, intended for intensive daily evolution and a strong senior fullstack portfolio. Bold redesigns are expected when they improve the approved product. The current project has no production or user-owned game data: discarded prototype schemas, saves and workflow formats must be reset and removed, not preserved through compatibility code, historical DTOs, decoders or migration chains. While that remains true, keep exactly one current baseline database migration: fold schema changes into it and reset disposable local/test databases instead of accumulating additive migrations. Begin an immutable additive migration history only after the owner explicitly declares a lifecycle change or identifies data that must survive. Credentials and external side effects always require explicit accounting.

On this Windows workstation, read [Local dependencies](../../docs/development.md#local-dependencies) before starting or repairing project infrastructure. Docker Desktop with its WSL 2 backend is the verified path. Its known startup failure comes from stale AF_UNIX socket reparse points in two transient Local AppData directories, not from WSL or container data; repair both directories together while Docker is stopped instead of reinstalling software or bypassing the failure. Direct Docker Engine inside `Ubuntu-24.04` is recovery-only and must not publish the project ports concurrently with Docker Desktop.

Build in balanced passes across meaningful user flows. Do not perfect a small subsystem while major parts of the experience remain disconnected. Keep fixture behavior honest: scripted tests are not a functioning AI storyteller. The core is world-independent: D&D checks, storyteller judgment and time. Currency, employment, wages, species and example activities belong to scenario content, never mandatory character or outcome fields. Do not turn a brainstorming example into a universal mechanic. Favor generic story progression over simulations for every activity or population.

Treat observability as product behavior, not final polish. Durable player-facing activity history records meaningful game facts; operational logs diagnose the machinery around them. New or changed flows should emit structured, actionable info, warning and error events at their owning boundaries, with stable event names and useful correlation identifiers. Never log credentials, provider payloads or private player content merely for convenience, and never mistake a transient process log for durable game history. Keep the relevant manual QA coverage current when behavior or its diagnostics change.

Use the feature workflow for significant work. The user agrees the product vision before bulk implementation. Authorization then persists across the agreed phases; do not repeatedly request approval for routine details. A material change to that vision, scope or cost needs discussion. Small authorized fixes proceed directly.

Name every new feature folder `YYYY-MM-DD--HH-mm--feature-name`, using the repository's local timezone at creation and a lowercase kebab-case descriptive suffix. The timestamp is immutable after creation. Remove completed feature folders after their durable decisions have been folded into permanent documentation; Git retains their history.

Checks are optional throughout the current POC lifecycle. Default to fast, coherent vertical implementation slices without routine verification commands; do not chase green results or polish minor issues ahead of a connected playable experience. Follow [Verification](verification.md), which overrides stricter check requirements in plans or engineering guidance. Keep this policy until the owner explicitly changes it.

## Roles, handoffs and cost

The owner's preferred division is Codex for investigation, product/technical design and review; Cursor for bulk coding and refactoring. Prepare actionable phases instead of starting a large implementation pass in Codex without being asked. Do not launch another task, agent or subscription/model switch automatically.

Keep one active implementation owner for a slice. Before work, inspect Git status and the current feature checkpoint. Preserve unrelated changes. At handoff, record the current phase, exact next step, relevant checks and unresolved blockers in PLAN.md; rewrite this snapshot rather than appending diary entries. Keep handoffs short enough that a fresh model can act without rereading the conversation.

Use existing tools and local substitutes. Paid models, media, hosted integrations and deployment require explicit authorization. Read [Spending](spending.md). Keep private context, credentials and player data out of Git.
