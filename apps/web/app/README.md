# Next App Router | source map

**First look:** Existing Next 16 pages are Server Components unless explicitly marked `'use client'`; they use `requireViewer` and direct Nest `fetch` for initial private DTOs, then render Client interactive islands. The *selected future* architecture migrates private pages to request-scoped Query prefetch and hydration. **There is no current TanStack Query provider yet.**
**Start:** [root layout](../../../layout.tsx) / [requireViewer](../src/lib/viewer.ts) → private route below → feature README. **Do not read every page.**
**Source basis:** source `470a5df`, inspected 2026-11-12. W02/W15 own route-group/hydration changes; W07 owns error/loading mechanics.

## One route → one owner

| URL | Server page | Client feature | Next boundary |
| --- | --- | --- | --- |
| `/` | [home page](../../../page.tsx) | none | public |
| `/sign-in` | [sign-in page](../../../sign-in/page.tsx) | `src/features/session/sign-in-button.tsx` | public entry, Better Auth |
| `/stories` | [story list page](../../../stories/page.tsx) | `src/features/stories/{live-story-list,draft-list}.tsx` | `requireViewer` and two independent Nest reads, **currently sequential** |
| `/stories/new?id=UUID` | [new draft page](../../../stories/new/page.tsx) | `src/features/stories/draft-editor.tsx` | server UUID/query normalization |
| `/stories/:id` | [saved draft page](../../../stories/[id]/page.tsx) | same `DraftEditor` | 401 sign-in, 404 not-found |
| `/stories/:id/preview` | [preview page](../../../stories/[id]/preview/page.tsx) | `src/features/stories/opening-preview.tsx` | parallel draft/latest/catalogue SSR reads |
| `/play/:id` | [Play page](../../../play/[id]/page.tsx) | `src/features/play/view.tsx` | typed SSR story snapshot |
| `/chamber` | [developer route](../../../chamber/page.tsx) | `src/features/developer-tools/chamber/view.tsx` | backend controller registration is conditional on developerTools |
| `/demo` | [scripted demo](../../../demo/page.tsx) | browser-only prototype | does not persist gameplay |

**Current Next config:** [next.config.ts](../next.config.ts) rewrites same-origin `/api/*` to loopback Nest `127.0.0.1:3001`, while server-side `apiOrigin` can be configured. W02 corrects topology; W15 adds authenticated route group with server-side per-request QueryClient and `HydrationBoundary`; keep user-facing URL paths exactly.

## Scope and failure model

- 401 from viewer => sign-in; 404 from owner-scoped read => notFound; upstream 5xx/timeout => recoverable route error. Next `redirect`/`notFound` are special outcomes; don't swallow them in a generic catch.
- Private data must not leak through shared RSC/proxy/browser caches. A server `no-store` fetch is a useful defense, not full connected proof; W14 tests real HTML/soft nav/back after logout.
- Initial HTML should contain authorized story text, not a client waterfall. Hydration must not duplicate initial GET or overwrite later query-cache versions.
- Session provider should not force public/demo pages into client-only rendering; W15 scopes Query provider to private route group.

**Read deeper only for:** [F1/F2 Next target](../../../docs/engineering/targets/react-next.md) architecture, [client/identity contract](../../../docs/technical/client-and-identity.md) semantics, [transport owner map](../src/lib/README.md) or [integration warning](../../../tools/api-integration/README.md). A route file's 20–60 lines are generally cheaper than the whole architecture spec.

**Maintenance:** update this map when routes, Next page authority, client islands, error/loading boundaries or auth placement change. No need to rewrite it for local JSX layout work.
