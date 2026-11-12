# React / Next.js engineering target | DECIDED architecture

**State: ARCHITECTURE SELECTED, 2026-11-12.** The repository owner explicitly directed the architect to **choose the complete professional frontend stack and resolve architecture decisions**, with TanStack Query mandatory and no cap on the eventual scope of a justified refactor. This contract supersedes the earlier “Proposed/minimal client controllers/defer TanStack” recommendation. **Implementation is not authorized in this session:** only Markdown is being edited; Cursor will execute selected Changes later. A selected architecture is not a claim that its code exists or tests pass.

**Scope:** React 19, Next.js 16 App Router, `apps/web`, its browser/SSR consumer boundary, necessary Nest-facing API contracts and end-to-end verification. **Purpose:** a senior-engineering portfolio. **Excluded:** gameplay expansion, UI/UX and visual redesign, new narrative behavior, live model spending, unrelated infrastructure modernization. **Behavioral authority:** [client/identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), [execution semantics](../../technical/execution.md), [gameplay boundaries](../../player-experience.md); this document owns *frontend engineering decisions*, not new game rules.

## 0. Final stack decisions (these are instructions, not a library wishlist)

| Concern | Selected technology/architecture | Binding reason and constraint |
| --- | --- | --- |
| Framework | **Existing Next.js 16 App Router + React 19 + TypeScript 5 strict** | Keep Server Components and SSR, focused Client islands, RSC navigation/streaming, no migration to SPA |
| Remote/server state | **TanStack Query v5, required** | One identity-keyed browser server-state cache, hydration, invalidation, pagination, bounded refetch and observability |
| Server data loading | **Next server-only authenticated Nest readers + request-scoped QueryClient + dehydrate/HydrationBoundary** | Private HTML renders with preloaded cache; no independent Server Component copy of mutable story data |
| HTTP and validation | **Zod 4 contracts + typed endpoint-specific server and browser adapters** | Parse unknown at wire; exhaustively distinguish protocol/auth/conflict/transient errors; no untyped `send(anything)` |
| Forms | **React Hook Form v7 + `@hookform/resolvers/zod`**, with `useFieldArray` where appropriate | Creation draft, campaign settings, preset editing; dirty tracking, field errors, immutable save snapshots, controlled resets |
| Mutations | **TanStack `useMutation` for transport lifecycle + explicit typed intent state machine for business protocol** | Mutation success can mean 202/admission, not final publication; stable UUID/payload, no automatic paid replay |
| Local UI | **React state/reducers for ephemeral view state; URL for navigable identity** | Query is the only client cache for remote server state; no Redux/Zustand/XState or synchronized duplicate stores |
| Ongoing updates | **Authenticated SSE invalidation + Query refetch, with bounded polling/resync fallback** | Existing future SSE contract becomes part of selected engineering destination; events are hints, not authority |
| Tests | **Vitest, React Testing Library, user-event, MSW; existing Playwright/Nest integration; axe-core/Playwright accessibility checks** | Pure -> component -> HTTP -> browser truth, deterministic races and no paid providers |
| Component workbench | **Storybook with Next-compatible builder + MSW-backed deterministic states** | Independent review of normal, blocked, pending, uncertain, conflict and recovery contracts, *not* a visual redesign |
| Static enforcement | **ESLint (React Hooks, Next, TanStack Query rules), TypeScript strict + enforceable import directions, Prettier and existing Turborepo/CI** | Errors and architecture boundaries checked mechanically, not a promise in an agent rule |
| Diagnostics | **Safe structured frontend request/command/error instrumentation + React Profiler and measured build/network traces** | Diagnose wrong view, stale read and failed operation without logging story content, cookies, tokens or prompts |

**Version policy:** keep existing pinned Next 16/React 19/Zod 4. Add the compatible *stable* major versions above, pin exact lockfile versions after installation and confirm compatibility on Node 24 with a successful build. Do not assert a particular future patch version without verification. Avoid experimental TanStack streaming package, React compiler auto-enablement and new client-state libraries. Native controls remain the default; accessible Radix-like primitives are permissible **only** for a genuinely complex control added under the later UI/UX target, not as a blanket rewrite.

**No discretionary technology decisions left to Cursor:** it may choose local implementation details, but not substitute SWR/Redux, omit TanStack Query/RHF, invent Server Actions, replace SSE with WebSockets, broaden game authority or silently change retry/security semantics.

## 1. Desired data and rendering topology

```text
Browser navigation / Next route (viewer + entity URL identity)
       |
       v
Next Server Component or authenticated route group
  ├─ server-only requireViewer / Nest owner-aware read
  ├─ request-scoped QueryClient (NEVER process-global)
  ├─ parallel critical prefetch using Zod-validated server adapters
  └─ HydrationBoundary(dehydrate only intended private projection)
       |
       v
React-rendered HTML + interactive Client feature islands
  └─ authenticated QueryClientProvider (memory-only browser cache)
      ├─ useQuery / useSuspenseQuery for resource snapshots and read models
      ├─ useInfiniteQuery for lists and chronology
      ├─ useMutation with frozen intent envelope and explicit domain lifecycle
      ├─ React Hook Form local edit sessions
      ├─ local view control state, derived selectors, pure render components
      └─ SSE invalidation -> invalidate/refetch Query -> validated snapshot
       |
       v
same-origin typed browser HTTP (cookie session; CSRF enforced)
       |
       v
Nest API -> application/DB/Temporal authority
  ├─ user/object authorization and public projections
  ├─ idempotency/operation receipt and visible version
  ├─ 200 immediate / 202 admitted / 409 conflicted semantics
  └─ SSE update hints after committed state, without private narrative

Developer Chamber: separate authenticated *developer-gated* API and UI,
no shared privileged browser state, reused only safe Query/transport policies.
```

The existing `app/` URL structure stays unchanged for users. Introduce a route group such as `app/(authenticated)/` for **server-side auth composition and a small client Query provider** while preserving every path (`/stories`, `/play/:id`, `/chamber`). Keep root `app/layout.tsx` a Server Component. The grouped layout may establish auth/provider context, but **every private page/API request still independently enforces access**; shared layouts can survive soft navigation. Public and scripted `/demo` routes do not pay for the authenticated Query provider.

### Data ownership invariants

1. **Nest owns truth.** TanStack Query caches *public/authorized projections*, never mechanics, billing, or invented in-progress results.
2. **Query owns remote data.** Do not store the same story in `useState`, context, Zustand or a parallel custom snapshot store. A single Query key/entry is the client projection owner; use pure structural-sharing/reconciliation and one update API.
3. **RHF owns unsaved edits.** Background Query refreshes must not reset dirty user values. The current server revision and form edit session are separate.
4. **User intent is distinct from request.** Query's mutation status is transport, not a durable operation ledger or substitute for an explicit intent state machine.
5. **Local UI remains local.** Tabs, expanded panels, offer path breadcrumbs and temporary menu state use `useState`/`useReducer` and reset only at their declared entity/offer boundary.
6. **URL owns selection.** Query keys include authenticated viewer and resource identity. A->B transition must never show A as B even while B is loading.

## 2. TanStack Query architecture: exact operating contract

### Provider and SSR hydration

- Server prefetch: instantiate a **new QueryClient per server request or independently scoped private route**, run authenticated Nest `prefetchQuery`/`fetchQuery` for singular resources and `prefetchInfiniteQuery` for first-page infinite lists, in parallel for independent critical reads, and hand only their Zod-validated authorized representations to `HydrationBoundary`. **Never export a module-global server QueryClient.**
- Server prefetch and browser `queryFn` have the **same key and result schema**, but different transports: the server uses request-bound private Nest calls; the browser uses same-origin `/api`. No cookies, server origins or Node-only code may cross into a Client import graph.
- Client provider instantiates one browser QueryClient per authenticated browser session (not each render). Use stable Query client construction compatible with Suspense. Prefetch/await the *primary* snapshot required for useful server HTML; noncritical panels may stream independently under a deliberate Suspense boundary.
- **No duplicated mutable display owners:** do not separately render a long-lived server JSX snapshot next to a client Query view that later diverges. Private Server Components are principally loaders and safe composition; interactive story/list components read the hydrated Query cache. The HTML must contain meaningful scene text before hydration, without a duplicate mount fetch.
- For an already mounted Query entry, blindly passing fresh server `initialData` is **forbidden** because it need not replace older cache data. Use hydration, explicit invalidation and domain-version-aware acceptance. Test soft navigation, RSC refresh and in-flight response ordering.

### Required query keys and cache policies

Every private key begins with `['viewer', viewerId, ...]` and includes stable resource/filter identity. Never put session cookies, tokens, unredacted text or a mutable object identity into a key.

| Query | Key suffix | Default stale policy | Invalidation |
| --- | --- | --- | --- |
| Current story | `['story',storyId,'snapshot']` | `staleTime: 5_000` ms; active pending status refresh separately | Accepted command, SSE hint, focus/resume, explicit refresh |
| Story history | `['story',storyId,'history',filters]` (infinite) | 30_000 ms | Publication/invalidation or user explicit refresh |
| Story list | `['stories','list',filters]` (infinite) | 15_000 ms | Start/fork and relevant publication |
| Draft list | `['drafts','list',filters]` (infinite) | 15_000 ms | Draft save/create |
| Draft detail | `['draft',draftId]` | 15_000 ms | Save/conflict reconciliation |
| Latest opening | `['draft',draftId,'opening']` | 5_000 ms while pending, otherwise 15_000 ms | Generation admission/settlement, Start conflict |
| Catalogues/presets | `['catalogue',kind]` or `['presets']` | 300_000 ms for immutable catalogue; 60_000 ms for private presets | Explicit save or catalogue change |
| Settings/history | `['story',storyId,'settings',kind]` | 30_000 ms | Settings mutation |
| Chamber/QA | `['chamber',...]`, `['qa',runId,...]` | 5_000 ms or explicit refresh by scenario | Own authorized command/run transitions |

**Default browser cache:** memory-only, `gcTime: 300_000` ms. `refetchOnWindowFocus: true` and `refetchOnReconnect: true` *for stale GETs*; no service worker/private cache persister, IndexedDB, `persistQueryClient` or `broadcastQueryClient` for private payloads. GET retry: at most **one** bounded retry with backoff on genuine network/502/503/504, never retry 400/401/403/404/409/429 or malformed contract. **Mutation retry: zero**, `networkMode: 'always'` for irreversible commands so they fail/enter uncertain handling instead of being silently queued for network reconnection. No automatic paused-mutation resume.

### Snapshot and update policy

- One validated story snapshot Query entry is canonical for all Play consumers. Use `queryClient.setQueryData` *only* through a resource-aware, monotonic reconciliation function with viewer/story key and server version. All mutation responses, explicit reads, SSE invalidation reads, SSR hydration conflicts and polling results obey this gate.
- For same story order by `viewVersion`, then validated `resolution.version` when applicable. **Equal logical-version dynamic projections** (e.g. countdown display) may be accepted only from the latest eligible request epoch; older completions cannot roll back a newer request result. If server protocol violates “material state increments visible version”, strengthen the **backend projection contract**, not a client guess.
- Query's `dataUpdatedAt` controls cache freshness **not** domain authority. It is forbidden to treat later arrival time as a newer story revision or to let Query's default replacement semantics defeat domain monotonicity.
- Query `select` derives read-only view information, not another store. No optimistic committed outcomes. Direct command response may seed a snapshot only after runtime validation and matching resource/operation eligibility; otherwise invalidate and fetch.
- Queries use AbortSignal from TanStack queryFn and an entity/viewer guard for callbacks that can outlive cancellation. Every query/command response must be parsed by Zod.

### Pagination

Use `useInfiniteQuery` for stories, drafts and chronology, with typed per-resource cursor and `getNextPageParam`, a finite `maxPages` when justified by UI memory size, stable ordering/dedupe and explicit query-key reset. Story list uses UUID continuation, drafts opaque cursor, history numeric `before`. Preserve current visible buttons and navigation, changing only engineering consistency. One in-flight `fetchNextPage` per resource; wrong-viewer/route responses cannot enter another key.

## 3. Command, error and recovery contract

**Command transport uses `useMutation` but domain state uses a typed, endpoint-specific intent machine** (discriminated union/reducer, not XState). Freeze each envelope at user interaction: `{viewerId, resourceId, kind, operationId, endpoint, requestVersion, body, createdAt}`. A repeated attempt must carry **the exact ID, endpoint and frozen JSON payload**. Never use an Effect to POST when a component mounts or browser reconnects. For commands where the server returns 202, the result is `accepted/pending`, never `published`. On 409 read authoritative state and preserve local editable input; on 401 reauthenticate without resending; 400/422 actionable; 429 rate-limited; 5xx/timeout ambiguous until GET/receipt reconciliation. Query `invalidateQueries` updates all affected read models *after* a confirmed transition, not as a substitute for resolving an unknown business effect.

### Reload and durable identity: fully decided

- **Resolution/admitted expensive commands:** add a small, owner-scoped read-only Nest **operation receipt endpoint** (see W19); it reports the persisted operation identity/status and only authorized public fields. This is a frontend-supporting API contract, **not** game mechanic redesign.
- Persist a **minimal nonsecret, versioned operation envelope with a fixed 24-hour TTL in sessionStorage**, keyed by authenticated viewer, story and operation ID, for commands needing same-key reload recovery (Play resolutions and Start). **Do not persist session secrets, private narrative, prompt bodies, arbitrary form prose or the Query cache.** If the original payload cannot safely be stored, store an operation reference and require receipt reconciliation; never invent a replacement intent.
- On reload first GET the authoritative story/operation receipt, never POST automatically. Only an explicit user recovery control can reissue the *identical* frozen envelope after authorization/contract validation. If receipt absent/ambiguous, show a blocked/unknown state, not a new charge.
- **Start:** keep `?story=UUID` as recovery anchor. Freeze candidate ID, draft revision, locked flag, speed and optional start package when first submitted. On reload GET `/api/stories/:storyId` first; only if not settled and still authorized may the original frozen Start envelope be offered for explicit same-body retry.
- **Draft saves:** expected revision fence + captured submitted form values; GET latest draft on ambiguous response, preserve dirty edits. They are not equivalent to a charged Storyteller command.
- **Generation:** explicit new request vs repeat admitted attempt. Existing `202` generation and provider-uncertain policy respected; no automatic second model dispatch.
- Enforce backend same-operation/different-payload rejection, owner scoping and actual persisted one-effect receipts. Client disablement and TanStack mutation `scope` do not create cross-tab exactly-once guarantees.

## 4. End-to-end update transport (selected, not future conjecture)

**Target:** authenticated SSE for committed story/version **invalidation hints**, plus HTTP GET reconciliation. Backend sends no private narrative in events. Use `EventSource` with same-origin cookie and server-side auth/object authorization, a bounded heartbeat, proper proxy streaming and disconnect cleanup. A server append/update emits a compact `{eventId,storyId,viewVersion,kind}` after commit. Use PostgreSQL transactional `LISTEN/NOTIFY` as the minimal cross-process hint source, per the existing [client technical contract](../../technical/client-and-identity.md); this is not a durable replay or additional business queue.

**Client:** one SSE stream per actively viewed story; on opening/reconnect and newer hint invalidate the matching Query key, then fetch authoritative snapshot. Dedupe event/version hints and ignore wrong story/viewer; close on session/resource change. If stream unavailable, keep bounded, visibility-aware `2s` pending-status polling as a fallback; when SSE is healthy, use a slower **30s** reconciliation safety poll while pending, plus immediate focus/reconnect/visibility refresh. Backoff on repeated error, no query storm, no paid mutation from events. The final end-to-end suite must simulate a missed event and recover from GET. **No WebSockets, Redis Pub/Sub or RabbitMQ.** SSE is a frontend transport with a narrowly necessary Nest/DB notification addition, not gameplay implementation.

## 5. Forms, components and accessibility

### React Hook Form rules

- Use RHF for draft creation/edit, campaign settings and private preset forms. Use `zodResolver` with existing Zod schemas/explicit UI schemas, `mode: 'onTouched'`, field-linked errors and accessible focus on invalid submit. Use `useFieldArray` for tags/guidance; stable UI row keys, preserve the domain tag ID separately.
- `defaultValues` are per *editing entity*; a newer Query response must **not** blindly become reactive `values` that erases unsaved edits. On explicit user acceptance of a newer saved revision, use controlled `reset`. On successful save advance the saved baseline (e.g. RHF `resetDefaultValues` if installed version supports it) while retaining any edits made after submit; no silent draft overwrite.
- Keep `expectedRevision`, frozen submit body, local dirty/touched fields, pending/conflict and server revision separate. Type server error shape and represent all validation/conflict outcomes. Navigation warnings cover hard unload and known in-app navigation, never hack router internals.
- No autosave, local private draft persistence or new form visual design without a separate product decision.

### Module boundaries

- `app/(authenticated)/`: route/resource and server-only auth/data prefetch, loading/error/not-found, route-group provider.
- `src/features/<feature>/api`: typed browser endpoints/query and mutation options; `model`: state machines, pure selectors and IDs; `ui`: view components and forms. This is the **preferred folder pattern for migrated features**, not a forced layer for every trivial file.
- `src/shared/api`: small pure HTTP/error parsing and Query key helpers; `src/shared/ui`: only genuinely reusable semantic control primitives; `src/server`: server-only Nest reader and request context. Do not invent a new shared monorepo package for a single importer.
- Pure components receive props derived from Query/React local form state. One feature container coordinates resource/commands; children never write canonical Query story directly. A large cohesive file can remain large; an extracted module must have a distinct reason-to-change and narrow test.
- Import direction: feature UI -> feature model/API + shared; server modules never imported by client; domain/backend packages never into web client. No cross-feature import for constants. Prefer `import type` where possible; preserve strict optional and unchecked indexed flags.
- Keep existing visual markup/classes except necessary semantic/focus/error corrections; no broad Tailwind/shadcn/Radix adoption during this engineering campaign.

### React and user-state mechanics

- Follow React 19 rules of hooks and effects, stable list keys, no derived state in Effects, intentional keyed remounts by *entity* rather than settings revision, correct cleanup/Strict Mode. No heavy `useMemo`/`useCallback`/`memo` unless identity or profiling shows reason.
- Accessibility is engineering acceptance: usable native labels/fields, keyboard operations, aria-live for genuine state transitions (not every 2s poll), focus restoration after error, valid dialogs/status semantics, adequate target/screen-reader operation, reduced motion when applicable. Use Playwright + axe and human keyboard review; don't claim WCAG from a static linter.
- Error paths: App Router `loading/error/not-found` for expected scope; Query `QueryErrorResetBoundary` and React Suspense only where controlled and tested. Preserve authentication/forbidden/transient distinction and never render another user's cached content on browser back.

## 6. Security, diagnostics, performance and proof

### Authentication/developer policy

- Nest + Better Auth session is authority. Next route groups authenticate at server boundary, but every endpoint reauthorizes access. Cookie sessions `HttpOnly/SameSite` under one origin, CSRF protections at Nest, explicit proxy trust and no session token in localStorage/query key/logs. Private Next reads use `cache: 'no-store'`, no shared RSC/HTTP/proxy caching and authenticated `Cache-Control: private, no-store` where appropriate. Verify all layers in a production-like build, not only source.
- **Chamber is developer-only**: disable developer/QA endpoints by default in hosted deployments; enable only through explicit backend config and an authenticated **Better Auth user-ID allowlist** (e.g. `DEVELOPER_USER_IDS`), with no unauthenticated local-development bypass. An ordinary authenticated account must not reach inspection/dispatch controls. The UI route is also gated, but **backend denies first**. This is a chosen security policy, not an optional question for Cursor.
- QueryClient is scoped to the authenticated browser session and clears on logout/account switch. Use full navigation to flush Next Router Cache; send cross-tab logout signal via `BroadcastChannel` and force revalidation on visibility/return. Private Query cache is memory-only; QA run ID is an untrusted viewer-scoped hint, never a credential. Tests include anonymous, owner, another owner and developer role.

### Quality proof

- Vitest + RTL/user-event + MSW for deterministic pure/React/HTTP failures and controlled race interleavings. Preserve existing real Nest/DB/Playwright suites; tests that reset `offscreen_auth_test` require explicit safe setup. Use Playwright/axe-core for keyboard, focus, route recovery and browser privacy. Storybook state stories are **deterministic and provider-free**, for human review of the new architecture's representative states.
- ESLint: React Hooks/exhaustive deps, Next recommended rules, TanStack Query's plugin, import boundaries, type hygiene; fix existing debt within scoped Changes, don't globally disable useful checks.
- Profiler and bundle/request waterfall metrics precede performance claims. Avoid blanket caching/virtualization. Record baseline, improvement/unchanged cost, environment, negative cases and limits. Log only safe route category, operation correlation, state/version and error taxonomy, not user story text/PII or raw secrets.
- Existing GitHub Actions are retained. Add cheap provider-free web tests/lint/build to current pipeline; no separate paid runner, destructive DB operations or automatic provider-backed end-to-end testing.

## 7. Required F1–F15 acceptance contract

The anchors deliberately preserve historical audit/Change references. Each is a concrete gate, not a qualitative grade.

### F1. Server/client rendering boundary
Private routes render real authorized HTML before hydration using server prefetch + `HydrationBoundary`, public routes stay server/static, provider is scoped, and no duplicate fetch occurs on initial mount. Production route bundle/client graph and RSC/soft-navigation pass.

### F2. Authentication, privacy and API ownership
Nest reauthorizes every resource; private SSR/RSC/Query caches are viewer-isolated and no-store at required layers; logout/back/other-owner cannot surface prior content; developer endpoints reject ordinary users. Browser+proxy negative tests.

### F3. Identity and state ownership
URL/resource viewer key, TanStack Query remote state, RHF unsaved edits, intent state and local view controls each have one owner and explicit lifetime. A->B before B loads and after late A response never misattributes data.

### F4. Versioned snapshot reconciliation
Snapshot Query accepts only same viewer/story and monotonic `viewVersion`/`resolution.version`; equal-version updates respect request-epoch tie rule; all hydration, GET, mutation receipts and SSE paths use it. Reversed-order tests required.

### F5. One recoverable mutation model
Each distinct intent creates one immutable envelope; `useMutation` does not auto retry or auto resume; admitted 202 vs published truth is explicit; typed receipt GET and session-scoped recovery survive reload without duplicate effects. Lost-ACK and changed-body retry tests.

### F6. Revalidation and live-update strategy
SSE invalidates Query and GET establishes truth; visible/hidden/reconnect/fallback/timer lifetimes bounded, no request storm, missed-event resync. Neither SSE nor polling dispatches game mutations.

### F7. Screen and component responsibility
Feature/local model/api/ui boundaries are cohesive and testable, pure selectors separated, limited sharing; no hidden second story state, arbitrary file splintering or browser import of server code.

### F8. Creation/forms and editing consistency
RHF/Zod form errors and dirty data, expected revision conflict and frozen submit, intentional reset; preview/Start use immutable intent; late replies do not erase newer local edits. Two-tab, reload and 409 tests.

### F9. Accessible, resilient interaction
Keyboard/focus/status across normal, loading, empty, conflict, 401/404/503, pending, blocked, uncertain and recovered; meaningful route boundaries, Playwright+axe+human check; preserve appearance.

### F10. Evidence and maintainability
Web-local unit/component/API tests, real provider-free integration, CI type/lint/build, Storybook state stories and honest before/after evidence; negative/reversed-order tests, no fabricated pass/production claim.

### F11. Typed network contract and error discipline
Explicit Zod inputs/outputs and domain error union; no `Response` or `body: unknown` leaks past transport adapters; 200/202/400/401/404/409/429/5xx and malformed body handled individually; no unsafe auto mutation retry.

### F12. List, history and navigation consistency
`useInfiniteQuery` with typed viewer-scoped key/cursor/nextPage, append/dedupe/order, race isolation, correct back/forward and manual refresh; no stale/duplicate/cross-user pages.

### F13. Developer-only Chamber/QA isolation
Chamber is restricted at Nest and Next by developer policy, not CSS; Query/QA run references viewer-partitioned, shared safe snapshot policy but no privileged player-state leak. Owner/other/developer tests.

### F14. Type, module and dependency hygiene
Strict TS, React/Next/TanStack hooks lint, server-only and import direction checks, compatibility-locked dependencies and no accidental server/backend code in client chunks. Deliberately bad import fails.

### F15. Performance, diagnostics and delivery fitness
Measure initial HTML, client JS, hydration, request waterfalls, polling/SSE traffic and rerender hotspots; safe diagnostics and production-like no-store/proxy proof; representative workbench state stories; no unmeasured “fast” claim.

## 8. Alternatives rejected, no open architect-level menu

- **SWR, custom fetch + useEffect, global React context cache, Redux/Zustand:** rejected as the remote-data architecture; **TanStack Query v5 is the approved selection**.
- **Form-only useState or another form library for major editors:** replaced by RHF + Zod resolver. Simple one-button controls still use plain React state.
- **Query mutations as full business machine, generic `send(anything)`, optimistic gameplay outcomes:** rejected; explicit protocol and idempotency controls are mandatory.
- **Client-only Next rewrite, global server QueryClient, public/private shared cache, persisting all Query results:** rejected.
- **WebSockets/new broker for one-way invalidation:** rejected; SSE + PostgreSQL hints + authoritative GET selected.
- **Experimental Query SSR integration:** rejected; stable request-scoped `prefetchQuery`/`dehydrate`/`HydrationBoundary` selected.
- **Native CSS framework/theme swap or gameplay redesign:** not part of this campaign, regardless of their potential future merits.
- **No tests until after refactor:** rejected; test foundation comes first.
- **“No change if source proves safe”** remains a legitimate execution outcome for an individual packet. That is not an undecided architecture.

## 9. Convergence, status and handoff

The [Nov 12 audit](../audits/react-next-gap-2026-11-12.md) records the unchanged code baseline; [Change queue](../../changes/README.md) governs the ordered implementation program and newly added stack-specific packets. The November 11/early-November-12 cautious proposal is **superseded as an architecture recommendation**, not deleted as historical evidence.

**Owner direction resolved:** adopt TanStack Query, professional support stack, end-to-end quality and correctness rather than optimizing for smallest source diff or minimal dependency count. **The architect has chosen the remaining decisions above.** This contract is **selected for implementation planning**, but no Change is active and no code execution is authorized by today's Markdown pass. Cursor follows only the selected, authorized Change packet, not the whole area program in one uncontrolled diff.

**Exit rule:** for each F1–F15, attach an actual revision-specific evidence receipt (demonstrated / accepted design-only / deliberately out-of-scope); an installed library, a green mock, a Storybook screenshot or a completed folder is not proof of engineering quality.

## 10. Professional references

Repository manuals actually applied: [frontend state and async](../../../.agents/knowledge/frontend-state-and-async.md), [architecture decision space](../../../.agents/knowledge/architecture-decision-space.md), [API/network](../../../.agents/knowledge/api-and-network-contracts.md), [security/trust](../../../.agents/knowledge/security-and-trust.md), [testing evidence](../../../.agents/knowledge/testing-and-quality-evidence.md), [caching/performance](../../../.agents/knowledge/caching-and-performance.md), [observability](../../../.agents/knowledge/observability-and-production-diagnostics.md), [release delivery](../../../.agents/knowledge/release-and-delivery-engineering.md). The [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md), [independent design review](../../../.agents/skills/independent-design-review/SKILL.md) and [target-first rule](../../../.agents/rules/target-driven-renewal.md) govern how Changes are challenged and implemented.

Official guidance: [TanStack Query advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr), [Query important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [Query mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations), [Query infinite lists](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries), [React Hook Form useForm](https://react-hook-form.com/docs/useform), [RHF reset](https://react-hook-form.com/docs/useform/reset), [Next Server/Client](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next data security](https://nextjs.org/docs/app/guides/data-security), [React Effects](https://react.dev/learn/you-might-not-need-an-effect), [Playwright](https://playwright.dev/docs/best-practices), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). Framework behavior is version-specific: implementation must verify the installed Next 16 configuration and actual build before asserting runtime success.
