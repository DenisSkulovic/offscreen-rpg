# Next App Router | source map

**First look:** Existing Next 16 pages are Server Components unless explicitly marked `'use client'`. Private URLs live under [`(authenticated)/`]((authenticated)/) with a layout session gate + browser Query provider; Nest reads use [`src/server`](../src/server/README.md). **Play** uses SSR `prefetchQuery` + `HydrationBoundary` plus route `loading`/`error`/`not-found` and a Query error boundary. Public routes stay outside that group.
**Start:** [root layout](layout.tsx) / [`requireViewer`](../src/server/viewer.ts) → [(authenticated)/layout.tsx]((authenticated)/layout.tsx) → private route → feature README. **Do not read every page.**
**Source basis:** post-W07 `main`.

## One route → one owner

| URL | Server page | Client feature | Next boundary |
| --- | --- | --- | --- |
| `/` | [home page](page.tsx) | none | public |
| `/sign-in` | [sign-in page](sign-in/page.tsx) | `src/features/session/sign-in-button.tsx` | public entry, Better Auth |
| `/stories` | [(authenticated)/stories/page.tsx]((authenticated)/stories/page.tsx) | `src/features/stories/{live-story-list,draft-list}.tsx` | parallel drafts+stories Nest reads |
| `/stories/new?id=UUID` | [(authenticated)/stories/new/page.tsx]((authenticated)/stories/new/page.tsx) | `src/features/stories/draft-editor.tsx` | server UUID/query normalization |
| `/stories/:id` | [(authenticated)/stories/[id]/page.tsx]((authenticated)/stories/[id]/page.tsx) | same `DraftEditor` | 401 sign-in, 404 not-found |
| `/stories/:id/preview` | [(authenticated)/stories/[id]/preview/page.tsx]((authenticated)/stories/[id]/preview/page.tsx) | `src/features/stories/opening-preview.tsx` | parallel draft/latest/catalogue SSR reads |
| `/play/:id` | [(authenticated)/play/[id]/page.tsx]((authenticated)/play/[id]/page.tsx) | `PlayQueryBoundary` + `PlayScene` | Nest read first (401/404/503 propagate), then seed Query + hydrate; `loading`/`error`/`not-found` |
| `/stories` | [(authenticated)/stories/page.tsx]((authenticated)/stories/page.tsx) | `LiveStoryList` / `DraftList` | SSR `prefetchInfiniteQuery` + hydrate; `loading`/`error` |
| `/chamber` | [(authenticated)/chamber/page.tsx]((authenticated)/chamber/page.tsx) | `src/features/developer-tools/chamber/view.tsx` | backend controller registration is conditional on developerTools |
| `/demo` | [scripted demo](demo/page.tsx) | browser-only prototype | does not persist gameplay |
| `/rules` | [rules page](rules/page.tsx) | none | public |

**Next config:** [next.config.ts](../next.config.ts) rewrites browser `/api/*` via `API_PROXY_ORIGIN` (default loopback `127.0.0.1:3001`). SSR uses `API_INTERNAL_ORIGIN`. Both are Node-only; do not publish them with `NEXT_PUBLIC_*`. Query provider + Play hydration live inside `(authenticated)`; keep user-facing URL paths exactly.

## Scope and failure model

- 401 from viewer/Nest => sign-in; 404 from owner-scoped read => notFound; upstream 5xx/timeout => recoverable route error (`NestTransientError`). Malformed Nest JSON => `NestProtocolError`. Next `redirect`/`notFound` are special outcomes; don't swallow them in a generic catch. Client recovery UI lives in [`src/features/recovery`](../src/features/recovery/route-recovery.tsx) and must keep 503 ≠ deleted.
- Route-group layout checks session only; it is **not** Nest endpoint authorization.
- Private data must not leak through shared RSC/proxy/browser caches. A server `no-store` fetch is a useful defense, not full connected proof; W14 tests real HTML/soft nav/back after logout.
- Initial HTML should contain authorized story text, not a client waterfall. Hydration must not duplicate initial GET or overwrite later query-cache versions.
- Session/Query provider (W15) should not force public/demo pages into client-only rendering; keep the provider inside `(authenticated)`.

**Read deeper only for:** [F1/F2 Next target](../../../docs/engineering/targets/react-next.md) architecture, [client/identity contract](../../../docs/technical/client-and-identity.md) semantics, [server reader map](../src/server/README.md), [transport owner map](../src/lib/README.md) or [integration warning](../../../tools/api-integration/README.md). A route file's 20–60 lines are generally cheaper than the whole architecture spec.

**Maintenance:** update this map when routes, Next page authority, client islands, error/loading boundaries or auth placement change. No need to rewrite it for local JSX layout work.
