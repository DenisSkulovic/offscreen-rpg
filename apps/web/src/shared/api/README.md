# Shared Query API helpers | source map

**First look:** Pure query keys, defaults and browser `queryOptions`. Server Nest transport stays in [`../../server/`](../../server/README.md). Do not import `server-only` modules here.
**Start:** [`query-keys.ts`](query-keys.ts) → [`story-snapshot-query.ts`](story-snapshot-query.ts) → authenticated provider.
**Source basis:** W15, 2026-11-12.

| Module | Role |
| --- | --- |
| `query-keys.ts` | `['viewer', viewerId, ...]` factories; no secrets in keys |
| `query-defaults.ts` | stale/gc/retry/mutation policies from React/Next target |
| `query-client.ts` | `createBrowserQueryClient` / `createServerQueryClient` (server never global) |
| `story-snapshot-query.ts` | Play snapshot `queryOptions` shared by SSR prefetch override + browser |

**Maintenance:** update when key shapes or cache policies change.
