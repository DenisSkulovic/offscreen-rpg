# Target-first engineering renewal

**Trigger:** audits, design and significant Changes intended to raise this repository to portfolio-grade engineering quality. Applies to React/Next.js, UI/UX, backend, data, infrastructure, security and related modernization. **Not a mandate** for a trivial bug fix or for gameplay feature work whose already approved product/technical contract supplies the target.

## Governing rule

**Define the desired, reviewable end state first. Then inspect the current system as evidence of the gap. Then authorize implementation Changes whose acceptance advances that end state.** The current source is a baseline and a constraint, **not the design brief or the standard of excellence**. A list of smells or files to split is not an architecture.

No portfolio-modernization Change is **Ready** unless its destination is named by an explicit target criterion and the proposed code delta demonstrates how it closes a material part of the audited gap. Reject vague verbs such as "improve," "modernize," "clean up" and "make scalable" without an outcome, negative case or target trace.

## Three distinct artifacts, in this order

1. **Target design, independent of source defects:** own one area-level target specification under `docs/engineering/targets/` (or another existing authoritative home). Identify purpose, boundaries and responsibilities, user-visible and developer-visible promises, state/data/identity lifetimes, integration contracts, failure/recovery, accessibility, security, performance observability, verification/maintainability, and explicit non-goals. State architectural choices, credible rejected alternatives, constraints and what would justify revisiting them. Express acceptance as scenarios, not adjectives or fashionable libraries. Mark proposed decisions until owner-reviewed.
2. **Gap audit against that target:** inspect real source/tests/configuration at an identified commit. Map existing paths to target criteria, using evidence levels: source-observed, fixture/test-exercised, live-observed or unknown. Separate defects from intentional differences, missing evidence, and future product work. Rank by criticality, prerequisite dependencies and portfolio demonstration value. No "smell of the day" backlog.
3. **Bounded Changes:** each significant `CHANGE.md` links a target criterion and audit finding, explains baseline → desired delta → preserving invariants → falsifiable success/negative cases. Order by dependencies so each slice improves the *same chosen architecture* rather than letting an executor redesign it. Set `Ready` only after actual owner authorization and source revalidation; a batch of proposed packets never authorizes coding.

## What good and bad progress look like

- **Good:** design a coherent frontend data/state model, audit all relevant entrypoints for mismatches, then change one authorized boundary while retaining one overall direction.
- **Bad:** randomly extract a large hook, add a query library, rewrite CSS, change render strategy and call those independent improvements without a chosen architecture or user-facing guarantees.
- **Good:** select a simple architecture over an elaborate one when it meets the target more reliably. **No library/technology earns inclusion merely because it looks good on a CV.**
- **Bad:** promise "zero defects," "fully optimized" or "production-grade" without workload, test environments, empirical evidence and remaining limitations.

## Required review gate

A reviewer or planning agent should reject an implementation plan when any of these is missing:

- A target end state with **named criteria** chosen before the source-gap assessment (or a documented explicit change to that target).
- A grounded baseline: exact code owner, observed failure/deficit and evidence limit, without treating unrun tests as passed.
- A credible competing design and its cost/trade-off, informed by the appropriate `.agents/knowledge/` manual and current official framework documentation when relevant.
- Specific mapping from target criterion → gap → Change → proof, with preserved working behavior, risk and rejected adjacent work.
- A viable migration path for cross-cutting work and a stop condition preventing opportunistic unrelated "cleanup."

If the audit proves the target is already satisfied, write **no Change** for that criterion. If the target is disputed, resolve the design **before** giving the work to Cursor. A target may be revised by an explicit owner-reviewed decision and its consequences, not by discovering that existing code would be inconvenient to change.

## Roles and specialized knowledge

Use `frontend-engineering` + [frontend state](../knowledge/frontend-state-and-async.md) for React/Next behavior, [architecture decision space](../knowledge/architecture-decision-space.md) for target boundaries, [testing knowledge](../knowledge/testing-and-quality-evidence.md) for proof, and `ui-art-direction` + [interface design](../knowledge/interface-design-craft.md) for visual UX. Consult `security-architecture-review` and API contracts when authenticated user identity, server rendering, caching or transport are involved. These references provide design lenses, **not permission** to preempt product intent. Choose the relevant sections before deciding; don't inflate each executor packet with entire manuals.

This is a planning/review contract. Markdown alone cannot guarantee an agent follows it; use the selected Change template, independent reviews, evidence checks and owner authorization as additional gates. No application changes or external provider calls arise from this rule.
