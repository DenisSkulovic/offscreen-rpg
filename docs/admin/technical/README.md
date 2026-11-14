# Offscreen Control | selected technical target and route map

**Status:** Technical **target selected for design review**, 2026-11-14. Product direction was [accepted by owner](../product-acceptance-and-scope.md). These are **technical architecture specifications, not deployed capabilities**, and do not authorize source edits, migrations, hosted provider spend or Cursor execution. Subsequent implementation packets require source revalidation and owner selection.

**Scope:** A production-credible internal administrative control plane for a persistent, AI-driven game and commercial service, initially constrained to safe, useful read-only operations and staff governance. Advanced assistance, financial writes, state repairs, LiveOps changes and private narrative access remain capability-gated.

## Navigate by the question

| Technical concern | Owning document |
| --- | --- |
| What actually exists in the source snapshot; what must not be assumed? | [Source baseline and gap audit](source-baseline-2026-11-14.md) |
| What is the module, service, API and domain ownership topology? | [Control-plane architecture](control-plane-boundaries.md) |
| Who is a staff actor; how do scoped grants, sessions, approval and revocation work? | [Staff identity and authorization](staff-identity-and-policy.md) |
| How are user/campaign/AI/admin records read, redacted, searched and attributed? | [Read projections and data boundaries](read-models-and-privacy.md) |
| What is a safe admin command, approval, receipt and immutable audit event? | [Actions, approvals and audit](action-approval-and-audit.md) |
| How does Next.js deliver a robust staff UI without adding authorization? | [Admin frontend and interaction contracts](frontend-and-operator-experience.md) |
| How do money, model costs, gameplay facts, incidents and LiveOps share evidence without sharing authority? | [Operations, economics and release boundaries](operations-economics-and-releases.md) |
| How do we falsify security, state, concurrency and privacy claims? | [Security and verification matrix](security-and-verification.md) |
| What has been chosen versus intentionally deferred? | [Architecture decisions and capability gates](architecture-decisions.md) |

Read the owning document and only its immediate source references. Do not preload the entire suite for a narrow Cursor Change.

## Target shape

```text
Browser (/control)  -> Next server-only Admin BFF/SSR + isolated Query cache
                           |
       explicit staff-session credential + CSRF/origin + no-store
                           |
                  Nest /api/admin/*
                    + Admin actor resolver
                    + bounded action/resource/purpose policy
                    + data minimization and consistent errors
                           |
       @offscreen/application/admin (new domain/use-case boundary)
             |                |                  |
     permissioned read   admin action/audit   incident/ops projections
       projections        and approvals         (initially read-only)
             |                |                  |
           PostgreSQL / domain application owners / approved integrations
```

**Only one source owns each fact.** Player/gameplay operations retain their current authoritative application paths; Admin does not call regular player controllers with spoofed identity, edit game tables without a supported domain command, or invent billing states absent from the repository.

## Development sequence

1. Product acceptance: **complete for scoped core**, with hazardous business rules explicitly deferred.
2. Technical architecture: **these documents**; must be reviewed for cross-document contracts and source evidence.
3. Bounded implementation program: only after the technical review; exact source paths and branch head must be rechecked against Cursor's evolving `main`.
4. `docs/changes` code-bearing dossiers: Proposed until the owner authorizes a selected, dependency-ready packet as Ready.
5. Implementation and proof: provider-free focused tests, then a dedicated disposable DB/Nest/browser integration lane, then any separately approved live deployment/security review.

Do not allow a design-only branch to overwrite or rebase another agent's local work. Current source inspection is tied to the snapshot in the [audit](source-baseline-2026-11-14.md).
