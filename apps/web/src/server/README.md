# Server-only Nest readers | source map

**First look:** Private SSR talks to Nest through this folder only. Browser helpers stay in [`../lib/`](../lib/README.md). Importing these modules into a Client Component must fail (`server-only`).
**Start:** [`viewer.ts`](viewer.ts) → [`nest-reader.ts`](nest-reader.ts) → one authenticated page under [`../../app/(authenticated)/`](../../app/(authenticated)/).
**Source basis:** W02, 2026-11-12.

## Ownership

| Module | Behavior |
| --- | --- |
| `api-origin.ts` | `API_INTERNAL_ORIGIN` for SSR; pure helper (safe for Next config patterns). Proxy rewrite uses `API_PROXY_ORIGIN` in [`next.config.ts`](../../next.config.ts) — never `NEXT_PUBLIC_*`. |
| `viewer.ts` | `requireViewer()` — cookie → Nest `/api/me`, 401 → `/sign-in`, React `cache()` per request. Layout gate ≠ resource authorization. |
| `nest-reader.ts` | `nestFetch` / `readNestJson` / `applyNestRoutePolicy`: `no-store`, 5s timeout, 401 sign-in, 404 `notFound`, other → `NestTransientError`. |
| `seed-authorized-query.ts` | Seed SSR Query from an already-authorized value. Nest reads that must throw route outcomes happen *before* this helper — never inside `prefetchQuery` queryFn. |
| `parse-nest-json.ts` | Zod parse; malformed body → `NestProtocolError` (not 404). |
| `classify-nest-status.ts` | Pure status taxonomy; **503 is transient, never not_found**. |

## Failure model

- Preserve Next `redirect` / `notFound` outside generic catches.
- Layout `requireViewer` only proves a session exists for the route group.
- Each page still performs owner-scoped Nest GETs; Nest remains the authority.
- W14 owns production-like proxy/cache/HTML privacy proof.

**Maintenance:** update when SSR transport, status policy, or origin env names change.
