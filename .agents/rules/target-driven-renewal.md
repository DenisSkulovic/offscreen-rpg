# Target-first engineering renewal

**Trigger:** audits, design and significant Changes intended to raise this repository to portfolio-grade engineering quality. Applies to React/Next.js, UI/UX, backend, data, infrastructure, security and related modernization. **Not a mandate** for a trivial bug fix or for gameplay feature work whose already approved product/technical contract supplies the target.

## Governing rule

**Define the desired, reviewable end state first. Then inspect the current system as evidence of the gap. Then authorize implementation Changes whose acceptance advances that end state.** The current source is a baseline and a constraint, **not the design brief or the standard of excellence**. A list of smells or files to split is not an architecture.

No portfolio-modernization Change is **Ready** unless its destination is named by an explicit target criterion and the proposed code delta demonstrates how it closes a material part of the audited gap. Reject vague verbs such as "improve," "modernize," "clean up" and "make scalable" without an outcome, negative case or target trace.

## Design-led engineering: mandatory material-design gate (2026-11-26)

The Temporal replacement established a better working method: design deeply, challenge the design, exercise actual tools and learn with the owner, then implement. The goal is a simpler, comprehensible, reproducible system, not better-organized generated code or more packets.

### Select the design posture

- **Clean-slate target:** appropriate when internals are untrusted, disposable, overgrown, or fundamentally misaligned. Record purpose, required behavior and external constraints; explicitly identify the legacy subtree excluded from initial study. Read current agent rules, adjacent systems, interfaces, authoritative requirements and actual environment facts, not the excluded internals. Do not copy its directory tree, abstractions, algorithms or tests as design inputs. Respect an explicit owner instruction not to read a subtree; use boundary evidence instead and disclose remaining unknowns. Reopen excluded internals only with owner permission when needed for safe cutover.
- **Evolutionary design:** appropriate when working behavior, proven data, compatibility, migration cost or sound architecture warrants preservation. Inspect existing implementation after establishing the target and preserve only justified pieces.
- **Focused fix:** already-settled contract with a small defect. No new design dossier or multi-pass ritual unless evidence reveals a material architecture question.

No existing code has inherent architectural authority. Neither deletion nor reuse is automatically virtuous. Existing data, externally observable behavior, security, financial and correctness guarantees remain constraints; replacement does not authorize their destruction.

### Work in the design space, not the packet queue

Use one substantive dossier in `work/designs/open/<area>/`. Start with intent, non-goals, constraints and questions. Grow files as useful: architecture and responsibilities, alternatives/decisions, concrete configuration or interface specimens, experiment plan, findings and independent review. These are examples, not mandatory filenames or document quotas. Record actual first-party versions/source references for consequential external behavior. Prefer the vendor's supported mechanisms, native declarative configuration, ordinary tools and simple composition over bespoke glue. For each script or abstraction, name the real unmet requirement it serves; challenge whether deleting it, using a Helm value or native controller, or a small command is better.

Iterate repeatedly: design → independent critique → revise → concrete specimen → authorized experiment → observations → revise. Review architecture as a whole, then individual boundaries, operations/failure and maintainability; a packet readiness audit is not a substitute. Ask what can be removed. Use exact configuration, manifests, example interfaces and commands to make design falsifiable. Do not claim a simulated run or fixture proves vendor behavior. Collaborate with the owner in small terminal experiments when local runtime is unavailable; interpret real outputs, use read-only checks first, bound mutations, record failures as evidence and update source rather than manually nursing the live environment.

### Gate before implementation planning

For substantial design, no implementation Change packet or Cursor dispatch until the dossier records:
1. A coherent end state and why it meets the actual requirements, including meaningful alternatives and rejected complexity.
2. Concrete specimens and boundaries; lifecycle, failure, security, data and operational contracts sufficient to implement.
3. At least one separate critical review, substantive revision where warranted, and experiment results for consequential uncertain assumptions (or exact reason evidence is unavailable and the affected decision remains gated). Repeat until major design questions are settled, not until a page count is reached.
4. Source-grounded integration/cutover map: affected consumers, compatibility, state and permission ownership, what to preserve/replace/remove, proof and rollback/refusal. For clean-slate design this comes **after** the independent target, respecting source exclusions; no guessed callers.
5. Owner acceptance of material decisions and reconciliation into permanent product/technical owners, distinguishing selected target from implementation and proof.

A narrow experiment may precede acceptance with explicit scope and authorization; it is not production implementation or implicit ratification. Do not manufacture packets to show progress. A real blocker remains in Design; dependency-gated execution of already settled contracts is not a design blocker.

### Select execution by economics and fit

Direct ChatGPT implementation plus owner-operated terminal feedback is a legitimate route for coherent declarative infrastructure, small tools/configs, prototypes and other scoped work within available access. Use a Change branch and relevant ownership, evidence and documentation requirements; no obligation to construct a paid-agent handoff. For broad application migrations, many disjoint edits, local builds or tool limitations, bounded Cursor Changes remain useful **after** the design is settled. Hybrid is often best. Do not assume the direct route always wins; compare total cost, rework, risk and owner learning. Record the route and scope. No background or unavailable execution claims.

For infrastructure, the deliverable is the repository and its reproducible lifecycle. Manual terminal actions are diagnostic or explicitly authorized maintenance, never hidden prerequisites. Distinguish existing-cluster provisioning, repeat ensure, upgrade, workload proof, and fresh clone/cold cluster acceptance. Fix the source of setup and control defects, then rerun the normal public path. Prefer scripted rerunnable proof for recurring checks; do not pay a model to execute a checklist that a deterministic tool can own. Local disposability requires explicit scope; never infer permission to destroy foreign or valuable state.

## Three distinct artifacts, in this order

1. **Target design, independent of source defects:** develop one area-level target in the active Design dossier, then promote accepted guarantees into `docs/technical/` or another existing authoritative home. Identify purpose, boundaries and responsibilities, user-visible and developer-visible promises, state/data/identity lifetimes, integration contracts, failure/recovery, accessibility, security, performance observability, verification/maintainability, and explicit non-goals. State architectural choices, credible rejected alternatives, constraints and what would justify revisiting them. Express acceptance as scenarios, not adjectives or fashionable libraries. Mark proposed decisions until owner-reviewed.
2. **Gap audit against that target:** inspect real source/tests/configuration at an identified commit. Map existing paths to target criteria, using evidence levels: source-observed, fixture/test-exercised, live-observed or unknown. Separate defects from intentional differences, missing evidence, and future product work. Rank by criticality, prerequisite dependencies and portfolio demonstration value. No "smell of the day" backlog.
3. **Selected execution route (bounded Changes when delegated):** each significant `CHANGE.md` links a target criterion and audit finding, explains baseline → desired delta → preserving invariants → falsifiable success/negative cases. Order by dependencies so each slice improves the _same chosen architecture_ rather than letting an executor redesign it. Set `Ready` only after actual owner authorization and source revalidation; a batch of proposed packets never authorizes coding.

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
