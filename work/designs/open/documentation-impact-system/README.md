# Documentation impact architecture | design program

**State:** Proposed design, 2026-11-18. **Not ratified and not implementation permission.** Product canon and current development rules remain authoritative until an owner selects changes. This dossier designs a repository knowledge *maintenance system*, not a new game mechanic.

## Decision requested

Make each executable Change a **three-plane transformation** planned before execution: (1) product-intent documentation, (2) technical/contract documentation, and (3) executable code, tests and configuration. For each plane, the author names exact intended changes or gives an evidence-backed no-op reason. Add a fourth, separate **dependency-closure pass** across related documentation and source maps. Require a pre-execution impact review and an independent close review. Never infer that source code is a higher authority than ratified product/technical contracts.

Editing only executable output while leaving its controlling specs stale is analogous to modifying /dist while ignoring /src. The analogy is about *authority*, not a license to rewrite specs to match accidental code behavior.

## Read in order

1. [Source-grounded audit](AUDIT-2026-11-18.md): what current rules, example Changes, scripts and links actually demonstrate, including limitations.
2. [Target architecture](TARGET-ARCHITECTURE.md): per-Change contract, semantic wiki relationships, forward/reverse impact, proof and safety.
3. [Delivery and evaluation](DELIVERY-AND-VALIDATION.md): implementation order, baseline protections, mutation tests and success criteria.

## Execution route (all Proposed; none selected)

- [WIKI09: plan-time three-plane Change contract](../../../changes/open/2026-11-18--wiki09-change-impact-contract/CHANGE.md). Amend existing authoring template, workflow skill and existing wiki change guard; do not create a second change system.
- [WIKI10: contextual contract relationships](../../../changes/open/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md). Introduce explicit, bounded, section-level impact edges and seed a small high-risk cross-reference set without changing normative game meaning.
- [WIKI11: impact closure and independent proof](../../../changes/open/2026-11-18--wiki11-impact-closure-and-proof/CHANGE.md). Extend existing graph/guard/maintenance mechanisms after HK07 to report uncovered dependents and verify both planned and actual edits.

**Sequencing:** WIKI09 after HK02 check-scope changes, WIKI10 after WIKI09, WIKI11 after HK06/HK07 and WIKI10. HK08 CI integration must consume the resulting gate rather than reimplement it. Do not select multiple packets at once.

## Relation to existing architecture

The current [.agents documentation rule](../../../../.agents/rules/documentation.md), [Change standard](../../../../.agents/references/change-work-unit-standard.md), [Change workflow template](../../../../.agents/skills/change-workflow/assets/CHANGE.md), [reconciliation skill](../../../../.agents/skills/documentation-reconciliation/SKILL.md), [wiki graph](../../../../scripts/repo-tools/wiki-core/model.mjs) and [change guard](../../../../scripts/repo-tools/wiki-core/change-guard.mjs) are real foundations, not mistakes to discard. Current [HK02/HK06/HK07/HK08 housekeeping](../repository-housekeeping/PREVENTION-SYSTEM.md) already owns workflow trigger coverage, inventory/lifecycle, Git freshness and CI/brief orchestration respectively. The new work adds the **missing semantics and authoring obligations**; it must not fork those tools.

## Non-goals

No generated documentation that restates source, mandatory link counts, all-to-all links, auto-ratification, automatic code-to-spec rewriting, Cognee/vector database, paid model dependency, universal frontmatter, encyclopedia-size boilerplate or historical archive rewrite. No claiming truth from a passing static validator.

## Owner decision gate

Before implementation, accept or amend the three-plane/relationship model and confirm the ordering relative to HK02–HK08. This design commit itself changes no current product/technical requirements, selects no Change and authorizes no coding agent to execute its proposed packets.
