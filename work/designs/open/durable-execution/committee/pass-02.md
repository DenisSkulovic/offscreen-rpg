# **Durable Execution E1 | Architecture committee pass 02**

DEFENDED

H01 CLOSED

**The strict qualification namespace admission correction resolves the architectural contradiction identified in pass 01.** The selected E1 architecture is now sufficiently determined for owner ratification and subsequent implementation planning.

Critical

# **0**

High

# **0**

Medium

# **2**

Low

# **0**

No further architecture review or preliminary native experiments are required for the selected evolution.

## **1. Review identity and provenance**

| Field       | Verified value                        |
| ----------- | ------------------------------------- |
| Repository  | `DenisSkulovic/offscreen-rpg`         |
| Branch      | `main`                                |
| Review date | 2026-11-28                            |
| Role        | Independent architecture reviewer     |
| Depth       | Targeted impact-based re-review       |
| Scope       | DE-E1-AR-H01 and affected obligations |
| Receipt     | `committee/pass-02.md`                |

**Exact reviewed main HEAD:**

[`a2e5eea430df62bc9527c85978f8b93f5e9fc154`](https://github.com/DenisSkulovic/offscreen-rpg/commit/a2e5eea430df62bc9527c85978f8b93f5e9fc154?utm_source=chatgpt.com)

Previous reviewed candidate:

`e5015a1103d630a5bd821bc80068def32efebeee`

Original design investigation baseline:

`c8dab5c47f5a8d638122c9321230f6bb4bfd0ac6`

The current candidate is exactly one commit ahead of the previous reviewed candidate, with no divergent commits.

| Changed file             | Nature of change                        |
| ------------------------ | --------------------------------------- |
| Design `README.md`       | H01 correction and M01/M02 dispositions |
| `committee/pass-01.md`   | Persisted previous verdict              |
| `work/designs/README.md` | Lifecycle status update                 |

No implementation source changed between the two candidates. Unaffected source evidence and architectural conclusions from pass 01 remain applicable.

The review applies the current `AGENTS.md` severity policy, `CHATGPT.md` read-only adapter, design-led engineering rules, planner investigation standard and repository durable-knowledge requirements.

## **2. DE-E1-AR-H01 closure**

CLOSED

Previously HIGH · Qualification namespace custody

### **2.1. Selected architectural correction**

The revised dossier establishes two distinct registration contracts under the existing Temporal infrastructure owner.

Shared transport and infrastructure ownership. Deliberately different success semantics.

This separation is necessary and sufficient. It avoids weakening the new qualification guarantee or breaking the existing registration contract.

The strict operation remains infrastructure-owner functionality, not a public API of `@offscreen/temporal-runtime`.

### **2.2. Compatibility with actual source**

The following source was inspected at the current candidate SHA.

| Actual source anchor          | Assessment                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `namespaceCommand()`          | Existing explicit-context, bounded command transport is reusable                         |
| `createTemporalNamespace()`   | Intentional already-exists tolerance remains unchanged                                   |
| `describeTemporalNamespace()` | Existing read-only behavior remains unchanged                                            |
| `parseTemporalDescribe()`     | Successful identity parsing is reusable; strict absence requires stricter classification |
| `runPlatformCommand()`        | Exposes success, exit status, timeout and missing-command information                    |
| `assertPlatformTarget()`      | Provides existing cluster-owner and baseline UID verification                            |
| `namespaces.test.mjs`         | Existing injected command tests provide the appropriate regression seam                  |

Relevant immutable sources:

[Temporal namespace owner](https://github.com/DenisSkulovic/offscreen-rpg/blob/a2e5eea430df62bc9527c85978f8b93f5e9fc154/infra/platform/temporal/namespaces.mjs?utm_source=chatgpt.com) · [Command and target verification](https://github.com/DenisSkulovic/offscreen-rpg/blob/a2e5eea430df62bc9527c85978f8b93f5e9fc154/infra/platform/common/commands.mjs?utm_source=chatgpt.com) · [Namespace tests](https://github.com/DenisSkulovic/offscreen-rpg/blob/a2e5eea430df62bc9527c85978f8b93f5e9fc154/infra/platform/temporal/tests/namespaces.test.mjs?utm_source=chatgpt.com)

**Important construction interpretation:** the current `parseTemporalDescribe()` accepts a bare `NamespaceNotFound` token as evidence of absence. The strict route must not blindly treat every existing `status: 'absent'` projection as sufficient.

The corrected design explicitly requires unambiguous namespace-specific absence and rejects malformed or transport-failed observations. Therefore, it sufficiently determines the stricter behavior without requiring the exact parser implementation at architecture stage.

The planner must preserve that distinction when freezing the first construction packet. This is an existing H01 proof obligation, not a new finding.

## **3. Refusal and creation custody**

The revised admission sequence is coherent and fail-closed.

Any failed prerequisite or uncertain observation terminates admission. No recovery path converts uncertain creation into ownership.

### **Verified refusal matrix**

| Observation                                     | Required behavior       | Architecture |
| ----------------------------------------------- | ----------------------- | ------------ |
| Wrong profile, name, retention or authorization | Refuse before mutation  | Sound        |
| Existing namespace                              | Refuse before creation  | Sound        |
| Ambiguous absence or transport failure          | Refuse before creation  | Sound        |
| Same-name registration race                     | Refuse                  | Sound        |
| `NamespaceAlreadyExists`                        | Refuse                  | Sound        |
| Timeout or uncertain create outcome             | Refuse without retry    | Sound        |
| Acknowledged create, failed verification        | Refuse; record residual | Sound        |
| Cluster identity drift                          | Refuse                  | Sound        |
| Confirmed creation and verified identity        | Admit                   | Sound        |

The original counterexample is eliminated:

An external operation winning registration between describe and create can no longer produce successful qualification admission through the ordinary helper's already-exists tolerance.

The selected custody model additionally preserves:

- Explicit operator authorization and dev-only targeting.
- Fresh namespace naming and one-day retention.
- Namespace ID, cluster identity and attempt receipt binding.
- Dedicated fresh queues for both qualification consumers.
- No Worker or Workflow start before successful admission.
- No automatic retry, adoption, repair or deletion of uncertain state.
- Recorded residuals where creation may have occurred.

The operator-controlled exclusion of concurrent same-name maintenance and cluster replacement is proportionate for this bounded local qualification environment. A general distributed namespace lease system is unnecessary.

**H01 closure criteria are satisfied at architecture resolution.**

## **4. Affected construction and acceptance obligations**

The correction has been assigned to the existing delivery stages without introducing another Change solely for namespace admission.

**Construction 1: Runtime foundation**

Add the strict owner entrypoint, target binding, positive ordered command proof, refusal fixtures and ordinary registration regression tests.

Sufficiently determined

**Construction 2: Qualification consumers**

Require successful strict admission for both consumers. Prove refusal cannot reach Worker or Workflow startup. Preserve existing Agent Core semantics.

Sufficiently determined

**Joint qualification and closure**

Exercise actual strict creation, record verified identity, execute both native specimens, retrieve telemetry and preserve custody evidence.

Future authorized execution

The distinction between offline construction and live qualification remains intact.

No additional live race experiment is required. Injected command tests can discriminate the relevant refusal paths without deliberately creating uncertain namespace state on the live development cluster.

Main integration continues to require joint acceptance, not merely successful source construction.

## **5. Preservation of nonblocking findings**

Both Medium findings from pass 01 have been preserved and appropriately incorporated into existing proof obligations.

| Finding                                   | Verified disposition                                                                                                                                                                        | Status      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **M01** Recovery assertion strength       | Explicit initial/final Run ID equality, exactly two physical model starts and one completed physical tool across Worker generations. Existing history and replacement assertions preserved. | Nonblocking |
| **M02** Physical observation completeness | Distinguish physical starts, terminal observations and client-observed results. Unmatched starts remain incomplete; no fabricated success or completion. Preserve error propagation.        | Nonblocking |

### **Durable destinations**

| Finding | Owner                                                                                        |
| ------- | -------------------------------------------------------------------------------------------- |
| H01     | `infra/platform/temporal/README.md`, `docs/runbooks/kubernetes-temporal.md`                  |
| M01     | Agent Core package README and maintained qualification suite                                 |
| M02     | `docs/technical/observability/telemetry-and-diagnostics.md` and runtime qualification README |

These dispositions are correctly assigned for promotion and construction. They are not additional architecture-review gates, and their implementation is not claimed to be complete.

## **6. Consolidated architectural verdict**

All unaffected pass-01 conclusions are reused.

Minimal native Temporal runtime boundary

DEFENDED

Workspace and package ownership

DEFENDED

Connection and Worker custody

DEFENDED

Native SDK integration

DEFENDED

Retry, identity and recovery semantics

DEFENDED

Synthetic execution specimens

DEFENDED

Agent Core preservation

DEFENDED

Observability E2 integration boundary

DEFENDED

Strict qualification namespace admission

DEFENDED

Construction and joint acceptance architecture

DEFENDED

No material regression or new substantive finding was identified within the correction's impact boundary.

## **7. Eligible progression**

1. **Persist pass 02**

   Retain this verdict against the exact reviewed candidate.
2. **Owner ratification**

   Accept E1 and promote the selected technical contract.
3. **Complete Observability E2 integration**

   Preserve the owner-selected sequential delivery order and reconcile affected source against updated main.
4. **Prepare and commission construction**

   Freeze the bounded implementation packets using actual source anchors.
5. **Joint qualification and acceptance**

   Perform authorized native proof and integrate the accepted evolution.

The next architecture iteration should be informed by actual E1 construction and qualification results, rather than further speculative design.

## **8. Final committee disposition**

| Review state                                 | Result                 |
| -------------------------------------------- | ---------------------- |
| Independent analysis                         | Complete               |
| Overall architecture verdict                 | **DEFENDED**           |
| DE-E1-AR-H01                                 | **CLOSED**             |
| Unresolved Critical/High findings            | None                   |
| M01/M02                                      | Preserved, nonblocking |
| Further architecture review required         | No                     |
| Additional architecture experiments required | No                     |
| Verdict delivered                            | Yes                    |
| Repository persistence                       | Pending custodian      |
| Owner ratification                           | Pending                |
| Implementation commission                    | Not granted            |
| Native qualification                         | Not run                |
| Repository mutations                         | None                   |
| Live operations                              | None                   |

**Evidence limitations:** This was a read-only, source-based architecture re-review through GitHub. No local checkout, compilation, tests or native experiments were performed. The strict admission entrypoint is a selected architectural contract, not yet implemented functionality. Future E2 integration drift remains subject to the already-selected targeted reconciliation.

This verdict is bound exclusively to:

`a2e5eea430df62bc9527c85978f8b93f5e9fc154`

Deliver this receipt to:

`work/designs/open/durable-execution/committee/pass-02.md`

**Committee conclusion:** Durable Execution E1 is architecturally defended. The localized custody contradiction has been resolved without expanding the runtime abstraction, changing ordinary registration semantics or introducing unnecessary infrastructure.

Stop the design iteration. Proceed to ratification and the selected construction cycle.