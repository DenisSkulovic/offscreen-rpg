# React / Next.js engineering target | architecture contract

**Status:** Revised proposal for owner review, 2026-11-12. **Owner:** repository owner. **Scope:** `apps/web`, its browser/server API consumption, directly supporting shared contracts and frontend-specific quality gates. **Authority:** an engineering end-state proposal, not a source audit, gameplay requirement, aesthetic design, or permission to implement. Existing F1–F10 anchors are preserved; F11–F15 extend the contract.

**Mission:** make Offscreen RPG an exceptionally understandable, reliable, maintainable React 19 / Next.js 16 App Router portfolio. The interface's present appearance and player experience are not the design reference. Nest remains the authoritative backend. No gameplay expansion, visual redesign, live-provider spending, message broker, database migration, or wholesale framework adoption is authorized by this proposal.

**Related authority:** [client/identity](../../technical/client-and-identity.md), [story lifecycle](../../technical/story-lifecycle.md), [execution](../../technical/execution.md), [code quality](../code-quality.md), and [target-first rule](../../../.agents/rules/target-driven-renewal.md). These own gameplay and backend promises; a frontend refactor must preserve them. The older technical document's suggested Tailwind/shadcn/TanStack Query toolkit is a *candidate*, not evidence that installing it improves this project. Any normative conflict must be resolved before implementation.

## 1. Architecture thesis, defined without reference to current source

**Default recommendation: server-first route composition + feature-scoped browser controllers + a minimal typed transport boundary + shared pure policies.** This is a chosen *proposed destination*, not a demand for particular filenames or design patterns.

```text
Browser navigation (route ID + authenticated viewer)
     |
     v
Next App Router: server page/layout, request-bound session check
     |  - private Nest reads, explicit no-store
     |  - validate serialized public projections
     |  - choose redirect / not-found / recoverable failure
     v
Server-rendered page + narrow Client interactive islands
     |
     +-- read-only presentation (immutable snapshot/derived view)
     +-- feature controller (resource identity, view reconciliation, refresh)
     +-- typed command lifecycle (captured intent ID + frozen payload)
     +-- local form/draft state (unsaved data, revision, conflict resolution)
     +-- paged readers (query/filter/cursor identity)
     |
     v
Same-origin browser HTTP -> Nest API (authentication, authorization,
                               admission, idempotency, receipts)
                                -> application/database/worker (authority)

Developer Chamber: distinct client surface; reuse only safe pure/transport
semantics, never inherit a player's hidden state or privilege.
```

Responsibilities are **logical**. A new module must isolate a different change/failure/identity lifetime and earn its maintenance cost. Do not turn the sketch into a framework or create a provider wrapping every component.

### State ownership inventory (normative design)

| State | Authority | Scope and lifetime | Reader/writer/invalidator |
| --- | --- | --- | --- |
| Selected story/draft, route params | URL + server authorization | Navigation identity | Next route; change means isolate/reset former resource |
| Viewer and session | Nest/Better Auth | Authenticated principal and session epoch | Server check; full navigation/partition on logout, account switch or expiry |
| Published story | Nest public projection | (viewer scope, story ID, viewVersion, resolution version when valid) | One story controller accepts only eligible snapshots; no client mechanics |
| Command intent | User action + Nest admission | (viewer, resource, command kind, operation ID, immutable payload); until known outcome/reconciliation | Typed use-case controller; never derive a second intent from rerender |
| Ongoing background work | Nest snapshot/receipt | Resource/operation identity, server-reported state | Read/refresh; browser timers are not authority |
| Saved form | Nest revision | Draft/settings/preset identity | Validated read/write with conflict handling |
| Unsaved form and local navigation | Browser user | Specific entity and edit session | Feature form controller; never overwritten by unrelated refresh |
| List, history, filters and cursor | Server records, browser view | Viewer + query + page/session watermark | Explicit page reader and reset on key change |
| QA inspector/workspace | Authorized developer API, local ephemeral controls | Viewer + selected run/scenario | Separate Chamber owner; persisted browser hints cannot authenticate |

**Resource safety is not one comparator.** It requires matching render identity *before B has loaded*, guarding late callbacks, resetting local edits deliberately, partitioning session-private caches, and then comparing authoritative versions for the *same* resource.

## 2. Required engineering qualities and falsifiable acceptance

### F1. Server/client rendering boundary

- Public informational routes remain server/static where possible. Private routes authenticate, authorize via Nest and produce meaningful HTML on first navigation. Client Components own actual interaction only; server-only readers never enter client import graphs.
- Pass only deliberately public, serializable projections to client islands. Interactive UI starts from the supplied initial data; do not reflexively fetch the same initial record on mount.
- Choose streaming/Suspense boundaries around *independently useful* async regions, not arbitrary spinners. Decide each route's rendering and prefetch policy explicitly, including cached RSC/router payloads.
- **Proof:** production build/client graph, initial HTML without JS, client navigation, hydration comparison and measured request count on representative private/public routes.

### F2. Authentication, privacy and Next/Nest authority

- Nest/Better Auth own session validation, object/property authorization and every meaningful state transition. Next is a reader/composer, not a second game engine or independently privileged command API.
- Private SSR requests propagate only the required session credentials from the incoming request through a server-only, bounded, validated reader. No browser-accessible secret, arbitrary forwarded headers, open redirect or cross-user shared cache.
- Distinguish 401 (reauthentication), intentionally hidden 404 (absent or forbidden object), 400/409 (input/conflict), 429 (limits) and 5xx/timeouts (transient service problem). Never explain another owner's object existence.
- Document same-origin routing in development and deployment. Treat Next Data Cache, per-request memoization, client Router Cache, browser cache, proxy cache and browser storage as separate layers; `cache: 'no-store'` on one fetch does not certify them all.
- On session expiry, logout, switch-user, back/forward and cross-tab transitions, private stale content must not become visible or resubmitted automatically. Protect CSRF at the actual authenticated mutation boundary.
- **Proof:** three-principal (anonymous, owner, other user) HTML/RSC/API/soft-navigation matrix, cache headers and page history; no private content crosses identity.

### F3. Resource identity, React state and lifecycle

- Every lasting client controller declares its entity/viewer key, initialization, reset and disposal policy. Use a deliberate keyed boundary when all descendant state should reset; use guarded state machines when specific edits must persist.
- Derive display-only values during render. Effects synchronize with subscriptions/timers/external systems, with correct cleanup and exhaustive dependencies; never fire paid/irreversible user commands from mount effects.
- Ref-backed in-flight data may retain a transport reference, but anything governing render/disabled/retry visibility must participate in React state or a correct external-store subscription. Do not rely on incidental component remounts for isolation.
- **Proof:** A displayed -> navigation to B while B pending -> B arrives -> delayed A arrives; A never appears under B at any intermediate point. Strict Mode setup/cleanup/setup leaves one valid subscription.

### F4. Resource-safe monotonic snapshot reconciliation

- Parse all remote snapshots; reject identity mismatch before version comparison. For the same authorized resource, order by server `viewVersion`, with an explicit, contract-backed same-version policy (including resolution version and representation equality/invalid tie cases).
- All accepted updates (SSR initial, command receipt projection, manual refresh, timer, future live hint, router refresh) must enter the same reconciliation owner. No independent child may replace canonical display state.
- Keep the latest valid resource snapshot when a slower earlier read returns. Unknown/invalid versions or protocol violations are reported as errors, not silently invented recency.
- **Proof:** same story v14 before v13; equal viewVersion resolution ordering; wrong story with artificially higher version; user A -> B; all obey identity and monotonic rules.

### F5. Explicit, recoverable command lifecycle

- Separate **distinct user intent** from repeated HTTP attempt. Capture operation ID, exact endpoint, command kind, expected revision, and immutable payload *once* at admission. A retry of uncertain submission must reuse the same identity **and payload**, or only reconcile by reading.
- Model transport (`idle/submitting/uncertain/conflict/failed`) independently from server business state (`admitted/running/blocked/published`). In particular HTTP 202 does not mean the scene finished; 200 means only what that endpoint promises.
- Honor each command's real semantics: choice/resolution, campaign actions and controls, settings, generation, Start and draft editing are **not** interchangeable. Share only retry/timeout/status primitives proven common; user-facing recovery and admission differ.
- Block or reconcile conflicting new intent while completion is unknown. Cancellation/unmount does not undo a server commit. Do not automatically repeat a provider request after 5xx, timeout, reload or session expiry.
- **Recovery across reload:** state what the server can actually prove. For operations with a durable URL/operation reference, recover from that resource first. If the API does not expose enough identity/receipt information, show a safe blocked/reconciliation path; do **not** promise guaranteed same-key replay after reload without extending an independently approved server contract.
- **Proof:** commit-before-timeout; rapid duplicate click; failed read after 409; changed form values before same-ID retry; reload; one backend effect and truthful UI, with no new paid operation.

### F6. Invalidation, refresh, and background work

- Each resource has one refresh coordinator: explicit refresh triggers, visibility/focus/reconnect policy, bounded cadence and backoff, timeout and abort/ignore on identity change. Avoid multiple competing timers and stale closures.
- Refresh is a GET/authorized projection read, never a gameplay mutation. Hidden tabs may suspend active polling; visible return must force an authorized resync. A failed refresh cannot indefinitely display “fresh” or silently spin.
- Event-driven update transport (SSE) is *not* part of this renewal. If later justified, it emits invalidation hints which call the same authoritative snapshot reader; no duplicate client store or inferred event log.
- **Proof:** hide/show, offline/reconnect, repeated 503, A->B during timer, Strict Mode; bounded requests, correct cleanup, no model spend.

### F7. Feature architecture, component/hook responsibilities

- `app/` owns route identity, authentication boundary, data composition, boundary-specific errors/loading/not-found. `src/features/{play,stories,session,developer-tools}` own feature behavior and presentation. Very small `src/lib` owns genuinely shared transport/identity helpers; domain authority lives outside web.
- Put pure transformations/formatting/validators outside interactive rendering where independently useful. Containers/controllers orchestrate async behavior, components display explicit props, forms own local edits. Shared primitives need an identical invariant across **at least two credible consumers**.
- Prefer semantic cohesion to line-count goals. Do not distribute the same state across five hooks, create a universal hook factory, import a Client component to obtain a constant, or blur developer telemetry with player view.
- Dependency direction and server/client import boundaries must be enforceable through tests/static checks, not only prose.
- **Proof:** an engineer traces one action, retry, refresh, form edit and receipt through bounded ownership points; independent tests need not render all 649 lines for a pure decision.

### F8. Forms, draft editing and creation lifecycle

- Local editable values, last saved revision, dirty state, submission snapshot and server conflict are separate. Freeze values/revision for a save attempt; late replies cannot erase newer edits; intentional discard/reload must be user-consented.
- Draft, Storyteller settings, preset and generation/start each get semantics appropriate to their backend. Editable settings must not remount and lose unsaved data solely because a background revision incremented. Validation uses shared runtime contracts plus accessible field errors; client validation never grants authority.
- Navigation and refresh policy must cover ordinary links, soft navigation, browser back, session change, cross-tab stale revision and reload. A form library is optional only if it genuinely simplifies this.
- Generation and Start are operation workflows, not ordinary form submits; protect their immutable request envelope and recoverable identity.
- **Proof:** save races, two-tab 409, newer typing versus delayed save, route switch and unsaved values, uncertain Start followed by changed pace; no silent overwrite or duplicated effect.

### F9. Accessible, resilient interaction mechanics

- Preserve semantic native controls, labels, status announcements, keyboard and focus behavior through loading, blocked, accepted, error and recovery states. Busy/disabled semantics reflect real ability to act; no endless unacknowledged spinner.
- Provide route-level errors/loading/not-found where genuinely helpful; expected domain validation/conflict is not an uncaught framework exception. Preserve scene readability with long content and on narrow viewports; this is **engineering acceptance**, not a request to redesign typography, layouts, art or product UX.
- Honor reduced motion where motion is used; no excessive live-region announcements for periodic polls. Use accessible roles/selectors in browser tests, supported by human review for meaningful flows.
- **Proof:** keyboard-only create -> preview -> play/recover and representative interruption; focus, status, disabled controls and route recovery with live evidence.

### F10. Testing strategy and truthfulness of evidence

- Layer tests by claim: pure state machines/version selectors; React component visibility/lifetime; HTTP schema and status contracts; Next SSR/auth/private caching; selected provider-free browser journeys with a real Nest/DB boundary. Retain existing integrated Playwright rather than replacing it with mocks.
- Deliberately control race order and fault position; avoid time-based sleeps for concurrency proofs. Tests must reject plausible wrong implementations and distinguish server admission from publication.
- Local `typecheck`, lint, formatting, isolated tests, builds and relevant browser tests have documented commands and side effects. No “CI green” inferred from source or a historical run.
- **Proof:** at least one deterministic adversarial case per high-risk state boundary plus a connected trace for privacy/command authority. No model-provider calls by default.

### F11. Typed network contract and error discipline

- HTTP adapters are narrow, owned by server or client runtime, with precise endpoint request/response schemas, explicit timeout/abort policy and safe handling for non-JSON, malformed JSON, protocol mismatch, 401/404/409/429/5xx.
- Data `unknown` is permitted at the network edge; feature logic receives validated, use-case-specific values, not unstructured `Response` or `body: unknown` without an admission contract. Preserve machine-readable Nest error codes/reasons where supported.
- Browser and server adapters share **pure response/error taxonomy** if beneficial, but never accidentally share server cookies/origin/secrets or automatic mutation retry.
- **Proof:** contract fixtures for malformed body, wrong shape, timeout, 409 and 401; no generic “Unavailable” branch claims an authoritative failure or hides recovery information.

### F12. List, history, and navigation consistency

- List/history readers define query identity, cursor interpretation (replace page vs append list), stable ordering, de-duplication, retry, empty/exhausted states and permission invalidation. No stale page from another viewer/resource or older filter appears under a new key.
- Navigation through `Link`, hard reload, browser back/forward, RSC prefetch and client router refresh must not corrupt resource state or bypass unsaved-edit policy. Cursor/URL values are validated and encoded.
- **Proof:** append/replace under documented intended UX, delayed page N after filter/user/story switch, duplicate/empty page, expired session and returning through browser history.

### F13. Developer-only Chamber/QA isolation

- Chamber exercises authorized scenarios and reads only public or deliberately restricted inspector projections. UI isolation does not grant permission: enforce developer access in Nest or explicitly define trusted-local-only deployment when applicable.
- Share pure story versioning/transport policies with Play where identical; keep QA-run persistence and inspector-specific state separate. Partition persistent browser hints by viewer and do not mistake localStorage run ID for authorization.
- **Proof:** regular/unauthorized user cannot obtain privileged inspector data from API or RSC; Chamber remount/identity switch does not reveal prior viewer's data or corrupt Play.

### F14. Type, module and dependency hygiene

- TypeScript `strict`, exact optionals and unchecked-index guards remain; runtime parsing at boundaries; no unreviewed casts, `any` escape hatches, silent impossible states or source modules imported for unrelated constants.
- Enforce important import directions (`server-only`, client-safe shared modules, feature cross-import limits) with narrowly useful tooling. Explicitly review build-time dependencies and serialized client module graph; avoid blanket “everything shared” packages.
- Add libraries only through documented need, alternatives and effect on bundle, behavior and agent navigation. Avoid React compiler/context/global store and premature virtualization absent evidence.
- **Proof:** negative static test or intentional bad import is rejected; production build and typecheck complete after migration.

### F15. Performance, diagnostics, and delivery fitness

- Establish repeatable baselines before optimization: first authenticated HTML utility, JS/route chunk size, hydration warnings, route/request waterfalls, refresh rate, component render hotspots and main user-perceived latencies. Only then select and justify budgets/optimizations.
- Capture safe structured diagnostics around route read, snapshot eligibility, command ID/status and refresh failures without session cookies, provider prompts, private story text or raw personal data. Do not build an observability platform for a portfolio checkbox.
- Verify representative hosting/proxy routing and authenticated response cache semantics rather than assuming local rewrite applies to deployment. CI already existing is an asset; integrate cheap, provider-free checks without multiplying paid infrastructure.
- **Proof:** measured pre/post workload or explicitly “unmeasured”; reproducible local build/trace and deployment-mode smoke test, no confidential telemetry.

## 3. Representative acceptance scenarios

| Scenario | Broken implementation that must fail | Owning criteria |
| --- | --- | --- |
| A -> B while A is in-flight, B not yet loaded | Old A shown under B or late A wins | F3 F4 F12 |
| v14 then delayed v13; equal view version but changed resolution | View regresses / tie policy arbitrary | F4 F10 |
| Server committed an action; HTTP acknowledgement lost | Second charge/roll or false “failed” claim | F5 F11 |
| Start ID reused while pace/lock settings were edited | Retry sends a different body under the same identity | F5 F8 |
| Logout/user switch with cached private RSC or browser back | Old viewer's story content becomes visible | F1 F2 |
| Two editors save same draft revision | Later save silently overwrites data | F8 F11 |
| Network outage during hidden-tab refresh | Spinner/storm/stale timer or provider request | F6 F9 |
| Unauthorized Chamber inspector request | Secret internals exposed because UI is “developer-only” | F2 F13 |
| Incorrect server-only import in Client module | Build silently bundles a privileged dependency | F1 F14 |
| “Faster after refactor” claim | No recorded comparable measurement | F10 F15 |

## 4. Consequential alternatives and revisiting criteria

| Option | Decision for the proposed target | Revisit when |
| --- | --- | --- |
| Next Server Components + feature client islands | **Prefer**. Preserves SSR/private loading and limited hydration | Meaningful private SSR proves unsuitable for an actual hosting/security constraint |
| Feature-local typed read controllers | **Prefer initially**. One or a few data consumers per resource, explicit invalidation | Repeated cross-route cached reads, fan-out and invalidation demonstrate costly duplication |
| TanStack Query for reads, separate command FSM | **Credible alternative; defer**, not “never”. Avoid a second cache before measured need | A specific multi-consumer read lifecycle becomes simpler and its session cache policy is proven |
| Redux/Zustand/global mutable entity store | **Reject by default**; creates invalidation/identity obligations | Multiple independent actors truly need coordinated client state that scoped controllers cannot handle |
| Generic `send(anything)` API/mutation hook | **Reject**; conflates 200/202, command fingerprints and domain recovery | Multiple endpoints demonstrably share identical state/side effects |
| Route Server Actions for existing Nest commands | **Do not mandate**; Nest remains canonical, same-origin browser HTTP suffices | A verified security/latency problem justifies a narrow BFF action without duplicating authority |
| Persist all pending mutations in localStorage | **Reject blanket storage**; session/privacy, stale identity and replay problems | A narrow non-secret operation reference is necessary, versioned and safely reconciled with Nest |
| Immediate SSE/WebSocket rollout | **Defer**. HTTP refresh meets the stated current need | Measured latency/poll cost and a designed auth/reconnect/proxy contract justify it |
| Split every long component / adopt Tailwind/shadcn | **Reject as default**; visual redesign is separate, decomposition must improve ownership | Coherent use-case/test responsibility proves extracting one module pays |
| No refactor, add only tests | **Valid option zero**, but insufficient where a safety/ownership invariant is demonstrably missing | Tests show the supposed gap already impossible and design remains simple |

The strongest competitor is **TanStack Query for read state combined with explicit command controllers**. It may ultimately be better if list/history/preview/chamber reads multiply and cache invalidation becomes complex. Its key, privacy partitioning, hydration and freshness contract must precede adoption. This is an evidence-driven decision, not a rejection of a good library.

## 5. Implementation governance and approval

- Target criteria are **Proposed** for owner review. They establish a coherent destination for proposed design/audit documents, **not an already approved implementation**. Resolve any mismatch with the technical contracts and record approval or revision explicitly.
- [November 12 source audit](../audits/react-next-gap-2026-11-12.md) is a separate, later-stage comparison. Code is a baseline and feasibility constraint, never a reason to lower standards. Historical [November 11 audit](../audits/react-next-gap-2026-11-11.md) remains useful provenance.
- Each prospective `docs/changes/*/CHANGE.md` is a *future code-bearing outcome* with a direct criterion → source finding → acceptance link. Proposed packets are not an active Cursor queue. `docs/changes/README.md` must retain `Current change: none` until the owner explicitly selects and authorizes one.
- Convergence requires a revision-specific criterion/evidence table (demonstrated, intentionally deferred, accepted design-only, or unproved), not seven folders being closed or a polished screenshot. Baselines and focused proofs precede performance boasts.
- No provider calls, persistent database reset, deployment, application source edit, or UX/gameplay redesign is authorized by this Markdown architecture exercise.

## 6. Professional reasoning and references

This target uses the repo's [frontend state manual](../../../.agents/knowledge/frontend-state-and-async.md), [architecture alternatives](../../../.agents/knowledge/architecture-decision-space.md), [API semantics](../../../.agents/knowledge/api-and-network-contracts.md), [security and trust](../../../.agents/knowledge/security-and-trust.md), [testing evidence](../../../.agents/knowledge/testing-and-quality-evidence.md), [caching](../../../.agents/knowledge/caching-and-performance.md), [observability](../../../.agents/knowledge/observability-and-production-diagnostics.md) and [release design](../../../.agents/knowledge/release-and-delivery-engineering.md). Relevant first-party framework authorities: [React Effects / derived state](https://react.dev/learn/you-might-not-need-an-effect), [React state reset by key](https://react.dev/learn/preserving-and-resetting-state), [Next Server/Client boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next private caching/route policy](https://nextjs.org/docs/app/guides/caching-without-cache-components), [Next errors](https://nextjs.org/docs/app/api-reference/file-conventions/error), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/), and [Playwright best practices](https://playwright.dev/docs/best-practices).

The manuals inform trade-offs, not permission to add their entire technology menus. A future design challenger should attack the concrete scenarios and strongest alternative rather than merely praise the target.
