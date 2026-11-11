# Coding-agent role catalog

**On-demand menu, not automatically spawned workers.** A role defines a job boundary with deliverable and authority. An agent may hold several roles over time; for consequential reviews a separate context is preferable. Tool suggestions are economic defaults, not mandated brands. For permissions and handoff contracts see [role orchestration](README.md) and [assignments](assignments.md).

## Product, experience and design

| Role | Responsibility and distinctive deliverable | Typical vehicle / approval |
| --- | --- | --- |
| **Product strategist** | Define opportunity, user value, non-goals and impact tradeoffs, independent of present implementation | ChatGPT + owner; owner approves |
| **Product spec author** | Turn accepted player behavior into crisp product doc + examples/negative acceptance | ChatGPT, with source support; documentation only |
| **UX / interaction designer** | User journeys, information architecture, state/action hierarchy, flows and recoveries | ChatGPT; `player-experience-design` |
| **Visual designer** | Typography, composition, responsive design language, detailed component states | ChatGPT; `ui-art-direction` for professional art direction |
| **UX / visual critic** | Independent alternative, friction/cognitive load, actual screenshot or flow discrepancies | Fresh ChatGPT or read-only critic; no code edits |
| **Accessibility reviewer** | Keyboard/focus/semantics/contrast and recovery acceptance against target UI | Targeted review with `frontend-engineering`; actual browser evidence needed |
| **Design-system steward** | Shared UI tokens, component variants, consistency and migration cost | Technical designer; don't create abstractions before repeated need |

## Architecture and engineering specialties

| Role | Responsibility and distinctive deliverable | Typical vehicle / permission |
| --- | --- | --- |
| **Source investigator** | Ground one question in actual paths/symbols, current behavior and competing causes | Claude/Cursor Explore or read-only session |
| **Solution architect** | Compare ownership/interface designs, failures and costs; propose intended technical contract | ChatGPT + focused Claude evidence |
| **Architecture critic** | Find alternative boundary and counterexample that could invalidate first design | Independent context; `independent-design-review` |
| **Frontend engineer** | Implement approved browser/UI behavior, server/client split, races, accessibility | Cursor executor; `frontend-engineering` |
| **Frontend reviewer** | Verify React/Next.js state, async ordering, accessibility and spec fidelity | Read-only reviewer, changed diff + narrow source |
| **Backend engineer** | Implement approved API/application operations and typed errors | Cursor executor; use `api-contract-design` for significant API decisions, `architecture-boundary-review` for service ownership |
| **Backend / transaction reviewer** | Race/lock/retry/idempotency/partial failure analysis with exact state fence | Claude or targeted reviewer; `transactional-correctness-review` |
| **Data architect** | Schema, identity, source-of-truth, revision and migration options | `data-model-review` + [modeling/migration manual](../knowledge/data-modeling-and-migrations.md); owner approves boundary |
| **Security/privacy reviewer** | Authz across owner identities, secrets, boundaries, input trust and data exposure | Independent scoped `security-architecture-review` with [security knowledge](../knowledge/security-and-trust.md); no silent permission expansion |
| **Performance/cache specialist** | Locate actual bottleneck, compare query/cache/async options, define freshness and resource costs | `cache-performance-review` + [performance manual](../knowledge/caching-and-performance.md); no infrastructure by default |
| **Observability specialist** | Meaningful evidence/trace plan, redaction, diagnostic signals and operability | `observability-design-review`, [operations manual](../knowledge/observability-and-production-diagnostics.md); never add telemetry as gameplay authority |
| **AI systems specialist** | *Game* Storyteller task contracts, retrieval/provenance, prompt boundaries, controlled model evaluation | Technical specialist, separate from coding-agent harness; paid inference explicitly authorized only |

## Quality, delivery and maintenance

| Role | Responsibility and distinctive deliverable | Typical vehicle / permission |
| --- | --- | --- |
| **Test strategist** | Before code: acceptance matrix with success, rejection, edge, concurrency and evidence tier | ChatGPT/Claude read-only; [`test-strategy`](../skills/test-strategy/SKILL.md); no fake passing tests |
| **Unit-test engineer** | Implement approved fast deterministic cases for pure policy/code | Cursor, bounded code permission |
| **Integration / E2E designer** | Define cross-system user journeys, real dependencies, failure injection and acceptance evidence | ChatGPT with Claude source grounding and [testing manual](../knowledge/testing-and-quality-evidence.md) when consequential |
| **Test executor / investigator** | Run targeted safe checks, classify failure vs flaky environment vs wrong assumption | Claude/Cursor only with exact command permissions |
| **Independent acceptance verifier** | Audit delivered artifact, diff, proofs and human-visible result against the approved spec | Fresh reviewer; may block or return findings, not self-certify |
| **Documentation curator** | Repair navigation, authoritative ownership, stale facts and duplicate context | ChatGPT/harness maintenance; docs-only scope |
| **Release / operations reviewer** | Evaluate deploy, migration, rollback and production risk; never deploy by default | `release-readiness-review` + [release manual](../knowledge/release-and-delivery-engineering.md), explicit human deployment gate |
| **Workflow coordinator / integrator** | Select roles, dependencies, worktree ownership, handoff receipts and final convergence | ChatGPT or user-led session; no automatic agents |

**Specialization is orthogonal:** a "test strategist for React async state" combines the *test strategist* role with *frontend-engineering* knowledge. A "data architect reviewing background delivery" combines the *data architect* role with *transactional-correctness-review*. We should not generate a new agent file for every Cartesian-product role combination.

## How to choose two roles, not twenty

Choose the first role that owns the **next decision**; add one reviewer role for the largest **independent risk**. Examples:

- UI is visually dull but functionally defined → visual designer + visual critic; no backend engineer yet.
- Existing feature's failure is unclear → source investigator + optional competing-hypothesis debugger; no product-spec rewrite.
- SQL/idempotency change → backend/data architect + transaction reviewer **before** executor.
- New API is already specified → backend executor + test strategist if failure cases are material.
- Missing coverage → test strategist designs cases, test engineer implements, independent verifier checks cases aren't tautological.
- Broken doc route → documentation curator alone, unless the underlying implementation truth is disputed.

For end-to-end UI teamwork see [UI playbook](playbooks/ui-feature.md). Native subagents are only a small optional execution subset; a named role is **not** automatically a parallel chat, model purchase or permission grant.
