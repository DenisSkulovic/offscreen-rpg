# Shared Query API helpers | source map

**First look:** Pure query keys, defaults and browser `queryOptions`. Server Nest transport stays in [`../../server/`](../../server/README.md). Do not import `server-only` modules here.
**Start:** [`query-keys.ts`](query-keys.ts) → [`story-snapshot-query.ts`](story-snapshot-query.ts) → authenticated provider.
**Source basis:** W15 + W05, 2026-11-12.

| Module | Role |
| --- | --- |
| `query-keys.ts` | `['viewer', viewerId, ...]` factories; no secrets in keys |
| `query-defaults.ts` | stale/gc/retry/mutation policies from React/Next target |
| `query-client.ts` | `createBrowserQueryClient` / `createServerQueryClient` (server never global) |
| `story-snapshot-query.ts` | SSR `storySnapshotQueryOptions` + Play `playStorySnapshotQueryOptions` (pending refetch / W03 gate) |
| `story-pending-refresh.ts` | Pure pending-refresh predicate + 2s cadence constant (pre-SSE) |
| `story-snapshot-reconcile.ts` | Pure viewer/story/`viewVersion`/epoch gate |
| `story-snapshot-write.ts` | Sole Play Query write for snapshots |

**Maintenance:** update when key shapes, cache policies or snapshot write gates change.
