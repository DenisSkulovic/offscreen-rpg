# Change: specific code-bearing outcome

**State:** Proposed / Ready / Implementing / Verifying / Blocked / Done / Cancelled.
**Approval and owner:** [who approved actual code implementation, when, and who executes it; no automatic authority from historical notes].
**Kind:** behavior / defect / refactor / test code / tool or executable configuration / migration.
**Parent initiative (optional):** [link only, not a copied plan].

## Cursor first-screen brief (write this before deep details)

> **Current-source map:** [one nearest README with source-inspected date, not the entire repository].  
> **Primary governing heading:** [one exact product/technical or F-criterion `#anchor`].  
> **Known trap / contrary case:** [one source-grounded race, version, permission, retry or toolchain behavior].  
> **Scope/permission:** [explicitly permitted code delta, normal/negative proof, and whether tests with side effects are authorized].

This brief lets a cheap coding model decide whether it has the correct owner in its **first screen**; it is **not a substitute for reading the remainder of this selected Change before implementation**. The Change is the next code outcome, the nearby README owns current navigation, and permanent specs own normative behavior. Do **not** paste whole historical audits or repeat 10 pages of architecture here.

## Target alignment (required for portfolio-modernization Changes)

- End-state specification and exact target criterion: [link to proposed/approved area target heading; write target before auditing source].
- Source-grounded gap finding: [link to audit with revision/paths and evidence level].
- Contribution to final architecture: [which target guarantee this bounded diff enables, and what still remains].
- Competing alternative and why not chosen: [include keeping current code when plausible].
- **Readiness gate:** no `Ready` status without owner-reviewed target, grounded gap, code scope and negative proof. Audit/target uncertainty keeps this `Proposed`.

## Outcome and motivation

One observable change to executable code/tests/configuration and why it matters. What is the smallest complete result a reviewer can verify? If there is **no intended code diff**, do not create a Change: use a design/investigation/evaluation/documentation task instead.

## Authority and baseline

- Product (when user behavior changes): [specific approved document and heading].
- Technical contract / invariant: [specific document and heading].
- Current code/evidence: [verified revision, actual source path/symbol, or explicit reinspection gate].
- Applicable professional knowledge: [one relevant manual/section if a significant engineering decision remains].

## Code scope and exclusions

- Expected touched code/test/config owners: [...]
- Preserve: [...]
- Explicitly exclude: [adjacent initiatives, unrelated refactors, provider spend, migrations, deployments].

## Acceptance and negative proof

- Representative successful result: [...]
- Failure/rejection/edge case that would disprove a plausible incorrect implementation: [...]
- Cheapest safe test/inspection, side effects and environment authorization: [...]

## Handoff and next action

- Exact next permitted step: [...]
- Decisions/blockers that must be resolved before code work: [...]
- If this Change spans several independently verifiable code slices, add `PLAN.md` with one active checkpoint. Don't create a second program-level specification here.

**Closing rule:** record actual diff and verification, reconcile the owning product/technical/evidence documents, then retire the active packet. Git retains the historical plan.
