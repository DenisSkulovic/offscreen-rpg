# How we develop this product

Status: Active working agreement. The product → technical design → code sequence is user-directed. Detailed working conventions below are assistant-established and reversible.
Updated: 2026-09-16.

## Three layers, with explicit feedback

1. **Product:** why it exists, whom it serves, what players can do, how it behaves, quality expectations, scope, and evidence of success.
2. **Technical:** how the accepted behavior will be delivered, including architecture, data, integrations, constraints, tradeoffs, and verification.
3. **Implementation:** working code, tests, and operating instructions that realize the accepted product and technical decisions.

This is the default direction of dependency. Later discoveries may require upstream revisions. Code does not silently redefine the product; a technical limitation is raised as a product tradeoff, decided with Denis when material, and reflected in affected documents.

Do not require the complete long-term library before building anything. Once a coherent first scope is accepted, its product and technical definitions can become ready while future features remain outlines.

## Current phase and boundaries

D061 closes this product-definition pass at baseline v0.01. Next session: derive compact technical documents, then implement a playable MVP under Denis's direction. This review itself performs no technical implementation, account setup, deployment or paid model calls. Prior product-only restrictions describe the completed exploration phase, not a prohibition on the requested next phase.

A baseline freezes the current direction and scope long enough to build. It does not mark every draft option accepted. Technical design resolves the short queue in TASKS, records chosen defaults and maps them to supported behavior; playtests can reopen a specific product decision with evidence. Do not require completion of the optional topic tree.

Be technology-aware without prescribing solutions. State the player-facing need, identify feasibility uncertainties, and record what evidence will eventually resolve them. When a current capability, price, or limitation affects a real decision, research official sources and date the finding. Do not treat a particular model's behavior as a timeless limit.

Example: “An NPC must not act on information they never learned” is a product requirement. The storage and retrieval machinery belongs in the technical layer.

## Progressive elaboration

1. Draft and discuss the cornerstone, [PRODUCT_VISION](product/PRODUCT_VISION.md), roughly one to two pages of prose.
2. Map the future library in [DOCUMENTATION_TREE](DOCUMENTATION_TREE.md). The map can be provisional while the vision is being refined.
3. Agree the vision baseline and adjust the map accordingly.
4. Elaborate one coherent topic at a time: journeys, concepts, behaviors, edge cases, and acceptance examples.
5. Reconcile contradictions and determine a focused first release.
6. With explicit user direction to enter technical design, derive technical documents from the accepted product scope.
7. With the implementation phase authorized, build and verify a small complete slice; feed actual findings back upstream.

Generating text is drafting, not deciding. Do not fill every planned file automatically or invent certainty to make a document look finished.

## A normal evening's session

- Read the compact entry point and only the topic needed.
- Choose or infer a manageable product question from the current focus.
- Discuss concrete examples and alternatives in ordinary conversation.
- Draft the agreed direction; clearly label remaining proposals and questions.
- Update the relevant document, decision record, and restart focus.
- Give Denis a short account of what changed and what remains open.

No special commands, manual copying, or formal signoff ceremony is required. Clear agreement in conversation is sufficient to accept a decision. Silence and unrelated follow-ups are not acceptance. Explain the concrete behavior, recommendation and important tradeoff in conversation, then record his answer at the scope actually agreed. Do not seek blanket approval of a bundle of unread drafts.

## Document conventions

Each substantial document should identify status, last substantive update, scope, and related documents. Use these states:

- **Planned:** listed in the map; no file required.
- **Draft:** written but contains unaccepted proposals.
- **Accepted:** Denis has agreed the stated scope or decision; still revisable.
- **Needs revision:** affected by a newer decision or conflicting evidence.
- **Superseded:** retained as history, excluded from normal reading.

The source of release placement is product/foundations/scope-and-release-plan.md; topic owners define behavior without duplicating the roadmap. The documentation map is optional coverage, not a backlog to populate.

A topic document should usually contain purpose, relevant actors/concepts, expected behavior, boundaries, examples, and open questions. Use only applicable sections. Do not pad every document to fit a template.

Assign stable requirement IDs when requirements become concrete, not to every brainstorm sentence. Later technical designs refer to those IDs; implementation checks refer to their acceptance examples. Keep traceability proportionate.

## Options, forks and release disposition

User direction: capture alternatives now without forcing premature MVP choices. Exploration can continue across unresolved forks. Do not repeatedly ask Denis to choose a first-release mode simply because a document mentions one.

Separate three dimensions:
- **Document maturity:** draft, accepted, needs-revision, etc.
- **Option decision:** candidate, selected, or rejected, with rationale.
- **Release disposition:** unassigned, MVP-candidate, next-candidate, parked, implement in a named release, postponed, or cancelled. Candidate labels are recommendations, not commitments. Parked means no planned implementation or documentation work; it may never happen.

An accepted long-term capability may be postponed for an MVP. A draft alternative is not a promised configurable feature. Cancellation is distinct from postponement, and either can be reconsidered with recorded rationale.

Keep each fork in its owning topic with a stable local ID, alternatives, tradeoffs, dependencies, evidence needed and current disposition. Link from TASKS.md when actionable; do not duplicate the whole option catalogue there. Existing open questions can gain this structure when their topic is substantively revised.

At MVP scoping or implementation planning, review the relevant forks and choose a coherent subset. Before coding affected behavior, resolve choices necessary to implement and test it. Mark exclusions explicitly; no need to settle unrelated long-term options. Assistant recommendations remain candidates until adopted.

## Change workflow

### Reviews must end in applied changes

Denis's instruction: a review is work on the source documents, not a standalone report. Apply valid editorial, consistency, ownership and structural corrections in the same session. Put substantive recommendations directly into their authoritative product topics as clearly marked proposals; their substance must not exist only in a review or scenario file.

If a finding genuinely requires a new product choice, write the concrete alternatives, recommendation and consequences in its owner and link the actionable question from TASKS. Do not invent user acceptance, but do not withhold useful draft text pending acceptance. Previously answered choices are not blockers.

Before finishing, account for every finding as applied, an explicit product decision in the active queue, or rejected with a reason. Keep this checklist temporary. Verify affected references and saved changes, then report changes briefly in conversation. Do not create or retain standalone review reports unless Denis asks. A short session-log outcome is sufficient and must not become a findings backlog.

For a meaningful product change:
1. Find its authoritative section and related requirements.
2. Identify affected documents and, later, design/code.
3. Discuss material behavioral or scope choices with Denis.
4. Update the source and decision record; mark unresolved dependents as needing revision.
5. Verify affected links and examples. Never claim implementation matches changed docs until checked.

Keep one authoritative home for each concept. Cross-reference it rather than maintaining duplicate definitions. The vision summarizes; detailed topic documents own precise behavior.

## Context, money, and storage

The root AGENTS.md routes assistants to this workflow; it holds brief enforceable instructions rather than copies of all documents. Add a reusable automation/skill only when a repeated procedure actually benefits from it. No extra framework is required now.

Use selective reads, concise handoffs, batched coherent edits, and local checks. No new paid documentation service or automatic model calls. Development budgets are decided separately from assistant subscription usage.

Git is authoritative for active project documentation and future implementation. Commit coherent changes and push to the configured GitHub remote. On another device, clone/pull the repository; do not resume editing the retained Drive snapshot.

The repository working tree and Git metadata live outside Drive sync. The former project folder remains a historical migration snapshot with a pointer to GitHub. Private workspace and career records remain outside the repository. Validate docs with `python scripts/check_docs.py` from the repository root before committing.
