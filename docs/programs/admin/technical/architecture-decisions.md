# Admin architecture decisions, alternatives and conditional gates

**Status:** Architect-selected technical target following 2026-11-14 product acceptance. These are **design decisions**, not completed implementation. Owner may revise with evidence. `main` source changes during Cursor work require revalidation before code packets are Ready.

## A. Selected decisions

| ID | Decision | Rationale / excluded shortcut |
| --- | --- | --- |
| AT-01 | Dedicated Admin control plane inside current Nest/Next modular monolith | Keeps one trusted game/application owner; avoid premature separate service or arbitrary direct SQL UI |
| AT-02 | Separate staff principal and explicit Admin session from player identity | A valid player login or extra JWT Boolean cannot authorize internal operations |
| AT-03 | Typed versioned bounded-grant evaluator, default deny, resource scope and conditions | Supports overlapping jobs without AWS IAM engine complexity or dangerous permissions cross-product |
| AT-04 | Independent case assignment governance; assigned-case access not self-generated | Closes adversarial PR-01 privilege laundering |
| AT-05 | API and application enforce every staff read/command with field-level data policy | Frontend hidden pages or middleware alone aren't authorization |
| AT-06 | Dedicated redacted Admin DTOs, source provenance/coverage and page-limited search | Do not export raw tables or mistake missing billing for free tier |
| AT-07 | Distinct admin identity/epoch keyed browser Query and server-only SSR reader | Avoid player/Admin or staff/staff cache leakage across soft navigation and revocation |
| AT-08 | Explicit Admin action intent/approval/attempt/receipt/audit, server-derived actor and idempotency | A click, provider acknowledgment or changed document isn't verified business completion |
| AT-09 | Protected append-only audit and fail-closed sensitive writes/reads where necessary | Avoid unaudited privileged effects and editable after-the-fact stories |
| AT-10 | Initial read-oriented foundation followed by separately gated write domains | Build useful Admin without inventing finance, privacy, game repairs or live spend permissions |
| AT-11 | No reuse of player controllers by spoofing `ownerId`; domain-specific service adapters for safe reads/commands | Current application methods are player-ownership guarded and their contract must remain intact |
| AT-12 | Existing usage windows and storyteller records provide technical evidence, not customer billing | Prevent false economic claims and accidental duplicate paid calls |
| AT-13 | Conditional developer Chamber stays separate; Admin Sandbox is a future audited domain feature | Production fault hooks are not a support portal |
| AT-14 | Operator-specific search, receipts, error/freshness status and proof | No permissive universal search query or blank "green" metrics on missing telemetry |

## B. Deferred details and their explicit blockers

| Topic | Why not frozen now | Precondition for further technical/code work |
| --- | --- | --- |
| Authentication backend for enterprise staff SSO | Currently Better Auth GitHub OAuth; company/provider choice future | Prove admin-session adapter with current versions, select MFA strategy before real-user hosted launch |
| Separate Admin hostname/deployment | Same-origin route can be secure when API gate is correct; distinct deployment may later improve isolation | Threat/cost review with real hosting topology |
| Numeric grant/refund limits and exact staff package membership | Real team and commercial policy not selected | Concrete accepted roles/caps and delegability before privileged writes |
| Pricing and chargeable units | Product intentionally chose concept separation, not actual offerings | Plan/subscription/entitlement/allowance and customer metering policy accepted |
| Support vendor and outbound email | No proven selected helpdesk stack | Choose single inbound source and communication consent; case anchors can precede |
| Private story inspection and export | Requires purpose/notice/retention/legal policy | Owner/legal acceptance and strict audit of sensitive access |
| Player write assistance / impersonation | Actual consent, permitted actions, multiplayer impact, costs unresolved | Defined allowlist, consent and explicit staff-as-actor lifecycle |
| Game-state repair, checkpoint restores | Not all committed facts can be safely undone | Owner-approved repair taxonomy, participant notice and domain engine proofs |
| Global sponsored spend stop | Needs real dispatch/admission fence across worker and provider attempts | Backend enforcement analysis and fake-provider race proof before UI control |
| Incompatible LiveOps updates | Existing campaigns may retain captured versions and rights | Compatibility/version/pinning and migration policy accepted |
| Trust/Privacy processor and erasure workflow | Legal obligations/jurisdictions, integration retention unknown | Qualified review of rights, retention, processor and multi-participant policy |
| Internal AI investigator and automatic actions | Source access, prompt injection, spurious diagnosis and model autonomy risk | Advisory-only policy, evidence control, measured benefit and action approval |

**Deferral means not implemented or safely unavailable.** It is not permission for Cursor to fill in defaults.

## C. Order-of-dependency technical reasoning

Before any customer-level account view:
1. Explicit staff identity/session, no implicit global staff access.
2. Coherent default-deny action/resource policy.
3. Safe projection with independently authorized fields and no content leaks.
4. Tests verifying the above across Nest/Next and user identity changes.

Before any sensitive mutation:
5. Server action identity/preflight, idempotent receipt, protected audit and approval semantics.
6. Owning domain's explicit mutation contract with verifiable business result.
7. Negative/concurrency, lost-ACK and revocation tests at real boundaries.

Before any live paid or production-wide action:
8. Real funding/dispatch enforcement and provider status/uncertainty handling.
9. Operational incident and emergency-mode policies.
10. Live-run security and provider-spend review with separate authorization.

This is a *dependency graph*, not necessarily ten sequential frontend screens. Several independent read-only panels can follow the initial staff/policy foundation in parallel when source ownership doesn't conflict.

## D. Review criteria for technical completion

The core technical architecture is ready to author bounded Changes only when:
- product scope and sensitive deferrals agree with the [acceptance record](../product-acceptance-and-scope.md);
- [source baseline](source-baseline-2026-11-14.md) is reconciled with the current main branch;
- staff principal/session, bounded policy and result/denial semantics form a coherent API contract;
- Admin search/Player 360 and operation summary fields have precise source/sensitivity definitions;
- audit/approval semantics are authoritative for any write proposed in a Change;
- dependency order and real negative proofs are specified;
- no “read-only” route secretly dispatches a model or mutates a player account.

Documentation cannot prove runtime security. Future Change acceptance must establish V0→V2→V3 evidence per [verification](security-and-verification.md).

## E. Initial implementation program status

This file establishes the **technical direction** only. The [core V1 wire contract](core-v1-contracts.md), [first-wave authentication design](first-wave-design-decisions.md) and [proposed implementation program](../implementation-program.md) now define eight candidate code-bearing Changes. No packet is Ready merely because the architect prefers this topology; implementation requires current-source revalidation and owner selection.
