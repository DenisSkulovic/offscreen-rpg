# Core Admin V1 | concrete protected read and staff governance contracts

**Status:** Architect-selected **initial-scope technical contract**, 2026-11-14; source-revalidation and implementation tests still required. Product: [accepted scope](../product-acceptance-and-scope.md). **This is not live code.** All described DTOs are the desired strict, versioned shapes; exact type names here are implementation targets, not assertions of existing exports.

## 1. First-scope rules

- **All Admin access uses explicit staff-session context**; player-only access fails before source reads. Session entry is permitted only for an approved active staff principal.
- **All read endpoints authorize resource and fields**, returning schema-validated minimal data. Authorization is not delegated to Next UI.
- **No user-initiated paid provider call, game movement, mark-read, account change or customer allowance adjustment is caused by an Admin GET.**
- **Search starts with stable IDs only** in the first foundation, with email/phone lookup, full-text story search and bulk export excluded.
- **No raw story passages, private generation JSON, OAuth tokens, payment instruments or confidential Trust material** in V1 read responses.
- **Unsupported paid subscriptions/multiplayer relationship fields are not synthesized** from player tables.
- **Case assignment, financial/grant writes, live assist, narrative export and production repairs are deferred** beyond this foundation until their owning policies and technical contracts are accepted.

## 2. Staff session endpoints

| Method / path | Meaning | Required actor/authority | Result |
| --- | --- | --- | --- |
| `POST /api/admin/session/enter` | Explicitly begin staff-mode from an authenticated, verified human identity | Existing login plus active staff principal and enrollment/assurance policy; CSRF/origin | Rotated, short-lived admin-purpose cookie; safe `AdminSelfV1` |
| `GET /api/admin/me` | Validate current staff session for SSR/Query | Active staff session | Safe identity, staff ID, session expiry, access epoch and allowed workspace families |
| `POST /api/admin/session/exit` | Terminate admin-purpose session, clear cookie | Existing session or safe logout | Idempotent close; no player session authority granted |
| `GET /api/admin/staff/:staffId/access` | Inspect effective scoped authority | `staff.access.inspect` (staff self-view narrowly allowed) | Named capabilities, scope descriptors, provenance/expiry and safe denial explanation |
| `POST /api/admin/staff/invitations` | Invite authorized staff (later foundation phase) | Specific `staff.invite`, delegable subset only, audit | Validated invitation result with expiry, never a superuser |

The authenticated staff principal is **not** the same object as `/api/me`'s current player user. A staff session is not minted by simply setting `user.isAdmin = true`. Initialization/bootstrap requires a deliberate, out-of-band procedure (not an unauthenticated endpoint).

## 3. Read-only resource endpoints

| Method / path | Capability | V1 response / constraints |
| --- | --- | --- |
| `GET /api/admin/players?ref=<exact-id>&limit=<bounded>` | `player.summary.read` plus source scope | Filtered paginated search with stable safe reference; no raw email lookup |
| `GET /api/admin/players/:id` | `player.summary.read` for this target | `PlayerSummaryV1`, account status and source-backed relationships; billing `unsupported` if absent |
| `GET /api/admin/players/:id/campaigns?cursor=<opaque>` | `campaign.metadata.read` and subject relationship | Page of permitted legacy-owner/current story metadata, no passages |
| `GET /api/admin/campaigns/:id/operations?cursor=<opaque>` | `ai.operation.read` / `campaign.metadata.read` as appropriate | Redacted generation status list, bounded safe failure codes |
| `GET /api/admin/operations/:id` | `ai.operation.read` for target | Task/attempt/publication status, source refs and coverage, not `input/output` |
| `GET /api/admin/usage/status?accountRef=<id>` | `commercial.usage.read` or narrower `platform.spend.read` | **Technical** reservation/settlement/uncertain windows with explicit unknown, no paid-tier inference |
| `GET /api/admin/audit?cursor=<opaque>` | `audit.events.read` and row scope | Permitted sanitized action/session/admin events; protected narrative contents absent |

**No wildcard `/api/admin/*:table` endpoint**, no unrestricted SQL/explorer route, no bulk export as a subset of list GET, and no player-action HTTP forwarding.

For the initial implementation program, prioritize `/admin/me`, narrow player search/summary, legacy campaign metadata and auditable session/identity. Operation/usage/audit views are separate follow-up Changes as backend source and privacy boundaries are proven.

## 4. DTO shapes and status semantics

### Common safe Admin reference

```ts
type AdminSubjectRefV1 = {
  kind: 'player' | 'campaign' | 'operation' | 'staff' | 'case' | 'incident';
  id: string;             // validated stable ID, not arbitrary text
  environment: 'production' | 'staging' | 'local';
};
```

Environment values are **illustrative recognized buckets**; the actual registry is controlled by the server. Passing a different environment from the browser never changes the server's deployment scope.

### Common read envelope (conceptual TypeScript target)

```ts
type AdminReadEnvelopeV1<T> = {
  version: 1;
  subject: AdminSubjectRefV1;
  data: T;                 // endpoint-specific strict, sanitized schema
  observedAt: string;      // ISO timestamp
  consistency: 'verified' | 'delayed' | 'partial' | 'unavailable';
  sources: Array<{
    kind: string;          // source registry, validated
    coverage: 'complete' | 'since-enabled' | 'partial' | 'unknown';
    observedAt?: string;
  }>;
  limitations: Array<'unsupported' | 'stale' | 'incomplete-evidence' | 'source-unavailable'>;
};
```

**Do not include data for resources whose existence the actor is not allowed to discover.** Redaction is by explicit endpoint field allowlist plus scoped authorization. For a field whose unavailable state is itself permitted, use a safe discriminator; never dump original JSON and subtract keys as an afterthought.

### Specific initial read objects

```ts
type PlayerSummaryV1 = {
  id: string;
  createdAt: string;
  status: 'active' | 'restricted' | 'unknown'; // source-backed only
  relationshipSummary: {
    legacyOwnedCampaignCount: number | null; // null == not available, not zero
    coverage: 'complete' | 'partial' | 'unknown';
  };
  commercial: { status: 'unsupported' | 'unknown' | 'verified'; explanationCode?: string };
};
type CampaignMetadataV1 = {
  id: string;
  relation: 'legacy-owner'; // current only; expand when real memberships exist
  createdAt: string;
  currentRevision: number | null;
  viewVersion: number | null;
  operationHealth: 'normal' | 'pending' | 'uncertain' | 'unavailable';
};
type RedactedOperationV1 = {
  id: string;
  kind: string;                   // allowlisted safe task category
  state: 'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain';
  publication: 'pending' | 'published' | 'stale' | 'blocked' | 'unknown';
  sourceCoverage: 'complete' | 'partial' | 'unknown';
  lastObservedAt: string;
  safeFailureCode?: string;       // server allowlist, no raw provider error
};
```

The prototype does not yet have a verified staff-facing account status/restriction model. The projector must use `unknown` rather than assert `active` from the mere existence of an auth user. A campaign can legitimately have a pending Storyteller task and still be consistent. Do not derive `normal` merely from "no errors found" when coverage is partial.

### Safe error contract

```ts
type AdminErrorV1 = {
  version: 1;
  code: 'unauthenticated' | 'staff_session_required' | 'not_found' |
        'not_authorized' | 'step_up_required' | 'approval_required' |
        'invalid_request' | 'conflict' | 'rate_limited' | 'unavailable';
  requestId: string;  // opaque diagnostic reference only
};
```

**HTTP handling target:** 401 for no valid auth/session, 403 for safe known capability denial only when the viewer may know the resource class, privacy-preserving 404 for forbidden/absent resources without revealing existence, 400 validation failure, 409 stale/conflicting command, 429 throttle, 503 source/audit dependency unavailable. `approval_required`/step-up are typed operation outcomes; do not let a generic HTTP error obscure workflow state. No stack traces, raw SQL, OAuth subject, policy source, document title or internal provider payload in error responses.

## 5. Rights checking and freshness

The staff API handler must:
1. Resolve the current verified Admin actor (not generic player viewer).
2. Validate request/subject parameters and server-known environment.
3. Apply a complete grant to the **specific action and resource** and any field-level restrictions.
4. Query the authoritative source with data minimization and enforced subject scope.
5. Strict-parse/serialize the DTO; append required audit for sensitive operations.
6. Return `Cache-Control: private, no-store`, and honor current access epoch on every request.

Queries with a permitted reference may return `unknown`, `partial` or `unsupported` if their actual source lacks data. They must not accidentally generate a model task or mutate story "seen" state.

## 6. Initial implementation acceptance

- Nonstaff and player-only cookie get no Admin data from GET, SSR or browser API.
- Staff with named player scope can see that player's minimal summary, but not another known player's record or metadata.
- Raw `account.accessToken` and `generation.input/output` absent in every V1 JSON even if present in DB.
- Search filter by player reference cannot leak other players through counts, suggestions or page traversal.
- Current `story.ownerId` maps to `legacy-owner`, not fabricated multiplayer/payer association.
- Missing billing source returns `unsupported`, not free or paid.
- Two simultaneous Admin sessions with different scoped grants cannot share a Query projection.
- Logged-out/revoked staff gets no cached SSR private payload and all subsequent endpoint calls fail.
- Unsupported reads/actions return a safe unavailable/denied outcome, not an empty success response.
- No real provider spending, game time progression, or internal note/passage publication during an Admin read.

**Read-only V1 does not imply the remaining nine workspaces will have fully functional screens.** Render only source-backed capabilities that are authorized and verified.
