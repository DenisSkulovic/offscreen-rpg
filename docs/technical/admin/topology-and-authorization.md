# Admin control-plane architecture | selected long-term technical topology

**Status:** Selected technical target, 2026-11-14, for the logical control plane and its authorization model. A narrow staff-session, scoped-read and case slice is realized in source (see [Current realization](#current-realization-source-verified-2026-11-27)); landing that slice does not ratify the target's package catalog, any production grant or any proposed module split. Product authority: [accepted Admin target](../../product/admin/README.md). Source evidence: [baseline](./investigation-and-privacy.md). Staff-console navigation, rendering and cache isolation are the [console and read models](console-and-read-models.md) contract. This page owns control-plane topology and authorization.

## 1. The architecture choice

**Choose a dedicated logical Admin control plane within the existing modular monolith, not a new fleet of microservices.**

- **Frontend:** a distinct staff shell at `/control` within `apps/web` (Next 16 App Router), with an independent server-only staff resolver and its own browser Query namespace. A future deployment may isolate its hostname if exposure/risk warrants it; route topology alone is **not** the security boundary.
- **API:** `/api/admin/*` Nest controllers inside `apps/api`, resolved through a mandatory staff actor/assurance/policy guard. No existing `/api/stories/*` or `/api/drafts/*` player controller may accept an Admin override header or `ownerId` from staff.
- **Application:** the installed package boundary is `@offscreen/admin` (`packages/admin/src/`) for staff access, sessions, minimized projections and case use cases. No `@offscreen/application` package or `@offscreen/application/admin` re-export exists in the current workspace; an earlier statement of such a compatibility alias is superseded by the extraction recorded in the archived MA03/MA08 packets. Future internal module splits remain proposals, not a claim of implementation. Where an operation belongs to an existing domain, it calls a **narrowly defined authorized application service** rather than mutating game tables through a web controller.
- **Contracts:** `@offscreen/admin-interface` typed, strict Zod request/response schemas, per-entity stable IDs, source/coverage and safe error states. No raw database row exposure.
- **Persistence:** versioned `admin_*` tables in existing PostgreSQL for staff, assignments, session/approval/action/audit and minimal case anchors. Business/game data keep existing authoritative tables and histories; new Admin structures should not duplicate them.
- **Integrations:** adapters that preserve the provider/source of truth (future payment, helpdesk, notifications, telemetry). The Admin never pretends a copied provider value is a final settlement.

This is a **control plane** (human authorization, observation and intervention) distinct from the **game/data plane** (player commands, mechanics, Storyteller tasks and publications). An operator can observe a legitimate world but cannot become its source of truth.

## Authorization claim map

This map separates the selected control-plane target from proposed module boundaries and from production grants this page withholds. It adds no staff role.

| Selected authorization target | Routes the page already calls implemented | Proposed staff modules | Withheld production grants |
| --- | --- | --- | --- |
| Dedicated logical Admin control plane in the existing modular monolith. Staff actor, assurance, and policy gate every admin effect. Authentication proves who. Policy proves the allowed effect on this resource in this context. Player story and draft controllers accept no Admin override header and no staff `ownerId`. | Scoped slice only, source-verified 2026-11-27: `/control` (`enter`, staff home, `players`) and `/api/admin/*` controllers for session, cases, players and evidence/audit/usage (see [Current realization](#current-realization-source-verified-2026-11-27)). Implemented existence is not a production grant, not a ratified package catalog and not a claim that the proposed modules exist. | Suggested boundaries only: `apps/api/src/modules/admin/`; application modules for identity, access, projections, cases, actions, and audit; `packages/admin-interface/src/admin.ts`; versioned `admin_*` persistence; `apps/web/app/(control)/control/`; `apps/web/src/features/admin/`. | No production staff role. First delivery withholds live write assistance, raw narrative export, financial actions, arbitrary world repair, and general LiveOps editing. Also withheld: general support impersonation, raw prompt disclosure, a generic admin query of generation input or output, and cross-tenant access. |

**Status mirror (provenance).** Mirrored from product [authority and governance, Status](../../product/admin/authority-and-governance.md), [Player 360 and support, Status](../../product/admin/player-360-and-support.md) and [operator workflows, Status](../../product/admin/operator-workflows.md), all dated 2026-11-14; the product pages keep their own scope restrictions and remain the owners of the policy. Landed Admin access and audit slices do not accept the proposed package catalog as production grants; the catalog awaits owner review. Player-safe reads and case anchors exist from the Admin wave. OBS06/07 Situation UI is synthetic or disposable-grant proof only. Production `support-investigator` grant issuance for live workers is absent, and full Turn Capsule disclosure is not implemented. Illustrative Support, impersonation, raw-prompt, refund, export and LiveOps examples stay Proposed or Blocked. This mirror records realization status only; it adds no grant, role or disclosure, and no persona or workflow description is a grant.

This map is the single owner of the withholding: describing Player 360 does not authorize general support impersonation, describing an investigation read does not authorize raw prompt disclosure, and cross-tenant access stays refused. The [console](console-and-read-models.md), [investigation](investigation-and-privacy.md) and [commands](commands-and-audit.md) pages link here instead of restating it. Player story reads stay scoped by [Relationship semantics and current single-owner source](./investigation-and-privacy.md#3-relationship-semantics-and-current-single-owner-source). The caller remains a separate principal under [Authentication and sessions](../platform/identities-and-access.md#authentication-and-sessions).

### Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| Authorization claim map | constrained-by | [Relationship semantics and current single-owner source](./investigation-and-privacy.md#3-relationship-semantics-and-current-single-owner-source) | If story reads stop being owner-scoped, or ownerId stops meaning the campaign owner, this map's refusal to accept a staff-supplied ownerId would either block a real membership read or let staff impersonate the owner |
| Authorization claim map | constrained-by | [Authentication and sessions](../platform/identities-and-access.md#authentication-and-sessions) | If a snapshot read no longer checks membership separately from the session, a staff principal could be treated as the story owner and this map's player-route refusal would no longer separate caller from subject |

## Current realization (source-verified, 2026-11-27)

Realization facts, separate from the selected target above. Existence of a route or module is read-only source evidence; it is not live qualification and does not select anything proposed on this page.

- **Staff session.** `packages/admin/src/session.ts`: a staff session is a separate Admin-purpose session over a verified player/auth session. Constants: login freshness 15 minutes (`ADMIN_LOGIN_FRESHNESS_MS`), absolute lifetime 8 hours, idle lifetime 30 minutes. `AdminActor` carries staff principal, Admin session, auth user/session, `accessEpoch`, status (`active` or `suspended`) and expiries. Failure codes are `unauthenticated`, `staff_session_required`, `not_authorized`, `step_up_required`, `conflict` and `unavailable`. Cookie and token handling live in `cookie.ts` and `token.ts` (only a digest is stored).
- **Policy.** `packages/admin/src/registry.ts` holds the closed, code-defined capability and package registry (unknown names deny); `policy.ts` `evaluateAdminAccess` evaluates assignments against resource kind, environment and scope; `access.ts` derives workspace families. The 14 current capabilities cover player summary/identity, campaign metadata, AI operation, commercial usage, platform spend/status, staff profile/access inspection, audit events, case summary/create/assign and campaign situation forensics.
- **HTTP.** `apps/api/src/modules/admin/` (`@Controller('admin')`, global prefix `/api`): `controllers/admin-session.ts` (`session/enter`, `me`, `session/exit`, `staff/:staffId/access`), `admin-cases.ts`, `admin-players.ts`, `admin-evidence.ts` (audit, access check, usage status, campaign operations, operation detail). Every gate flows through `admin-actor-service.ts`. The module README is the route table.
- **Web.** `apps/web/app/(control)/control/` implements `enter`, a `(staff)` layout, home and `players`; `apps/web/src/server/admin-actor.ts` `requireAdminActor` calls `/api/admin/me` and redirects 401 to sign-in and 403 to `/control/enter`. It authorizes the shell only; each page's reads are re-authorized by Nest. `apps/web/src/features/admin/` holds the Admin query provider/keys and panels.
- **Contracts.** `packages/admin-interface/src/admin.ts` holds the strict wire schemas.
- **Not realized.** The nested `identity/access/projections/cases/actions/audit` directories, action/approval/outbox persistence and every write category other than case create/assign/status.

## 2. Trust boundaries and request flow

The cross-boundary map (player API, document store, worker, provider) is [Platform trust boundaries](../platform/security-and-trust-boundaries.md#boundary-map); it grants nothing to staff. The staff request flow is below.

```text
Browser with player or no session                 Browser with explicit staff session
              |                                             |
     public/player Next routes                           /control
              |                                  server requireAdminActor
              |                                             |
        /api/stories/*                                /api/admin/*
        player identity                         staff session/actor resolver
       + story ownership                       grant scope + policy conditions
              |                                  + deny/approval/assurance
              |                                             |
 existing @offscreen/application                    /admin use cases
 mechanics / Storyteller / reads                minimized reads / governed actions
              |                                             |
      authoritative story/usage                    same domain records via
          data and receipts                     guarded readers/command owners
                                                            |
                                                  audited Admin results
```

**Rule for every request.** Each request, SSR render, search, export, mutation, SSE subscription and background action carries the same mandatory authorization and revocation semantics. Authentication proves **who**; policy proves the **allowed effect on this resource in this context**. Neither URL visibility nor a Next layout substitutes for the API gate. A Player session alone never opens a staff page: the server resolver redirects it to the staff entry step (see [Current realization](#current-realization-source-verified-2026-11-27)).

### Do not use these shortcuts

- Pass `targetOwnerId` into `this.stories.read` by constructing a fake player identity, or accept any staff-supplied `ownerId` as scope: scope comes only from the server actor's assignments.
- Expose developer-only Chamber controllers globally to obtain an easy Admin debugger.
- Serialize `generation.input/output` or raw document-store JSON through a generic `/admin/query` endpoint.
- Put entitlement/payer authority in React state, page props, JWT names, email domains, or an LLM-generated explanation.
- Let the browser choose permission scopes, approving actor, spent amount or target player ownership.
- Share query data between staff and player providers or cache private Admin RSC responses publicly.
- Treat a frontend disabled button, optional guard decorator or API gateway authentication as authoritative domain authorization.

## 3. Code-owner map (destination, NOT existing folders)

The table below is the proposed destination. For the folders that actually exist today see [Current realization](#current-realization-source-verified-2026-11-27): `packages/admin/src/` is flat (access, audit-reads, case-writes, cookie, diagnostics-reads, player-reads, policy, registry, session, situation-reads, token, usage-reads, `persistence/`), and the web feature folder is not split as proposed.

| Module | Primary responsibility | Depends on |
| --- | --- | --- |
| `apps/api/src/modules/admin/` | Staff HTTP controllers/guards/error mapping, case/action composition, request context | Staff authorization and Admin application |
| `packages/admin/src/identity/` | Resolve verified staff principal, active operator session/assurance, revocation | Auth adapter, staff DB |
| `packages/admin/src/access/` | Typed bounded-grant evaluation, staff package lifecycle, reasons/approval signals | Authorized resource facts, staff DB |
| `packages/admin/src/projections/` | Small safe search/Player 360/campaign/usage/operation summaries | Existing domain readers or scoped SQL; contracts |
| `packages/admin/src/cases/` | Case anchors, assignments, cross-domain evidence links and handoffs | Authority, audit, case policy |
| `packages/admin/src/actions/` | Preflight, approval, idempotent execution, reconciliation, audit/outbox | Existing domain command owners |
| `packages/admin/src/audit/` | Protected typed event history and sensitive-access capture | Staff identity; storage |
| `packages/admin-interface/src/admin.ts` | Strict wire projections, error/status/action/capability shapes | Zod, stable domain identifiers |
| `packages/db/src/schema/admin*.ts` | Versioned staff/policy/action/audit/case persistence | PostgreSQL/Drizzle; migrations |
| `apps/web/app/(control)/control/` | Staff-only App Router routes and server gate | Dedicated staff reader |
| `apps/web/src/features/admin/` | Admin workspaces, Query/form/command state and accessible UI | Admin API adapters and shared UI primitives |

These are **suggested future internal ownership boundaries** (the identity/access/projections/cases/actions/audit subdirectories are **not** selected for immediate creation). MA03 selects a single `packages/admin/src/` workspace and a one-to-one move of current 13 modules; do not invent these nested directories during MA03. Core responsibilities and security checks may not be silently collapsed into an existing player controller.

## 4. Separation of command and observation

**Observation:** a read projection may combine separately authorized source facts but never invent a new authority. It reports source, freshness, status and coverage; its permission check covers the query's **resource scope and every sensitive output field**.

**Intervention:** an Admin action is not a “write permission on a table.” It is a named, domain-approved command with target, version/prerequisite, requested effect, independent policy and an attributable result. Existing mechanical, funding and publication authority must still validate it.

**Cases / incidents / audit** are cross-domain context, not extra owners of player game state.

## 5. Model consistency and asynchronous work

- Use the existing application/DB owners for deterministic game operations and durable tasks; avoid network/provider calls while holding story locks.
- All paid/model-provider work remains admitted by captured funding authority. An Admin preview, report or request must not trigger unbounded provider calls.
- A new global protective stop must be checked by actual dispatch/admission paths, including workers and in-flight restrictions; an operator button is not proof the stop is effective.
- Admin operations that call another system distinguish **requested, provider accepted, confirmed effect and uncertain**. Use a durable intent/receipt where double execution is consequential.
- Read-only metadata may be eventually consistent, but a mutation preflight must **re-read authoritative target state** just before executing.

## 6. Initial delivery boundary

**Design for the full target; initially expose only what has a safe authoritative source and proof:**
1. Staff-only access and scoped capability evaluation, with auditable bootstrap.
2. Read-only staff directory/effective access where authorized, and a protected Admin session.
3. Player search and account summary, single-owner campaign metadata with verified state.
4. Read-only operation/usage status where source-backed, without private prompts or invented customer billing.
5. A minimal case anchor and safe cross-links only once assignment authority is established.
6. Basic audit/incident exposure, with operational stop **only after** a validated spend-enforcement seam exists.

No live write assistance, raw narrative export, financial actions, arbitrary world repairs or general LiveOps editing in this first delivery boundary. Those future extensions must satisfy the per-category gates in [commands and audit, first-wave enabled operations](commands-and-audit.md#7-first-wave-enabled-operations).

## 7. Dependency and trade-off rationale

**Rejected alternatives.** A separate admin microservice would duplicate identity, database access, deploy/incident surface and latency before measured need. A full ABAC scripting language is hard to audit for a small operating organization. A Boolean `isAdmin`, an owner spoof, a raw SQL console or UI-hidden controls are too weak for the target. **Chosen:** a typed, small, **deny-by-default grant evaluator** and a dedicated domain service inside the existing Nest stack (realized as `registry.ts` plus `policy.ts`), intentionally stricter than the POC player path.

## 8. Architecture rejection cases

- Any unauthenticated or player-only request reaches an Admin projection or mutating operation.
- A staff principal retains a read after revocation merely because the page was already rendered.
- A staff member with analytics/global scopes obtains case-limited compensation on arbitrary accounts.
- A legacy player owner-scoped route can be invoked on another player's behalf by passing extra headers/parameters.
- A game AI provider call can be started by rendering a read-only Admin page.
- A raw prompt or hidden campaign content appears in the basic Player 360 response.
- A lost HTTP acknowledgment makes it possible to execute a second refund/grant without reconciliation.
- A stale dashboard says spending is safe despite unknown provider allocations.
- A privileged Admin code path can perform writes without an attributable operator and audit result.

These are normative technical constraints, not claims that current tests prove them.
