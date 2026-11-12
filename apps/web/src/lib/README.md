# Web transport and session | source map

**First look:** Current `viewer.ts` is **server-only in usage**, calls Nest `/api/me` with incoming cookie, and provides internal API origin. `story-transport.ts` is a **browser-side helper** for story snapshot GET, parsing and PUT commands. They are not interchangeable runtimes. **Target (not yet implemented):** explicit `server-only` boundary, typed server/browser adapters and TanStack Query as browser server-state owner.
**Read only:** [viewer.ts](viewer.ts) for authenticated SSR; [story-transport.ts](story-transport.ts) for current browser story traffic. No need to open the whole app.
**Source basis:** `470a5df`, 2026-11-12 static inspection. This map does not assert runtime caching, deployment proxy correctness or successful authentication tests.

## Current ownership and precise observed behavior

| Owner | Exports and behavior | Risk / target |
| --- | --- | --- |
| `viewer.ts` | `apiOrigin()` reads `API_INTERNAL_ORIGIN` or loopback `127.0.0.1:3001`; `requireViewer()` forwards request cookie to Nest GET `/api/me` with `cache:'no-store'` and 5s timeout | 401 redirects `/sign-in`; other non-OK throws; result `{user,cookie}`. W02 moves to dedicated server-only typed boundary |
| `story-transport.ts` | `readStorySnapshot(storyId,signal?)` GET `/api/stories/:id`, 10s timeout, Zod `storySnapshotSchema` | Throws generic `Unavailable` on non-OK, bypassing typed status recovery |
| `story-transport.ts` | `readSnapshotFromResponse(response)` parses supplied response JSON | Caller must distinguish 200/202 and not infer settled status |
| `story-transport.ts` | `submitStoryJson({url,body,signal?})` sends `PUT` JSON and returns raw `Response` | `body:unknown`/status handling is pushed to many feature owners; target uses typed endpoint-specific adapter |
| `story-transport.ts` | `preferNewerSnapshot(prior,next)` accepts equal/higher viewVersion with resolution tie rule | Does **not** check viewer/story ID; W03 replaces all writes with resource-aware Query acceptance |
| `auth-client.ts` | `createAuthClient()` for Better Auth React | Browser session actions; not a substitute for Nest owner checks |

## Session and cache stack (do not conflate)

```text
Incoming browser request (cookie)
  -> Next server requireViewer -> Nest /api/me (Better Auth/session)
  -> private Nest story/draft GET -> validated public DTO -> SSR props

Client React -> same-origin /api/* -> Next rewrite -> Nest API
  -> per-object authorization and state transitions
```

**Current configuration caveat:** [Next rewrite](../../next.config.ts) hardcodes `http://127.0.0.1:3001` for browser `/api`, while server `API_INTERNAL_ORIGIN` is configurable. W02 owns coherent local/deployment origins. `cache:'no-store'` in one fetch does **not** establish all Next Router/RSC/proxy cache guarantees; W14 proves private isolation in a production-like browser.

**Selected future boundaries:** request-scoped server QueryClient for authenticated prefetch, memory-only browser QueryClient per session, viewer+resource keys, Zod runtime schemas, no duplicated canonical story state, typed domain errors, explicit idempotency command protocol. See [target F1–F5/F11](../../../../docs/engineering/targets/react-next.md) by **exact heading**, not full-file ingestion.

## Where to expand

- For Next route and private HTML: [App Router map](../../app/README.md).
- For commands, retries and ambiguous success: [Play owner map](../features/play/README.md) and [Nest stories API map](../../../api/src/modules/stories/README.md).
- For login/logout behavior: [SessionRefresh](../features/session/session-refresh.tsx) + [SignOutButton](../features/session/sign-out-button.tsx). The latter hard-navigates after logout to clear Next client route cache.
- For proof: [auth integration](../../../../tools/api-integration/test/auth.integration.ts) (real backend, provider-free, disposable DB) or fast adapter tests after W01.

**Maintenance:** when an exported transport helper, session boundary, error taxonomy or server/browser import direction changes, update this map and relevant tests as part of the owning Change. Otherwise don't regenerate it mechanically.
