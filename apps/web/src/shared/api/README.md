# Shared Query API helpers | source map

**First look:** Pure query keys, defaults and browser `queryOptions`. Server Nest transport stays in [`../../server/`](../../server/README.md). Do not import `server-only` modules here.
**Start:** [`query-keys.ts`](query-keys.ts) → [`story-snapshot-query.ts`](story-snapshot-query.ts) → authenticated provider.
**Source basis:** W15 + W05 + W17, 2026-11-12.

| Module | Role |
| --- | --- |
| `query-keys.ts` | `['viewer', viewerId, ...]` factories; no secrets in keys |
| `query-defaults.ts` | stale/gc/retry/mutation policies from React/Next target |
| `query-client.ts` | `createBrowserQueryClient` / `createServerQueryClient` (server never global) |
| `story-snapshot-query.ts` | SSR `storySnapshotQueryOptions` + Play `playStorySnapshotQueryOptions` (SSE-aware pending refetch / W03 gate) |
| `story-pending-refresh.ts` | Pure pending-refresh predicate + 30s safety / 2s fallback cadence |
| `story-update-stream.ts` | Typed EventSource manager; validates `storyUpdateHintSchema`; test factory seam |
| `story-snapshot-reconcile.ts` | Pure viewer/story/`viewVersion`/epoch gate |
| `story-snapshot-write.ts` | Sole Play Query write for snapshots |
| `draft-query.ts` | Viewer-scoped draft `queryOptions` + browser GET; no focus refetch into RHF |

**Maintenance:** update when key shapes, cache policies or snapshot write gates change.
