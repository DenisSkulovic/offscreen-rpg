# Working agreement

## Product → Technical → Code

Code is an artifact of the product and technical specifications. Before changing behavior, update the affected product description, then its technical contract, then implement. For a structural change with no product effect, confirm the existing product contract and update only the relevant technical description; do not manufacture product changes.

Keep proposed behavior distinguishable from implemented and verified behavior. Update docs/progress.md when that boundary changes. If implementation reveals a design problem, correct the owning specification before proceeding; never leave the code and docs knowingly contradictory.

Before changing shared domain contracts or progression logic, use [Vision](../../docs/vision.md) and the [benchmark playthroughs](../../docs/playthroughs.md) as design constraints. Distinguish a universal invariant, selected ruleset/content, an illustrative fixture and an explicit implementation limit. Trace the proposed boundary through the immediate example and a contrasting existing benchmark, including the small/abstract benchmark when introducing character, world or resource assumptions. Record the short reasoning in the active feature plan. This is source/design reasoning, not a requirement to run tests or implement every example. A fixture must exercise the same application contract as generated play; moving constants to a fixture file is insufficient if shared handlers still interpret scenario names. Do not weaken acceptance or relabel an unfinished integration as future work to declare completion.

Documentation describes the current design. Replace or delete obsolete text in place. No superseded paragraphs, amendment tables, chronological logs or review-report dumps. Git holds history. Describe behavior, boundaries and consequential tradeoffs, not each branch of code. Keep open product choices in docs/questions.md until resolved. Brainstorming examples are inspiration, not automatic requirements.

## Lifecycle and scope

This is a very raw POC/MVP, intended for intensive daily evolution and a strong senior fullstack portfolio. Bold redesigns are expected when they improve the approved product. Do not retain internal compatibility layers, unused abstractions or migration machinery solely for hypothetical production users. Still account explicitly for actual saved stories, workflow histories, credentials and destructive actions.

Build in balanced passes across meaningful user flows. Do not perfect a small subsystem while major parts of the experience remain disconnected. Keep fixture behavior honest: scripted tests are not a functioning AI storyteller. The core is world-independent: D&D checks, storyteller judgment and time. Currency, employment, wages, species and example activities belong to scenario content, never mandatory character or outcome fields. Do not turn a brainstorming example into a universal mechanic. Favor generic story progression over simulations for every activity or population.

Use the feature workflow for significant work. The user agrees the product vision before bulk implementation. Authorization then persists across the agreed phases; do not repeatedly request approval for routine details. A material change to that vision, scope or cost needs discussion. Small authorized fixes proceed directly.

Checks are optional throughout the current POC lifecycle. Default to implementation without routine verification commands; do not chase green results or spend time on minor issues. Follow [Verification](verification.md), which overrides stricter check requirements in plans or engineering guidance. Keep this policy until the owner explicitly changes it.

## Roles, handoffs and cost

The owner's preferred division is Codex for investigation, product/technical design and review; Cursor for bulk coding and refactoring. Prepare actionable phases instead of starting a large implementation pass in Codex without being asked. Do not launch another task, agent or subscription/model switch automatically.

Keep one active implementation owner for a slice. Before work, inspect Git status and the current feature checkpoint. Preserve unrelated changes. At handoff, record the current phase, exact next step, relevant checks and unresolved blockers in PLAN.md; rewrite this snapshot rather than appending diary entries. Keep handoffs short enough that a fresh model can act without rereading the conversation.

Use existing tools and local substitutes. Paid models, media, hosted integrations and deployment require explicit authorization. Read [Spending](spending.md). Keep private context, credentials and player data out of Git.
