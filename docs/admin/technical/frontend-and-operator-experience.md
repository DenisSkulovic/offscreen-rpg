# Admin frontend, navigation and interaction contracts

**Status:** Selected technical target, 2026-11-14. Product owners: [Command Center](../command-center-product.md), [Personas](../personas-and-workspaces.md), [Player 360](../player-360-service-blueprint.md), [Authority](../authority-operating-policy.md). Respect the [selected React/Next target](../../engineering/targets/react-next.md) and the [source baseline](source-baseline-2026-11-14.md).

## 1. One staff shell with isolated authentication and data

Choose `/control` as the initial reserved staff URL family, implemented through an explicit App Router group such as `apps/web/app/(control)/control/**`. Do not place the console inside the player `/stories` hierarchy or reuse the player `requireViewer` as the Admin authorization check.

**Render path:**
1. Server-only `requireAdminActor` obtains an explicit staff session through Nest.
2. The page performs **independently authorized resource reads**, not "the layout already checked".
3. Request-scoped Query prefetch and Zod parse deliver the initial safe projection into SSR HTML.
4. An Admin-scoped QueryClientProvider owns browser server-state cache, separate from player Query state.
5. Interactive views use typed Query fetch/mutation plus local view state; the API remains the only authority.

**Chosen frontend stack:** the repository's Next 16/React 19, TanStack Query v5, strict Zod wire contracts, React Hook Form + Zod for editable staff forms, local ephemeral React state and existing Vitest/RTL/MSW/Playwright/axe/Storybook patterns. No second Redux-like global store or new rendering framework.

## 2. Session and cache isolation

- Admin browser queries are keyed by **staffPrincipalId + privilege/session epoch + resource/filter identity**, e.g. `['admin', staffId, accessEpoch, 'player', targetId, 'summary']`. Never put session secrets, private text or raw prompts in query keys.
- An expired/revoked staff session causes **server denial**, visible sign-out/permission-ended state and cleared Admin browser cache. Logout/role change in another tab must invalidate cached sensitive projections before reuse.
- Player user-switch and staff-switch must not show prior person's account or story. Soft navigation, back-forward cache, SSR hydration and refresh must all honor current staff access.
- Admin responses, SSR/RSC, CDN/proxy and EventSource hints are private/no-store; do not persist sensitive admin state to localStorage, IndexedDB or a service worker.
- A staff badge, hidden menu, `useCan()` client helper or cached policy summary is only presentation. Every Nest read/mutation rechecks policy.
- Deep links preserve a safe return path after explicit Admin reauthentication; arbitrary open redirects, external callback URLs and command resubmission are prohibited.

## 3. Logical navigation and roles

Start with coherent destinations matching product workspaces: Command Center, Players & Accounts, Support & Cases, Gameplay & Worlds, AI & Engineering, LiveOps, Commercial, Growth & Insights, Trust & Privacy, Access & Governance.

This is an **information architecture**, not a requirement to generate ten empty menu items in the first implementation. A workspace appears as usable when its backend source and permission actually exist. A multi-role employee can pin a mixture of sections, but each record/action remains independently authorized.

A global finder returns restricted results with safe subject/type references. It must not reveal protected record existence, counts, titles or autocomplete. Saved links cannot elevate authority.

Navigation selection should be modeled in URLs for stable subject identity, not an opaque global context. Cases/incident deep links should preserve provenance so staff can return to their originating work item.

## 4. Shared interaction building blocks

These are **behavioral components**, not specific UI libraries:

| Interaction pattern | Necessary states and behavior |
| --- | --- |
| Staff session gate | Loading/confirmed staff/needs reauthentication/denied/revoked/service unavailable |
| Entity finder | Initial/valid results/no authorized matches/invalid query/restricted/unavailable |
| Player 360 | Source-backed summary, per-panel evidence/freshness and explicit unavailability |
| Capability-aware action | Allowed, can request approval, step-up needed, hard denied, unavailable/deferred |
| Sensitive evidence panel | Restricted by default; purpose/expiry/assurance before opening; audited access |
| Action composer | Target, exact delta, current version, impact/affected people, irreversibility, reason and approval requirement |
| Approval detail | Proposal digest, requester, approver, expiry, immutable target, actual authorization status |
| Operation receipt | Admitted/processing/unknown/partial/failed/verified; safe reconciliation instead of blind retry |
| Incident panel | Scope, affected operations, severity, source/freshness and verified mitigation |
| Work queue | Owner, subject, next action, current dependency and safely redacted preview |
| Audit timeline | Human/system actor, authority/time, action type, target and verified status without private payload |

**Accessible behavior:** semantic controls, keyboard navigation, focus/failure recovery, accessible tables/pagination, deliberate confirmation for risky effects, readable status text, alerts that do not spam screen readers. A 403 (not permitted), 404 (no authorized record), 409 (stale intent), 423/blocked as selected, 429 (rate-limited), 503 (source unavailable) and unknown effect require distinguishable safe user-facing outcomes.

Do not display a generic "permission denied" for source telemetry unavailable, nor an invented `0` allowance for absent billing support.

## 5. Transport and Next boundary

- `/api/admin` routes use a staff-specific typed browser transport or shared low-level transport that always includes Admin-session/CSRF context; never append staff ID to a URL to acquire access.
- Nest controllers parse strict Zod DTOs and perform server authorization; Next server readers parse the same public Admin DTO schemas and forward only permitted credentials.
- Server Component prefetch must never use globally shared QueryClient; pass only minimum field-scoped records to hydration. One Query key owns each remote projection.
- For list/detail, use permission-aware cursor pagination and deterministic stable identity. Keep counts and suggested search values within allowed scope.
- Mutations use immutable frozen request envelopes, zero automatic retry, original action ID receipt polling/reconciliation and correct pending/unknown states. They cannot advertise success from HTTP 202 alone.
- Use SSE only for **authorized invalidation hints** where it materially improves a queue/incident experience, with reconnect auth and fallback GET. Initial read-only Admin can use ordinary explicit refresh/polling; do not build a global event bus before operational need.

## 6. Screenshot/interaction states for future Storybook

Provider-free fixtures should include:
- nonstaff signed in to player area, denied from Admin without any Admin shell flash;
- new Admin Reader with no data access except named metadata;
- Support + Engineering role overlap with case-only boundaries;
- valid Player 360 where billing is **unsupported** and technical usage is `uncertain`;
- staff revocation while two tabs are open;
- deep link from restricted Trust case to another employee with no Trust permission;
- historical story public events with `since-enabled` coverage;
- approved-but-not-executed action, and timed-out possibly committed effect;
- empty/no data due to unauthorized results versus actual empty permitted list;
- mobile dense table, keyboard-only flow and screen reader announcement.

Fixture behavior does not prove endpoint authorization, audit persistence or real provider accounting. Those need a higher test layer.

## 7. Boundary with player UI and developer Chamber

Players remain in `/stories`, `/play` and public demo; their query cache and player auth flow remain unchanged. Developer Chamber remains conditionally registered in its own local tooling environment. Admin diagnostic sandbox may eventually reuse safe Chamber capabilities behind an independently governed application owner, but should not expose test fault switches via general `/control` routes.

**No new public "Admin" link** that discloses internal features to ordinary players; internal staff can enter through a known route with proper authentication.

## 8. Frontend negative acceptance

- Authenticated player opens `/control`: no admin SSR payload, no flash of navigation, no privileged API call succeeds.
- Authorized staff returns after revocation: old Query and browser history do not reveal protected Player 360 data.
- Admin Client Component imports server-only identity module: build/static guard rejects boundary.
- Global search result contains protected player title/Trust case name: request fails safe rather than exposing snippet.
- Allowed operator loads account with unsupported billing fields: UI says unsupported/unavailable, never free/no spend.
- One package grants read access; frontend cannot infer grant/create permission and call an unguarded action.
- Action changed since preflight: client surfaces conflict/approval expiry and reconciles original receipt, not replays with fresh request ID.
- Lost provider response triggers no new model dispatch merely because a staff form rerenders.
- Two employees link to same case and operation: consistent safe status, independently authorized content.
- Developer Chamber is unavailable in production: Admin UI does not try to activate it as a fallback.

Exact component styling and route structure remain secondary to the security/interaction contracts.
