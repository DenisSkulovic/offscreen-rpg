# Documentation impact architecture | design program

**State:** Accepted 2026-11-18 for the WIKI09, WIKI10, then WIKI11 sequence. **Not product canon and not a technical game contract.** Product and technical pages remain the authority for game behavior. This dossier designs a repository knowledge maintenance system, not a new game mechanic.

## Decision requested

Make each executable Change a **three-plane transformation** planned before execution: (1) product-intent documentation, (2) technical/contract documentation, and (3) executable code, tests and configuration. For each plane, the author names exact intended changes or gives an evidence-backed no-op reason. Add a fourth, separate **dependency-closure pass** across related documentation and source maps. Require a pre-execution impact review and an independent close review. Never infer that source code is a higher authority than ratified product/technical contracts.

Editing only executable output while leaving its controlling specs stale is analogous to modifying /dist while ignoring /src. The analogy is about *authority*, not a license to rewrite specs to match accidental code behavior.

## Read in order

1. [Source-grounded audit](AUDIT-2026-11-18.md): what current rules, example Changes, scripts and links actually demonstrate, including limitations.
2. [Target architecture](TARGET-ARCHITECTURE.md): per-Change contract, semantic wiki relationships, forward/reverse impact, proof and safety.
3. [High-risk contract neighborhoods](CONTRACT-NEIGHBORHOODS.md): verified starting candidates, selected-vs-proposed gates and documentation-only follow-up coverage.
4. [Delivery and evaluation](DELIVERY-AND-VALIDATION.md): implementation order, baseline protections, mutation tests and success criteria.

## Execution route

WIKI09, WIKI10, and WIKI11 are Done. No packet in this sequence is selected.

- [WIKI09: plan-time three-plane Change contract](../../../changes/archive/2026-11/other/2026-11-18--wiki09-change-impact-contract/CHANGE.md). Done. The authoring template, workflow skill, and change guard now require the planned table for schema-declaring Ready packets.
- [WIKI10: contextual contract relationships](../../../changes/archive/2026-11/other/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md). Done. Typed edges reverse from Pace and from visual hierarchy. Ordinary links stay non-binding.
- [WIKI11: impact closure and independent proof](../../../changes/archive/2026-11/other/2026-11-18--wiki11-impact-closure-and-proof/CHANGE.md). Done. Close compares the plan, the diff, and known contract dependents. A passing report does not mean the pages agree.

**Sequencing:** WIKI09 after HK02 check-scope changes, WIKI10 after WIKI09, WIKI11 after HK06/HK07 and WIKI10. HK08 CI integration must consume the resulting gate rather than reimplement it. Do not select multiple packets at once.

## Companion program: editorial quality of the actual text

The [canonical content refoundation](../documentation-editorial-audit/README.md) audits and proposes substantive writing, claim-ownership and article-cohesion revisions across all 70 substantive product/technical pages, including a [full vision rewrite pilot](../documentation-editorial-audit/PILOT-VISION-REWRITE.md). **Impact graph correctness does not certify prose truth or comprehensibility.** WIKI09–11 concern plan/graph/closure machinery; editorial sessions fix actual passages, ambiguous acceptance authority and misleading source-status claims without creating fake code-bearing Changes. These are complementary, not duplicate programs.

## Relation to existing architecture

The current [.agents documentation rule](../../../../.agents/rules/documentation.md), [Change standard](../../../../.agents/references/change-work-unit-standard.md), [Change workflow template](../../../../.agents/skills/change-workflow/assets/CHANGE.md), [reconciliation skill](../../../../.agents/skills/documentation-reconciliation/SKILL.md), [wiki graph](../../../../scripts/repo-tools/wiki-core/model.mjs) and [change guard](../../../../scripts/repo-tools/wiki-core/change-guard.mjs) are real foundations, not mistakes to discard. Current [HK02/HK06/HK07/HK08 housekeeping](../repository-housekeeping/PREVENTION-SYSTEM.md) already owns workflow trigger coverage, inventory/lifecycle, Git freshness and CI/brief orchestration respectively. The new work adds the **missing semantics and authoring obligations**; it must not fork those tools.

## Non-goals

No generated documentation that restates source, mandatory link counts, all-to-all links, auto-ratification, automatic code-to-spec rewriting, Cognee/vector database, paid model dependency, universal frontmatter, encyclopedia-size boilerplate or historical archive rewrite. No claiming truth from a passing static validator.

## Owner decision gate

The owner accepted the three-plane model as written on 2026-11-18 and confirmed WIKI09, then WIKI10, then WIKI11. HK02, HK06, HK07, and HK08 are already Done. Acceptance of this design does not change a game rule.
