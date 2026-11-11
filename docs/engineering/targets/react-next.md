# React / Next.js engineering target

**State:** Proposed architectural end state for owner review, November 11, 2026. **Area:** `apps/web` and its consumer-facing API boundaries. **Purpose:** high-quality, defensible full-stack engineering portfolio, while preserving existing game semantics. This is the **destination, deliberately defined independently of source problems**. The [gap audit](../audits/react-next-gap-2026-11-11.md) is a separate document, compiled **after** this target. No implementation permission is implied.

**Authoritative behavioral contracts:** [client/identity and updates](../../technical/client-and-identity.md), [player experience](../../player-experience.md), [story lifecycle](../../technical/story-lifecycle.md), [execution/failure semantics](../../technical/execution.md). Target choices below refine engineering organization; if they differ from a permanent technical owner, resolve the contradiction with the owner **before implementation**. A later visual/art-direction target is a separate deliverable.

## Thesis and design intent

Use the **existing Next.js 16 App Router + React 19 stack exceptionally well**. The result should be understandable to a strong React/Next engineer without knowing Offscreen RPG: server-render the appropriate private/public content, hydrate only where interaction benefits, keep a single server authority, handle async uncertainty as a first-class state, and make common UI behavior independently testable. The code should show explicit responsibility boundaries, not a maze of wrappers or a fashionable state-management library.

**Design constraints:** NestJS owns authentication, authorization and game commands; PostgreSQL/Temporal remain behind it. No game mechanics, paid AI inference, migration, gameplay feature invention or new message broker is required. A portfolio-grade local system need not masquerade as a globally scaled production SaaS.

## End-state architectural contract

```text
                    Browser navigation
                           |
           Next.js route / Server Components
           - route/auth/session boundary
           - authenticated, uncached Nest read
           - schema-validated initial projection
                           |
                 Scoped interactive islands
         +-----------------+--------------------+
         |                 |                    |
   Immutable story   Local editor/form      Developer Chamber
   snapshot view     draft state            (separate surface)
         |
   UI snapshot owner <--- versioned read / polling / future SSE hints
         |
   Command controller ---> typed browser transport ---> Nest API
     (one intent/key,           (same-origin HTTP)    (authority, receipts)
      pending/uncertain,
      no duplicate effect)
```

These are **logical ownership boundaries**, not mandatory filenames or packages. Extract modules only if they separate change, state, lifecycle, security or test concerns that actually differ.

### F1. Server/client rendering boundary

- Public explanatory pages render as Server Components or static content; private route pages authenticate and fetch their initial data on the server. Browser-only interactivity lives in focused Client Components.
- No broad `'use client'` boundary around an entire route merely for convenience. No accidental inclusion of server-only configuration, credentials or domain backends in a client import graph.
- Make initial private view useful and structurally correct before hydration. The interactive client uses that server-supplied snapshot without an unnecessary duplicate fetch on mount.
- **Proof:** inspect a production build's route/client graph; an initial authorized page produces meaningful HTML, while JavaScript enables controls rather than reconstructing the primary data.

### F2. Authentication, privacy and API ownership

- Next is presentation/BFF read composition only; **Nest remains the only decision and data authority**. The server-only API boundary propagates the existing authenticated session securely and validates all returned runtime contracts.
- Uncached/private fetching is explicit for user/story/draft data; no cross-user shared cache or unintended browser retention. Authentication and story authorization failures have distinct appropriate outcomes (sign-in, forbidden/unknown, transient failure), without leaking another user's existence.
- A stable, typed server reader centralizes repeated transport/error/timeout **semantics**, without introducing a general-purpose API framework or proxying secrets to the browser.
- **Negative proof:** switch users or story ownership; previous private content never appears in another viewer's rendered HTML, client cache or browser history state.

### F3. Identity and state ownership

- Classify state by authority, identity, lifetime and invalidation: URL-selected resource, authenticated viewer, server snapshot (story ID + visible version), admitted command identity, unsaved form, local view controls and developer-only inspector.
- Exactly one coherent client owner decides which **authoritative story snapshot** is displayed; children receive derived presentation props and callbacks. Local UI state is not a competing canonical store.
- Changing story/draft/viewer identity clears or isolates in-flight work, error messages, history pages and unsaved private state **appropriately**; stale A data must never render under B. Reset local state deliberately by identity, not incidental remount.
- Derive values during render; Effects synchronize with external systems only. Avoid invisible refs that must influence visible controls without a state transition.

### F4. Versioned snapshot reconciliation

- An incoming snapshot belongs to a known resource identity and is parsed against a shared contract; same-resource snapshots are reconciled monotonically by the authoritative visible version, with correct tie-breaking when resolution changes inside the same view version.
- Version ordering cannot hide resource switches or cross-user contamination; refresh, command response, session change and future live invalidation all go through the **same reconciliation path**.
- **Negative proof:** v14 arrives before late v13; v14 remains shown. Change story A→B while A's request is pending; A never overwrites B even before B completes.

### F5. One recoverable mutation model

- Each distinct user intent creates **one stable, recorded idempotency identity** and a captured immutable payload; uncertain transport outcomes retain that identity until reconciliation. Retrying means safely retrying the *same* intent, not creating a new command or charging another provider call.
- Local command states are explicit, e.g. `idle → submitting → accepted/pending | conflict | uncertain → reconciled`. A server receipt is not a completed gameplay outcome. UI controls reflect the confirmed/admitted state, not optimistic fiction.
- New user intent after an uncertain command is blocked or explicitly reconciled according to the actual API contract. Conflict 409 triggers an authorized refetch; 401/403 require session/permission handling, 400 is actionable validation, network timeout is **unknown completion**, not proof of failure.
- Shared primitives may be used across choices, pause/resume, settings and draft submission **only where their contracts genuinely coincide**. Different command semantics must not be flattened into a generic `send(anything)` abstraction.
- **Negative proof:** timeout after server commit, double-click, stale revision, reload and explicit retry create at most one server effect; UI never falsely claims success or loses the recoverable request.

### F6. Revalidation and live-update strategy

- **Baseline:** bounded, abortable read-only refresh/polling for unresolved work, visible and background tab transitions handled intentionally; changing identity cancels stale reads. Failures surface when user action is required and never silently dispatch an expensive model call.
- **Later transport evolution (separate backend/infra Change):** adopt authenticated SSE invalidation only when end-to-end delivery/reconnect/proxy guarantees are implemented and tested; browser refetches the authoritative snapshot. WebSockets/Redis/RabbitMQ are **not required** by this frontend target.
- A single place coordinates refresh triggers and version checks; polling and future SSE must not create competing stores or trigger loops.

### F7. Screen and component responsibility

- `app/` handles Next routing and server loading; feature-level modules own view composition; presentational components focus on semantics and rendering; hooks/controllers own long-lived async commands or subscriptions; adapters handle HTTP/validation. No component should simultaneously own all of them.
- Prefer vertical feature organization for story creation, play, sessions and developer laboratory, with a small genuinely shared transport/identity layer. Do not build a class hierarchy, universal store, generic CRUD client or independent framework per screen.
- Presentation is decomposed along meaningful user or lifecycle boundaries; splitting a 600-line component into ten coupled fragments is **not** success without clearer ownership and tests.
- Chamber/debug data and game technical IDs stay intentionally separate from primary player reading flow.

### F8. Creation/forms and editing consistency

- Forms distinguish **local unsaved draft** from server-saved revision; editing preserves input during failure/conflict, validates at both browser and server boundaries, and supplies an explicit resolution path for concurrent changes.
- Long-running preview/start operations keep stable operation identity, show truthful pending/uncertain/recovery states and never auto-repeat a paid model request.
- Forms use semantic labels, focus, field errors, keyboard operation and intentional navigation/dirty-state handling. Unmount, route change or late reply must not overwrite a newer edit.
- A form library is justified by form complexity, not mandated. Its adoption must improve the target, not duplicate independent state owners.

### F9. Accessible, resilient UX engineering (distinct from art direction)

- Representative screens work keyboard-only, expose accessible labels and focus movement, announce consequential state changes without noisy recurring announcements, and do not strand users behind indefinite spinners.
- Document normal, empty, loading, invalid, conflict, expired-session, offline/timeout, uncertain, blocked and recovered states for each important workflow. Use route-level `loading.tsx`, `error.tsx`, `not-found.tsx` where the boundary genuinely benefits; never confuse expected domain errors with thrown framework crashes.
- No need to settle final typography, theme, spacing or imagery here. A **separate UX/art-direction target** decides those; React architecture must be able to implement it without further state/transport redesign.
- **Proof:** targeted browser keyboard/focus and narrow-screen tests, plus a human visual review; TypeScript alone cannot prove WCAG or coherent experience.

### F10. Evidence and maintainability

- Small pure units test version selection, resource identity and request-state transitions. Component tests prove visible pending/conflict/recovery and keyboard behavior. At least one provider-free browser integration shows initial server → client → Nest response contract with auth boundary.
- Include deliberately **reversed response order**, uncertain server commit, session identity switch and pagination/reload tests; fake transports must not replace the real HTTP contract for all evidence.
- A reproducible local typecheck, lint/format, focused tests and controlled browser walkthrough are documented. No claim of production readiness without executing them. CI is a candidate Change after local evidence proves repeatability.
- Design-sensitive performance is measured on representative build/routes (HTML usefulness, client JS, hydration, waterfalls, rerenders and request counts). Agree specific budgets **after** a recorded baseline; do not invent numerical targets or memoize every component.
- Source modules, names, runtime types and ownership are simple enough for the owner to explain trade-offs and failure paths in a technical interview. Complexity must earn its operational cost.

## Rejected/default alternatives

| Option | Default judgment | Revisit only if |
| --- | --- | --- |
| Replace Next.js with Vite SPA | Reject for this renewal; existing Next affords server-first entry | Actual deployment/runtime cost dominates and server rendering yields no user/developer benefit |
| Use client-only rendering for authenticated pages | Reject; meaningful private HTML and typed server reads are part of the portfolio target | Security constraints prevent safe SSR and owner chooses different architecture |
| Introduce Redux/global entity store | Reject; single authoritative snapshot and narrow local state should suffice | Multiple independent producers/consumers demonstrate genuine coordinated state complexity |
| Install TanStack Query for **all** data immediately | Defer; a query library may simplify repeated identity-scoped reads, but must preserve admitted-command semantics | Audit demonstrates the existing read/cache lifecycle needs it and full invalidation/identity semantics are designed |
| Require Tailwind/shadcn/ui | Out of scope for engineering behavior | Separate owner-approved UI design system shows a practical advantage |
| Add WebSockets, RabbitMQ or Redis to make frontend "modern" | Reject as a portfolio checkbox | Measured functional/operational requirement and cross-service delivery contract justify them |
| Purely cosmetic component extraction | Reject as target achievement | It measurably reduces responsibility coupling and improves a target guarantee with proof |

## Definition of target convergence

An architect/reviewer may call this **area target reached** only with a criterion-by-criterion matrix F1–F10 showing `demonstrated`, `accepted design-only`, `deliberately deferred`, or `unproved`, with actual revision and linked evidence. A glossy screenshot, zero lint errors or completion of the Change list alone is insufficient. Remaining limits must be honest and concrete.

**Owner decisions required before implementation:** approve/revise this target's topology and priorities; decide initial state-cache policy (minimal app-owned controller versus measured need for a query library), whether a shared command controller should be implemented in one step or by feature, and the acceptable browser-testing stack. The audit may recommend; it cannot silently grant approval.

## Professional references consulted

- [React: Effects are for external synchronization](https://react.dev/learn/you-might-not-need-an-effect), [external subscriptions](https://react.dev/reference/react/useSyncExternalStore)
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [fetch/caching](https://nextjs.org/docs/app/api-reference/functions/fetch), [error boundaries](https://nextjs.org/docs/app/api-reference/file-conventions/error)
- [Frontend state/async manual](../../../.agents/knowledge/frontend-state-and-async.md), [architecture decision space](../../../.agents/knowledge/architecture-decision-space.md), [testing evidence](../../../.agents/knowledge/testing-and-quality-evidence.md) and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md)
