# Offscreen Control | selected technical target and route map

**Status (reconciled 2026-11-15):** Technical target selected 2026-11-14; **AD01–AD08 first-wave implemented and evidenced**. Desk review: [architecture review](architecture-review-2026-11-14.md). Product: [acceptance](../product-acceptance-and-scope.md). Landed source facts: [post-AD baseline appendix](source-baseline-2026-11-14.md#post-ad-implementation-baseline--2026-11-15). OBS06/07 Support Situation is **Done in synthetic/disposable scope only** — **no production grant issuer**. These specs remain the contract for designed vs implemented; they do not authorize new spend or migrations.

**Scope:** Internal administrative control plane — staff session, grants, redacted reads, `/control` shell, diagnostics/usage/audit/cases, plus synthetic case-scoped Situation. Advanced assistance, financial writes, state repairs, LiveOps changes, private narrative access, and production Support grants remain capability-gated.

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
| What are the exact first-wave session/cookie/bootstrap decisions? | [First-wave technical decisions](first-wave-design-decisions.md) |
| What are the initial Admin APIs, wire shapes and error semantics? | [Core Admin V1 contracts](core-v1-contracts.md) |
| What is the architecture review outcome before code packets? | [Technical desk review](architecture-review-2026-11-14.md) |
| Which scoped source changes could Cursor implement after selection? | [AD01–AD08 program](../implementation-program.md) |

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
2. Technical architecture: **these documents** (designed vs implemented called out in the [post-AD appendix](source-baseline-2026-11-14.md#post-ad-implementation-baseline--2026-11-15)).
3. Bounded implementation: [AD01–AD08](../implementation-program.md) **Done** with evidence under `docs/programs/admin/evidence/`.
4. Forensic Support Situation: OBS06/07 **Done synthetic**; production grant stewardship still open ([observability](../../observability/README.md)).
5. Further work: only via [changes queue](../../../../work/changes/README.md); disposable-DB proof before any live/security claim.

Do not treat design prose as runtime evidence. Pre-code audit remains historical; post-AD appendix is the current source baseline.
