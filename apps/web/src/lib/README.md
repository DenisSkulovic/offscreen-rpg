# Web transport and session | source map

**First look:** Authenticated SSR Nest reads live in [`../server/`](../server/README.md) (`server-only`). Query keys/options live in [`../shared/api/`](../shared/api/README.md). This folder owns **browser-side** helpers: story snapshot GET/PUT and Better Auth client actions.
**Read only:** [story-transport.ts](story-transport.ts) for current browser story traffic; [auth-client.ts](auth-client.ts) for session actions. Server session gate: [`../server/viewer.ts`](../server/viewer.ts).
**Source basis:** W15, 2026-11-12.

## Current ownership and precise observed behavior

| Owner | Exports and behavior | Risk / target |
| --- | --- | --- |
| `../server/viewer.ts` | `requireViewer()` forwards request cookie to Nest GET `/api/me` with `cache:'no-store'` and 5s timeout | 401 redirects `/sign-in`; other non-OK → `NestTransientError`; result `{user,cookie}`. Layout gate ≠ resource auth |
| `../server/nest-reader.ts` | Typed `nestFetch` / `readNestJson` / status policy | 404 → notFound; 503 → transient; malformed body → protocol error |
| `story-transport.ts` | `readStorySnapshot(storyId,signal?)` GET `/api/stories/:id`, 10s timeout, Zod `storySnapshotSchema` | Throws `StorySnapshotReadError` with HTTP/`0` status for Query retry; aborts rethrow |
| `story-transport.ts` | `readSnapshotFromResponse(response)` parses supplied response JSON | Caller must distinguish 200/202 and not infer settled status |
| `story-transport.ts` | `submitStoryJson({url,body,signal?})` sends `PUT` JSON and returns raw `Response` | `body:unknown`/status handling is pushed to many feature owners; target uses typed endpoint-specific adapter |
| `story-transport.ts` | `preferNewerSnapshot(prior,next)` accepts equal/higher viewVersion with resolution tie rule | Does **not** check viewer/story ID; W03 replaces all writes with resource-aware Query acceptance |
| `auth-client.ts` | `createAuthClient()` for Better Auth React | Browser session actions; not a substitute for Nest owner checks |

## Session and cache stack (do not conflate)

```text
Incoming browser request (cookie)
  -> Next (authenticated) layout requireViewer -> Nest /api/me
  -> private Nest story/draft GET (src/server) -> validated public DTO -> SSR props

Client React -> same-origin /api/* -> Next rewrite (API_PROXY_ORIGIN) -> Nest API
  -> per-object authorization and state transitions
```

**Origins:** SSR uses `API_INTERNAL_ORIGIN`; browser rewrite uses `API_PROXY_ORIGIN`. Both default to loopback `127.0.0.1:3001` and stay Node-only. `cache:'no-store'` in one fetch does **not** establish all Next Router/RSC/proxy cache guarantees; W14 proves private isolation in a production-like browser.

**Selected future boundaries:** request-scoped server QueryClient for authenticated prefetch, memory-only browser QueryClient per session, viewer+resource keys, Zod runtime schemas, no duplicated canonical story state, typed domain errors, explicit idempotency command protocol. See [target F1–F5/F11](../../../../docs/engineering/targets/react-next.md) by **exact heading**, not full-file ingestion.

## Where to expand

- For Next route and private HTML: [App Router map](../../app/README.md).
- For SSR Nest readers: [server map](../server/README.md).
- For commands, retries and ambiguous success: [Play owner map](../features/play/README.md) and [Nest stories API map](../../../api/src/modules/stories/README.md).
- For login/logout behavior: [SessionRefresh](../features/session/session-refresh.tsx) + [SignOutButton](../features/session/sign-out-button.tsx). The latter hard-navigates after logout to clear Next client route cache.
- For proof: [auth integration](../../../../tools/api-integration/test/auth.integration.ts) (real backend, provider-free, disposable DB) or fast adapter tests under `src/server/*.test.ts`.

**Maintenance:** when an exported transport helper, session boundary, error taxonomy or server/browser import direction changes, update this map and relevant tests as part of the owning Change. Otherwise don't regenerate it mechanically.
